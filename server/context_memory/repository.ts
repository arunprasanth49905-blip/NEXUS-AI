import fs from 'fs';
import path from 'path';
import type { MemoryRecord, MemoryType } from '../../src/types/context_memory.js';

export interface MemoryFilterOptions {
  session_id?: string;
  project_id?: string;
  memory_type?: MemoryType;
  tags?: string[];
  limit?: number;
}

export class MemoryRepository {
  private db: any = null;
  private inMemoryFallback: Map<string, MemoryRecord> = new Map();
  private isSqliteActive = false;
  private dbPath: string;

  constructor(customDbPath?: string) {
    this.dbPath = customDbPath || path.resolve(process.cwd(), 'data', 'nexus_memory.db');
    this.initDatabase();
  }

  private initDatabase() {
    try {
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Dynamically load node:sqlite
      // @ts-ignore Node 22+ built-in
      const sqliteModule = require('node:sqlite');
      if (sqliteModule && sqliteModule.DatabaseSync) {
        this.db = new sqliteModule.DatabaseSync(this.dbPath);
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS memories (
            memory_id TEXT PRIMARY KEY,
            memory_type TEXT NOT NULL,
            content TEXT NOT NULL,
            summary TEXT,
            source TEXT NOT NULL,
            source_id TEXT,
            session_id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            expires_at TEXT,
            tags TEXT,
            entities TEXT,
            topics TEXT,
            provenance TEXT,
            privacy_level TEXT,
            persistence_policy TEXT,
            user_controlled INTEGER,
            metadata TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_mem_type ON memories(memory_type);
          CREATE INDEX IF NOT EXISTS idx_mem_session ON memories(session_id);
          CREATE INDEX IF NOT EXISTS idx_mem_project ON memories(project_id);
        `);
        this.isSqliteActive = true;
      }
    } catch {
      this.isSqliteActive = false;
    }
  }

  public isUsingSqlite(): boolean {
    return this.isSqliteActive;
  }

  public async save(record: MemoryRecord): Promise<void> {
    if (this.isSqliteActive && this.db) {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO memories (
          memory_id, memory_type, content, summary, source, source_id,
          session_id, project_id, created_at, updated_at, expires_at,
          tags, entities, topics, provenance, privacy_level, persistence_policy,
          user_controlled, metadata
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?
        )
      `);
      stmt.run(
        record.memory_id,
        record.memory_type,
        record.content,
        record.summary,
        record.source,
        record.source_id || null,
        record.session_id,
        record.project_id,
        record.created_at,
        record.updated_at,
        record.expires_at || null,
        JSON.stringify(record.tags || []),
        JSON.stringify(record.entities || []),
        JSON.stringify(record.topics || []),
        JSON.stringify(record.provenance || {}),
        record.privacy_level,
        record.persistence_policy,
        record.user_controlled ? 1 : 0,
        JSON.stringify(record.metadata || {})
      );
    }
    // Maintain in memory mirror for instant retrieval
    this.inMemoryFallback.set(record.memory_id, record);
  }

  public async getById(memoryId: string): Promise<MemoryRecord | null> {
    if (this.inMemoryFallback.has(memoryId)) {
      return this.inMemoryFallback.get(memoryId)!;
    }
    if (this.isSqliteActive && this.db) {
      const stmt = this.db.prepare('SELECT * FROM memories WHERE memory_id = ?');
      const row = stmt.get(memoryId);
      if (row) return this.mapRowToRecord(row);
    }
    return null;
  }

  public async list(filter: MemoryFilterOptions = {}): Promise<MemoryRecord[]> {
    let records: MemoryRecord[] = [];

    if (this.isSqliteActive && this.db) {
      let query = 'SELECT * FROM memories WHERE 1=1';
      const params: any[] = [];

      if (filter.session_id) {
        query += ' AND session_id = ?';
        params.push(filter.session_id);
      }
      if (filter.project_id) {
        query += ' AND project_id = ?';
        params.push(filter.project_id);
      }
      if (filter.memory_type) {
        query += ' AND memory_type = ?';
        params.push(filter.memory_type);
      }

      query += ' ORDER BY created_at DESC';
      if (filter.limit) {
        query += ` LIMIT ${filter.limit}`;
      }

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);
      records = rows.map((r: any) => this.mapRowToRecord(r));
    } else {
      records = Array.from(this.inMemoryFallback.values());
      if (filter.session_id) {
        records = records.filter((r) => r.session_id === filter.session_id);
      }
      if (filter.project_id) {
        records = records.filter((r) => r.project_id === filter.project_id);
      }
      if (filter.memory_type) {
        records = records.filter((r) => r.memory_type === filter.memory_type);
      }
      records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (filter.limit) {
        records = records.slice(0, filter.limit);
      }
    }

    return records;
  }

  public async delete(memoryId: string): Promise<boolean> {
    let removed = this.inMemoryFallback.delete(memoryId);
    if (this.isSqliteActive && this.db) {
      const stmt = this.db.prepare('DELETE FROM memories WHERE memory_id = ?');
      stmt.run(memoryId);
      removed = true;
    }
    return removed;
  }

  public async deleteBySession(sessionId: string): Promise<number> {
    let count = 0;
    for (const [id, rec] of this.inMemoryFallback.entries()) {
      if (rec.session_id === sessionId) {
        this.inMemoryFallback.delete(id);
        count++;
      }
    }
    if (this.isSqliteActive && this.db) {
      const stmt = this.db.prepare('DELETE FROM memories WHERE session_id = ?');
      stmt.run(sessionId);
    }
    return count;
  }

  public async deleteByProject(projectId: string): Promise<number> {
    let count = 0;
    for (const [id, rec] of this.inMemoryFallback.entries()) {
      if (rec.project_id === projectId) {
        this.inMemoryFallback.delete(id);
        count++;
      }
    }
    if (this.isSqliteActive && this.db) {
      const stmt = this.db.prepare('DELETE FROM memories WHERE project_id = ?');
      stmt.run(projectId);
    }
    return count;
  }

  public async count(): Promise<{ total: number; byType: Record<string, number> }> {
    const records = await this.list();
    const byType: Record<string, number> = {
      SHORT_TERM: 0,
      SESSION: 0,
      PROJECT: 0,
      LONG_TERM: 0,
    };
    records.forEach((r) => {
      byType[r.memory_type] = (byType[r.memory_type] || 0) + 1;
    });
    return { total: records.length, byType };
  }

  private mapRowToRecord(row: any): MemoryRecord {
    return {
      memory_id: row.memory_id,
      memory_type: row.memory_type as MemoryType,
      content: row.content,
      summary: row.summary,
      source: row.source,
      source_id: row.source_id,
      session_id: row.session_id,
      project_id: row.project_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      expires_at: row.expires_at,
      tags: JSON.parse(row.tags || '[]'),
      entities: JSON.parse(row.entities || '[]'),
      topics: JSON.parse(row.topics || '[]'),
      provenance: JSON.parse(row.provenance || '{}'),
      privacy_level: row.privacy_level,
      persistence_policy: row.persistence_policy,
      user_controlled: row.user_controlled === 1,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }
}
