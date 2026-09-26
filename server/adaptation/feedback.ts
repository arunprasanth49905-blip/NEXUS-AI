/**
 * NEXUS-AI Phase 7: User Feedback Repository & Manager
 * Records user feedback (HELPFUL, NOT_HELPFUL, categories, comments)
 * with privacy sanitization and learning signal integration.
 */

import fs from 'fs';
import path from 'path';
import { SecretRedactor } from '../tools/redaction.js';
import type { UserFeedback, FeedbackRating, FeedbackCategory } from './types.js';

export interface FeedbackFilter {
  rating?: FeedbackRating;
  category?: FeedbackCategory;
  task_id?: string;
  limit?: number;
}

export class FeedbackRepository {
  private static instance: FeedbackRepository | null = null;
  private db: any = null;
  private inMemoryFeedback: Map<string, UserFeedback> = new Map();
  private dbPath: string;

  constructor(customDbPath?: string) {
    this.dbPath = customDbPath || path.resolve(process.cwd(), 'data', 'nexus_memory.db');
    this.initDatabase();
  }

  public static getInstance(customDbPath?: string): FeedbackRepository {
    if (!FeedbackRepository.instance) {
      FeedbackRepository.instance = new FeedbackRepository(customDbPath);
    }
    return FeedbackRepository.instance;
  }

  public static resetInstance(): void {
    FeedbackRepository.instance = null;
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
          CREATE TABLE IF NOT EXISTS feedback (
            feedback_id TEXT PRIMARY KEY,
            task_id TEXT,
            execution_id TEXT,
            response_id TEXT,
            rating TEXT NOT NULL,
            category TEXT,
            comment TEXT,
            timestamp TEXT NOT NULL,
            source TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_fb_task ON feedback(task_id);
          CREATE INDEX IF NOT EXISTS idx_fb_rating ON feedback(rating);
        `);
      }
    } catch {
      this.db = null;
    }
  }

  public saveFeedback(feedback: UserFeedback): void {
    const sanitized: UserFeedback = {
      ...feedback,
      comment: feedback.comment ? SecretRedactor.redactText(feedback.comment) : undefined,
    };

    this.inMemoryFeedback.set(sanitized.feedback_id, sanitized);

    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO feedback (
            feedback_id, task_id, execution_id, response_id, rating, category, comment, timestamp, source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          sanitized.feedback_id,
          sanitized.task_id || null,
          sanitized.execution_id || null,
          sanitized.response_id || null,
          sanitized.rating,
          sanitized.category || null,
          sanitized.comment || null,
          sanitized.timestamp,
          sanitized.source
        );
      } catch {
        // Fallback to in-memory
      }
    }
  }

  public getFeedback(feedbackId: string): UserFeedback | undefined {
    if (this.inMemoryFeedback.has(feedbackId)) {
      return this.inMemoryFeedback.get(feedbackId);
    }

    if (this.db) {
      try {
        const stmt = this.db.prepare('SELECT * FROM feedback WHERE feedback_id = ?');
        const row = stmt.get(feedbackId);
        if (row) {
          const fb = this.rowToFeedback(row);
          this.inMemoryFeedback.set(fb.feedback_id, fb);
          return fb;
        }
      } catch {
        // fallback
      }
    }

    return undefined;
  }

  public listFeedback(filter?: FeedbackFilter): UserFeedback[] {
    let all = Array.from(this.inMemoryFeedback.values());

    if (this.db) {
      try {
        const stmt = this.db.prepare('SELECT * FROM feedback ORDER BY timestamp DESC');
        const rows = stmt.all();
        if (rows && rows.length > 0) {
          all = rows.map((r: any) => this.rowToFeedback(r));
          for (const item of all) {
            this.inMemoryFeedback.set(item.feedback_id, item);
          }
        }
      } catch {
        // use in-memory
      }
    }

    let filtered = all.filter((fb) => {
      if (filter?.rating && fb.rating !== filter.rating) return false;
      if (filter?.category && fb.category !== filter.category) return false;
      if (filter?.task_id && fb.task_id !== filter.task_id) return false;
      return true;
    });

    if (filter?.limit && filter.limit > 0) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  public countFeedback(): number {
    if (this.db) {
      try {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM feedback');
        const row = stmt.get();
        if (row && typeof row.count === 'number') {
          return row.count;
        }
      } catch {
        // fallback
      }
    }
    return this.inMemoryFeedback.size;
  }

  public clear(): void {
    this.inMemoryFeedback.clear();
    if (this.db) {
      try {
        this.db.exec('DELETE FROM feedback;');
      } catch {
        // ignore
      }
    }
  }

  private rowToFeedback(row: any): UserFeedback {
    return {
      feedback_id: row.feedback_id,
      task_id: row.task_id || undefined,
      execution_id: row.execution_id || undefined,
      response_id: row.response_id || undefined,
      rating: row.rating as FeedbackRating,
      category: row.category ? (row.category as FeedbackCategory) : undefined,
      comment: row.comment || undefined,
      timestamp: row.timestamp,
      source: row.source,
    };
  }
}

export class FeedbackManager {
  private repository: FeedbackRepository;

  constructor(repository?: FeedbackRepository) {
    this.repository = repository || FeedbackRepository.getInstance();
  }

  public recordFeedback(params: {
    rating: FeedbackRating;
    category?: FeedbackCategory;
    comment?: string;
    task_id?: string;
    execution_id?: string;
    response_id?: string;
    source?: string;
  }): UserFeedback {
    const sanitizedComment = params.comment ? SecretRedactor.redactText(params.comment) : undefined;
    const feedback: UserFeedback = {
      feedback_id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rating: params.rating,
      category: params.category,
      comment: sanitizedComment,
      task_id: params.task_id,
      execution_id: params.execution_id,
      response_id: params.response_id,
      timestamp: new Date().toISOString(),
      source: params.source || 'user_interface',
    };

    this.repository.saveFeedback(feedback);
    return feedback;
  }

  public getRepository(): FeedbackRepository {
    return this.repository;
  }
}
