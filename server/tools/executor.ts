/**
 * NEXUS-AI Phase 6: Central Tool Execution Engine
 * Governs capability validation, policy evaluations, approval gating, timeouts, retries,
 * sandboxing, idempotency, secret redaction, and action verification.
 */

import { ToolRegistry } from './registry.js';
import { PolicyEngine } from './policy.js';
import { ActionAuditLogger } from './audit.js';
import { ActionVerificationEngine } from './verification.js';
import { SecretRedactor } from './redaction.js';
import { ApprovalGate } from '../agents/approval.js';
import type {
  ToolRequest,
  ToolResult,
  ToolExecutionRecord,
  ToolExecutionStatus,
} from './types.js';

export interface ToolExecutorOptions {
  registry?: ToolRegistry;
  policyEngine?: PolicyEngine;
  approvalGate?: ApprovalGate;
  auditLogger?: ActionAuditLogger;
  defaultTimeoutSeconds?: number;
  maxRetries?: number;
}

export class ToolExecutionEngine {
  private static instance: ToolExecutionEngine | null = null;

  public registry: ToolRegistry;
  public policyEngine: PolicyEngine;
  public approvalGate: ApprovalGate;
  public auditLogger: ActionAuditLogger;
  public defaultTimeoutSeconds: number;
  public maxRetries: number;

  private activeExecutions: Map<string, AbortController> = new Map();
  private completedExecutions: Map<string, ToolExecutionRecord> = new Map();
  private idempotencyKeys: Map<string, ToolResult> = new Map();

  constructor(options?: ToolExecutorOptions) {
    this.registry = options?.registry || ToolRegistry.getInstance();
    this.policyEngine = options?.policyEngine || PolicyEngine.getInstance();
    this.approvalGate = options?.approvalGate || ApprovalGate.getInstance();
    this.auditLogger = options?.auditLogger || ActionAuditLogger.getInstance();
    this.defaultTimeoutSeconds = options?.defaultTimeoutSeconds || 30;
    this.maxRetries = options?.maxRetries ?? 2;
  }

  public static getInstance(options?: ToolExecutorOptions): ToolExecutionEngine {
    if (!ToolExecutionEngine.instance) {
      ToolExecutionEngine.instance = new ToolExecutionEngine(options);
    }
    return ToolExecutionEngine.instance;
  }

  public static resetInstance(): void {
    ToolExecutionEngine.instance = null;
  }

  /**
   * Main entry point to execute an agent tool request.
   */
  public async executeToolRequest(request: ToolRequest): Promise<ToolResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    // 1. Idempotency Check (Scenario 9: prevents accidental duplicate execution)
    const idempotencyKey = request.idempotency_key || `${request.agent_id}:${request.tool_id}:${JSON.stringify(request.input)}`;
    if (this.idempotencyKeys.has(idempotencyKey)) {
      const cached = this.idempotencyKeys.get(idempotencyKey)!;
      return {
        ...cached,
        request_id: request.request_id,
        metadata: { ...cached.metadata, duplicate_detected: true },
      };
    }

    // 2. Tool Lookup (Scenario 5: TOOL_NOT_FOUND)
    const tool = this.registry.get(request.tool_id);
    if (!tool) {
      const err = `Tool '${request.tool_id}' not found in Tool Registry.`;
      this.auditLogger.logEvent({
        request_id: request.request_id,
        task_id: request.task_id,
        agent_id: request.agent_id,
        tool_id: request.tool_id,
        action: `Execute ${request.tool_id}`,
        risk_level: 'READ_ONLY',
        approval_status: 'NOT_REQUIRED',
        execution_status: 'FAILED',
        result_summary: err,
        provenance: { agent_id: request.agent_id, tool_id: request.tool_id, timestamp: startedAt },
        duration_ms: Date.now() - startTime,
        error: err,
      });

      return {
        request_id: request.request_id,
        tool_id: request.tool_id,
        status: 'FAILED',
        output: {},
        warnings: [],
        errors: [err],
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        provenance: { agent_id: request.agent_id, tool_id: request.tool_id, timestamp: startedAt },
      };
    }

    // 3. Input Validation (Validates schema types & required fields)
    const inputValidation = tool.validateInput(request.input);
    if (!inputValidation.valid) {
      const err = `Input validation failed for tool '${tool.name}': ${inputValidation.errors.join('; ')}`;
      return {
        request_id: request.request_id,
        tool_id: tool.tool_id,
        status: 'FAILED',
        output: {},
        warnings: [],
        errors: [err],
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        provenance: { agent_id: request.agent_id, tool_id: tool.tool_id, timestamp: startedAt },
      };
    }

    // 4. Policy Engine Evaluation (Scenario 6: CAPABILITY_DENIED, Scenario 7: PATH_NOT_ALLOWED)
    const policyResult = this.policyEngine.evaluate(request, tool);
    if (policyResult.decision === 'DENY') {
      const err = `Policy Denied: ${policyResult.reason}`;
      this.auditLogger.logEvent({
        request_id: request.request_id,
        task_id: request.task_id,
        agent_id: request.agent_id,
        tool_id: tool.tool_id,
        action: `Execute ${tool.name}`,
        risk_level: policyResult.risk_level,
        approval_status: 'NOT_REQUIRED',
        execution_status: 'BLOCKED',
        result_summary: err,
        provenance: { agent_id: request.agent_id, tool_id: tool.tool_id, timestamp: startedAt },
        duration_ms: Date.now() - startTime,
        error: err,
      });

      return {
        request_id: request.request_id,
        tool_id: tool.tool_id,
        status: 'BLOCKED',
        output: {},
        warnings: [],
        errors: [err],
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        provenance: { agent_id: request.agent_id, tool_id: tool.tool_id, timestamp: startedAt },
      };
    }

    // 5. Human Approval Gate Check (Scenario 2, 3, 4, 12)
    if (policyResult.decision === 'REQUIRE_APPROVAL') {
      let isApproved = false;

      // Check if existing approval exists
      if (request.approval_id) {
        const approval = this.approvalGate.getApproval(request.approval_id);
        if (approval?.status === 'APPROVED') {
          isApproved = true;
        } else if (approval?.status === 'REJECTED') {
          // Scenario 4: Rejected action stops immediately
          const err = `Action was rejected by user. Execution cancelled.`;
          return {
            request_id: request.request_id,
            tool_id: tool.tool_id,
            status: 'CANCELLED',
            output: {},
            warnings: [],
            errors: [err],
            started_at: startedAt,
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
            provenance: { agent_id: request.agent_id, tool_id: tool.tool_id, timestamp: startedAt },
          };
        }
      }

      if (!isApproved) {
        // Create pending approval requirement
        const approvalReq = this.approvalGate.requestApproval({
          task_id: request.task_id || `task-tool-${Date.now()}`,
          step_id: request.request_id,
          action: `${tool.name}: ${request.capability}`,
          reason: policyResult.reason,
          risk_level: policyResult.risk_level,
        });

        this.auditLogger.logEvent({
          request_id: request.request_id,
          task_id: request.task_id,
          agent_id: request.agent_id,
          tool_id: tool.tool_id,
          action: `${tool.name}: ${request.capability}`,
          risk_level: policyResult.risk_level,
          approval_status: 'PENDING',
          execution_status: 'WAITING_FOR_APPROVAL',
          result_summary: `Paused: Waiting for human approval (${approvalReq.approval_id}).`,
          provenance: { agent_id: request.agent_id, tool_id: tool.tool_id, timestamp: startedAt },
          duration_ms: Date.now() - startTime,
        });

        return {
          request_id: request.request_id,
          tool_id: tool.tool_id,
          status: 'WAITING_FOR_APPROVAL',
          output: {
            approval_id: approvalReq.approval_id,
            reason: approvalReq.reason,
            risk_level: approvalReq.risk_level,
          },
          warnings: ['Action requires user approval before execution.'],
          errors: [],
          started_at: startedAt,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          provenance: { agent_id: request.agent_id, tool_id: tool.tool_id, timestamp: startedAt },
        };
      }
    }

    // 6. Execution with Timeout & Controlled Retries (Scenario 8: Timeout, Scenario 10: Secret Redaction)
    const timeoutMs = (tool.timeout_seconds || this.defaultTimeoutSeconds) * 1000;
    const abortController = new AbortController();
    this.activeExecutions.set(request.request_id, abortController);

    let attempts = 0;
    const canRetry = tool.risk_level === 'READ_ONLY' || tool.risk_level === 'LOW_RISK';
    const maxAttempts = canRetry ? 1 + this.maxRetries : 1;
    let lastError: Error | null = null;
    let rawOutput: Record<string, unknown> | null = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        rawOutput = await this.runWithTimeout(
          () => tool.execute({ request, timeout_ms: timeoutMs, abort_signal: abortController.signal }),
          timeoutMs,
          abortController.signal
        );
        lastError = null;
        break; // Successful execution
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (abortController.signal.aborted) {
          break; // Do not retry if aborted/cancelled
        }
      }
    }

    this.activeExecutions.delete(request.request_id);

    // 7. Handle Timeout or Execution Errors
    if (lastError || !rawOutput) {
      const isTimeout = lastError?.message.includes('timed out');
      const finalStatus: ToolExecutionStatus = isTimeout
        ? 'TIMEOUT'
        : abortController.signal.aborted
        ? 'CANCELLED'
        : 'FAILED';

      const errMsg = lastError?.message || 'Tool execution failed.';

      this.auditLogger.logEvent({
        request_id: request.request_id,
        task_id: request.task_id,
        agent_id: request.agent_id,
        tool_id: tool.tool_id,
        action: `Execute ${tool.name}`,
        risk_level: tool.risk_level,
        approval_status: policyResult.decision === 'REQUIRE_APPROVAL' ? 'APPROVED' : 'NOT_REQUIRED',
        execution_status: finalStatus,
        result_summary: errMsg,
        provenance: { agent_id: request.agent_id, tool_id: tool.tool_id, timestamp: startedAt },
        duration_ms: Date.now() - startTime,
        error: errMsg,
      });

      return {
        request_id: request.request_id,
        tool_id: tool.tool_id,
        status: finalStatus,
        output: {},
        warnings: [],
        errors: [errMsg],
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        provenance: { agent_id: request.agent_id, tool_id: tool.tool_id, timestamp: startedAt },
      };
    }

    // 8. Secret Redaction Layer (Scenario 10: sensitive secret redaction in output)
    const sanitizedOutput = SecretRedactor.redactObject(rawOutput);

    // 9. Output Verification via ActionVerificationEngine
    const initialResult: ToolResult = {
      request_id: request.request_id,
      tool_id: tool.tool_id,
      status: 'COMPLETED',
      output: sanitizedOutput,
      warnings: [],
      errors: [],
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      provenance: { agent_id: request.agent_id, tool_id: tool.tool_id, timestamp: startedAt },
    };

    const verification = ActionVerificationEngine.verifyResult(initialResult);
    initialResult.verification = {
      state: verification.state,
      verified: verification.verified,
      summary: verification.summary,
    };

    // 10. Record in Audit Logger & Cache for Idempotency
    this.auditLogger.logEvent({
      request_id: request.request_id,
      task_id: request.task_id,
      agent_id: request.agent_id,
      tool_id: tool.tool_id,
      action: `${tool.name} completed`,
      risk_level: tool.risk_level,
      approval_status: policyResult.decision === 'REQUIRE_APPROVAL' ? 'APPROVED' : 'NOT_REQUIRED',
      execution_status: 'COMPLETED',
      result_summary: verification.summary,
      provenance: initialResult.provenance,
      duration_ms: initialResult.duration_ms,
    });

    this.idempotencyKeys.set(idempotencyKey, initialResult);

    const record: ToolExecutionRecord = {
      execution_id: `exec-tool-${Date.now()}`,
      request_id: request.request_id,
      tool_id: tool.tool_id,
      agent_id: request.agent_id,
      task_id: request.task_id,
      status: 'COMPLETED',
      input: request.input,
      output: sanitizedOutput,
      warnings: [],
      errors: [],
      started_at: startedAt,
      completed_at: initialResult.completed_at,
      duration_ms: initialResult.duration_ms,
      provenance: initialResult.provenance,
      verification: initialResult.verification,
    };
    this.completedExecutions.set(record.execution_id, record);

    return initialResult;
  }

  public cancelExecution(requestId: string): boolean {
    const controller = this.activeExecutions.get(requestId);
    if (controller) {
      controller.abort();
      this.activeExecutions.delete(requestId);
      return true;
    }
    return false;
  }

  public getExecution(executionId: string): ToolExecutionRecord | undefined {
    return this.completedExecutions.get(executionId);
  }

  public listExecutions(): ToolExecutionRecord[] {
    return Array.from(this.completedExecutions.values());
  }

  public getStatusReport() {
    return {
      status: 'READY' as const,
      version: '1.0.0',
      registered_tools_count: this.registry.getRegisteredCount(),
      enabled_tools_count: this.registry.getEnabledCount(),
      tools: this.registry.listInfos(),
      policy_engine: {
        status: 'READY' as const,
        filesystem_enabled: this.policyEngine.filesystem_enabled,
        network_enabled: this.policyEngine.network_enabled,
        browser_enabled: this.policyEngine.browser_enabled,
        external_api_enabled: this.policyEngine.external_api_enabled,
        auto_execute_safe_tasks: this.policyEngine.auto_execute_safe_tasks,
        approval_required_for_high_risk: this.policyEngine.approval_required_for_high_risk,
      },
      execution_engine: {
        status: 'READY' as const,
        default_timeout_seconds: this.defaultTimeoutSeconds,
        max_retries: this.maxRetries,
        active_executions_count: this.activeExecutions.size,
      },
      audit_logger: {
        status: 'READY' as const,
        total_events: this.auditLogger.getTotalEventsCount(),
      },
      filesystem_access: (this.policyEngine.filesystem_enabled ? 'AVAILABLE' : 'BLOCKED') as 'AVAILABLE' | 'BLOCKED',
      network_access: (this.policyEngine.network_enabled ? 'AVAILABLE' : 'BLOCKED') as 'AVAILABLE' | 'BLOCKED',
    };
  }

  private runWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null;
      let settled = false;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
      };

      if (signal?.aborted) {
        return reject(new Error('Operation cancelled by user.'));
      }

      const onAbort = () => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error('Operation cancelled by user.'));
        }
      };

      signal?.addEventListener('abort', onAbort, { once: true });

      timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          signal?.removeEventListener('abort', onAbort);
          reject(new Error(`Tool execution timed out after ${timeoutMs / 1000}s.`));
        }
      }, timeoutMs);

      fn()
        .then((res) => {
          if (!settled) {
            settled = true;
            cleanup();
            signal?.removeEventListener('abort', onAbort);
            resolve(res);
          }
        })
        .catch((err) => {
          if (!settled) {
            settled = true;
            cleanup();
            signal?.removeEventListener('abort', onAbort);
            reject(err);
          }
        });
    });
  }
}
