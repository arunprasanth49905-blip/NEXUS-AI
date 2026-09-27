/**
 * NEXUS-AI Phase 6: Tool & Action Engine Frontend Client Service
 */

import type {
  ToolInfo,
  ToolResult,
  ToolEngineStatusReport,
  ActionAuditEvent,
} from '../types/tool.js';
import { API_BASE_URL, buildApiUrl } from './api';

export class ToolService {
  private static instance: ToolService | null = null;
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  public static getInstance(): ToolService {
    if (!ToolService.instance) {
      ToolService.instance = new ToolService();
    }
    return ToolService.instance;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = buildApiUrl(endpoint, this.baseUrl);
    const isDev =
      (typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV)) ||
      (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV !== 'production');
    if (isDev) {
      console.log(`[NEXUS ToolService] ${options.method || 'GET'} ${url} (Base: ${this.baseUrl || 'relative'})`);
    }
    const res = await fetch(url, options);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Tool request to '${url}' failed with HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  public async getTools(): Promise<{ tools: ToolInfo[]; total: number; enabled: number }> {
    return this.request<{ tools: ToolInfo[]; total: number; enabled: number }>('/tools');
  }

  public async getTool(toolId: string): Promise<{ tool: ToolInfo }> {
    return this.request<{ tool: ToolInfo }>(`/tools/${toolId}`);
  }

  public async getCapabilities(): Promise<{ capabilities: Record<string, string[]> }> {
    return this.request<{ capabilities: Record<string, string[]> }>('/tools/capabilities');
  }

  public async getStatus(): Promise<ToolEngineStatusReport> {
    return this.request<ToolEngineStatusReport>('/tools/status');
  }

  public async getPolicies(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/tools/policies');
  }

  public async validateInput(
    toolId: string,
    input: Record<string, unknown>
  ): Promise<{ valid: boolean; errors: string[] }> {
    return this.request<{ valid: boolean; errors: string[] }>('/tools/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id: toolId, input }),
    });
  }

  public async executeTool(params: {
    tool_id: string;
    input: Record<string, unknown>;
    capability?: string;
    task_id?: string;
    agent_id?: string;
    approval_id?: string;
  }): Promise<ToolResult> {
    return this.request<ToolResult>('/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  }

  public async getActions(limit: number = 50): Promise<{ actions: ActionAuditEvent[]; total: number }> {
    return this.request<{ actions: ActionAuditEvent[]; total: number }>(`/actions?limit=${limit}`);
  }

  public async getAction(actionId: string): Promise<{ action: ActionAuditEvent }> {
    return this.request<{ action: ActionAuditEvent }>(`/actions/${actionId}`);
  }

  public async cancelExecution(executionId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/tools/executions/${executionId}/cancel`, {
      method: 'POST',
    });
  }
}

export const toolService = ToolService.getInstance();
