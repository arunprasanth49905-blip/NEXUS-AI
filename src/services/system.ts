/**
 * NEXUS EDGE System & Runtime Service
 * Phase 1 & Phase 2 Integration
 */

import { api } from './api';
import type { 
  HealthResponse, 
  SystemMetrics, 
  ContextInfo, 
  SystemStatusType, 
  RuntimeStatusResponse,
  BenchmarkRunResult,
  InferenceResponse,
  ProviderId
} from '../types';

export const fallbackContext: ContextInfo = {
  project: 'NEXUS EDGE',
  status: 'Ready',
  runtime: 'CPU (Available)',
  privacy: 'Protected',
  boundary: 'Local edge perimeter',
  active_sources: 0,
  phase: 'Phase 2 - AI Runtime Engine',
  active_model: 'nexus-edge-intent-v1',
};

export const fallbackDiagnostics: SystemMetrics = {
  system: {
    os: 'Local Host OS (Detecting...)',
    os_family: 'Detected',
    os_version: 'Baseline',
    architecture: 'Host Architecture',
    processor: 'Host Processor',
    cpu_physical_cores: 'Detected',
    cpu_logical_threads: 'Detected',
    total_memory_gb: null,
    available_memory_gb: null,
    memory_usage_percent: null,
  },
  runtime: {
    status: 'Ready',
    provider: 'NEXUS Local Edge Engine (CPU)',
    model: 'nexus-edge-intent-v1',
    execution_mode: 'Hardware-Aware (CPU)',
    phase: 'Phase 2 - AI Runtime Engine',
    privacy_boundary: 'Local-only / Zero Cloud Telemetry',
  },
  acceleration: {
    cpu: 'Host CPU (Detected)',
    gpu: 'Not configured',
    npu: 'Not detected',
    qnn_runtime: 'Not detected / Not configured',
    inference_engine: 'CPU Fallback',
    tops_rating: 'Unknown',
  },
  timestamp: new Date().toISOString(),
};

export const fallbackRuntimeStatus: RuntimeStatusResponse = {
  runtime_state: 'READY',
  active_provider: 'cpu',
  active_model: 'nexus-edge-intent-v1',
  explanation: {
    summary: 'Execution path: CPU (Baseline provider)',
    details: 'Fallback active: Qualcomm QNN was not detected and no compatible GPU inference provider is available.',
    why_this_runtime: 'QNN is not available on this device. No compatible GPU inference provider is configured. CPU is available and selected as the fallback execution path.',
  },
  selection: {
    selected_provider: 'cpu',
    reason: 'CPU is currently the available compatible execution provider.',
    fallback_used: true,
    fallback_reason: 'Qualcomm QNN was not detected and no compatible GPU inference provider is available.',
    chain_attempted: ['qnn', 'gpu', 'cpu'],
    available_providers: ['cpu'],
  },
  hardware: {
    os: 'Detecting...',
    osFamily: 'Linux / Windows',
    osVersion: 'Standard',
    architecture: 'x64',
    processor: 'Detecting...',
    cpuPhysicalCores: 'Unknown',
    cpuLogicalThreads: 'Unknown',
    totalMemoryGb: null,
    availableMemoryGb: null,
    memoryUsagePercent: null,
    gpuDeviceDetected: false,
    gpuDeviceName: null,
    gpuInferenceProviderAvailable: false,
    gpuInferenceReason: 'Compatible GPU inference provider is not available.',
    snapdragonDetected: false,
    snapdragonEvidence: 'No Qualcomm or Snapdragon processor signatures detected.',
    qnnEnvironmentDetected: false,
    qnnStatus: 'NOT_AVAILABLE',
    qnnReason: 'No compatible Qualcomm QNN environment detected.',
    npuAvailable: false,
  },
  providers: [
    {
      provider_id: 'qnn',
      name: 'Qualcomm® QNN / Snapdragon® NPU Provider',
      type: 'Hardware NPU Hexagon Engine',
      status: 'NOT_AVAILABLE',
      status_reason: 'No Qualcomm QNN SDK or Snapdragon NPU environment detected on this host.',
      detected: false,
      initialized: false,
      capabilities: {
        supportedFormats: ['QNN_DLC', 'ONNX'],
        maxBatchSize: 8,
        quantizationSupported: ['INT8', 'INT4', 'FP16'],
        supportedPrecision: ['int8', 'fp16'],
        npuAcceleration: true,
        gpuAcceleration: false,
        notes: 'Snapdragon NPU / QNN runtime is not present on this machine.',
      },
      telemetry: {
        inferenceCount: 0,
        totalLatencyMs: 0,
        averageLatencyMs: null,
        lastLatencyMs: null,
        lastExecutionTimestamp: null,
        errorsCount: 0,
      },
    },
    {
      provider_id: 'gpu',
      name: 'Hardware GPU Acceleration Provider',
      type: 'DirectML / CUDA Compute Engine',
      status: 'NOT_AVAILABLE',
      status_reason: 'No compatible GPU device or compute runtime detected on this host.',
      detected: false,
      initialized: false,
      capabilities: {
        supportedFormats: ['ONNX', 'TorchScript', 'TensorRT'],
        maxBatchSize: 64,
        quantizationSupported: ['FP16', 'INT8', 'INT4'],
        supportedPrecision: ['fp16', 'fp32'],
        npuAcceleration: false,
        gpuAcceleration: true,
        notes: 'GPU inference provider not initialized on this machine.',
      },
      telemetry: {
        inferenceCount: 0,
        totalLatencyMs: 0,
        averageLatencyMs: null,
        lastLatencyMs: null,
        lastExecutionTimestamp: null,
        errorsCount: 0,
      },
    },
    {
      provider_id: 'cpu',
      name: 'Host CPU Execution Provider',
      type: 'Native Host Compute Baseline',
      status: 'READY',
      status_reason: 'CPU runtime initialized and ready for local inference.',
      detected: true,
      initialized: true,
      capabilities: {
        supportedFormats: ['ONNX', 'GGUF', 'TorchScript', 'NEXUS_EMBED_WEIGHTS'],
        maxBatchSize: 16,
        quantizationSupported: ['FP32', 'FP16', 'INT8', 'INT4'],
        supportedPrecision: ['fp32', 'fp16'],
        npuAcceleration: false,
        gpuAcceleration: false,
        notes: 'Reliable host baseline engine with SIMD instruction fallback.',
      },
      telemetry: {
        inferenceCount: 0,
        totalLatencyMs: 0,
        averageLatencyMs: null,
        lastLatencyMs: null,
        lastExecutionTimestamp: null,
        errorsCount: 0,
      },
    },
  ],
  models: [
    {
      id: 'nexus-edge-intent-v1',
      name: 'NEXUS Edge Context Classifier',
      version: '1.2.0',
      format: 'NEXUS_EMBED_WEIGHTS',
      task: 'context-intent',
      inputType: 'text (utf-8 prompt)',
      outputType: 'intent distribution & tokens',
      supportedProviders: ['cpu', 'gpu', 'qnn'],
      path: './models/nexus-intent-v1.json',
      sizeBytes: 142000,
      status: 'READY',
      description: 'Lightweight local edge context categorization and privacy guard classifier.',
    },
  ],
  telemetry_summary: {
    total_inferences: 0,
    average_latency_ms: null,
    active_memory_mb: 48,
  },
};

export async function fetchSystemStatus(): Promise<{
  status: SystemStatusType;
  health: HealthResponse | null;
  error?: string;
}> {
  try {
    const health = await api.getHealth();
    return {
      status: 'ready',
      health,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Local edge backend service unreachable.';
    return {
      status: 'limited',
      health: null,
      error: msg,
    };
  }
}

export async function fetchSystemMetrics(): Promise<{
  metrics: SystemMetrics;
  isLive: boolean;
  error?: string;
}> {
  try {
    const metrics = await api.getSystemDiagnostics();
    return {
      metrics,
      isLive: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Using baseline system diagnostics.';
    return {
      metrics: fallbackDiagnostics,
      isLive: false,
      error: msg,
    };
  }
}

export async function fetchActiveContext(): Promise<{
  context: ContextInfo;
  isLive: boolean;
}> {
  try {
    const context = await api.getContext();
    return {
      context,
      isLive: true,
    };
  } catch {
    return {
      context: fallbackContext,
      isLive: false,
    };
  }
}

export async function fetchRuntimeStatus(): Promise<{
  runtime: RuntimeStatusResponse;
  isLive: boolean;
  error?: string;
}> {
  try {
    const runtime = await api.getRuntimeStatus();
    return {
      runtime,
      isLive: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Using baseline runtime state.';
    return {
      runtime: fallbackRuntimeStatus,
      isLive: false,
      error: msg,
    };
  }
}

export async function executeBenchmark(
  provider?: ProviderId,
  model?: string,
  runs: number = 5
): Promise<BenchmarkRunResult> {
  return api.runBenchmark({ provider, model, runs });
}

export async function executeInference(
  input: string,
  model?: string,
  provider?: ProviderId | 'auto'
): Promise<InferenceResponse> {
  return api.runInference({ input, model, provider });
}
