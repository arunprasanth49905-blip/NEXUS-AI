/**
 * NEXUS-AI Phase 5: Context Scoping & Memory Integration
 * Enforces principle of least privilege for agent context and protects memory store.
 */

import { ContextMemoryEngine } from '../context_memory/manager.js';
import type { BaseAgent } from './base.js';

export interface ScopedAgentContext {
  task_id: string;
  agent_id: string;
  scoped_payload: Record<string, unknown>;
  scoped_context_types: string[];
}

export class ContextScoper {
  private contextMemoryEngine: ContextMemoryEngine;

  constructor(contextMemoryEngine?: ContextMemoryEngine) {
    this.contextMemoryEngine = contextMemoryEngine || ContextMemoryEngine.getInstance();
  }

  /**
   * Scope context specifically to what the agent requires.
   * Prevents leaking unneeded memory or sensitive context across agent boundaries.
   */
  public async scopeForAgent(
    agent: BaseAgent,
    rawContext: Record<string, unknown>,
    query: string
  ): Promise<ScopedAgentContext> {
    const requiredTypes = agent.required_context_types;
    const scoped: Record<string, unknown> = {};

    // 1. Document Context for Document Agent
    if (requiredTypes.includes('document')) {
      if (rawContext.document) {
        scoped.document = rawContext.document;
      } else if (rawContext.file) {
        scoped.document = rawContext.file;
      }
    }

    // 2. Visual Context for Vision Agent
    if (requiredTypes.includes('screen') || requiredTypes.includes('camera') || requiredTypes.includes('visual')) {
      if (rawContext.screen) scoped.screen = rawContext.screen;
      if (rawContext.camera) scoped.camera = rawContext.camera;
      if (rawContext.visual) scoped.visual = rawContext.visual;
    }

    // 3. Error / Stack Trace for Debug Agent
    if (requiredTypes.includes('error') || requiredTypes.includes('stack_trace')) {
      if (rawContext.error) scoped.error = rawContext.error;
      if (rawContext.stack_trace) scoped.stack_trace = rawContext.stack_trace;
      if (rawContext.project) scoped.project = rawContext.project;
    }

    // 4. Memory Context for Knowledge / Research Agent (retrieved dynamically, bounded)
    if (requiredTypes.includes('memory') || requiredTypes.includes('project_context')) {
      try {
        const memories = await this.contextMemoryEngine.getRetrievalEngine().retrieve({
          query,
          limit: 3, // Bounded: minimum necessary
        });
        scoped.memories = memories.map((m) => ({
          memory_id: m.memory.memory_id,
          summary: m.memory.summary,
          content: m.memory.content,
          memory_type: m.memory.memory_type,
        }));
      } catch {
        scoped.memories = [];
      }
    }

    // 5. Project context
    if (requiredTypes.includes('project_context') && rawContext.project) {
      scoped.project = rawContext.project;
    }

    // Always include sanitized input text
    scoped.input_text = query;

    return {
      task_id: (rawContext.task_id as string) || 'unknown',
      agent_id: agent.agent_id,
      scoped_payload: scoped,
      scoped_context_types: Object.keys(scoped),
    };
  }

  /**
   * Evaluate whether an agent result can become a memory candidate under Phase 4 policy.
   * Agents CANNOT write long-term memory directly.
   */
  public async submitMemoryCandidate(params: {
    content: string;
    summary: string;
    agent_id: string;
    user_controlled?: boolean;
  }): Promise<{ stored: boolean; reason: string }> {
    // Audit candidate through Phase 4 PrivacyGuard & Secret Detection
    return await this.contextMemoryEngine.evaluateAndStoreMemory({
      content: params.content,
      summary: params.summary,
      memory_type: 'PROJECT',
      source: 'system',
      user_controlled: params.user_controlled ?? false,
      reason: `Agent (${params.agent_id}) execution candidate evaluated against Phase 4 policy`,
    });
  }
}
