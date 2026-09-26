/**
 * NEXUS EDGE API Service Client
 * Phase 1, Phase 2 (Runtime), Phase 3 (Multimodal Perception) & Phase 4 (Context & Memory)
 */

import type {
  HealthResponse,
  SystemMetrics,
  ContextInfo,
  RuntimeStatusResponse,
  RuntimeProviderInfo,
  ModelMetadata,
  InferenceResponse,
  BenchmarkRunResult,
  InferenceTelemetry,
  ProviderId,
  PerceptionStatusResponse,
  NexusContextObject,
  UnifiedMultimodalContext,
  ScreenCaptureRequest,
  CameraCaptureRequest,
  VoiceTranscriptionRequest,
  ContextMemoryStatusResponse,
  MemoryRecord,
  ActiveTask,
  ContextSession,
  MemorySearchResult,
  MemoryType,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

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
          // ignore json parse error on non-json body
        }
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new Error('Connection timed out. Local NEXUS service may be unresponsive.');
        }
        throw new Error(err.message || 'Unable to connect to local NEXUS edge service.');
      }
      throw new Error('An unexpected error occurred while communicating with the edge service.');
    }
  }

  // --- Phase 1 Endpoints ---
  public async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  public async getSystemDiagnostics(): Promise<SystemMetrics> {
    return this.request<SystemMetrics>('/system');
  }

  public async getContext(): Promise<ContextInfo> {
    return this.request<ContextInfo>('/context');
  }

  public async sendAssistantQuery(message: string, contextIds?: string[], contextType: string = 'general'): Promise<{
    response: string;
    status: string;
    phase: string;
    execution_mode: string;
    provider?: string;
    latency_ms?: number;
    fallback_used?: boolean;
    fallback_reason?: string | null;
    multimodal_context?: string;
    context_understanding?: {
      category?: string;
      intent?: string;
      active_task?: string | null;
      entities?: string[];
      topics?: string[];
      retrieved_memories_count?: number;
      estimated_tokens?: number;
    };
    timestamp: string;
  }> {
    return this.request('/assistant/query', {
      method: 'POST',
      body: JSON.stringify({ message, context_ids: contextIds, context_type: contextType }),
    });
  }

  // --- Phase 2 Runtime Endpoints ---
  public async getRuntimeStatus(): Promise<RuntimeStatusResponse> {
    return this.request<RuntimeStatusResponse>('/runtime/status');
  }

  public async getRuntimeProviders(): Promise<{ providers: RuntimeProviderInfo[]; timestamp: string }> {
    return this.request<{ providers: RuntimeProviderInfo[]; timestamp: string }>('/runtime/providers');
  }

  public async getRuntimeModels(): Promise<{ models: ModelMetadata[]; timestamp: string }> {
    return this.request<{ models: ModelMetadata[]; timestamp: string }>('/runtime/models');
  }

  public async loadModel(modelId: string): Promise<{ success: boolean; model_id: string; status: string }> {
    return this.request('/runtime/models/load', {
      method: 'POST',
      body: JSON.stringify({ model_id: modelId }),
    });
  }

  public async unloadModel(modelId: string): Promise<{ success: boolean; model_id: string; status: string }> {
    return this.request('/runtime/models/unload', {
      method: 'POST',
      body: JSON.stringify({ model_id: modelId }),
    });
  }

  public async runInference(params: {
    input: string;
    model?: string;
    provider?: ProviderId | 'auto';
  }): Promise<InferenceResponse> {
    return this.request<InferenceResponse>('/inference', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  public async getTelemetry(): Promise<{ telemetry: InferenceTelemetry[]; timestamp: string }> {
    return this.request<{ telemetry: InferenceTelemetry[]; timestamp: string }>('/runtime/telemetry');
  }

  public async runBenchmark(params: {
    provider?: ProviderId;
    model?: string;
    runs?: number;
  }): Promise<BenchmarkRunResult> {
    return this.request<BenchmarkRunResult>('/runtime/benchmark', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // --- Phase 3 Multimodal Perception Endpoints ---
  public async getPerceptionStatus(): Promise<PerceptionStatusResponse> {
    return this.request<PerceptionStatusResponse>('/perception/status');
  }

  public async submitTextContext(text: string): Promise<{ success: boolean; context: NexusContextObject }> {
    return this.request('/perception/text', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  public async submitScreenCapture(data: ScreenCaptureRequest): Promise<{ success: boolean; context: NexusContextObject }> {
    return this.request('/perception/screen', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async submitCameraCapture(data: CameraCaptureRequest): Promise<{ success: boolean; context: NexusContextObject }> {
    return this.request('/perception/camera', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async submitVoiceTranscript(data: VoiceTranscriptionRequest): Promise<{ success: boolean; context: NexusContextObject }> {
    return this.request('/perception/voice', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async submitDocument(data: { filename: string; base64_data: string; mime_type?: string }): Promise<{ success: boolean; context: NexusContextObject }> {
    return this.request('/perception/document', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async getPerceptionContexts(): Promise<{ contexts: NexusContextObject[]; timestamp: string }> {
    return this.request<{ contexts: NexusContextObject[]; timestamp: string }>('/perception/context');
  }

  public async mergePerceptionContexts(contextIds: string[], primaryQuery?: string): Promise<{ success: boolean; unified_context: UnifiedMultimodalContext }> {
    return this.request('/perception/context/merge', {
      method: 'POST',
      body: JSON.stringify({ context_ids: contextIds, primary_query: primaryQuery }),
    });
  }

  // --- Phase 4 Context & Memory Endpoints ---
  public async getContextMemoryStatus(): Promise<ContextMemoryStatusResponse> {
    return this.request<ContextMemoryStatusResponse>('/context/status');
  }

  public async getSession(): Promise<{ session: ContextSession }> {
    return this.request<{ session: ContextSession }>('/context/session');
  }

  public async resetSession(title?: string): Promise<{ session: ContextSession }> {
    return this.request<{ session: ContextSession }>('/context/session', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  public async getCurrentTask(): Promise<{ active_task: ActiveTask | null }> {
    return this.request<{ active_task: ActiveTask | null }>('/tasks/current');
  }

  public async setActiveTask(title: string, description?: string): Promise<{ active_task: ActiveTask }> {
    return this.request<{ active_task: ActiveTask }>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
  }

  public async clearActiveTask(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/tasks/current', {
      method: 'DELETE',
    });
  }

  public async getMemories(type?: MemoryType): Promise<{ memories: MemoryRecord[]; total: number }> {
    const endpoint = type ? `/memory?type=${type}` : '/memory';
    return this.request<{ memories: MemoryRecord[]; total: number }>(endpoint);
  }

  public async saveMemory(data: { content: string; memory_type?: MemoryType; summary?: string }): Promise<{ success: boolean; memory: MemoryRecord; reason: string }> {
    return this.request<{ success: boolean; memory: MemoryRecord; reason: string }>('/memory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async searchMemories(query: string): Promise<MemorySearchResult> {
    return this.request<MemorySearchResult>('/memory/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  public async deleteMemory(id: string): Promise<{ success: boolean; memory_id: string }> {
    return this.request<{ success: boolean; memory_id: string }>(`/memory/${id}`, {
      method: 'DELETE',
    });
  }

  public async clearSessionMemory(): Promise<{ success: boolean; deleted_count: number }> {
    return this.request<{ success: boolean; deleted_count: number }>('/memory/session', {
      method: 'DELETE',
    });
  }

  public async clearProjectMemory(): Promise<{ success: boolean; deleted_count: number }> {
    return this.request<{ success: boolean; deleted_count: number }>('/memory/project', {
      method: 'DELETE',
    });
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }
}

export const api = new ApiService(API_BASE_URL);
