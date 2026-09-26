/**
 * NEXUS-AI Phase 5: Result Model & Aggregator
 * Standardizes structured outputs, tracks provenance, and aggregates partial results.
 */

import type { AgentExecutionRecord } from './types.js';

export class ResultAggregator {
  private results: Map<string, AgentExecutionRecord> = new Map(); // step_id -> record

  public recordResult(record: AgentExecutionRecord): void {
    const key = record.step_id || record.execution_id;
    this.results.set(key, record);
  }

  public getResult(step_id: string): AgentExecutionRecord | undefined {
    return this.results.get(step_id);
  }

  public getAllResults(): Record<string, AgentExecutionRecord> {
    const obj: Record<string, AgentExecutionRecord> = {};
    for (const [k, v] of this.results.entries()) {
      obj[k] = v;
    }
    return obj;
  }

  public getSuccessfulResults(): AgentExecutionRecord[] {
    return Array.from(this.results.values()).filter((r) => r.status === 'COMPLETED');
  }

  public getFailedResults(): AgentExecutionRecord[] {
    return Array.from(this.results.values()).filter((r) => r.status === 'FAILED' || r.status === 'TIMED_OUT');
  }

  public hasFailures(): boolean {
    return this.getFailedResults().length > 0;
  }

  /**
   * Synthesize final user-facing text response from aggregated step outputs.
   * Preserves provenance and partial progress if failures occur.
   */
  public synthesizeFinalOutput(objective: string): string {
    const records = Array.from(this.results.values());
    if (records.length === 0) {
      return `Task: ${objective}\nStatus: No execution steps were completed.`;
    }

    // If single step, return its direct text output
    if (records.length === 1) {
      const rec = records[0];
      const text = (rec.output?.text as string) || (rec.output?.summary as string) || '';
      if (rec.status === 'FAILED') {
        return `Task could not be completed: ${rec.errors.join('; ')}`;
      }
      return text || `Completed successfully via ${rec.agent_id}.`;
    }

    // Multi-step aggregation: combine step outputs in logical sequence
    const parts: string[] = [];
    parts.push(`### Executive Summary for: "${objective}"\n`);

    for (const rec of records) {
      const stepLabel = rec.step_id ? `Step ${rec.step_id.replace('step-', '')}` : 'Step';
      if (rec.status === 'COMPLETED') {
        const text = (rec.output?.text as string) || JSON.stringify(rec.output || {});
        parts.push(`**${stepLabel} (${rec.agent_id}):**\n${text}\n`);
      } else if (rec.status === 'FAILED') {
        parts.push(`**${stepLabel} (${rec.agent_id}) [FAILED]:**\n${rec.errors.join(', ')}\n`);
      } else if (rec.status === 'TIMED_OUT') {
        parts.push(`**${stepLabel} (${rec.agent_id}) [TIMED OUT]:** Execution exceeded allocated threshold.\n`);
      } else if (rec.status === 'CANCELLED') {
        parts.push(`**${stepLabel} (${rec.agent_id}) [CANCELLED]:** Step halted due to task cancellation.\n`);
      }
    }

    return parts.join('\n');
  }
}
