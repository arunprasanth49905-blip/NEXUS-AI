/**
 * NEXUS-AI Phase 7: Learning Signal Manager
 * Records and processes learning signals across task execution, user feedback, and agent outcomes.
 */

import fs from 'fs';
import path from 'path';
import { SecretRedactor } from '../tools/redaction.js';
import type {
  LearningSignal,
  LearningSignalType,
  PreferenceScope,
} from './types.js';

export interface SignalFilter {
  type?: LearningSignalType;
  task_id?: string;
  scope?: PreferenceScope;
  limit?: number;
}

export class LearningSignalRepository {
  private static instance: LearningSignalRepository | null = null;
  private db: any = null;
  private inMemorySignals: Map<string, LearningSignal> = new Map();
  private dbPath: string;

  constructor(customDbPath?: string) {
    this.dbPath = customDbPath || path.resolve(process.cwd(), 'data', 'nexus_memory.db');
    this.initDatabase();
  }

  public static getInstance(customDbPath?: string): LearningSignalRepository {
    if (!LearningSignalRepository.instance) {
      LearningSignalRepository.instance = new LearningSignalRepository(customDbPath);
    }
    return LearningSignalRepository.instance;
  }

  public static resetInstance(): void {
    LearningSignalRepository.instance = null;
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
          CREATE TABLE IF NOT EXISTS learning_signals (
            signal_id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            source TEXT NOT NULL,
            task_id TEXT,
            execution_id TEXT,
            context TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            scope TEXT NOT NULL,
            privacy_level TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_sig_type ON learning_signals(type);
          CREATE INDEX IF NOT EXISTS idx_sig_task ON learning_signals(task_id);
        `);
      }
    } catch {
      this.db = null;
    }
  }

  public saveSignal(signal: LearningSignal): void {
    this.inMemorySignals.set(signal.signal_id, signal);

    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO learning_signals (
            signal_id, type, source, task_id, execution_id, context, timestamp, scope, privacy_level
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          signal.signal_id,
          signal.type,
          signal.source,
          signal.task_id || null,
          signal.execution_id || null,
          JSON.stringify(signal.context || {}),
          signal.timestamp,
          signal.scope,
          signal.privacy_level
        );
      } catch {
        // fallback
      }
    }
  }

  public listSignals(filter?: SignalFilter): LearningSignal[] {
    let all = Array.from(this.inMemorySignals.values());

    if (this.db) {
      try {
        const stmt = this.db.prepare('SELECT * FROM learning_signals ORDER BY timestamp DESC');
        const rows = stmt.all();
        if (rows && rows.length > 0) {
          all = rows.map((r: any) => this.rowToSignal(r));
          for (const s of all) {
            this.inMemorySignals.set(s.signal_id, s);
          }
        }
      } catch {
        // fallback
      }
    }

    let filtered = all.filter((s) => {
      if (filter?.type && s.type !== filter.type) return false;
      if (filter?.task_id && s.task_id !== filter.task_id) return false;
      if (filter?.scope && s.scope !== filter.scope) return false;
      return true;
    });

    if (filter?.limit && filter.limit > 0) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  public countSignals(): number {
    if (this.db) {
      try {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM learning_signals');
        const row = stmt.get();
        if (row && typeof row.count === 'number') {
          return row.count;
        }
      } catch {
        // fallback
      }
    }
    return this.inMemorySignals.size;
  }

  public clear(): void {
    this.inMemorySignals.clear();
    if (this.db) {
      try {
        this.db.exec('DELETE FROM learning_signals;');
      } catch {
        // ignore
      }
    }
  }

  private rowToSignal(row: any): LearningSignal {
    let ctx = {};
    try {
      ctx = JSON.parse(row.context || '{}');
    } catch {
      ctx = {};
    }
    return {
      signal_id: row.signal_id,
      type: row.type as LearningSignalType,
      source: row.source,
      task_id: row.task_id || undefined,
      execution_id: row.execution_id || undefined,
      context: ctx as Record<string, unknown>,
      timestamp: row.timestamp,
      scope: row.scope as PreferenceScope,
      privacy_level: row.privacy_level,
    };
  }
}

export class LearningSignalManager {
  private repository: LearningSignalRepository;

  constructor(repository?: LearningSignalRepository) {
    this.repository = repository || LearningSignalRepository.getInstance();
  }

  public emitSignal(params: {
    type: LearningSignalType;
    source: string;
    task_id?: string;
    execution_id?: string;
    context?: Record<string, unknown>;
    scope?: PreferenceScope;
    privacy_level?: string;
  }): LearningSignal {
    // Sanitize context for any credentials
    const rawContextStr = JSON.stringify(params.context || {});
    const redactedContextStr = SecretRedactor.redactText(rawContextStr);
    let sanitizedContext: Record<string, unknown> = {};
    try {
      sanitizedContext = JSON.parse(redactedContextStr);
    } catch {
      sanitizedContext = { sanitized: true };
    }

    const signal: LearningSignal = {
      signal_id: `sig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: params.type,
      source: params.source,
      task_id: params.task_id,
      execution_id: params.execution_id,
      context: sanitizedContext,
      timestamp: new Date().toISOString(),
      scope: params.scope || 'USER',
      privacy_level: params.privacy_level || 'PROTECTED',
    };

    this.repository.saveSignal(signal);
    return signal;
  }

  public getRepository(): LearningSignalRepository {
    return this.repository;
  }
}
