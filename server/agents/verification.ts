/**
 * NEXUS-AI Phase 5: Verification Engine & Conflict Detection
 * Validates plan execution integrity, detects output contradictions, and generates verification reports.
 */

import type {
  TaskPlan,
  AgentExecutionRecord,
  VerificationReport,
  VerificationState,
  PlanConflict,
} from './types.js';

export class VerificationEngine {
  /**
   * Verify all step outputs against the declared task plan.
   * Truthful verification without synthetic confidence or accuracy scores.
   */
  public static verify(
    plan: TaskPlan,
    results: Record<string, AgentExecutionRecord>
  ): VerificationReport {
    const totalSteps = plan.steps.length;
    let completedCount = 0;
    const missingOutputs: string[] = [];
    const failures: string[] = [];
    const conflicts: PlanConflict[] = [];

    // 1. Audit each step in plan
    for (const step of plan.steps) {
      const rec = results[step.step_id];
      if (!rec) {
        missingOutputs.push(step.step_id);
        continue;
      }

      if (rec.status === 'COMPLETED') {
        if (!rec.output || (typeof rec.output.text === 'string' && !rec.output.text.trim())) {
          missingOutputs.push(step.step_id);
        } else {
          completedCount++;
        }
      } else if (rec.status === 'FAILED' || rec.status === 'TIMED_OUT') {
        failures.push(`${step.step_id} (${rec.agent_id}): ${rec.errors.join('; ') || rec.status}`);
      }
    }

    // 2. Conflict Detection across step results
    // Example: step-1 and step-2 reporting opposite findings or contradictory flags
    const executedRecords = Object.values(results);
    for (let i = 0; i < executedRecords.length; i++) {
      for (let j = i + 1; j < executedRecords.length; j++) {
        const r1 = executedRecords[i];
        const r2 = executedRecords[j];

        if (r1.status === 'COMPLETED' && r2.status === 'COMPLETED' && r1.output && r2.output) {
          const t1 = String(r1.output.text || '').toLowerCase();
          const t2 = String(r2.output.text || '').toLowerCase();

          // Check for semantic contradiction markers (e.g. one claims incompatible, other claims compatible)
          const c1ClaimsCompatible = t1.includes('fully compatible') || t1.includes('no errors found');
          const c2ClaimsIncompatible = t2.includes('incompatible') || t2.includes('critical error detected');

          if (c1ClaimsCompatible && c2ClaimsIncompatible) {
            conflicts.push({
              conflict_id: `conf-${Date.now()}-${r1.step_id}-${r2.step_id}`,
              source_agents: [r1.agent_id, r2.agent_id],
              affected_step_id: r2.step_id || 'unknown',
              description: `Contradictory status detected between ${r1.agent_id} and ${r2.agent_id}: divergent compatibility / error conclusions.`,
              conflicting_data: {
                [r1.agent_id]: r1.output,
                [r2.agent_id]: r2.output,
              },
            });
          }
        }
      }
    }

    // 3. Determine Verification State
    let state: VerificationState = 'VALID';
    let summary = 'All plan steps completed successfully with verified outputs.';

    if (conflicts.length > 0) {
      state = 'NEEDS_REVIEW';
      summary = `Execution completed with ${conflicts.length} contradictory finding(s) between agents. User review required.`;
    } else if (failures.length > 0) {
      if (completedCount > 0) {
        state = 'PARTIAL';
        summary = `Partial execution: ${completedCount}/${totalSteps} step(s) completed. ${failures.length} step(s) failed.`;
      } else {
        state = 'FAILED';
        summary = `Plan execution failed. No steps completed successfully.`;
      }
    } else if (missingOutputs.length > 0) {
      state = 'PARTIAL';
      summary = `Execution incomplete: ${missingOutputs.length} step output(s) missing or pending.`;
    }

    return {
      state,
      completed_steps: completedCount,
      total_steps: totalSteps,
      missing_outputs: missingOutputs,
      conflicts,
      failures,
      summary,
      timestamp: new Date().toISOString(),
    };
  }
}
