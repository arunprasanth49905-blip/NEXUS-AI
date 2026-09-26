/**
 * NEXUS-AI Phase 5: Plan & PlanStep Models
 */

import type {
  TaskPlan,
  PlanStep,
  ApprovalRequirement,
  AgentRiskLevel,
} from './types.js';

export function createPlanStep(params: {
  step_id: string;
  title: string;
  description: string;
  agent_id: string;
  required_capabilities: string[];
  dependencies?: string[];
  risk_level?: AgentRiskLevel;
  approval_required?: boolean;
  input_context?: Record<string, unknown>;
}): PlanStep {
  return {
    step_id: params.step_id,
    title: params.title,
    description: params.description,
    agent_id: params.agent_id,
    required_capabilities: [...params.required_capabilities],
    dependencies: params.dependencies ? [...params.dependencies] : [],
    status: 'PENDING',
    risk_level: params.risk_level || 'READ_ONLY',
    approval_required: params.approval_required || (params.risk_level === 'HIGH_RISK' || params.risk_level === 'EXTERNAL_SIDE_EFFECT'),
    input_context: params.input_context || {},
  };
}

export function createTaskPlan(params: {
  plan_id?: string;
  task_id: string;
  objective: string;
  steps: PlanStep[];
}): TaskPlan {
  const now = new Date().toISOString();
  const planId = params.plan_id || `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const dependencies: Record<string, string[]> = {};
  const requiredAgents = new Set<string>();
  const approvalRequirements: ApprovalRequirement[] = [];

  for (const step of params.steps) {
    dependencies[step.step_id] = [...step.dependencies];
    requiredAgents.add(step.agent_id);

    if (step.approval_required) {
      approvalRequirements.push({
        approval_id: `appr-${Date.now()}-${step.step_id}`,
        task_id: params.task_id,
        step_id: step.step_id,
        action: step.title,
        reason: `Step involves elevated risk category (${step.risk_level}). Explicit human approval required before execution.`,
        risk_level: step.risk_level,
        status: 'PENDING',
        requested_at: now,
      });
    }
  }

  return {
    plan_id: planId,
    task_id: params.task_id,
    objective: params.objective,
    steps: params.steps,
    dependencies,
    required_agents: Array.from(requiredAgents),
    approval_requirements: approvalRequirements,
    status: 'READY',
    created_at: now,
    updated_at: now,
  };
}
