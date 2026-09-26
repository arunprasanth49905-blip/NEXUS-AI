/**
 * NEXUS-AI Phase 5: Agent Selector
 * Capability-based dynamic agent matching, permission validation, and availability verification.
 */

import { AgentRegistry } from './registry.js';
import { BaseAgent } from './base.js';
import type { AgentRiskLevel } from './types.js';

export interface AgentSelectionCriteria {
  required_capabilities: string[];
  task_type?: string;
  context_types?: string[];
  max_acceptable_risk?: AgentRiskLevel;
  preferred_agent_id?: string;
}

export interface AgentSelectionResult {
  selected: boolean;
  agent?: BaseAgent;
  agent_id?: string;
  matched_capabilities: string[];
  missing_capabilities: string[];
  error?: string;
}

export class AgentSelector {
  private registry: AgentRegistry;

  constructor(registry = AgentRegistry.getInstance()) {
    this.registry = registry;
  }

  /**
   * Dynamically match an agent from the registry based on required capabilities and availability.
   * Does NOT use hard-coded switch statements.
   */
  public selectAgent(criteria: AgentSelectionCriteria): AgentSelectionResult {
    const { required_capabilities, task_type, preferred_agent_id } = criteria;
    const availableAgents = this.registry.getAll().filter((a) => a.availability === 'AVAILABLE');

    // 1. If preferred_agent_id is requested and valid, verify its capability compatibility
    if (preferred_agent_id) {
      const candidate = this.registry.get(preferred_agent_id);
      if (candidate && candidate.availability === 'AVAILABLE') {
        const matched = required_capabilities.filter((c) => candidate.hasCapability(c));
        const missing = required_capabilities.filter((c) => !candidate.hasCapability(c));
        
        // If it matches at least one capability or no specific capabilities are demanded
        if (matched.length > 0 || required_capabilities.length === 0) {
          return {
            selected: true,
            agent: candidate,
            agent_id: candidate.agent_id,
            matched_capabilities: matched,
            missing_capabilities: missing,
          };
        }
      }
    }

    // 2. Score candidates by number of matched capabilities
    let bestMatch: BaseAgent | null = null;
    let highestMatches = 0;
    let bestMatchedCaps: string[] = [];
    let bestMissingCaps: string[] = [];

    for (const candidate of availableAgents) {
      const matched = required_capabilities.filter((c) => candidate.hasCapability(c));
      const missing = required_capabilities.filter((c) => !candidate.hasCapability(c));

      // Extra bonus score if candidate explicitly supports this task_type
      let score = matched.length;
      if (task_type && candidate.supportsTaskType(task_type)) {
        score += 1;
      }

      if (score > highestMatches && matched.length > 0) {
        highestMatches = score;
        bestMatch = candidate;
        bestMatchedCaps = matched;
        bestMissingCaps = missing;
      }
    }

    if (bestMatch) {
      return {
        selected: true,
        agent: bestMatch,
        agent_id: bestMatch.agent_id,
        matched_capabilities: bestMatchedCaps,
        missing_capabilities: bestMissingCaps,
      };
    }

    // Structured failure when no agent qualifies
    return {
      selected: false,
      matched_capabilities: [],
      missing_capabilities: [...required_capabilities],
      error: 'No suitable NEXUS agent is currently available for this task.',
    };
  }

  /**
   * Validate whether an agent is authorized for a specific requested capability.
   */
  public validatePermission(agent_id: string, capability: string): boolean {
    const agent = this.registry.get(agent_id);
    if (!agent) return false;
    return agent.hasCapability(capability);
  }
}
