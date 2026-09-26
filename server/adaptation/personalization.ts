/**
 * NEXUS-AI Phase 7: Personalization Engine
 * Discovers and applies relevant scoped preferences and strategy signals to incoming queries/plans,
 * strictly enforcing project isolation, precedence ordering, and user privacy toggles.
 */

import { PreferenceRepository } from './preferences.js';
import { LearningPolicyEngine } from './policy.js';
import { OutcomeAnalyzer } from './outcomes.js';
import type {
  UserPreference,
  PersonalizationRecommendation,
  PreferenceScope,
} from './types.js';

export interface PersonalizationRequest {
  query: string;
  project_id?: string;
  task_id?: string;
}

export class PersonalizationEngine {
  private preferenceRepo: PreferenceRepository;
  private policyEngine: LearningPolicyEngine;
  private outcomeAnalyzer: OutcomeAnalyzer;

  constructor(
    preferenceRepo?: PreferenceRepository,
    policyEngine?: LearningPolicyEngine,
    outcomeAnalyzer?: OutcomeAnalyzer
  ) {
    this.preferenceRepo = preferenceRepo || PreferenceRepository.getInstance();
    this.policyEngine = policyEngine || LearningPolicyEngine.getInstance();
    this.outcomeAnalyzer = outcomeAnalyzer || new OutcomeAnalyzer();
  }

  /**
   * Retrieves relevant preferences for a query/task with scope isolation and precedence.
   */
  public getRecommendations(req: PersonalizationRequest): PersonalizationRecommendation {
    const settings = this.policyEngine.getSettings();

    // 1. Check if personalization is disabled by user settings (Scenario 12)
    if (!settings.personalization_enabled || !settings.learning_enabled) {
      return {
        applied_preferences: [],
        explanation: undefined,
        suggested_strategy: undefined,
        has_overrides: false,
      };
    }

    // 2. Fetch all enabled preferences
    const allPreferences = this.preferenceRepo.listPreferences({ enabled_only: true });

    // 3. Filter by scope & project isolation (Scenario 10: Project A preference must not affect Project B)
    const scopeFiltered = allPreferences.filter((pref) => {
      if (pref.scope === 'PROJECT') {
        // Must match exact project_id
        return Boolean(req.project_id && pref.project_id === req.project_id);
      }
      if (pref.scope === 'TASK') {
        // Must match exact task_id
        return Boolean(req.task_id && pref.task_id === req.task_id);
      }
      if (pref.scope === 'USER' || pref.scope === 'SYSTEM' || pref.scope === 'SESSION') {
        return true;
      }
      return false;
    });

    // 4. Group by key to enforce precedence: TASK > PROJECT > USER > SYSTEM
    const scopeWeight: Record<PreferenceScope, number> = {
      TASK: 40,
      PROJECT: 30,
      SESSION: 20,
      USER: 10,
      SYSTEM: 0,
    };

    const keyMap = new Map<string, UserPreference>();
    for (const pref of scopeFiltered) {
      const existing = keyMap.get(pref.key);
      if (!existing) {
        keyMap.set(pref.key, pref);
      } else {
        const existingWeight = scopeWeight[existing.scope] || 0;
        const currentWeight = scopeWeight[pref.scope] || 0;
        if (currentWeight > existingWeight) {
          keyMap.set(pref.key, pref);
        }
      }
    }

    const candidatePreferences = Array.from(keyMap.values());

    // 5. Check relevance to query/task (Section 18)
    const lowerQuery = req.query.toLowerCase();
    const relevantPreferences = candidatePreferences.filter((pref) => {
      // Style, depth, format preferences always apply to generation
      if (
        pref.category === 'response_style' ||
        pref.category === 'explanation_depth' ||
        pref.category === 'output_format' ||
        pref.category === 'language'
      ) {
        return true;
      }
      // Or check if preference key or category appears in query
      if (lowerQuery.includes(pref.key.toLowerCase()) || lowerQuery.includes(pref.category.toLowerCase())) {
        return true;
      }
      return false;
    });

    // 6. Generate truthful, concise explanation (Section 27 & 48)
    let explanation: string | undefined = undefined;
    if (relevantPreferences.length > 0) {
      const explanations = relevantPreferences.map((p) => {
        if (p.scope === 'PROJECT') {
          return `Using the ${p.key.replace(/_/g, ' ')} preference saved for this project (${p.value})`;
        }
        return `Using your saved preference for ${p.value} ${p.key.replace(/_/g, ' ')}`;
      });
      explanation = explanations.join('; ') + '.';
    }

    // 7. Look up verified strategy if query matches known task type
    let suggestedStrategy = undefined;
    if (lowerQuery.includes('report') || lowerQuery.includes('document') || lowerQuery.includes('research')) {
      suggestedStrategy = this.outcomeAnalyzer.getBestStrategy('documentation');
    }

    return {
      applied_preferences: relevantPreferences,
      explanation,
      suggested_strategy: suggestedStrategy,
      has_overrides: relevantPreferences.some((p) => p.scope === 'PROJECT' || p.scope === 'TASK'),
    };
  }

  /**
   * Applies relevant preferences directly to prompt context for Phase 5 Planner.
   */
  public applyPersonalizationToContext(
    baseContext: string,
    req: PersonalizationRequest
  ): { enrichedContext: string; explanation?: string; appliedCount: number } {
    const rec = this.getRecommendations(req);

    if (rec.applied_preferences.length === 0) {
      return { enrichedContext: baseContext, explanation: undefined, appliedCount: 0 };
    }

    const prefSnippets = rec.applied_preferences.map(
      (p) => `- [${p.scope}] ${p.category} -> ${p.key}: ${p.value}`
    );

    const enriched = `${baseContext}\n\n[USER PREFERENCES & ADAPTIVE CONTEXT (Phase 7)]\n${prefSnippets.join(
      '\n'
    )}`;

    return {
      enrichedContext: enriched,
      explanation: rec.explanation,
      appliedCount: rec.applied_preferences.length,
    };
  }
}
