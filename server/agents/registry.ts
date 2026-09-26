/**
 * NEXUS-AI Phase 5: Agent Registry
 * Source of truth for available agents and capability lookup.
 */

import { BaseAgent } from './base.js';
import type { AgentInfo } from './types.js';

export class AgentRegistry {
  private static instance: AgentRegistry | null = null;
  private agents: Map<string, BaseAgent> = new Map();

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Reset instance (useful for clean testing states)
   */
  public static resetInstance(): void {
    AgentRegistry.instance = null;
  }

  public register(agent: BaseAgent): void {
    if (!agent || !agent.agent_id) {
      throw new Error('Invalid agent: agent and agent_id are required.');
    }
    this.agents.set(agent.agent_id, agent);
  }

  public unregister(agent_id: string): boolean {
    return this.agents.delete(agent_id);
  }

  public get(agent_id: string): BaseAgent | undefined {
    return this.agents.get(agent_id);
  }

  public list(): AgentInfo[] {
    return Array.from(this.agents.values()).map((agent) => agent.getInfo());
  }

  public getAll(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  public find_by_capability(capability: string): BaseAgent[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.availability !== 'UNAVAILABLE' && agent.hasCapability(capability)
    );
  }

  public find_by_task_type(task_type: string): BaseAgent[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.availability !== 'UNAVAILABLE' && agent.supportsTaskType(task_type)
    );
  }

  public count(): number {
    return this.agents.size;
  }

  public clear(): void {
    this.agents.clear();
  }
}
