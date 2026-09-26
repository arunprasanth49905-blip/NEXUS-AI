/**
 * NEXUS-AI Phase 6: Tool & Action Engine Frontend Client Service
 */

import type {
  ToolInfo,
  ToolResult,
  ToolEngineStatusReport,
  ActionAuditEvent,
} from '../types/tool.js';

export class ToolService {
  private static instance: ToolService | null = null;

  public static getInstance(): ToolService {
    if (!ToolService.instance) {
      ToolService.instance = new ToolService();
    }
    return ToolService.instance;
  }

  public async getTools(): Promise<{ tools: ToolInfo[]; total: number; enabled: number }> {
    const res = await fetch('/api/v1/tools');
    if (!res.ok) throw new Error(`Failed to fetch tools: ${res.statusText}`);
    return res.json();
  }

  public async getTool(toolId: string): Promise<{ tool: ToolInfo }> {
    const res = await fetch(`/api/v1/tools/${toolId}`);
    if (!res.ok) throw new Error(`Failed to fetch tool '${toolId}': ${res.statusText}`);
    return res.json();
  }

  public async getCapabilities(): Promise<{ capabilities: Record<string, string[]> }> {
    const res = await fetch('/api/v1/tools/capabilities');
    if (!res.ok) throw new Error(`Failed to fetch capabilities: ${res.statusText}`);
    return res.json();
  }

  public async getStatus(): Promise<ToolEngineStatusReport> {
    const res = await fetch('/api/v1/tools/status');
    if (!res.ok) throw new Error(`Failed to fetch tool engine status: ${res.statusText}`);
    return res.json();
  }

  public async getPolicies(): Promise<Record<string, unknown>> {
    const res = await fetch('/api/v1/tools/policies');
    if (!res.ok) throw new Error(`Failed to fetch tool policies: ${res.statusText}`);
    return res.json();
  }

  public async validateInput(
    toolId: string,
    input: Record<string, unknown>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const res = await fetch('/api/v1/tools/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id: toolId, input }),
    });
    if (!res.ok) throw new Error(`Failed to validate input: ${res.statusText}`);
    return res.json();
  }

  public async executeTool(params: {
    tool_id: string;
    input: Record<string, unknown>;
    capability?: string;
    task_id?: string;
    agent_id?: string;
    approval_id?: string;
  }): Promise<ToolResult> {
    const res = await fetch('/api/v1/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Tool execution failed with status ${res.status}`);
    }
    return res.json();
  }

  public async getActions(limit: number = 50): Promise<{ actions: ActionAuditEvent[]; total: number }> {
    const res = await fetch(`/api/v1/actions?limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to fetch actions: ${res.statusText}`);
    return res.json();
  }

  public async getAction(actionId: string): Promise<{ action: ActionAuditEvent }> {
    const res = await fetch(`/api/v1/actions/${actionId}`);
    if (!res.ok) throw new Error(`Failed to fetch action '${actionId}': ${res.statusText}`);
    return res.json();
  }

  public async cancelExecution(executionId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/v1/tools/executions/${executionId}/cancel`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Failed to cancel execution '${executionId}': ${res.statusText}`);
    return res.json();
  }
}

export const toolService = ToolService.getInstance();
