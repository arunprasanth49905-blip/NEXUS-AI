/**
 * NEXUS-AI Phase 5: Productivity Agent
 * Structures information, creates plans, organizes tasks, creates outlines, and drafts content into actionable formats.
 */

import { BaseAgent } from '../base.js';
import type { AgentExecutionContext, AgentExecutionOutput } from '../types.js';
import type { RuntimeManager } from '../../manager.js';

export class ProductivityAgent extends BaseAgent {
  public readonly agent_id = 'productivity-agent';
  public readonly name = 'Productivity Agent';
  public readonly description = 'Structures information, creates plans, organizes tasks, creates outlines, and transforms information into actionable structures.';
  public readonly capabilities = [
    'structure_information',
    'create_plans',
    'organize_tasks',
    'create_outlines',
    'draft_content',
    'transform_information',
  ];
  public readonly supported_task_types = [
    'planning',
    'outlining',
    'structuring',
    'organization',
    'drafting',
  ];
  public readonly required_context_types = ['text', 'task_context'];
  public readonly risk_level = 'READ_ONLY';

  private runtimeManager?: RuntimeManager;

  constructor(runtimeManager?: RuntimeManager) {
    super();
    this.runtimeManager = runtimeManager;
  }

  public async execute(context: AgentExecutionContext): Promise<AgentExecutionOutput> {
    const prompt = context.input_text;
    const dependencyOutputs = context.dependency_outputs || {};

    let structuredContext = `[NEXUS Productivity Agent]\nTask Goal: ${prompt}\n`;
    if (Object.keys(dependencyOutputs).length > 0) {
      structuredContext += `\nInputs to structure:\n`;
      for (const [stepId, output] of Object.entries(dependencyOutputs)) {
        structuredContext += `- From step ${stepId}: ${typeof output === 'string' ? output : JSON.stringify(output)}\n`;
      }
    }

    if (this.runtimeManager) {
      try {
        const infResult = await this.runtimeManager.infer({
          input: `Organize and create an actionable structure for:\n${structuredContext}`,
          requestedProvider: 'auto',
        });
        return {
          text: infResult.result.text,
          structured_data: {
            agent_id: this.agent_id,
            actionable_items: ['Section 1: Objective', 'Section 2: Execution Path', 'Section 3: Deliverables'],
            provider: infResult.provider,
            latency_ms: infResult.latency_ms,
          },
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Inference error';
        return {
          text: `[Productivity Agent Fallback]\nStructured Outline for: ${prompt}\n1. Objectives & Scope\n2. Key Workstreams\n3. Actionable Next Steps`,
          warnings: [msg],
        };
      }
    }

    return {
      text: `[Productivity Agent]\nStructured Action Plan & Presentation Layout:\n1. Executive Summary & Problem Framing\n2. Analysis of Findings\n3. Technical Gaps & Remediation Strategy\n4. Roadmap & Milestone Schedule`,
      structured_data: {
        agent_id: this.agent_id,
        sections: [
          { title: 'Executive Summary', order: 1 },
          { title: 'Technical Findings', order: 2 },
          { title: 'Gap Remediation', order: 3 },
          { title: 'Action Plan', order: 4 },
        ],
      },
    };
  }
}
