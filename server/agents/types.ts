/**
 * Backend Agent types for Phase 5 Agent Architecture
 */

import type {
  AgentRiskLevel,
  AgentAvailability,
  TaskComplexity,
  OrchestrationTaskStatus,
  PlanStepStatus,
  VerificationState,
  ApprovalStatus,
  AgentInfo,
  PlanStep,
  ApprovalRequirement,
  TaskPlan,
  OrchestrationTask,
  AgentExecutionRecord,
  PlanConflict,
  VerificationReport,
  OrchestrationResult,
  OrchestratorStatusReport,
} from '../../src/types/agent.js';

export type {
  AgentRiskLevel,
  AgentAvailability,
  TaskComplexity,
  OrchestrationTaskStatus,
  PlanStepStatus,
  VerificationState,
  ApprovalStatus,
  AgentInfo,
  PlanStep,
  ApprovalRequirement,
  TaskPlan,
  OrchestrationTask,
  AgentExecutionRecord,
  PlanConflict,
  VerificationReport,
  OrchestrationResult,
  OrchestratorStatusReport,
};

export interface AgentExecutionContext {
  task_id: string;
  step_id?: string;
  session_id?: string;
  project_id?: string;
  input_text: string;
  scoped_context: Record<string, unknown>;
  dependency_outputs?: Record<string, unknown>;
  timeout_ms?: number;
  abort_signal?: AbortSignal;
}

export interface AgentExecutionOutput {
  text: string;
  structured_data?: Record<string, unknown>;
  artifacts?: Array<{ name: string; type: string; uri?: string; data?: unknown }>;
  confidence?: number | null; // Truthful: null for heuristic/rule-based
  warnings?: string[];
}
