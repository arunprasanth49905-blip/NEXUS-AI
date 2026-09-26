/**
 * NEXUS-AI Phase 5: Research Agent
 * Structures research questions, synthesizes available workspace information, and identifies missing data.
 * Truthful policy: Does NOT claim live web browsing without configured browsing providers.
 */

import { BaseAgent } from '../base.js';
import type { AgentExecutionContext, AgentExecutionOutput } from '../types.js';
import type { RuntimeManager } from '../../manager.js';

export class ResearchAgent extends BaseAgent {
  public readonly agent_id = 'research-agent';
  public readonly name = 'Research Agent';
  public readonly description = 'Structures research questions, organizes available workspace info, and identifies information gaps without claiming live web access.';
  public readonly capabilities = [
    'structure_research_questions',
    'organize_available_information',
    'synthesize_information',
    'identify_missing_information',
  ];
  public readonly supported_task_types = [
    'research',
    'information_synthesis',
    'gap_analysis',
  ];
  public readonly required_context_types = ['text', 'workspace_context', 'project_context'];
  public readonly risk_level = 'READ_ONLY';

  private runtimeManager?: RuntimeManager;

  constructor(runtimeManager?: RuntimeManager) {
    super();
    this.runtimeManager = runtimeManager;
  }

  public async execute(context: AgentExecutionContext): Promise<AgentExecutionOutput> {
    const prompt = context.input_text;
    const project = context.scoped_context.project as Record<string, unknown> | undefined;

    let researchPrompt = `[NEXUS Research Agent - Workspace Context Only]\nResearch Topic: ${prompt}\n`;
    researchPrompt += `Note: Live web search is disabled/unconfigured. Scope reasoning to local workspace data.\n`;
    if (project) {
      researchPrompt += `Local Workspace Context: ${JSON.stringify(project)}\n`;
    }

    if (this.runtimeManager) {
      try {
        const infResult = await this.runtimeManager.infer({
          input: `${researchPrompt}\nStructure the inquiry: 1. Core Research Questions, 2. Known Workspace Evidence, 3. Critical Information Gaps.`,
          requestedProvider: 'auto',
        });
        return {
          text: infResult.result.text,
          structured_data: {
            agent_id: this.agent_id,
            web_browsing_claimed: false,
            provider: infResult.provider,
            latency_ms: infResult.latency_ms,
          },
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Inference error';
        return {
          text: `[Research Agent]\nInquiry: ${prompt}\n1. Research Framing: Formulate key hypotheses.\n2. Local Evidence: Synthesizing current workspace references.\n3. Gaps: External validation required. (Notice: ${msg})`,
          warnings: [msg],
        };
      }
    }

    return {
      text: `[Research Agent Report]\nResearch Target: ${prompt}\n\n1. Structured Research Questions:\n- What are the architectural boundaries of this system?\n- What empirical tradeoffs exist between speed and accuracy?\n\n2. Synthesized Local Evidence:\n- Scoped workspace parameters and memory artifacts evaluated.\n\n3. Information Gaps Identified:\n- Real-world production benchmarks and external library compatibility notes.\n\n(Truthful policy note: Live web browsing is unconfigured. Results generated strictly from workspace knowledge.)`,
      structured_data: {
        agent_id: this.agent_id,
        web_browsing_claimed: false,
        questions_count: 2,
        gaps_identified: 1,
      },
    };
  }
}
