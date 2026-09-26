/**
 * NEXUS EDGE Type Definitions
 * Phase 1: Product Foundation
 */

export type NavPage = 
  | 'home' 
  | 'ask-nexus' 
  | 'knowledge' 
  | 'activity' 
  | 'settings' 
  | 'diagnostics';

export type SystemStatusType = 
  | 'ready' 
  | 'processing' 
  | 'limited' 
  | 'offline' 
  | 'error';

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  phase: string;
  timestamp: string;
  runtime_ready: boolean;
  privacy: string;
}

export interface SystemMetrics {
  system: {
    os: string;
    os_family: string;
    os_version: string;
    architecture: string;
    processor: string;
    cpu_physical_cores: number | string;
    cpu_logical_threads: number | string;
    total_memory_gb: number;
    available_memory_gb: number;
    memory_usage_percent: number;
  };
  runtime: {
    status: string;
    provider: string;
    model: string;
    execution_mode: string;
    phase: string;
    privacy_boundary: string;
  };
  acceleration: {
    cpu: string;
    gpu: string;
    npu: string;
    qnn_runtime: string;
    inference_engine: string;
    tops_rating: string;
  };
  timestamp: string;
}

export interface ContextInfo {
  project: string;
  status: string;
  runtime: string;
  privacy: string;
  boundary: string;
  active_sources: number;
  phase: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  executionMode?: string;
  isStreaming?: boolean;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  type: 'document' | 'code' | 'note' | 'dataset';
  description: string;
  size: string;
  updatedAt: string;
  isSample?: boolean;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  relativeTime: string;
  title: string;
  category: 'query' | 'context' | 'system' | 'session';
  details?: string;
  isDemo?: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description?: string;
  duration?: number;
}

export interface QuickActionItem {
  id: string;
  label: string;
  description: string;
  prompt: string;
  iconName: string;
}
