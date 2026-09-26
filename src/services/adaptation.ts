/**
 * NEXUS-AI Phase 7: Adaptation & Preferences API Service
 */

import type {
  UserPreference,
  SuggestedPreferenceCandidate,
  UserFeedback,
  LearningSettingsState,
  AdaptiveEngineStatusReport,
  PersonalizationRecommendation,
} from '../types/adaptation.js';

const API_BASE = '/api/v1';

export async function getPreferences(params?: {
  scope?: string;
  category?: string;
  project_id?: string;
  enabled_only?: boolean;
}): Promise<UserPreference[]> {
  try {
    const query = new URLSearchParams();
    if (params?.scope) query.set('scope', params.scope);
    if (params?.category) query.set('category', params.category);
    if (params?.project_id) query.set('project_id', params.project_id);
    if (params?.enabled_only) query.set('enabled_only', 'true');

    const res = await fetch(`${API_BASE}/preferences?${query.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.preferences || [];
  } catch {
    return [];
  }
}

export async function createPreference(pref: {
  category: string;
  key: string;
  value: string;
  scope?: string;
  project_id?: string;
  task_id?: string;
}): Promise<{ success: boolean; preference?: UserPreference; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pref),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to save preference' };
    }
    return { success: true, preference: data.preference };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { success: false, error: msg };
  }
}

export async function updatePreference(
  id: string,
  updates: { value?: string; enabled?: boolean; scope?: string; category?: string }
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/preferences/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deletePreference(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/preferences/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function submitFeedback(feedback: {
  rating: 'HELPFUL' | 'NOT_HELPFUL';
  category?: string;
  comment?: string;
  task_id?: string;
  execution_id?: string;
  response_id?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getFeedbackList(): Promise<UserFeedback[]> {
  try {
    const res = await fetch(`${API_BASE}/feedback`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.feedback || [];
  } catch {
    return [];
  }
}

export async function getLearningStatus(): Promise<AdaptiveEngineStatusReport | null> {
  try {
    const res = await fetch(`${API_BASE}/learning/status`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getLearningHistory(): Promise<
  Array<{ id: string; title: string; detail: string; timestamp: string; category: string }>
> {
  try {
    const res = await fetch(`${API_BASE}/learning/history`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.history || [];
  } catch {
    return [];
  }
}

export async function getLearningSettings(): Promise<LearningSettingsState | null> {
  try {
    const res = await fetch(`${API_BASE}/learning/settings`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateLearningSettings(
  settings: Partial<LearningSettingsState>
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/learning/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getCandidates(): Promise<SuggestedPreferenceCandidate[]> {
  try {
    const res = await fetch(`${API_BASE}/preferences/candidates`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.candidates || [];
  } catch {
    return [];
  }
}

export async function resolveCandidate(candidateId: string, accept: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/preferences/candidates/${candidateId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getPersonalizationRecommendations(
  query: string,
  projectId?: string
): Promise<PersonalizationRecommendation | null> {
  try {
    const res = await fetch(`${API_BASE}/personalization/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, project_id: projectId }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
