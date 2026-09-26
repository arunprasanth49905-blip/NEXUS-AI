/**
 * NEXUS-AI Phase 4: Context Intelligence & Memory Engine Type Definitions
 */

import type { PerceptionModality, NexusContextObject } from './perception.js';

export type ContextCategory =
  | 'QUESTION'
  | 'TASK'
  | 'INSTRUCTION'
  | 'OBSERVATION'
  | 'ERROR'
  | 'DOCUMENT'
  | 'PROJECT_CONTEXT'
  | 'CONVERSATION'
  | 'PREFERENCE'
  | 'FACT'
  | 'TEMPORARY_STATE'
  | 'SYSTEM_EVENT';

export type IntentType =
  | 'ASK'
  | 'EXPLAIN'
  | 'DEBUG'
  | 'CREATE'
  | 'MODIFY'
  | 'SEARCH'
  | 'SUMMARIZE'
  | 'ANALYZE'
  | 'COMPARE'
  | 'PLAN'
  | 'EXECUTE'
  | 'NAVIGATE'
  | 'LEARN'
  | 'GENERAL_CONVERSATION';

export type TaskStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type MemoryType = 'SHORT_TERM' | 'SESSION' | 'PROJECT' | 'LONG_TERM';

export type MemoryPersistenceDecision = 
  | 'STORE' 
  | 'DO_NOT_STORE' 
  | 'SESSION_ONLY' 
  | 'PROJECT_MEMORY' 
  | 'LONG_TERM_MEMORY' 
  | 'EXPIRE';

export interface EntityMatch {
  name: string;
  category: 'tool' | 'framework' | 'technology' | 'file' | 'error' | 'concept' | 'person';
  confidence: number | null; // Truthful: null if rule-based
}

export interface TopicMatch {
  topic: string;
  relevance: number; // 0.0 - 1.0 deterministic score
}

export interface ActiveTask {
  task_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  intent: IntentType;
  session_id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  related_context_ids: string[];
  related_memory_ids: string[];
}

export interface MemoryRecord {
  memory_id: string;
  memory_type: MemoryType;
  content: string;
  summary: string;
  source: PerceptionModality | 'system' | 'user_explicit';
  source_id?: string;
  session_id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
  tags: string[];
  entities: string[];
  topics: string[];
  provenance: {
    origin: string;
    captureTime: string;
    reasonStored: string;
  };
  privacy_level: 'standard' | 'sensitive' | 'project_internal';
  persistence_policy: MemoryPersistenceDecision;
  user_controlled: boolean;
  metadata?: Record<string, unknown>;
}

export interface CanonicalContext {
  context_id: string;
  session_id: string;
  request_id?: string;
  timestamp: string;
  user_input: string;
  modality: PerceptionModality;
  source: string;
  content_type: string;
  category: ContextCategory;
  intent: IntentType;
  entities: EntityMatch[];
  topics: TopicMatch[];
  active_task?: ActiveTask | null;
  project: string;
  relevant_memories: MemoryRecord[];
  provenance: {
    sourceType: string;
    sourceSummary: string;
    confidence: number | null;
  };
  privacy_level: 'local_only' | 'session_ephemeral' | 'project_scoped';
  persistence_policy: MemoryPersistenceDecision;
  expires_at?: string | null;
  raw_perception?: NexusContextObject;
  metadata?: Record<string, unknown>;
}

export interface ContextWindow {
  window_id: string;
  constructed_at: string;
  total_items: number;
  estimated_tokens: number;
  active_task?: ActiveTask | null;
  current_context: CanonicalContext;
  prior_contexts: CanonicalContext[];
  retrieved_memories: MemoryRecord[];
  formatted_prompt: string;
  explanations: string[];
}

export interface ContextSession {
  session_id: string;
  created_at: string;
  updated_at: string;
  title: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'EXPIRED';
  project_id: string;
  active_task_id?: string | null;
  context_count: number;
  memory_count: number;
}

export interface MemorySearchResult {
  memories: Array<{
    memory: MemoryRecord;
    score: number; // Deterministic ranking score
    match_reasons: string[];
  }>;
  total_found: number;
  query: string;
  retrieval_strategy: string;
}

export interface ContextMemoryStatusResponse {
  context_engine: {
    status: 'READY' | 'LIMITED' | 'ERROR';
    active_session_id: string;
    active_contexts_count: number;
    intent_classifier: string;
    category_classifier: string;
  };
  memory_engine: {
    status: 'READY' | 'LIMITED' | 'ERROR';
    storage_type: 'sqlite' | 'memory_fallback';
    total_memories: number;
    by_type: {
      short_term: number;
      session: number;
      project: number;
      long_term: number;
    };
    auto_save: boolean;
    retrieval_active: boolean;
  };
  privacy_guard: {
    secret_redaction_active: boolean;
    zero_cloud_retention: boolean;
    rejected_secret_count: number;
  };
  active_task?: ActiveTask | null;
}
