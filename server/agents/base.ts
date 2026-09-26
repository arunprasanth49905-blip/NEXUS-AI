/**
 * NEXUS-AI Phase 5: Base Agent Class
 * Common agent abstraction for all specialized agents.
 */

import type {
  AgentInfo,
  AgentRiskLevel,
  AgentAvailability,
  AgentExecutionContext,
  AgentExecutionOutput,
} from './types.js';

export abstract class BaseAgent {
  public abstract readonly agent_id: string;
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly capabilities: string[];
  public abstract readonly supported_task_types: string[];
  public abstract readonly required_context_types: string[];
  public abstract readonly risk_level: AgentRiskLevel;
  public availability: AgentAvailability = 'AVAILABLE';
  public metadata: Record<string, unknown> = {};

  public getInfo(): AgentInfo {
    return {
      agent_id: this.agent_id,
      name: this.name,
      description: this.description,
      capabilities: [...this.capabilities],
      supported_task_types: [...this.supported_task_types],
      required_context_types: [...this.required_context_types],
      risk_level: this.risk_level,
      availability: this.availability,
      metadata: { ...this.metadata },
    };
  }

  public hasCapability(capability: string): boolean {
    return this.capabilities.includes(capability);
  }

  public supportsTaskType(taskType: string): boolean {
    return this.supported_task_types.includes(taskType);
  }

  /**
   * Execute agent logic with scoped context and cancellation support.
   */
  public abstract execute(context: AgentExecutionContext): Promise<AgentExecutionOutput>;
}
