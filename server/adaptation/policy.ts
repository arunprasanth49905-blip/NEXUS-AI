/**
 * NEXUS-AI Phase 7: Learning Policy Engine & Privacy Guard
 * Enforces security precedence (Security/Privacy > Preferences),
 * filters sensitive credentials, blocks prompt injection, and manages learning scopes.
 */

import { SecretRedactor } from '../tools/redaction.js';
import type {
  LearningSignal,
  LearningDecisionType,
  LearningSettingsState,
  PreferenceScope,
} from './types.js';

export interface PolicyEvaluationResult {
  decision: LearningDecisionType;
  allowed: boolean;
  effectiveScope: PreferenceScope;
  reason: string;
  securityViolation?: boolean;
}

export class LearningPolicyEngine {
  private static instance: LearningPolicyEngine | null = null;
  private settings: LearningSettingsState;

  constructor(initialSettings?: Partial<LearningSettingsState>) {
    this.settings = {
      learning_enabled: process.env.NEXUS_ADAPTIVE_INTELLIGENCE_ENABLED !== 'false',
      session_learning_enabled: process.env.NEXUS_SESSION_LEARNING_ENABLED !== 'false',
      project_learning_enabled: process.env.NEXUS_PROJECT_LEARNING_ENABLED !== 'false',
      long_term_preferences_enabled: process.env.NEXUS_LONG_TERM_PREFERENCES_ENABLED !== 'false',
      feedback_enabled: process.env.NEXUS_FEEDBACK_ENABLED !== 'false',
      personalization_enabled: process.env.NEXUS_PERSONALIZATION_ENABLED !== 'false',
      ...initialSettings,
    };
  }

  public static getInstance(): LearningPolicyEngine {
    if (!LearningPolicyEngine.instance) {
      LearningPolicyEngine.instance = new LearningPolicyEngine();
    }
    return LearningPolicyEngine.instance;
  }

  public getSettings(): LearningSettingsState {
    return { ...this.settings };
  }

  public updateSettings(updates: Partial<LearningSettingsState>): LearningSettingsState {
    this.settings = {
      ...this.settings,
      ...updates,
    };
    return this.getSettings();
  }

  /**
   * Evaluate a learning signal or candidate preference against privacy, security, and user controls.
   */
  public evaluateSignal(signal: LearningSignal): PolicyEvaluationResult {
    // 1. Global learning toggle check
    if (!this.settings.learning_enabled) {
      return {
        decision: 'IGNORE',
        allowed: false,
        effectiveScope: signal.scope,
        reason: 'Adaptive intelligence and learning are globally disabled by user settings.',
      };
    }

    // 2. Untrusted content / Document prompt injection defense (Scenario 9)
    if (signal.source === 'untrusted_document' || signal.source === 'external_content') {
      return {
        decision: 'IGNORE',
        allowed: false,
        effectiveScope: signal.scope,
        reason: 'Untrusted document content cannot define or modify system or user preferences.',
      };
    }

    const contextStr = JSON.stringify(signal.context || '').toLowerCase();

    // 3. Security Policy Precedence (Scenario 6: Stored preference conflicts with security policy)
    const securityBypassPatterns = [
      'never ask for approval',
      'disable approval',
      'skip approval',
      'bypass approval',
      'disable security',
      'ignore security',
      'ignore policy',
      'disable confirmation',
      'allow all dangerous actions',
      'override safety',
    ];

    for (const pattern of securityBypassPatterns) {
      if (contextStr.includes(pattern)) {
        return {
          decision: 'IGNORE',
          allowed: false,
          effectiveScope: signal.scope,
          reason: 'Security policy precedence: User preferences cannot override approval gates or security controls.',
          securityViolation: true,
        };
      }
    }

    // 4. Privacy Check: Secret / Credential Inspection (Section 15)
    if (SecretRedactor.hasSecrets(contextStr)) {
      return {
        decision: 'IGNORE',
        allowed: false,
        effectiveScope: signal.scope,
        reason: 'Privacy Guard: Content contains credentials, API keys, or private tokens and cannot be learned.',
      };
    }

    // 5. Evaluate scopes against user toggles (Scenario 11)
    if (signal.scope === 'USER' && !this.settings.long_term_preferences_enabled) {
      // Downgrade to SESSION_ONLY or IGNORE
      if (this.settings.session_learning_enabled) {
        return {
          decision: 'SESSION_ONLY',
          allowed: true,
          effectiveScope: 'SESSION',
          reason: 'Long-term preferences disabled; downgraded to session-only adaptation.',
        };
      } else {
        return {
          decision: 'IGNORE',
          allowed: false,
          effectiveScope: 'USER',
          reason: 'Long-term preferences are disabled in user settings.',
        };
      }
    }

    if (signal.scope === 'PROJECT' && !this.settings.project_learning_enabled) {
      return {
        decision: 'IGNORE',
        allowed: false,
        effectiveScope: 'PROJECT',
        reason: 'Project-level learning is disabled in settings.',
      };
    }

    if (signal.scope === 'SESSION' && !this.settings.session_learning_enabled) {
      return {
        decision: 'IGNORE',
        allowed: false,
        effectiveScope: 'SESSION',
        reason: 'Session learning is disabled in settings.',
      };
    }

    // 6. Signal-specific decision routing
    switch (signal.type) {
      case 'EXPLICIT_PREFERENCE':
        return {
          decision: 'PREFERENCE',
          allowed: true,
          effectiveScope: signal.scope,
          reason: 'Explicit user preference instruction approved.',
        };

      case 'VERIFIED_SUCCESS':
      case 'VERIFIED_FAILURE':
      case 'TOOL_FAILURE':
        return {
          decision: 'STRATEGY_SIGNAL',
          allowed: true,
          effectiveScope: signal.scope,
          reason: 'Verified execution outcome recorded for strategy adaptation.',
        };

      case 'USER_FEEDBACK':
        if (!this.settings.feedback_enabled) {
          return {
            decision: 'IGNORE',
            allowed: false,
            effectiveScope: signal.scope,
            reason: 'Feedback recording is disabled in settings.',
          };
        }
        return {
          decision: 'STRATEGY_SIGNAL',
          allowed: true,
          effectiveScope: signal.scope,
          reason: 'User feedback recorded for interaction adaptation.',
        };

      case 'USER_CORRECTION':
        return {
          decision: 'CANDIDATE',
          allowed: true,
          effectiveScope: signal.scope,
          reason: 'User correction identified as candidate preference.',
        };

      default:
        return {
          decision: 'SESSION_ONLY',
          allowed: true,
          effectiveScope: signal.scope,
          reason: 'Standard signal accepted for session context.',
        };
    }
  }

  /**
   * Validates if a proposed preference key and value violate security policies.
   */
  public isPreferenceSafe(key: string, value: string): { safe: boolean; reason?: string } {
    const combined = `${key} ${value}`.toLowerCase();

    if (SecretRedactor.hasSecrets(combined)) {
      return { safe: false, reason: 'Value contains secret or credential pattern.' };
    }

    const dangerous = [
      'disable approval',
      'never ask for approval',
      'bypass security',
      'ignore approval',
      'skip confirmation',
    ];

    for (const d of dangerous) {
      if (combined.includes(d)) {
        return {
          safe: false,
          reason: 'Security policies cannot be overridden by user preferences (Precedence: Security > Preferences).',
        };
      }
    }

    return { safe: true };
  }
}
