/**
 * NEXUS-AI Phase 5: Agent & Orchestration API Service
 */

import type {
  AgentInfo,
  OrchestrationTask,
  TaskPlan,
  OrchestrationResult,
  OrchestratorStatusReport,
  ApprovalRequirement,
  AgentExecutionRecord,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

class AgentService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 65000); // Allow time for multi-step agent execution

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `Service returned HTTP ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData && errData.error) errorMsg = errData.error;
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new Error('Agent execution or request timed out.');
        }
        throw new Error(err.message || 'Unable to communicate with NEXUS Agent Orchestrator.');
      }
      throw new Error('An unexpected error occurred in Agent Orchestrator service.');
    }
  }

  public async getAgents(): Promise<{ agents: AgentInfo[]; total: number }> {
    return this.request<{ agents: AgentInfo[]; total: number }>('/agents');
  }

  public async getAgent(agentId: string): Promise<{ agent: AgentInfo }> {
    return this.request<{ agent: AgentInfo }>(`/agents/${agentId}`);
  }

  public async getCapabilities(): Promise<{ capabilities: Record<string, string[]> }> {
    return this.request<{ capabilities: Record<string, string[]> }>('/agents/capabilities');
  }

  public async createTask(user_request: string, context?: Record<string, unknown>): Promise<{
    task: OrchestrationTask;
    plan: TaskPlan;
  }> {
    return this.request<{ task: OrchestrationTask; plan: TaskPlan }>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ user_request, context }),
    });
  }

  public async getTasks(): Promise<{ tasks: OrchestrationTask[] }> {
    return this.request<{ tasks: OrchestrationTask[] }>('/tasks');
  }

  public async getTask(taskId: string): Promise<{ task: OrchestrationTask }> {
    return this.request<{ task: OrchestrationTask }>(`/tasks/${taskId}`);
  }

  public async getPlan(taskId: string): Promise<{ plan: TaskPlan }> {
    return this.request<{ plan: TaskPlan }>(`/tasks/${taskId}/plan`);
  }

  public async executeTask(taskId: string): Promise<OrchestrationResult> {
    return this.request<OrchestrationResult>(`/tasks/${taskId}/execute`, {
      method: 'POST',
    });
  }

  public async cancelTask(taskId: string): Promise<{ success: boolean; task_id: string }> {
    return this.request<{ success: boolean; task_id: string }>(`/tasks/${taskId}/cancel`, {
      method: 'POST',
    });
  }

  public async getApprovals(): Promise<{ approvals: ApprovalRequirement[] }> {
    return this.request<{ approvals: ApprovalRequirement[] }>('/approvals');
  }

  public async approveAction(approvalId: string): Promise<{ success: boolean; result?: OrchestrationResult }> {
    return this.request<{ success: boolean; result?: OrchestrationResult }>(`/approvals/${approvalId}/approve`, {
      method: 'POST',
    });
  }

  public async rejectAction(approvalId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/approvals/${approvalId}/reject`, {
      method: 'POST',
    });
  }

  public async getExecutions(): Promise<{ executions: AgentExecutionRecord[] }> {
    return this.request<{ executions: AgentExecutionRecord[] }>('/executions');
  }

  public async getOrchestratorStatus(): Promise<OrchestratorStatusReport> {
    return this.request<OrchestratorStatusReport>('/orchestrator/status');
  }
}

export const agentService = new AgentService(API_BASE_URL);
