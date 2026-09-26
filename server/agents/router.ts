/**
 * NEXUS-AI Phase 5: BrainRouter
 * Routes incoming intents to appropriate capabilities, agents, and Phase 2 runtime providers.
 */

import { TaskClassifier } from './task.js';
import { AgentSelector } from './selector.js';
import { AgentRegistry } from './registry.js';
import type { RuntimeManager } from '../manager.js';
import type { ProviderId } from '../../src/types/runtime.js';

export interface BrainRoutingDecision {
  task_type: string;
  complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  required_capabilities: string[];
  selected_agent_id?: string;
  recommended_runtime_provider: ProviderId | 'auto';
  is_multistep: boolean;
  routing_rationale: string;
}

export class BrainRouter {
  private selector: AgentSelector;
  private registry: AgentRegistry;
  private runtimeManager?: RuntimeManager;

  constructor(
    registry = AgentRegistry.getInstance(),
    runtimeManager?: RuntimeManager
  ) {
    this.registry = registry;
    this.runtimeManager = runtimeManager;
    this.selector = new AgentSelector(this.registry);
  }

  /**
   * Route user request to capability requirements, agent candidate, and runtime provider.
   */
  public route(userRequest: string, context?: Record<string, unknown>): BrainRoutingDecision {
    const classification = TaskClassifier.classify(userRequest, context);

    const selection = this.selector.selectAgent({
      required_capabilities: classification.required_capabilities,
      task_type: classification.task_type,
      preferred_agent_id: classification.suggested_agent_id,
    });

    // Check runtime provider recommendation based on host hardware availability
    let recommendedProvider: ProviderId | 'auto' = 'auto';
    if (this.runtimeManager) {
      const rtStatus = this.runtimeManager.getRuntimeStatus();
      recommendedProvider = rtStatus.active_provider;
    }

    const rationale = classification.is_multistep
      ? `Multi-step request classified as ${classification.complexity}. Requires planning & agent decomposition.`
      : `Single-step ${classification.task_type} routed to ${selection.agent_id || 'fallback knowledge agent'}.`;

    return {
      task_type: classification.task_type,
      complexity: classification.complexity,
      required_capabilities: classification.required_capabilities,
      selected_agent_id: selection.agent_id,
      recommended_runtime_provider: recommendedProvider,
      is_multistep: classification.is_multistep,
      routing_rationale: rationale,
    };
  }
}
