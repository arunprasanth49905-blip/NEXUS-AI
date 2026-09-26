import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Play,
  XCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Bot,
  Layers,
  Ban,
  Check,
  X,
  FileCheck2,
} from 'lucide-react';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';
import type {
  OrchestrationTask,
  TaskPlan,
  PlanStepStatus,
  OrchestrationResult,
} from '../../types/agent';
import './PlanExecutionCard.css';

export interface PlanExecutionCardProps {
  task: OrchestrationTask;
  plan: TaskPlan;
  result?: OrchestrationResult | null;
  isRunning?: boolean;
  onExecutePlan: (taskId: string) => Promise<void>;
  onCancelTask: (taskId: string) => Promise<void>;
  onApproveAction: (approvalId: string) => Promise<void>;
  onRejectAction: (approvalId: string) => Promise<void>;
}

export const PlanExecutionCard: React.FC<PlanExecutionCardProps> = ({
  task,
  plan,
  result,
  isRunning = false,
  onExecutePlan,
  onCancelTask,
  onApproveAction,
  onRejectAction,
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const getStepStatusIcon = (status: PlanStepStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 size={16} className="text-emerald" />;
      case 'RUNNING':
        return <span className="nexus-step-dot nexus-step-running animate-pulse" />;
      case 'WAITING':
        return <AlertTriangle size={15} className="text-amber animate-pulse" />;
      case 'FAILED':
        return <XCircle size={16} className="text-rose" />;
      case 'SKIPPED':
        return <span className="nexus-step-skipped-dash">-</span>;
      case 'CANCELLED':
        return <Ban size={15} className="text-secondary" />;
      case 'READY':
      case 'PENDING':
      default:
        return <span className="nexus-step-dot nexus-step-pending" />;
    }
  };

  const pendingApprovals = result?.approvals_pending?.length
    ? result.approvals_pending
    : plan.approval_requirements.filter((a) => a.status === 'PENDING');

  const handleRun = async () => {
    setIsActionLoading(true);
    try {
      await onExecutePlan(task.task_id);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsActionLoading(true);
    try {
      await onCancelTask(task.task_id);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApprove = async (approvalId: string) => {
    setIsActionLoading(true);
    try {
      await onApproveAction(approvalId);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async (approvalId: string) => {
    setIsActionLoading(true);
    try {
      await onRejectAction(approvalId);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="nexus-plan-card animate-fade-in" role="region" aria-label="Task Plan and Execution">
      {/* 1. UNDERSTANDING REQUEST */}
      <div className="nexus-plan-section-header">
        <div className="nexus-plan-header-badge">
          <Layers size={13} className="text-cyan" />
          <span>UNDERSTANDING REQUEST</span>
        </div>
        <div className="nexus-plan-badges">
          <StatusBadge
            status={
              task.complexity === 'COMPLEX'
                ? 'limited'
                : task.complexity === 'MODERATE'
                ? 'processing'
                : 'ready'
            }
            label={task.complexity}
          />
          <StatusBadge
            status={
              task.status === 'COMPLETED'
                ? 'ready'
                : task.status === 'RUNNING'
                ? 'processing'
                : task.status === 'WAITING_FOR_APPROVAL'
                ? 'limited'
                : task.status === 'FAILED'
                ? 'error'
                : 'offline'
            }
            label={task.status}
          />
        </div>
      </div>

      <div className="nexus-plan-user-request">
        <p className="nexus-plan-request-text">"{task.user_request}"</p>
      </div>

      {/* 2. PLAN STEPS LIST */}
      <div className="nexus-plan-steps-container">
        <div className="nexus-plan-steps-header">
          <span className="nexus-plan-title">PLAN</span>
          <span className="nexus-plan-count">{plan.steps.length} {plan.steps.length === 1 ? 'step' : 'steps'}</span>
        </div>

        <div className="nexus-plan-steps-list">
          {plan.steps.map((step, index) => {
            const stepNum = index + 1;
            const currentStepResult = result?.step_results?.[step.step_id];
            const currentStatus = (currentStepResult?.status as PlanStepStatus) || step.status;

            return (
              <div
                key={step.step_id}
                className={`nexus-plan-step-row nexus-step-status-${currentStatus.toLowerCase()}`}
              >
                <div className="nexus-step-indicator">
                  {getStepStatusIcon(currentStatus)}
                </div>

                <div className="nexus-step-content">
                  <div className="nexus-step-title-row">
                    <span className="nexus-step-number">Step {stepNum} — </span>
                    <span className="nexus-step-title">{step.title}</span>
                  </div>

                  <div className="nexus-step-agent-row">
                    <Bot size={12} className="text-secondary" />
                    <span className="nexus-step-agent-name">{step.agent_id}</span>
                    {step.dependencies.length > 0 && (
                      <span className="nexus-step-dep-tag">
                        Depends on: {step.dependencies.join(', ')}
                      </span>
                    )}
                    {step.approval_required && (
                      <span className="nexus-step-risk-tag">
                        Approval Required ({step.risk_level})
                      </span>
                    )}
                  </div>

                  {/* Step Error or Output Preview */}
                  {Boolean(step.error) && (
                    <div className="nexus-step-error-msg">
                      <span>{String(step.error)}</span>
                    </div>
                  )}

                  {isDetailsOpen && typeof currentStepResult?.output?.text === 'string' && (
                    <div className="nexus-step-output-box">
                      <p className="nexus-step-output-text">
                        {currentStepResult.output.text.slice(0, 300)}
                        {currentStepResult.output.text.length > 300 ? '...' : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. APPROVAL GATE MODAL / PROMPT (Section 32) */}
      {pendingApprovals.length > 0 && (
        <div className="nexus-approval-gate-box" role="alert">
          <div className="nexus-approval-gate-header">
            <ShieldAlert size={18} className="text-amber flex-shrink-0" />
            <span className="nexus-approval-title">ACTION REQUIRES APPROVAL</span>
          </div>

          {pendingApprovals.map((approval) => (
            <div key={approval.approval_id} className="nexus-approval-item">
              <div className="nexus-approval-meta-grid">
                <div className="nexus-approval-field">
                  <span className="nexus-approval-label">Action:</span>
                  <span className="nexus-approval-val font-medium">{approval.action}</span>
                </div>
                <div className="nexus-approval-field">
                  <span className="nexus-approval-label">Reason:</span>
                  <span className="nexus-approval-val">{approval.reason}</span>
                </div>
                <div className="nexus-approval-field">
                  <span className="nexus-approval-label">Risk:</span>
                  <span className="nexus-approval-val nexus-risk-badge font-mono">{approval.risk_level}</span>
                </div>
              </div>

              <div className="nexus-approval-actions">
                <Button
                  size="sm"
                  variant="primary"
                  isLoading={isActionLoading}
                  leftIcon={<Check size={14} />}
                  onClick={() => handleApprove(approval.approval_id)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={isActionLoading}
                  leftIcon={<X size={14} />}
                  onClick={() => handleReject(approval.approval_id)}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. VERIFICATION REPORT (Section 22) */}
      {result?.verification && (
        <div className="nexus-verification-summary">
          <div className="nexus-verification-header">
            <FileCheck2 size={15} className="text-cyan" />
            <span className="nexus-verification-title">VERIFICATION</span>
            <StatusBadge
              status={
                result.verification.state === 'VALID'
                  ? 'ready'
                  : result.verification.state === 'NEEDS_REVIEW'
                  ? 'limited'
                  : result.verification.state === 'PARTIAL'
                  ? 'processing'
                  : 'error'
              }
              label={result.verification.state}
            />
          </div>
          <p className="nexus-verification-desc">{result.verification.summary}</p>
        </div>
      )}

      {/* 5. PLAN ACTIONS BAR */}
      <div className="nexus-plan-controls">
        <div className="nexus-plan-left-actions">
          <Button
            size="sm"
            variant="ghost"
            rightIcon={isDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          >
            {isDetailsOpen ? 'Hide Details' : 'Review Plan'}
          </Button>
        </div>

        <div className="nexus-plan-right-actions">
          {(task.status === 'CREATED' || task.status === 'PLANNED' || task.status === 'PAUSED') && (
            <Button
              size="sm"
              variant="primary"
              isLoading={isRunning || isActionLoading}
              leftIcon={<Play size={14} />}
              onClick={handleRun}
            >
              Run Plan
            </Button>
          )}

          {task.status === 'RUNNING' && (
            <Button
              size="sm"
              variant="danger"
              isLoading={isActionLoading}
              leftIcon={<Ban size={14} />}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
