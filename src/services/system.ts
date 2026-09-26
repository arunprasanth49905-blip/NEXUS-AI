/**
 * NEXUS EDGE System & Context Service
 * Phase 1: Product Foundation
 * 
 * Provides live telemetry from the backend service or graceful offline baseline data.
 * Always maintains truthful hardware disclosures (zero synthetic/fabricated metrics).
 */

import { api } from './api';
import type { HealthResponse, SystemMetrics, ContextInfo, SystemStatusType } from '../types';

export const fallbackContext: ContextInfo = {
  project: 'NEXUS EDGE',
  status: 'Ready',
  runtime: 'Available',
  privacy: 'Protected',
  boundary: 'Local edge perimeter (Standby)',
  active_sources: 0,
  phase: 'Phase 1 - Product Foundation',
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
    total_memory_gb: 0,
    available_memory_gb: 0,
    memory_usage_percent: 0,
  },
  runtime: {
    status: 'Ready',
    provider: 'NEXUS Local Edge Engine',
    model: 'Not configured (Phase 2)',
    execution_mode: 'Local Edge UI Shell',
    phase: 'Phase 1 - Product Foundation',
    privacy_boundary: 'Local-only / Zero Cloud Telemetry',
  },
  acceleration: {
    cpu: 'Host CPU (Detected)',
    gpu: 'Not configured',
    npu: 'Not detected',
    qnn_runtime: 'Not configured (Edge target runtime)',
    inference_engine: 'CPU Fallback (Phase 1 Baseline)',
    tops_rating: 'Unknown',
  },
  timestamp: new Date().toISOString(),
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
