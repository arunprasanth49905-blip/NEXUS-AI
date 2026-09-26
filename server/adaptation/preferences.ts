/**
 * NEXUS-AI Phase 7: User Preferences & Inferred Candidates
 * Manages explicit user preferences, candidate suggestions, and scope isolation (SESSION, TASK, PROJECT, USER).
 */

import fs from 'fs';
import path from 'path';
import { SecretRedactor } from '../tools/redaction.js';
import type {
  UserPreference,
  SuggestedPreferenceCandidate,
  PreferenceScope,
  PreferenceCategory,
} from './types.js';

export interface PreferenceFilter {
  scope?: PreferenceScope;
  project_id?: string;
  category?: PreferenceCategory;
  enabled_only?: boolean;
}

export class PreferenceRepository {
  private static instance: PreferenceRepository | null = null;
  private db: any = null;
  private inMemoryPreferences: Map<string, UserPreference> = new Map();
  private inMemoryCandidates: Map<string, SuggestedPreferenceCandidate> = new Map();
  private dbPath: string;

  constructor(customDbPath?: string) {
    this.dbPath = customDbPath || path.resolve(process.cwd(), 'data', 'nexus_memory.db');
    this.initDatabase();
  }

  public static getInstance(customDbPath?: string): PreferenceRepository {
    if (!PreferenceRepository.instance) {
      PreferenceRepository.instance = new PreferenceRepository(customDbPath);
    }
    return PreferenceRepository.instance;
  }

  public static resetInstance(): void {
    PreferenceRepository.instance = null;
  }

  private initDatabase(): void {
    try {
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // @ts-ignore Node 22+ built-in sqlite
      const sqliteModule = require('node:sqlite');
      if (sqliteModule && sqliteModule.DatabaseSync) {
        this.db = new sqliteModule.DatabaseSync(this.dbPath);
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS preferences (
            preference_id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            source TEXT NOT NULL,
            confidence REAL,
            scope TEXT NOT NULL,
            project_id TEXT,
            task_id TEXT,
            enabled INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            expiration TEXT,
            provenance TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_pref_scope ON preferences(scope);
          CREATE INDEX IF NOT EXISTS idx_pref_project ON preferences(project_id);
          CREATE INDEX IF NOT EXISTS idx_pref_key ON preferences(key);

          CREATE TABLE IF NOT EXISTS preference_candidates (
            candidate_id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            rationale TEXT NOT NULL,
            observed_count INTEGER NOT NULL,
            scope TEXT NOT NULL,
            created_at TEXT NOT NULL,
            status TEXT NOT NULL
          );
        `);
      }
    } catch {
      // Fallback cleanly to in-memory maps
      this.db = null;
    }
  }

  public savePreference(pref: UserPreference): void {
    const sanitizedValue = SecretRedactor.redactText(pref.value);
    const sanitizedPref: UserPreference = {
      ...pref,
      value: sanitizedValue,
    };

    this.inMemoryPreferences.set(sanitizedPref.preference_id, sanitizedPref);

    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO preferences (
            preference_id, category, key, value, source, confidence, scope,
            project_id, task_id, enabled, created_at, updated_at, expiration, provenance
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          sanitizedPref.preference_id,
          sanitizedPref.category,
          sanitizedPref.key,
          sanitizedPref.value,
          sanitizedPref.source,
          sanitizedPref.confidence,
          sanitizedPref.scope,
          sanitizedPref.project_id || null,
          sanitizedPref.task_id || null,
          sanitizedPref.enabled ? 1 : 0,
          sanitizedPref.created_at,
          sanitizedPref.updated_at,
          sanitizedPref.expiration || null,
          JSON.stringify(sanitizedPref.provenance || {})
        );
      } catch {
        // Continue with in-memory map
      }
    }
  }

  public getPreference(preferenceId: string): UserPreference | undefined {
    if (this.inMemoryPreferences.has(preferenceId)) {
      return this.inMemoryPreferences.get(preferenceId);
    }

    if (this.db) {
      try {
        const stmt = this.db.prepare('SELECT * FROM preferences WHERE preference_id = ?');
        const row = stmt.get(preferenceId);
        if (row) {
          const pref = this.rowToPreference(row);
          this.inMemoryPreferences.set(pref.preference_id, pref);
          return pref;
        }
      } catch {
        // Fallback
      }
    }

    return undefined;
  }

  public updatePreference(
    preferenceId: string,
    updates: Partial<Pick<UserPreference, 'value' | 'enabled' | 'scope' | 'category'>>
  ): UserPreference | undefined {
    const existing = this.getPreference(preferenceId);
    if (!existing) return undefined;

    const updated: UserPreference = {
      ...existing,
      ...updates,
      value: updates.value !== undefined ? SecretRedactor.redactText(updates.value) : existing.value,
      updated_at: new Date().toISOString(),
    };

    this.savePreference(updated);
    return updated;
  }

  public deletePreference(preferenceId: string): boolean {
    const existed = this.inMemoryPreferences.delete(preferenceId);

    if (this.db) {
      try {
        const stmt = this.db.prepare('DELETE FROM preferences WHERE preference_id = ?');
        stmt.run(preferenceId);
        return true;
      } catch {
        // Continue
      }
    }

    return existed;
  }

  public listPreferences(filter?: PreferenceFilter): UserPreference[] {
    let all = Array.from(this.inMemoryPreferences.values());

    if (this.db) {
      try {
        const stmt = this.db.prepare('SELECT * FROM preferences');
        const rows = stmt.all();
        if (rows && rows.length > 0) {
          all = rows.map((r: any) => this.rowToPreference(r));
          // Refresh in-memory cache
          for (const p of all) {
            this.inMemoryPreferences.set(p.preference_id, p);
          }
        }
      } catch {
        // Use in-memory
      }
    }

    return all.filter((p) => {
      if (filter?.enabled_only && !p.enabled) return false;
      if (filter?.scope && p.scope !== filter.scope) return false;
      if (filter?.category && p.category !== filter.category) return false;
      if (filter?.project_id && p.project_id && p.project_id !== filter.project_id) return false;
      return true;
    });
  }

  // --- CANDIDATE PREFERENCES ---

  public saveCandidate(candidate: SuggestedPreferenceCandidate): void {
    this.inMemoryCandidates.set(candidate.candidate_id, candidate);
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO preference_candidates (
            candidate_id, category, key, value, rationale, observed_count, scope, created_at, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          candidate.candidate_id,
          candidate.category,
          candidate.key,
          candidate.value,
          candidate.rationale,
          candidate.observed_count,
          candidate.scope,
          candidate.created_at,
          candidate.status
        );
      } catch {
        // fallback
      }
    }
  }

  public listPendingCandidates(): SuggestedPreferenceCandidate[] {
    return Array.from(this.inMemoryCandidates.values()).filter((c) => c.status === 'PENDING');
  }

  public resolveCandidate(candidateId: string, accept: boolean): UserPreference | null {
    const candidate = this.inMemoryCandidates.get(candidateId);
    if (!candidate) return null;

    candidate.status = accept ? 'ACCEPTED' : 'REJECTED';
    this.saveCandidate(candidate);

    if (accept) {
      const pref: UserPreference = {
        preference_id: `pref-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        category: candidate.category,
        key: candidate.key,
        value: candidate.value,
        source: 'inferred_candidate',
        confidence: null,
        scope: candidate.scope,
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        provenance: {
          source_instruction: `Approved candidate suggestion: ${candidate.rationale}`,
          detected_at: candidate.created_at,
        },
      };
      this.savePreference(pref);
      return pref;
    }

    return null;
  }

  public clear(): void {
    this.inMemoryPreferences.clear();
    this.inMemoryCandidates.clear();
    if (this.db) {
      try {
        this.db.exec('DELETE FROM preferences; DELETE FROM preference_candidates;');
      } catch {
        // ignore
      }
    }
  }

  private rowToPreference(row: any): UserPreference {
    let prov = {};
    try {
      prov = JSON.parse(row.provenance || '{}');
    } catch {
      prov = {};
    }
    return {
      preference_id: row.preference_id,
      category: row.category,
      key: row.key,
      value: row.value,
      source: row.source,
      confidence: row.confidence !== null ? Number(row.confidence) : null,
      scope: row.scope,
      project_id: row.project_id || undefined,
      task_id: row.task_id || undefined,
      enabled: Boolean(row.enabled),
      created_at: row.created_at,
      updated_at: row.updated_at,
      expiration: row.expiration || undefined,
      provenance: prov as any,
    };
  }
}

export class PreferenceManager {
  private repository: PreferenceRepository;

  constructor(repository?: PreferenceRepository) {
    this.repository = repository || PreferenceRepository.getInstance();
  }

  /**
   * Create an explicit user preference.
   */
  public createExplicitPreference(params: {
    category: PreferenceCategory;
    key: string;
    value: string;
    scope?: PreferenceScope;
    project_id?: string;
    task_id?: string;
    source_instruction?: string;
  }): UserPreference {
    const pref: UserPreference = {
      preference_id: `pref-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: params.category,
      key: params.key,
      value: params.value,
      source: 'explicit_user_instruction',
      confidence: null,
      scope: params.scope || 'USER',
      project_id: params.project_id,
      task_id: params.task_id,
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      provenance: {
        source_instruction: params.source_instruction,
        detected_at: new Date().toISOString(),
      },
    };

    this.repository.savePreference(pref);
    return pref;
  }

  /**
   * Deterministic extraction of user preferences from explicit conversation patterns.
   * e.g. "From now on, explain technical topics in simple language."
   * e.g. "For this report, use APA format."
   */
  public extractPreferenceFromInstruction(
    text: string,
    context?: { project_id?: string; task_id?: string }
  ): UserPreference | null {
    const lower = text.toLowerCase();

    // 1. Task/Project scoped format instruction: "For this report, use APA format"
    if (lower.includes('for this report') || lower.includes('for this task') || lower.includes('in this project')) {
      const isProject = lower.includes('project');
      const scope: PreferenceScope = isProject ? 'PROJECT' : 'TASK';

      let formatMatch = 'APA';
      if (lower.includes('apa')) formatMatch = 'APA format';
      else if (lower.includes('ieee')) formatMatch = 'IEEE format';
      else if (lower.includes('markdown')) formatMatch = 'Markdown format';
      else if (lower.includes('json')) formatMatch = 'JSON format';

      return this.createExplicitPreference({
        category: 'output_format',
        key: 'document_format',
        value: formatMatch,
        scope,
        project_id: context?.project_id,
        task_id: context?.task_id,
        source_instruction: text,
      });
    }

    // 2. Global user instruction: "Always explain things simply" / "From now on, explain technical topics in simple language"
    if (
      lower.includes('always explain') ||
      lower.includes('simple language') ||
      lower.includes('explain things simply') ||
      lower.includes('from now on')
    ) {
      let explanationLevel = 'simple';
      if (lower.includes('concise')) explanationLevel = 'concise';
      else if (lower.includes('detailed')) explanationLevel = 'detailed';
      else if (lower.includes('simple')) explanationLevel = 'simple';

      return this.createExplicitPreference({
        category: 'explanation_depth',
        key: 'explanation_level',
        value: explanationLevel,
        scope: 'USER',
        source_instruction: text,
      });
    }

    // 3. Response tone: "Use concise explanations"
    if (lower.includes('concise explanations') || lower.includes('be concise')) {
      return this.createExplicitPreference({
        category: 'response_style',
        key: 'tone',
        value: 'concise',
        scope: 'USER',
        source_instruction: text,
      });
    }

    return null;
  }

  /**
   * Suggest an inferred preference candidate (requires human confirmation; never saved automatically).
   */
  public suggestCandidate(params: {
    category: PreferenceCategory;
    key: string;
    value: string;
    rationale: string;
    scope?: PreferenceScope;
  }): SuggestedPreferenceCandidate {
    const candidate: SuggestedPreferenceCandidate = {
      candidate_id: `cand-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: params.category,
      key: params.key,
      value: params.value,
      rationale: params.rationale,
      observed_count: 1,
      scope: params.scope || 'USER',
      created_at: new Date().toISOString(),
      status: 'PENDING',
    };

    this.repository.saveCandidate(candidate);
    return candidate;
  }

  public getRepository(): PreferenceRepository {
    return this.repository;
  }
}
