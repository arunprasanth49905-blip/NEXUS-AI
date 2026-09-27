/**
 * NEXUS EDGE Assistant Provider Architecture Types
 */

export interface AssistantDocumentContext {
  filename: string;
  content: string;
  mimeType?: string;
  wordCount?: number;
}

export interface AssistantMemoryContext {
  memory_id: string;
  memory_type: string;
  content: string;
}

export interface AssistantPreferenceContext {
  key: string;
  value: string;
  category?: string;
  scope?: string;
}

export interface AssistantTaskContext {
  task_id: string;
  title: string;
  description: string;
  status?: string;
}

export interface AssistantGenerateParams {
  systemInstruction?: string;
  userMessage: string;
  context?: string;
  memories?: AssistantMemoryContext[];
  documents?: AssistantDocumentContext[];
  preferences?: AssistantPreferenceContext[];
  task?: AssistantTaskContext;
  multimodalSummary?: string;
}

export interface AssistantResponse {
  text: string;
  provider: string;
  model: string;
  latency_ms: number;
  grounded_context?: string[];
  warnings: string[];
  error_category?: string;
  provenance?: {
    timestamp: string;
    executionMode: string;
    source: string;
  };
}

export type AssistantStatusState =
  | 'READY'
  | 'CONFIGURED'
  | 'NOT_CONFIGURED'
  | 'INVALID_CONFIGURATION'
  | 'AUTH_FAILED'
  | 'MODEL_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'UNAVAILABLE'
  | 'ERROR';

export interface AssistantProviderStatus {
  provider: string;
  model: string;
  configured: boolean;
  status: AssistantStatusState;
  available: boolean;
  execution_mode: string;
  reason?: string;
  error_category?: string;
}

export interface AssistantProvider {
  readonly id: string;
  readonly name: string;
  readonly model: string;
  isConfigured(): boolean;
  isAvailable(): boolean;
  generateResponse(params: AssistantGenerateParams): Promise<AssistantResponse>;
  getStatus(): AssistantProviderStatus;
}
