/**
 * NEXUS-AI Phase 6: Action Audit Logger
 * Maintains auditable records of all tool actions, parameters, approvals, and outcomes without logging sensitive secrets.
 */

import type { ActionAuditEvent } from './types.js';
import { SecretRedactor } from './redaction.js';

export class ActionAuditLogger {
  private static instance: ActionAuditLogger | null = null;
  private auditEvents: ActionAuditEvent[] = [];
  private maxStoredEvents: number = 500;

  public static getInstance(): ActionAuditLogger {
    if (!ActionAuditLogger.instance) {
      ActionAuditLogger.instance = new ActionAuditLogger();
    }
    return ActionAuditLogger.instance;
  }

  public static resetInstance(): void {
    ActionAuditLogger.instance = null;
  }

  public logEvent(event: Omit<ActionAuditEvent, 'audit_id' | 'timestamp'>): ActionAuditEvent {
    const fullEvent: ActionAuditEvent = {
      audit_id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      request_id: event.request_id,
      execution_id: event.execution_id,
      task_id: event.task_id,
      agent_id: event.agent_id,
      tool_id: event.tool_id,
      action: SecretRedactor.redactText(event.action),
      risk_level: event.risk_level,
      approval_status: event.approval_status,
      execution_status: event.execution_status,
      result_summary: SecretRedactor.redactText(event.result_summary),
      provenance: SecretRedactor.redactObject(event.provenance),
      duration_ms: event.duration_ms,
      error: event.error ? SecretRedactor.redactText(event.error) : undefined,
      affected_resources: event.affected_resources?.map((r) => SecretRedactor.redactText(r)),
    };

    this.auditEvents.unshift(fullEvent);
    if (this.auditEvents.length > this.maxStoredEvents) {
      this.auditEvents.pop();
    }

    return fullEvent;
  }

  public listEvents(limit: number = 50): ActionAuditEvent[] {
    return this.auditEvents.slice(0, limit);
  }

  public getEvent(auditId: string): ActionAuditEvent | undefined {
    return this.auditEvents.find((e) => e.audit_id === auditId);
  }

  public getByTaskId(taskId: string): ActionAuditEvent[] {
    return this.auditEvents.filter((e) => e.task_id === taskId);
  }

  public getTotalEventsCount(): number {
    return this.auditEvents.length;
  }

  public clear(): void {
    this.auditEvents = [];
  }
}
