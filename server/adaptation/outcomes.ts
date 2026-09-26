/**
 * NEXUS-AI Phase 7: Task Outcome Analyzer & Strategy Repository
 * Records task outcomes, tracks verified successes/failures, and maintains empirical strategy patterns.
 */

import fs from 'fs';
import path from 'path';
import type {
  TaskOutcomeRecord,
  StrategyRecord,
  LearningSignalType,
} from './types.js';
import { LearningSignalManager } from './signals.js';

export class OutcomeRepository {
  private static instance: OutcomeRepository | null = null;
  private db: any = null;
  private inMemoryOutcomes: Map<string, TaskOutcomeRecord> = new Map();
  private inMemoryStrategies: Map<string, StrategyRecord> = new Map();
  private dbPath: string;

  constructor(customDbPath?: string) {
    this.dbPath = customDbPath || path.resolve(process.cwd(), 'data', 'nexus_memory.db');
    this.initDatabase();
  }

  public static getInstance(customDbPath?: string): OutcomeRepository {
    if (!OutcomeRepository.instance) {
      OutcomeRepository.instance = new OutcomeRepository(customDbPath);
    }
    return OutcomeRepository.instance;
  }

  public static resetInstance(): void {
    OutcomeRepository.instance = null;
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
          CREATE TABLE IF NOT EXISTS task_outcomes (
            outcome_id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            execution_id TEXT,
            status TEXT NOT NULL,
            verification_state TEXT NOT NULL,
            tools_used TEXT NOT NULL,
            agents_used TEXT NOT NULL,
            duration_ms INTEGER NOT NULL,
            strategy_id TEXT,
            feedback TEXT,
            timestamp TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_outcome_task ON task_outcomes(task_id);

          CREATE TABLE IF NOT EXISTS task_strategies (
            strategy_id TEXT PRIMARY KEY,
            task_type TEXT NOT NULL,
            description TEXT NOT NULL,
            steps_pattern TEXT NOT NULL,
            success_count INTEGER NOT NULL,
            failure_count INTEGER NOT NULL,
            last_used_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_strat_type ON task_strategies(task_type);
        `);
      }
    } catch {
      this.db = null;
    }
  }

  public saveOutcome(record: TaskOutcomeRecord): void {
    this.inMemoryOutcomes.set(record.outcome_id, record);

    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO task_outcomes (
            outcome_id, task_id, execution_id, status, verification_state,
            tools_used, agents_used, duration_ms, strategy_id, feedback, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          record.outcome_id,
          record.task_id,
          record.execution_id || null,
          record.status,
          record.verification_state,
          JSON.stringify(record.tools_used || []),
          JSON.stringify(record.agents_used || []),
          record.duration_ms,
          record.strategy_id || null,
          record.feedback ? JSON.stringify(record.feedback) : null,
          record.timestamp
        );
      } catch {
        // fallback
      }
    }
  }

  public getOutcome(outcomeId: string): TaskOutcomeRecord | undefined {
    if (this.inMemoryOutcomes.has(outcomeId)) {
      return this.inMemoryOutcomes.get(outcomeId);
    }

    if (this.db) {
      try {
        const stmt = this.db.prepare('SELECT * FROM task_outcomes WHERE outcome_id = ?');
        const row = stmt.get(outcomeId);
        if (row) {
          const rec = this.rowToOutcome(row);
          this.inMemoryOutcomes.set(rec.outcome_id, rec);
          return rec;
        }
      } catch {
        // fallback
      }
    }

    return undefined;
  }

  public listOutcomes(filter?: { task_id?: string; limit?: number }): TaskOutcomeRecord[] {
    let all = Array.from(this.inMemoryOutcomes.values());

    if (this.db) {
      try {
        const stmt = this.db.prepare('SELECT * FROM task_outcomes ORDER BY timestamp DESC');
        const rows = stmt.all();
        if (rows && rows.length > 0) {
          all = rows.map((r: any) => this.rowToOutcome(r));
          for (const item of all) {
            this.inMemoryOutcomes.set(item.outcome_id, item);
          }
        }
      } catch {
        // fallback
      }
    }

    let filtered = all;
    if (filter?.task_id) {
      filtered = filtered.filter((o) => o.task_id === filter.task_id);
    }
    if (filter?.limit && filter.limit > 0) {
      filtered = filtered.slice(0, filter.limit);
    }
    return filtered;
  }

  public countOutcomes(): number {
    if (this.db) {
      try {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM task_outcomes');
        const row = stmt.get();
        if (row && typeof row.count === 'number') {
          return row.count;
        }
      } catch {
        // fallback
      }
    }
    return this.inMemoryOutcomes.size;
  }

  // --- STRATEGY MANAGEMENT ---

  public saveStrategy(strat: StrategyRecord): void {
    this.inMemoryStrategies.set(strat.strategy_id, strat);

    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO task_strategies (
            strategy_id, task_type, description, steps_pattern, success_count, failure_count, last_used_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          strat.strategy_id,
          strat.task_type,
          strat.description,
          JSON.stringify(strat.steps_pattern || []),
          strat.success_count,
          strat.failure_count,
          strat.last_used_at
        );
      } catch {
        // fallback
      }
    }
  }

  public getStrategy(strategyId: string): StrategyRecord | undefined {
    if (this.inMemoryStrategies.has(strategyId)) {
      return this.inMemoryStrategies.get(strategyId);
    }

    if (this.db) {
      try {
        const stmt = this.db.prepare('SELECT * FROM task_strategies WHERE strategy_id = ?');
        const row = stmt.get(strategyId);
        if (row) {
          const strat = this.rowToStrategy(row);
          this.inMemoryStrategies.set(strat.strategy_id, strat);
          return strat;
        }
      } catch {
        // fallback
      }
    }

    return undefined;
  }

  public listStrategies(taskType?: string): StrategyRecord[] {
    let all = Array.from(this.inMemoryStrategies.values());

    if (this.db) {
      try {
        const stmt = this.db.prepare('SELECT * FROM task_strategies');
        const rows = stmt.all();
        if (rows && rows.length > 0) {
          all = rows.map((r: any) => this.rowToStrategy(r));
          for (const s of all) {
            this.inMemoryStrategies.set(s.strategy_id, s);
          }
        }
      } catch {
        // fallback
      }
    }

    if (taskType) {
      return all.filter((s) => s.task_type.toLowerCase() === taskType.toLowerCase());
    }
    return all;
  }

  public countStrategies(): number {
    if (this.db) {
      try {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM task_strategies');
        const row = stmt.get();
        if (row && typeof row.count === 'number') {
          return row.count;
        }
      } catch {
        // fallback
      }
    }
    return this.inMemoryStrategies.size;
  }

  public clear(): void {
    this.inMemoryOutcomes.clear();
    this.inMemoryStrategies.clear();
    if (this.db) {
      try {
        this.db.exec('DELETE FROM task_outcomes; DELETE FROM task_strategies;');
      } catch {
        // ignore
      }
    }
  }

  private rowToOutcome(row: any): TaskOutcomeRecord {
    let tools = [];
    let agents = [];
    let fb = undefined;
    try {
      tools = JSON.parse(row.tools_used || '[]');
      agents = JSON.parse(row.agents_used || '[]');
      if (row.feedback) fb = JSON.parse(row.feedback);
    } catch {
      // fallback
    }
    return {
      outcome_id: row.outcome_id,
      task_id: row.task_id,
      execution_id: row.execution_id || undefined,
      status: row.status,
      verification_state: row.verification_state,
      tools_used: tools,
      agents_used: agents,
      duration_ms: Number(row.duration_ms),
      strategy_id: row.strategy_id || undefined,
      feedback: fb,
      timestamp: row.timestamp,
    };
  }

  private rowToStrategy(row: any): StrategyRecord {
    let steps = [];
    try {
      steps = JSON.parse(row.steps_pattern || '[]');
    } catch {
      // fallback
    }
    return {
      strategy_id: row.strategy_id,
      task_type: row.task_type,
      description: row.description,
      steps_pattern: steps,
      success_count: Number(row.success_count),
      failure_count: Number(row.failure_count),
      last_used_at: row.last_used_at,
    };
  }
}

export class OutcomeAnalyzer {
  private repository: OutcomeRepository;
  private signalManager: LearningSignalManager;

  constructor(repository?: OutcomeRepository, signalManager?: LearningSignalManager) {
    this.repository = repository || OutcomeRepository.getInstance();
    this.signalManager = signalManager || new LearningSignalManager();
  }

  /**
   * Record task execution outcome and trigger adaptive learning signals.
   * If verification succeeded and status is SUCCESS, emits VERIFIED_SUCCESS.
   * If verification failed or tool failed, emits VERIFIED_FAILURE or TOOL_FAILURE.
   */
  public analyzeAndRecordOutcome(params: {
    task_id: string;
    execution_id?: string;
    status: string;
    verification_state: string;
    tools_used: string[];
    agents_used: string[];
    duration_ms: number;
    strategy_id?: string;
  }): TaskOutcomeRecord {
    const outcome: TaskOutcomeRecord = {
      outcome_id: `out-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      task_id: params.task_id,
      execution_id: params.execution_id,
      status: params.status,
      verification_state: params.verification_state,
      tools_used: params.tools_used,
      agents_used: params.agents_used,
      duration_ms: params.duration_ms,
      strategy_id: params.strategy_id,
      timestamp: new Date().toISOString(),
    };

    this.repository.saveOutcome(outcome);

    const isVerifiedSuccess =
      params.status === 'SUCCESS' &&
      (params.verification_state === 'VERIFIED' || params.verification_state === 'VALID');

    // Update strategy metrics if strategy_id was specified
    if (params.strategy_id) {
      const strat = this.repository.getStrategy(params.strategy_id);
      if (strat) {
        if (isVerifiedSuccess) {
          strat.success_count += 1;
        } else {
          strat.failure_count += 1;
        }
        strat.last_used_at = new Date().toISOString();
        this.repository.saveStrategy(strat);
      }
    }

    // Emit Learning Signal
    let signalType: LearningSignalType = 'VERIFIED_FAILURE';
    if (isVerifiedSuccess) {
      signalType = 'VERIFIED_SUCCESS';
    } else if (params.status === 'TOOL_ERROR' || params.status === 'FAILED') {
      signalType = params.tools_used.length > 0 ? 'TOOL_FAILURE' : 'VERIFIED_FAILURE';
    }

    this.signalManager.emitSignal({
      type: signalType,
      source: 'outcome_analyzer',
      task_id: params.task_id,
      execution_id: params.execution_id,
      context: {
        status: params.status,
        verification_state: params.verification_state,
        tools_used: params.tools_used,
        agents_used: params.agents_used,
        strategy_id: params.strategy_id,
      },
    });

    return outcome;
  }

  /**
   * Recommend empirical best strategy based on actual recorded outcomes (Section 21 & 24).
   */
  public getBestStrategy(taskType: string): StrategyRecord | undefined {
    const candidates = this.repository.listStrategies(taskType);
    if (candidates.length === 0) return undefined;

    // Filter to strategies that have at least one success and higher success than failure
    candidates.sort((a, b) => {
      const aNet = a.success_count - a.failure_count;
      const bNet = b.success_count - b.failure_count;
      if (bNet !== aNet) return bNet - aNet;
      return b.success_count - a.success_count;
    });

    return candidates[0];
  }

  public getRepository(): OutcomeRepository {
    return this.repository;
  }
}
