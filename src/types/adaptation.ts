/**
 * NEXUS-AI Phase 7: Adaptive Intelligence & Continuous Improvement Types
 */

export type PreferenceScope = 'SESSION' | 'TASK' | 'PROJECT' | 'USER' | 'SYSTEM';

export type PreferenceCategory =
  | 'response_style'
  | 'explanation_depth'
  | 'output_format'
  | 'language'
  | 'workflow'
  | 'tool_behavior'
  | 'confirmation_behavior';

export type PreferenceSource =
  | 'explicit_user_instruction'
  | 'user_setting'
  | 'inferred_candidate'
  | 'system_default';

export type FeedbackRating = 'HELPFUL' | 'NOT_HELPFUL';

export type FeedbackCategory =
  | 'CORRECT'
  | 'INCORRECT'
  | 'PARTIALLY_CORRECT'
  | 'TOO_LONG'
  | 'TOO_SHORT'
  | 'MISSING_INFORMATION'
  | 'WRONG_FORMAT'
  | 'OTHER';

export type LearningSignalType =
  | 'USER_CORRECTION'
  | 'USER_FEEDBACK'
  | 'EXPLICIT_PREFERENCE'
  | 'VERIFIED_SUCCESS'
  | 'VERIFIED_FAILURE'
  | 'TASK_RETRY'
  | 'PLAN_REVISION'
  | 'TOOL_FAILURE'
  | 'AGENT_FAILURE'
  | 'USER_REJECTION'
  | 'USER_APPROVAL';

export type LearningDecisionType =
  | 'IGNORE'
  | 'SESSION_ONLY'
  | 'CANDIDATE'
  | 'PREFERENCE'
  | 'STRATEGY_SIGNAL'
  | 'LONG_TERM_LEARNING';

export interface UserPreference {
  preference_id: string;
  category: PreferenceCategory;
  key: string;
  value: string;
  source: PreferenceSource;
  confidence: number | null; // Truthful: null unless empirically measured
  scope: PreferenceScope;
  project_id?: string;
  task_id?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  expiration?: string;
  provenance: {
    source_instruction?: string;
    detected_at: string;
    session_id?: string;
  };
}

export interface SuggestedPreferenceCandidate {
  candidate_id: string;
  category: PreferenceCategory;
  key: string;
  value: string;
  rationale: string;
  observed_count: number;
  scope: PreferenceScope;
  created_at: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface UserFeedback {
  feedback_id: string;
  task_id?: string;
  execution_id?: string;
  response_id?: string;
  rating: FeedbackRating;
  category?: FeedbackCategory;
  comment?: string;
  timestamp: string;
  source: string;
}

export interface LearningSignal {
  signal_id: string;
  type: LearningSignalType;
  source: string;
  task_id?: string;
  execution_id?: string;
  context: Record<string, unknown>;
  timestamp: string;
  scope: PreferenceScope;
  privacy_level: string;
}

export interface TaskOutcomeRecord {
  outcome_id: string;
  task_id: string;
  execution_id?: string;
  status: string;
  verification_state: string;
  tools_used: string[];
  agents_used: string[];
  duration_ms: number;
  strategy_id?: string;
  feedback?: UserFeedback;
  timestamp: string;
}

export interface StrategyRecord {
  strategy_id: string;
  task_type: string;
  description: string;
  steps_pattern: string[];
  success_count: number;
  failure_count: number;
  last_used_at: string;
}

export interface PersonalizationRecommendation {
  applied_preferences: UserPreference[];
  explanation?: string;
  suggested_strategy?: StrategyRecord;
  has_overrides: boolean;
}

export interface AdaptiveEngineStatusReport {
  status: 'READY' | 'LIMITED' | 'ERROR';
  version: string;
  learning_enabled: boolean;
  session_learning_enabled: boolean;
  project_learning_enabled: boolean;
  long_term_preferences_enabled: boolean;
  feedback_enabled: boolean;
  inferred_candidates_enabled: boolean;
  personalization_enabled: boolean;
  total_preferences_count: number;
  active_preferences_count: number;
  pending_suggestions_count: number;
  total_feedback_count: number;
  total_learning_signals_count: number;
  strategy_records_count: number;
  privacy_guard_status: 'PROTECTED' | 'LIMITED';
  model_retraining: 'DISABLED'; // Controlled Behavioral Adaptation Only
}

export interface LearningSettingsState {
  learning_enabled: boolean;
  session_learning_enabled: boolean;
  project_learning_enabled: boolean;
  long_term_preferences_enabled: boolean;
  feedback_enabled: boolean;
  personalization_enabled: boolean;
}
