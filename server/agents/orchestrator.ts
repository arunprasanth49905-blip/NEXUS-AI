/**
 * NEXUS-AI Phase 5: Central Agent Orchestrator
 * Coordinates planning, capability-based agent selection, DAG execution, verification, and human approvals.
 */

import { AgentRegistry } from './registry.js';
import { registerDefaultAgents } from './implementations/index.js';
import { createOrchestrationTask } from './task.js';
import { TaskDecomposer } from './decomposer.js';
import { AgentSelector } from './selector.js';
import { DependencyGraph } from './graph.js';
import { ExecutionEngine } from './executor.js';
import { ResultAggregator } from './result.js';
import { VerificationEngine } from './verification.js';
import { ApprovalGate } from './approval.js';
import { ContextScoper } from './scoping.js';
import { BrainRouter } from './router.js';
import { ToolExecutionEngine } from '../tools/executor.js';
import type { ToolRequest } from '../tools/types.js';
import type { RuntimeManager } from '../manager.js';
import type {
  OrchestrationTask,
  TaskPlan,
  OrchestrationResult,
  OrchestratorStatusReport,
  ApprovalRequirement,
} from './types.js';

export interface OrchestratorOptions {
  runtimeManager?: RuntimeManager;
  defaultTimeoutMs?: number;
  maxRetries?: number;
  parallelExecution?: boolean;
}

export class AgentOrchestrator {
  private static instance: AgentOrchestrator | null = null;

  private registry: AgentRegistry;
  private selector: AgentSelector;
  private executor: ExecutionEngine;
  private approvalGate: ApprovalGate;
  private scoper: ContextScoper;
  private router: BrainRouter;

  private tasks: Map<string, OrchestrationTask> = new Map();
  private plans: Map<string, TaskPlan> = new Map();
  private results: Map<string, OrchestrationResult> = new Map();

  constructor(options?: OrchestratorOptions) {
    this.registry = AgentRegistry.getInstance();
    registerDefaultAgents(this.registry, options?.runtimeManager);

    this.selector = new AgentSelector(this.registry);
    this.executor = new ExecutionEngine(
      this.registry,
      options?.maxRetries ?? 2,
      options?.defaultTimeoutMs ?? 60000
    );
    this.approvalGate = ApprovalGate.getInstance();
    this.scoper = new ContextScoper();
    this.router = new BrainRouter(this.registry, options?.runtimeManager);
  }

  public static getInstance(options?: OrchestratorOptions): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator(options);
    }
    return AgentOrchestrator.instance;
  }

  public static resetInstance(): void {
    AgentOrchestrator.instance = null;
    AgentRegistry.resetInstance();
    ApprovalGate.resetInstance();
  }

  public getRegistry(): AgentRegistry {
    return this.registry;
  }

  public getSelector(): AgentSelector {
    return this.selector;
  }

  public getApprovalGate(): ApprovalGate {
    return this.approvalGate;
  }

  public getExecutionEngine(): ExecutionEngine {
    return this.executor;
  }

  public getRouter(): BrainRouter {
    return this.router;
  }

  /**
   * 1. Create a new task and generate its plan
   */
  public createTaskAndPlan(params: {
    user_request: string;
    session_id?: string;
    context?: Record<string, unknown>;
    task_id?: string;
  }): { task: OrchestrationTask; plan: TaskPlan } {
    const task = createOrchestrationTask(params);
    const plan = TaskDecomposer.decompose(task);
    task.plan_id = plan.plan_id;
    task.plan = plan;
    task.status = 'PLANNED';

    this.tasks.set(task.task_id, task);
    this.plans.set(plan.plan_id, plan);

    return { task, plan };
  }

  public getTask(taskId: string): OrchestrationTask | undefined {
    return this.tasks.get(taskId);
  }

  public listTasks(): OrchestrationTask[] {
    return Array.from(this.tasks.values());
  }

  public getPlan(planId: string): TaskPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * Cancel task execution safely
   */
  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = 'CANCELLED';
    if (task.plan) {
      task.plan.status = 'CANCELLED';
      for (const step of task.plan.steps) {
        if (step.status === 'PENDING' || step.status === 'READY' || step.status === 'RUNNING') {
          step.status = 'CANCELLED';
        }
      }
    }

    this.executor.cancelTask(taskId);
    return true;
  }

  /**
   * Execute task plan through DAG dependency graph
   */
  public async executePlan(taskId: string): Promise<OrchestrationResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task '${taskId}' not found.`);
    }

    if (!task.plan) {
      throw new Error(`Task '${taskId}' has no associated plan.`);
    }

    // Check if task was already cancelled
    if (task.status === 'CANCELLED') {
      const result: OrchestrationResult = {
        task_id: taskId,
        plan_id: task.plan?.plan_id,
        status: 'CANCELLED',
        objective: task.user_request,
        complexity: task.complexity,
        plan: task.plan,
        step_results: {},
        final_output: 'Task execution was cancelled by user.',
        verification: {
          state: 'FAILED',
          completed_steps: 0,
          total_steps: task.plan?.steps.length || 0,
          missing_outputs: task.plan?.steps.map((s) => s.step_id) || [],
          conflicts: [],
          failures: ['Task was cancelled before execution.'],
          summary: 'Task was cancelled by user.',
          timestamp: new Date().toISOString(),
        },
        approvals_pending: [],
        created_at: task.created_at,
        completed_at: new Date().toISOString(),
      };
      this.results.set(taskId, result);
      return result;
    }

    // Accidental duplicate execution check (Scenario 12)
    const canExecute = this.executor.checkAndMarkTaskExecution(taskId);
    if (!canExecute) {
      const existing = this.results.get(taskId);
      if (existing) return existing;
      throw new Error(`Task '${taskId}' is already running or has been executed.`);
    }

    const plan = task.plan;
    task.status = 'RUNNING';
    plan.status = 'RUNNING';

    this.executor.registerTask(taskId);

    const graph = new DependencyGraph(plan.steps);
    if (graph.hasCycle()) {
      task.status = 'FAILED';
      plan.status = 'FAILED';
      throw new Error(`Circular dependency detected in plan '${plan.plan_id}'.`);
    }

    const aggregator = new ResultAggregator();
    const completedStepIds = new Set<string>();
    const failedStepIds = new Set<string>();
    const pendingApprovals: ApprovalRequirement[] = [];

    // Main DAG execution loop
    let hasWork = true;
    while (hasWork) {
      if (this.executor.isTaskCancelled(taskId)) {
        task.status = 'CANCELLED';
        plan.status = 'CANCELLED';
        break;
      }

      const readySteps = graph.getReadySteps(completedStepIds);
      if (readySteps.length === 0) {
        hasWork = false;
        break;
      }

      for (const step of readySteps) {
        if (this.executor.isTaskCancelled(taskId)) {
          step.status = 'CANCELLED';
          continue;
        }

        // 1. Approval Gate check
        if (this.approvalGate.isApprovalRequired(step, taskId)) {
          step.status = 'WAITING';
          task.status = 'WAITING_FOR_APPROVAL';
          const approval = this.approvalGate.requestApproval({
            task_id: taskId,
            step_id: step.step_id,
            action: step.title,
            reason: `Action requires user consent before execution. (Risk level: ${step.risk_level})`,
            risk_level: step.risk_level,
          });
          pendingApprovals.push(approval);

          // We do not execute this step until human approval is granted
          continue;
        }

        // 2. Prepare Context Scoping for Agent
        const agent = this.registry.get(step.agent_id);
        if (!agent) {
          step.status = 'FAILED';
          step.error = `Agent '${step.agent_id}' not found.`;
          failedStepIds.add(step.step_id);
          aggregator.recordResult({
            execution_id: `exec-${Date.now()}-${step.step_id}`,
            agent_id: step.agent_id,
            task_id: taskId,
            step_id: step.step_id,
            status: 'FAILED',
            provenance: { agent_id: step.agent_id, timestamp: new Date().toISOString() },
            warnings: [],
            errors: [`Agent '${step.agent_id}' not found.`],
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          });
          const downstreamSteps = graph.getDependentStepsOfFailed(step.step_id);
          for (const ds of downstreamSteps) {
            ds.status = 'SKIPPED';
            ds.error = `Skipped because prerequisite step '${step.step_id}' failed.`;
          }
          continue;
        }

        step.status = 'RUNNING';
        step.started_at = new Date().toISOString();

        // Pass outputs from direct prerequisites into dependent step
        const prereqIds = graph.getPrerequisites(step.step_id);
        const depOutputs: Record<string, unknown> = {};
        for (const pId of prereqIds) {
          const rec = aggregator.getResult(pId);
          if (rec?.output) {
            depOutputs[pId] = rec.output.text || rec.output;
          }
        }

        const scopedContext = await this.scoper.scopeForAgent(agent, task.context, task.user_request);

        const toolEngine = ToolExecutionEngine.getInstance();
        const requestTool = async (toolId: string, capability: string, input: Record<string, unknown>) => {
          const req: ToolRequest = {
            request_id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            task_id: taskId,
            execution_id: `exec-${taskId}-${step.step_id}`,
            agent_id: agent.agent_id,
            tool_id: toolId,
            capability,
            input,
            requested_at: new Date().toISOString(),
          };
          const res = await toolEngine.executeToolRequest(req);
          return res.output;
        };

        // 3. Controlled Execution via ExecutionEngine
        const record = await this.executor.executeStep(
          step,
          {
            task_id: taskId,
            session_id: task.session_id,
            input_text: step.description || task.user_request,
            scoped_context: scopedContext.scoped_payload,
            dependency_outputs: depOutputs,
            request_tool: requestTool,
          }
        );

        aggregator.recordResult(record);

        if (record.status === 'COMPLETED') {
          step.status = 'COMPLETED';
          step.output = record.output;
          step.completed_at = record.completed_at;
          completedStepIds.add(step.step_id);
        } else {
          step.status = record.status === 'TIMED_OUT' ? 'FAILED' : (record.status as any);
          step.error = record.errors.join('; ');
          step.completed_at = record.completed_at;
          failedStepIds.add(step.step_id);

          // Mark downstream dependent steps as SKIPPED
          const downstreamSteps = graph.getDependentStepsOfFailed(step.step_id);
          for (const ds of downstreamSteps) {
            ds.status = 'SKIPPED';
            ds.error = `Skipped because prerequisite step '${step.step_id}' failed.`;
          }
        }
      }
    }

    // 4. Verification & Result Synthesis
    const verification = VerificationEngine.verify(plan, aggregator.getAllResults());
    const finalOutput = aggregator.synthesizeFinalOutput(task.user_request);

    let finalTaskStatus: OrchestrationResult['status'] = 'COMPLETED';
    if (pendingApprovals.length > 0) {
      finalTaskStatus = 'WAITING_FOR_APPROVAL';
    } else if (task.status === 'CANCELLED') {
      finalTaskStatus = 'CANCELLED';
    } else if (verification.state === 'FAILED') {
      finalTaskStatus = 'FAILED';
    } else if (verification.state === 'PARTIAL' || verification.state === 'NEEDS_REVIEW') {
      finalTaskStatus = 'COMPLETED'; // Completed with partial/review status
    }

    task.status = finalTaskStatus;
    plan.status = finalTaskStatus === 'COMPLETED' ? 'COMPLETED' : plan.status;

    const result: OrchestrationResult = {
      task_id: taskId,
      plan_id: plan.plan_id,
      status: finalTaskStatus,
      objective: task.user_request,
      complexity: task.complexity,
      plan,
      step_results: aggregator.getAllResults(),
      final_output: finalOutput,
      verification,
      approvals_pending: pendingApprovals,
      created_at: task.created_at,
      completed_at: new Date().toISOString(),
    };

    this.results.set(taskId, result);
    return result;
  }

  /**
   * Resume plan execution after human approval
   */
  public async resumeAfterApproval(taskId: string, approvalId: string): Promise<OrchestrationResult> {
    const approval = this.approvalGate.getApproval(approvalId);
    if (!approval || approval.status !== 'APPROVED') {
      throw new Error(`Approval '${approvalId}' has not been approved.`);
    }

    const task = this.tasks.get(taskId);
    if (!task || !task.plan) {
      throw new Error(`Task '${taskId}' not found.`);
    }

    // Mark the step ready now that approval is granted
    const step = task.plan.steps.find((s) => s.step_id === approval.step_id);
    if (step) {
      step.approval_required = false;
      step.status = 'READY';
    }

    // Reset execution idempotency tracking and task state so plan can resume
    task.status = 'PLANNED';
    this.executor.clearTaskExecution(taskId);

    // Re-execute plan
    return this.executePlan(taskId);
  }

  /**
   * Diagnostic status report for Advanced Diagnostics
   */
  public getStatusReport(): OrchestratorStatusReport {
    const agents = this.registry.list();
    return {
      orchestrator_status: 'READY',
      agents_registered_count: agents.length,
      agents,
      planner_mode: 'Deterministic Task Decomposer (Phase 5)',
      selector_mode: 'Capability-Based Matching (Dynamic)',
      execution_engine: {
        status: 'READY',
        active_executions: this.executor.getActiveCount(),
        max_retries: 2,
        timeout_seconds: 60,
        parallel_execution: true,
      },
      verification_engine: {
        status: 'ACTIVE',
        conflict_detection_enabled: true,
      },
      approval_gate: {
        status: 'ACTIVE',
        pending_approvals_count: this.approvalGate.listPending().length,
        enforce_approvals: true,
      },
      context_scoping: {
        active: true,
        privacy_filtering: true,
      },
      memory_integration: {
        active: true,
        policy_enforced: true,
      },
      runtime_integration: {
        active: true,
        active_provider: 'Hardware-Aware Dynamic Routing',
      },
    };
  }
}
