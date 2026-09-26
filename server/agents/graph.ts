/**
 * NEXUS-AI Phase 5: Dependency Graph
 * Directed Acyclic Graph (DAG) management, readiness calculation, and failure propagation.
 */

import type { PlanStep } from './types.js';

export class DependencyGraph {
  private steps: Map<string, PlanStep> = new Map();
  private dependencies: Map<string, Set<string>> = new Map(); // step_id -> Set of prerequisite step_ids
  private dependents: Map<string, Set<string>> = new Map();   // step_id -> Set of downstream step_ids

  constructor(steps: PlanStep[]) {
    for (const step of steps) {
      this.steps.set(step.step_id, step);
      this.dependencies.set(step.step_id, new Set(step.dependencies || []));
      if (!this.dependents.has(step.step_id)) {
        this.dependents.set(step.step_id, new Set());
      }
    }

    // Build reverse dependents index
    for (const [stepId, prereqs] of this.dependencies.entries()) {
      for (const prereq of prereqs) {
        if (!this.dependents.has(prereq)) {
          this.dependents.set(prereq, new Set());
        }
        this.dependents.get(prereq)!.add(stepId);
      }
    }
  }

  /**
   * Detect if circular dependency exists in graph.
   */
  public hasCycle(): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const checkCycle = (stepId: string): boolean => {
      visited.add(stepId);
      recStack.add(stepId);

      const prereqs = this.dependencies.get(stepId) || new Set();
      for (const prereq of prereqs) {
        if (!visited.has(prereq)) {
          if (checkCycle(prereq)) return true;
        } else if (recStack.has(prereq)) {
          return true;
        }
      }

      recStack.delete(stepId);
      return false;
    };

    for (const stepId of this.steps.keys()) {
      if (!visited.has(stepId)) {
        if (checkCycle(stepId)) return true;
      }
    }
    return false;
  }

  /**
   * Determine steps that are ready for immediate execution:
   * Status is PENDING or READY, and all prerequisite steps have completed successfully.
   */
  public getReadySteps(completedStepIds: Set<string>): PlanStep[] {
    const ready: PlanStep[] = [];

    for (const [stepId, step] of this.steps.entries()) {
      if (completedStepIds.has(stepId)) {
        continue;
      }
      if (step.status !== 'PENDING' && step.status !== 'READY') {
        continue;
      }

      const prereqs = this.dependencies.get(stepId) || new Set();
      const allPrereqsMet = Array.from(prereqs).every((p) => completedStepIds.has(p));

      if (allPrereqsMet) {
        ready.push(step);
      }
    }

    return ready;
  }

  /**
   * Determine steps blocked on prerequisites that haven't finished yet.
   */
  public getBlockedSteps(completedStepIds: Set<string>): PlanStep[] {
    const blocked: PlanStep[] = [];

    for (const [stepId, step] of this.steps.entries()) {
      if (step.status !== 'PENDING' && step.status !== 'WAITING') {
        continue;
      }

      const prereqs = this.dependencies.get(stepId) || new Set();
      const hasUnmetPrereq = Array.from(prereqs).some((p) => !completedStepIds.has(p));

      if (hasUnmetPrereq) {
        blocked.push(step);
      }
    }

    return blocked;
  }

  /**
   * Find all downstream steps that transitively depend on a failed step.
   */
  public getDependentStepsOfFailed(failedStepId: string): PlanStep[] {
    const affected = new Set<string>();
    const queue = [failedStepId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const downstream = this.dependents.get(current) || new Set();
      for (const d of downstream) {
        if (!affected.has(d)) {
          affected.add(d);
          queue.push(d);
        }
      }
    }

    return Array.from(affected)
      .map((id) => this.steps.get(id))
      .filter((s): s is PlanStep => !!s);
  }

  /**
   * Get direct prerequisite step IDs for a given step.
   */
  public getPrerequisites(stepId: string): string[] {
    return Array.from(this.dependencies.get(stepId) || []);
  }
}
