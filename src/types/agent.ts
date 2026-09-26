/**
 * NEXUS-AI Phase 5: Agent Orchestration & Intelligent Task Planning Types
 */

export type AgentRiskLevel = 'READ_ONLY' | 'LOW_RISK' | 'HIGH_RISK' | 'EXTERNAL_SIDE_EFFECT';

export type AgentAvailability = 'AVAILABLE' | 'UNAVAILABLE' | 'DEGRADED';

export type TaskComplexity = 'SIMPLE' | 'MODERATE' | 'COMPLEX';

export type OrchestrationTaskStatus =
  | 'CREATED'
  | 'ANALYZING'
  | 'PLANNED'
  | 'WAITING_FOR_APPROVAL'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type PlanStepStatus =
  | 'PENDING'
  | 'READY'
  | 'RUNNING'
  | 'WAITING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED'
  | 'CANCELLED';

export type VerificationState = 'VALID' | 'PARTIAL' | 'FAILED' | 'NEEDS_REVIEW';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AgentInfo {
  agent_id: string;
  name: string;
  description: string;
  capabilities: string[];
  supported_task_types: string[];
  required_context_types: string[];
  risk_level: AgentRiskLevel;
  availability: AgentAvailability;
  metadata?: Record<string, unknown>;
}

export interface PlanStep {
  step_id: string;
  title: string;
  description: string;
  agent_id: string;
  required_capabilities: string[];
  dependencies: string[];
  status: PlanStepStatus;
  input_context?: Record<string, unknown>;
  output?: Record<string, unknown>;
  risk_level: AgentRiskLevel;
  approval_required: boolean;
  execution_id?: string;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

export interface ApprovalRequirement {
  approval_id: string;
  task_id: string;
  step_id: string;
  action: string;
  reason: string;
  risk_level: AgentRiskLevel;
  status: ApprovalStatus;
  requested_at: string;
  resolved_at?: string;
  decision?: 'APPROVED' | 'REJECTED';
}

export interface TaskPlan {
  plan_id: string;
  task_id: string;
  objective: string;
  steps: PlanStep[];
  dependencies: Record<string, string[]>;
  required_agents: string[];
  approval_requirements: ApprovalRequirement[];
  status: 'PENDING' | 'READY' | 'RUNNING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface OrchestrationTask {
  task_id: string;
  session_id: string;
  request_id: string;
  user_request: string;
  task_type: string;
  complexity: TaskComplexity;
  status: OrchestrationTaskStatus;
  context: Record<string, unknown>;
  required_capabilities: string[];
  plan_id?: string;
  plan?: TaskPlan;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface AgentExecutionRecord {
  execution_id: string;
  agent_id: string;
  task_id: string;
  step_id?: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'CANCELLED';
  output?: Record<string, unknown>;
  artifacts?: Array<{ name: string; type: string; uri?: string; data?: unknown }>;
  provenance: {
    agent_id: string;
    runtime_provider?: string;
    model_id?: string;
    timestamp: string;
  };
  warnings: string[];
  errors: string[];
  started_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
}

export interface PlanConflict {
  conflict_id: string;
  source_agents: string[];
  affected_step_id: string;
  description: string;
  conflicting_data: Record<string, unknown>;
}

export interface VerificationReport {
  state: VerificationState;
  completed_steps: number;
  total_steps: number;
  missing_outputs: string[];
  conflicts: PlanConflict[];
  failures: string[];
  summary: string;
  timestamp: string;
}

export interface OrchestrationResult {
  task_id: string;
  plan_id?: string;
  status: OrchestrationTaskStatus;
  objective: string;
  complexity: TaskComplexity;
  plan?: TaskPlan;
  step_results: Record<string, AgentExecutionRecord>;
  final_output: string;
  verification: VerificationReport;
  approvals_pending: ApprovalRequirement[];
  created_at: string;
  completed_at?: string;
}

export interface OrchestratorStatusReport {
  orchestrator_status: 'READY' | 'DEGRADED' | 'OFFLINE';
  agents_registered_count: number;
  agents: AgentInfo[];
  planner_mode: string;
  selector_mode: string;
  execution_engine: {
    status: 'READY' | 'RUNNING' | 'LIMITED';
    active_executions: number;
    max_retries: number;
    timeout_seconds: number;
    parallel_execution: boolean;
  };
  verification_engine: {
    status: 'ACTIVE';
    conflict_detection_enabled: boolean;
  };
  approval_gate: {
    status: 'ACTIVE';
    pending_approvals_count: number;
    enforce_approvals: boolean;
  };
  context_scoping: {
    active: boolean;
    privacy_filtering: boolean;
  };
  memory_integration: {
    active: boolean;
    policy_enforced: boolean;
  };
  runtime_integration: {
    active: boolean;
    active_provider: string;
  };
}
