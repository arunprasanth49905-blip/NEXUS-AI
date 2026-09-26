/**
 * NEXUS-AI Phase 6: Tool & Action Engine Types
 */

export type ToolCategory =
  | 'READ'
  | 'FILE'
  | 'DOCUMENT'
  | 'TEXT'
  | 'SYSTEM'
  | 'NETWORK'
  | 'BROWSER'
  | 'PRODUCTIVITY'
  | 'ANALYSIS'
  | 'VISION'
  | 'COMMUNICATION'
  | 'EXTERNAL_API';

export type ActionRiskLevel =
  | 'READ_ONLY'
  | 'LOW_RISK'
  | 'HIGH_RISK'
  | 'EXTERNAL_SIDE_EFFECT'
  | 'DESTRUCTIVE';

export type ToolExecutionStatus =
  | 'PENDING'
  | 'WAITING_FOR_APPROVAL'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'BLOCKED';

import type { VerificationState } from './agent.js';

export type PolicyDecisionType = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL';

export interface ToolCapability {
  capability_id: string;
  name: string;
  category: ToolCategory;
  description: string;
  risk_level: ActionRiskLevel;
}

export interface ToolFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: unknown;
  enum?: string[];
}

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, ToolFieldSchema>;
  required?: string[];
}

export interface ToolOutputSchema {
  type: 'object';
  properties: Record<string, ToolFieldSchema>;
}

export interface ToolInfo {
  tool_id: string;
  name: string;
  description: string;
  version: string;
  category: ToolCategory;
  capabilities: string[];
  risk_level: ActionRiskLevel;
  approval_required: boolean;
  enabled: boolean;
  timeout_seconds: number;
  input_schema: ToolInputSchema;
  output_schema: ToolOutputSchema;
  metadata?: Record<string, unknown>;
}

export interface ToolRequest {
  request_id: string;
  task_id?: string;
  execution_id?: string;
  agent_id: string;
  tool_id: string;
  capability: string;
  input: Record<string, unknown>;
  requested_at: string;
  context_scope?: Record<string, unknown>;
  privacy_level?: string;
  risk_level?: ActionRiskLevel;
  approval_id?: string;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolResult {
  request_id: string;
  tool_id: string;
  status: ToolExecutionStatus;
  output: Record<string, unknown>;
  artifacts?: Array<{ name: string; type: string; uri?: string; data?: unknown }>;
  warnings: string[];
  errors: string[];
  started_at: string;
  completed_at: string;
  duration_ms: number;
  provenance: {
    agent_id?: string;
    tool_id: string;
    timestamp: string;
    runtime_provider?: string;
  };
  verification?: {
    state: VerificationState;
    verified: boolean;
    summary: string;
  };
  metadata?: Record<string, unknown>;
}

export interface ActionAuditEvent {
  audit_id: string;
  timestamp: string;
  request_id: string;
  execution_id?: string;
  task_id?: string;
  agent_id: string;
  tool_id: string;
  action: string;
  risk_level: ActionRiskLevel;
  approval_status: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  execution_status: ToolExecutionStatus;
  result_summary: string;
  provenance: Record<string, unknown>;
  duration_ms: number;
  error?: string;
  affected_resources?: string[];
}

export interface PolicyEvaluationResult {
  decision: PolicyDecisionType;
  reason: string;
  risk_level: ActionRiskLevel;
  requires_approval: boolean;
  rules_triggered: string[];
}

export interface ToolEngineStatusReport {
  status: 'READY' | 'LIMITED' | 'ERROR';
  version: string;
  registered_tools_count: number;
  enabled_tools_count: number;
  tools: ToolInfo[];
  policy_engine: {
    status: 'READY' | 'ERROR';
    filesystem_enabled: boolean;
    network_enabled: boolean;
    browser_enabled: boolean;
    external_api_enabled: boolean;
    auto_execute_safe_tasks: boolean;
    approval_required_for_high_risk: boolean;
  };
  execution_engine: {
    status: 'READY' | 'ERROR';
    default_timeout_seconds: number;
    max_retries: number;
    active_executions_count: number;
  };
  audit_logger: {
    status: 'READY' | 'LIMITED' | 'ERROR';
    total_events: number;
  };
  filesystem_access: 'AVAILABLE' | 'LIMITED' | 'BLOCKED';
  network_access: 'AVAILABLE' | 'LIMITED' | 'BLOCKED';
}
