/**
 * Backend Tool & Action Engine Types
 */

import type { VerificationState } from '../../src/types/agent.js';
import type {
  ToolCategory,
  ActionRiskLevel,
  ToolExecutionStatus,
  PolicyDecisionType,
  ToolCapability,
  ToolFieldSchema,
  ToolInputSchema,
  ToolOutputSchema,
  ToolInfo,
  ToolRequest,
  ToolResult,
  ActionAuditEvent,
  PolicyEvaluationResult,
  ToolEngineStatusReport,
} from '../../src/types/tool.js';

export type {
  ToolCategory,
  ActionRiskLevel,
  ToolExecutionStatus,
  PolicyDecisionType,
  VerificationState,
  ToolCapability,
  ToolFieldSchema,
  ToolInputSchema,
  ToolOutputSchema,
  ToolInfo,
  ToolRequest,
  ToolResult,
  ActionAuditEvent,
  PolicyEvaluationResult,
  ToolEngineStatusReport,
};

export interface ToolExecutionContext {
  request: ToolRequest;
  timeout_ms?: number;
  abort_signal?: AbortSignal;
  session_id?: string;
}

export interface ToolExecutionRecord {
  execution_id: string;
  request_id: string;
  tool_id: string;
  agent_id: string;
  task_id?: string;
  status: ToolExecutionStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  warnings: string[];
  errors: string[];
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
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
}
