import type { MemoryRecord, ActiveTask, CanonicalContext } from '../../src/types/context_memory.js';
import type { MemoryRepository } from './repository.js';

export interface RetrievalQuery {
  query: string;
  session_id?: string;
  project_id?: string;
  active_task?: ActiveTask | null;
  current_context?: CanonicalContext;
  limit?: number;
}

export class MemoryRetrievalEngine {
  private repository: MemoryRepository;

  constructor(repository: MemoryRepository) {
    this.repository = repository;
  }

  public async retrieve(query: RetrievalQuery): Promise<Array<{ memory: MemoryRecord; score: number; match_reasons: string[] }>> {
    const allMemories = await this.repository.list({
      project_id: query.project_id,
    });

    const queryTerms = query.query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const scoredList: Array<{ memory: MemoryRecord; score: number; match_reasons: string[] }> = [];

    for (const mem of allMemories) {
      let score = 0;
      const reasons: string[] = [];
      const memLower = mem.content.toLowerCase();

      // 1. Same active task correlation (+0.4)
      if (query.active_task && (mem.metadata?.task_id === query.active_task.task_id || mem.summary.includes(query.active_task.title))) {
        score += 0.4;
        reasons.push(`Related to current active task: "${query.active_task.title}"`);
      }

      // 2. Same session correlation (+0.25)
      if (query.session_id && mem.session_id === query.session_id) {
        score += 0.25;
        reasons.push('Created in current session');
      }

      // 3. Project-level match (+0.2)
      if (query.project_id && mem.project_id === query.project_id && mem.memory_type === 'PROJECT') {
        score += 0.2;
        reasons.push('Relevant project architecture/specification');
      }

      // 4. Long-term user preferences (+0.3)
      if (mem.memory_type === 'LONG_TERM') {
        score += 0.3;
        reasons.push('Retained long-term preference');
      }

      // 5. Keyword token overlap (up to +0.5)
      let termMatches = 0;
      for (const term of queryTerms) {
        if (memLower.includes(term)) {
          termMatches++;
        }
      }
      if (termMatches > 0) {
        const termScore = Math.min(0.5, termMatches * 0.15);
        score += termScore;
        reasons.push(`Matched ${termMatches} keyword(s) with prompt`);
      }

      // 6. Recency boost (up to +0.1)
      const ageHours = (Date.now() - new Date(mem.created_at).getTime()) / (1000 * 60 * 60);
      if (ageHours < 24) {
        score += 0.1;
      }

      if (score > 0.2) {
        scoredList.push({
          memory: mem,
          score: Math.min(1.0, Number(score.toFixed(2))),
          match_reasons: reasons,
        });
      }
    }

    // Sort descending by deterministic relevance score
    scoredList.sort((a, b) => b.score - a.score);
    return scoredList.slice(0, query.limit || 5);
  }
}
