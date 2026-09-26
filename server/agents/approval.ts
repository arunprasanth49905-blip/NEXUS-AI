/**
 * NEXUS-AI Phase 5: Human Approval Gate
 * Manages risk assessment, approval requirements, and user decisions.
 */

import type {
  ApprovalRequirement,
  AgentRiskLevel,
  PlanStep,
} from './types.js';

export class ApprovalGate {
  private static instance: ApprovalGate | null = null;
  private approvals: Map<string, ApprovalRequirement> = new Map();

  public static getInstance(): ApprovalGate {
    if (!ApprovalGate.instance) {
      ApprovalGate.instance = new ApprovalGate();
    }
    return ApprovalGate.instance;
  }

  public static resetInstance(): void {
    ApprovalGate.instance = null;
  }

  /**
   * Check if a step requires human approval before proceeding.
   * If approval has already been granted for this step, returns false.
   */
  public isApprovalRequired(step: PlanStep, taskId?: string): boolean {
    if (taskId) {
      const existing = Array.from(this.approvals.values()).find(
        (a) => a.task_id === taskId && a.step_id === step.step_id
      );
      if (existing?.status === 'APPROVED') {
        return false;
      }
    }
    if (step.approval_required) return true;
    return step.risk_level === 'HIGH_RISK' || step.risk_level === 'EXTERNAL_SIDE_EFFECT';
  }

  public requestApproval(params: {
    task_id: string;
    step_id: string;
    action: string;
    reason: string;
    risk_level: AgentRiskLevel;
  }): ApprovalRequirement {
    const approvalId = `appr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const requirement: ApprovalRequirement = {
      approval_id: approvalId,
      task_id: params.task_id,
      step_id: params.step_id,
      action: params.action,
      reason: params.reason,
      risk_level: params.risk_level,
      status: 'PENDING',
      requested_at: new Date().toISOString(),
    };

    this.approvals.set(approvalId, requirement);
    return requirement;
  }

  public getApproval(approvalId: string): ApprovalRequirement | undefined {
    return this.approvals.get(approvalId);
  }

  public getByTaskId(taskId: string): ApprovalRequirement[] {
    return Array.from(this.approvals.values()).filter((a) => a.task_id === taskId);
  }

  public listPending(): ApprovalRequirement[] {
    return Array.from(this.approvals.values()).filter((a) => a.status === 'PENDING');
  }

  public resolve(
    approvalId: string,
    decision: 'APPROVED' | 'REJECTED'
  ): { success: boolean; approval?: ApprovalRequirement; error?: string } {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      return { success: false, error: `Approval '${approvalId}' not found.` };
    }

    if (approval.status !== 'PENDING') {
      return { success: false, error: `Approval '${approvalId}' is already ${approval.status}.` };
    }

    approval.status = decision;
    approval.decision = decision;
    approval.resolved_at = new Date().toISOString();
    return { success: true, approval };
  }

  public clear(): void {
    this.approvals.clear();
  }
}
