/**
 * NEXUS-AI Phase 5: Execution Engine
 * Controlled agent execution, idempotency, retry policies, timeouts, and cancellation.
 */

import { AgentRegistry } from './registry.js';
import type { BaseAgent } from './base.js';
import type {
  PlanStep,
  AgentExecutionRecord,
  AgentExecutionContext,
  AgentExecutionOutput,
} from './types.js';

export interface ExecutionOptions {
  max_retries?: number;
  timeout_ms?: number;
  abort_signal?: AbortSignal;
}

export class ExecutionEngine {
  private activeExecutions: Map<string, AgentExecutionRecord> = new Map();
  private executedTaskIds: Set<string> = new Set();
  private abortControllers: Map<string, AbortController> = new Map(); // task_id -> AbortController

  private registry: AgentRegistry;
  private defaultMaxRetries: number;
  private defaultTimeoutMs: number;

  constructor(
    registry = AgentRegistry.getInstance(),
    defaultMaxRetries = 2,
    defaultTimeoutMs = 60000
  ) {
    this.registry = registry;
    this.defaultMaxRetries = defaultMaxRetries;
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  /**
   * Register a task cancellation trigger.
   */
  public registerTask(taskId: string): AbortController {
    const ac = new AbortController();
    this.abortControllers.set(taskId, ac);
    return ac;
  }

  public cancelTask(taskId: string): boolean {
    const ac = this.abortControllers.get(taskId);
    if (ac) {
      ac.abort('Task cancelled by user');
      this.abortControllers.delete(taskId);
      return true;
    }
    return false;
  }

  public isTaskCancelled(taskId: string): boolean {
    const ac = this.abortControllers.get(taskId);
    return ac ? ac.signal.aborted : false;
  }

  /**
   * Check if a task was already completed or running to prevent duplicate accidental executions.
   */
  public checkAndMarkTaskExecution(taskId: string): boolean {
    if (this.executedTaskIds.has(taskId)) {
      return false; // Duplicate attempt
    }
    this.executedTaskIds.add(taskId);
    return true;
  }

  public clearTaskExecution(taskId: string): void {
    this.executedTaskIds.delete(taskId);
  }

  /**
   * Execute a single plan step with timeout, retry, and cancellation handling.
   */
  public async executeStep(
    step: PlanStep,
    context: {
      task_id: string;
      session_id?: string;
      project_id?: string;
      input_text: string;
      scoped_context: Record<string, unknown>;
      dependency_outputs?: Record<string, unknown>;
      request_tool?: (tool_id: string, capability: string, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
    },
    options?: ExecutionOptions
  ): Promise<AgentExecutionRecord> {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const maxRetries = options?.max_retries ?? this.defaultMaxRetries;
    const timeoutMs = options?.timeout_ms ?? this.defaultTimeoutMs;
    const taskAbortController = this.abortControllers.get(context.task_id);

    const agent = this.registry.get(step.agent_id);
    const now = new Date().toISOString();

    const record: AgentExecutionRecord = {
      execution_id: executionId,
      agent_id: step.agent_id,
      task_id: context.task_id,
      step_id: step.step_id,
      status: 'RUNNING',
      provenance: {
        agent_id: step.agent_id,
        timestamp: now,
      },
      warnings: [],
      errors: [],
      started_at: now,
      metadata: { retries: 0 },
    };

    this.activeExecutions.set(executionId, record);

    // 1. Check if task was already cancelled
    if (taskAbortController?.signal.aborted || options?.abort_signal?.aborted) {
      record.status = 'CANCELLED';
      record.errors.push('Execution aborted: task was cancelled prior to starting this step.');
      record.completed_at = new Date().toISOString();
      return record;
    }

    // 2. Validate agent availability
    if (!agent) {
      record.status = 'FAILED';
      record.errors.push(`NEXUS couldn't complete this step because the required agent '${step.agent_id}' is unavailable.`);
      record.completed_at = new Date().toISOString();
      return record;
    }

    if (agent.availability === 'UNAVAILABLE') {
      record.status = 'FAILED';
      record.errors.push(`Agent '${agent.name}' is currently unavailable on this host.`);
      record.completed_at = new Date().toISOString();
      return record;
    }

    // 3. Execution with Retry Loop
    let attempt = 0;
    while (attempt <= maxRetries) {
      if (attempt > 0) {
        record.warnings.push(`Retry attempt ${attempt}/${maxRetries} triggered.`);
        (record.metadata as Record<string, unknown>).retries = attempt;
      }

      try {
        const output = await this.runWithTimeout(
          agent,
          {
            task_id: context.task_id,
            step_id: step.step_id,
            session_id: context.session_id,
            project_id: context.project_id,
            input_text: context.input_text,
            scoped_context: context.scoped_context,
            dependency_outputs: context.dependency_outputs,
            timeout_ms: timeoutMs,
            abort_signal: taskAbortController?.signal || options?.abort_signal,
            request_tool: context.request_tool,
          },
          timeoutMs
        );

        record.status = 'COMPLETED';
        record.output = {
          text: output.text,
          structured_data: output.structured_data,
        };
        record.artifacts = output.artifacts;
        if (output.warnings) {
          record.warnings.push(...output.warnings);
        }
        record.completed_at = new Date().toISOString();
        return record;
      } catch (err: unknown) {
        const isTimeout = err instanceof Error && err.message.includes('Execution timed out');
        const isAbort = taskAbortController?.signal.aborted || (err instanceof Error && err.name === 'AbortError');
        const errMessage = err instanceof Error ? err.message : String(err);

        // DO NOT retry: cancellation, permission denied, invalid input, unsupported capability
        const isNonRetryable = isAbort ||
          errMessage.includes('permission') ||
          errMessage.includes('unauthorized') ||
          errMessage.includes('invalid input') ||
          errMessage.includes('unsupported capability');

        if (isAbort) {
          record.status = 'CANCELLED';
          record.errors.push('Task execution cancelled by user.');
          record.completed_at = new Date().toISOString();
          return record;
        }

        if (isNonRetryable || attempt >= maxRetries) {
          record.status = isTimeout ? 'TIMED_OUT' : 'FAILED';
          record.errors.push(errMessage);
          record.completed_at = new Date().toISOString();
          return record;
        }

        attempt++;
      }
    }

    record.status = 'FAILED';
    record.completed_at = new Date().toISOString();
    return record;
  }

  private async runWithTimeout(
    agent: BaseAgent,
    context: AgentExecutionContext,
    timeoutMs: number
  ): Promise<AgentExecutionOutput> {
    return new Promise((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null;
      let settled = false;

      timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(`Execution timed out after ${timeoutMs}ms.`));
        }
      }, timeoutMs);

      agent
        .execute(context)
        .then((res) => {
          if (!settled) {
            settled = true;
            if (timer) clearTimeout(timer);
            resolve(res);
          }
        })
        .catch((err) => {
          if (!settled) {
            settled = true;
            if (timer) clearTimeout(timer);
            reject(err);
          }
        });
    });
  }

  public getExecution(executionId: string): AgentExecutionRecord | undefined {
    return this.activeExecutions.get(executionId);
  }

  public listExecutions(): AgentExecutionRecord[] {
    return Array.from(this.activeExecutions.values());
  }

  public getActiveCount(): number {
    return Array.from(this.activeExecutions.values()).filter((e) => e.status === 'RUNNING').length;
  }
}
