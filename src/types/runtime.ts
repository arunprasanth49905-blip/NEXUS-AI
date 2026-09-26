/**
 * NEXUS-AI Phase 2 Hardware-Aware AI Runtime Engine
 * Provider Interface & State Types
 */

export type ProviderId = 'qnn' | 'gpu' | 'cpu';

export type ProviderStatus = 
  | 'AVAILABLE'
  | 'INITIALIZING'
  | 'READY'
  | 'BUSY'
  | 'NOT_AVAILABLE'
  | 'NOT_CONFIGURED'
  | 'UNSUPPORTED'
  | 'INITIALIZATION_FAILED'
  | 'ERROR';

export type RuntimeState =
  | 'READY'
  | 'PROCESSING'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'ERROR';

export interface ProviderCapabilities {
  supportedFormats: string[];
  maxBatchSize: number;
  quantizationSupported: string[];
  supportedPrecision: string[];
  npuAcceleration: boolean;
  gpuAcceleration: boolean;
  notes: string;
}

export interface ProviderTelemetry {
  inferenceCount: number;
  totalLatencyMs: number;
  averageLatencyMs: number | null;
  lastLatencyMs: number | null;
  lastExecutionTimestamp: string | null;
  errorsCount: number;
}

export interface RuntimeProviderInfo {
  provider_id: ProviderId;
  name: string;
  type: string;
  status: ProviderStatus;
  status_reason: string;
  detected: boolean;
  initialized: boolean;
  capabilities: ProviderCapabilities;
  telemetry: ProviderTelemetry;
}

export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  format: 'ONNX' | 'GGUF' | 'TorchScript' | 'QNN_DLC' | 'NEXUS_EMBED_WEIGHTS';
  task: 'text-classification' | 'text-embedding' | 'context-intent' | 'token-generation';
  inputType: string;
  outputType: string;
  supportedProviders: ProviderId[];
  path: string;
  sizeBytes: number;
  status: 'DISCOVERED' | 'VALIDATING' | 'VALID' | 'LOADING' | 'READY' | 'UNLOADED' | 'FAILED';
  description: string;
}

export interface HardwareDetectionResult {
  os: string;
  osFamily: string;
  osVersion: string;
  architecture: string;
  processor: string;
  cpuPhysicalCores: number | string;
  cpuLogicalThreads: number | string;
  totalMemoryGb: number | null;
  availableMemoryGb: number | null;
  memoryUsagePercent: number | null;
  gpuDeviceDetected: boolean;
  gpuDeviceName: string | null;
  gpuInferenceProviderAvailable: boolean;
  gpuInferenceReason: string;
  snapdragonDetected: boolean;
  snapdragonEvidence: string;
  qnnEnvironmentDetected: boolean;
  qnnStatus: ProviderStatus;
  qnnReason: string;
  npuAvailable: boolean;
}

export interface RuntimeSelectionResult {
  selected_provider: ProviderId;
  reason: string;
  fallback_used: boolean;
  fallback_reason: string | null;
  chain_attempted: ProviderId[];
  available_providers: ProviderId[];
}

export interface InferenceTelemetry {
  inference_latency_ms: number;
  model_load_time_ms: number;
  provider: ProviderId;
  model: string;
  timestamp: string;
  success: boolean;
  fallback_used: boolean;
  fallback_reason?: string | null;
  input_chars: number;
  output_tokens: number;
  hardware_measured: {
    cpu_cores_active: number | string;
    memory_rss_mb: number;
  };
}

export interface InferenceResponse {
  success: boolean;
  model: string;
  provider: ProviderId;
  fallback_used: boolean;
  fallback_reason?: string | null;
  latency_ms: number;
  result: {
    text: string;
    intent?: string;
    confidence?: number;
    tokens?: string[];
  };
  telemetry: InferenceTelemetry;
}

export interface BenchmarkRunResult {
  provider: ProviderId;
  model: string;
  runs: number;
  successful_runs: number;
  failed_runs: number;
  min_latency_ms: number;
  max_latency_ms: number;
  average_latency_ms: number;
  latencies: number[];
  timestamp: string;
}

export interface RuntimeStatusResponse {
  runtime_state: RuntimeState;
  active_provider: ProviderId;
  active_model: string;
  explanation: {
    summary: string;
    details: string;
    why_this_runtime: string;
  };
  selection: RuntimeSelectionResult;
  hardware: HardwareDetectionResult;
  providers: RuntimeProviderInfo[];
  models: ModelMetadata[];
  telemetry_summary: {
    total_inferences: number;
    average_latency_ms: number | null;
    active_memory_mb: number;
  };
}
