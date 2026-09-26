/**
 * NEXUS EDGE API Service Client
 * Phase 1, Phase 2 (Runtime) & Phase 3 (Multimodal Perception)
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

  public getBaseUrl(): string {
    return this.baseUrl;
  }
}

export const api = new ApiService(API_BASE_URL);
