/**
 * NEXUS-AI Phase 7: Adaptive Engine
 * Central coordinator for adaptive intelligence, user preferences,
 * feedback processing, outcome analysis, and personalization.
 */

import { PreferenceRepository, PreferenceManager } from './preferences.js';
import { FeedbackRepository, FeedbackManager } from './feedback.js';
import { LearningSignalRepository, LearningSignalManager } from './signals.js';
import { LearningPolicyEngine } from './policy.js';
import { OutcomeRepository, OutcomeAnalyzer } from './outcomes.js';
import { PersonalizationEngine } from './personalization.js';
import type {
  AdaptiveEngineStatusReport,
  LearningSignal,
} from './types.js';

export interface AdaptationHistoryItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  category: 'preference' | 'feedback' | 'outcome' | 'strategy';
}

export class AdaptiveEngine {
  private static instance: AdaptiveEngine | null = null;

  public preferenceRepo: PreferenceRepository;
  public preferenceManager: PreferenceManager;
  public feedbackRepo: FeedbackRepository;
  public feedbackManager: FeedbackManager;
  public signalRepo: LearningSignalRepository;
  public signalManager: LearningSignalManager;
  public policyEngine: LearningPolicyEngine;
  public outcomeRepo: OutcomeRepository;
  public outcomeAnalyzer: OutcomeAnalyzer;
  public personalizationEngine: PersonalizationEngine;

  private historyLog: AdaptationHistoryItem[] = [];

  constructor() {
    this.preferenceRepo = PreferenceRepository.getInstance();
    this.preferenceManager = new PreferenceManager(this.preferenceRepo);
    this.feedbackRepo = FeedbackRepository.getInstance();
    this.feedbackManager = new FeedbackManager(this.feedbackRepo);
    this.signalRepo = LearningSignalRepository.getInstance();
    this.signalManager = new LearningSignalManager(this.signalRepo);
    this.policyEngine = LearningPolicyEngine.getInstance();
    this.outcomeRepo = OutcomeRepository.getInstance();
    this.outcomeAnalyzer = new OutcomeAnalyzer(this.outcomeRepo, this.signalManager);
    this.personalizationEngine = new PersonalizationEngine(
      this.preferenceRepo,
      this.policyEngine,
      this.outcomeAnalyzer
    );
  }

  public static getInstance(): AdaptiveEngine {
    if (!AdaptiveEngine.instance) {
      AdaptiveEngine.instance = new AdaptiveEngine();
    }
    return AdaptiveEngine.instance;
  }

  public static resetInstance(): void {
    AdaptiveEngine.instance = null;
  }

  /**
   * Processes a learning signal through policy evaluation and executes behavioral adaptation.
   */
  public processLearningSignal(signal: LearningSignal): {
    evaluated: boolean;
    decision: string;
    reason: string;
  } {
    const policyResult = this.policyEngine.evaluateSignal(signal);

    if (!policyResult.allowed) {
      return {
        evaluated: true,
        decision: policyResult.decision,
        reason: policyResult.reason,
      };
    }

    // Record in adaptation history (Section 28)
    this.recordHistory({
      title: `Learning signal processed: ${signal.type}`,
      detail: `Scope: ${policyResult.effectiveScope} — ${policyResult.reason}`,
      category: signal.type.includes('FEEDBACK')
        ? 'feedback'
        : signal.type.includes('PREFERENCE')
        ? 'preference'
        : 'outcome',
    });

    return {
      evaluated: true,
      decision: policyResult.decision,
      reason: policyResult.reason,
    };
  }

  /**
   * Record entry in user-facing adaptation history (Section 28).
   */
  public recordHistory(item: Omit<AdaptationHistoryItem, 'id' | 'timestamp'>): void {
    const entry: AdaptationHistoryItem = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...item,
    };
    this.historyLog.unshift(entry);
    if (this.historyLog.length > 100) {
      this.historyLog.pop();
    }
  }

  public getHistory(): AdaptationHistoryItem[] {
    return [...this.historyLog];
  }

  public clearHistory(): void {
    this.historyLog = [];
  }

  /**
   * Diagnostic health & status reporting (Section 29: Advanced Diagnostics).
   */
  public getStatusReport(): AdaptiveEngineStatusReport {
    const settings = this.policyEngine.getSettings();
    const allPreferences = this.preferenceRepo.listPreferences();
    const activePreferences = allPreferences.filter((p) => p.enabled);
    const pendingCandidates = this.preferenceRepo.listPendingCandidates();

    const isReady = settings.learning_enabled;

    return {
      status: isReady ? 'READY' : 'LIMITED',
      version: '1.0.0-phase7',
      learning_enabled: settings.learning_enabled,
      session_learning_enabled: settings.session_learning_enabled,
      project_learning_enabled: settings.project_learning_enabled,
      long_term_preferences_enabled: settings.long_term_preferences_enabled,
      feedback_enabled: settings.feedback_enabled,
      inferred_candidates_enabled: true,
      personalization_enabled: settings.personalization_enabled,
      total_preferences_count: allPreferences.length,
      active_preferences_count: activePreferences.length,
      pending_suggestions_count: pendingCandidates.length,
      total_feedback_count: this.feedbackRepo.countFeedback(),
      total_learning_signals_count: this.signalRepo.countSignals(),
      strategy_records_count: this.outcomeRepo.countStrategies(),
      privacy_guard_status: 'PROTECTED',
      model_retraining: 'DISABLED',
    };
  }
}
