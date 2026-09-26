/**
 * NEXUS-AI Phase 5: Study Agent
 * Explains academic topics, summarizes study materials, creates study plans, and generates practice questions.
 */

import { BaseAgent } from '../base.js';
import type { AgentExecutionContext, AgentExecutionOutput } from '../types.js';
import type { RuntimeManager } from '../../manager.js';

export class StudyAgent extends BaseAgent {
  public readonly agent_id = 'study-agent';
  public readonly name = 'Study Agent';
  public readonly description = 'Explains academic and technical topics, summarizes study material, creates study plans, and generates practice questions.';
  public readonly capabilities = [
    'explain_academic_topics',
    'summarize_study_material',
    'create_study_plans',
    'generate_practice_questions',
    'assist_learning',
  ];
  public readonly supported_task_types = [
    'study',
    'academic',
    'practice_questions',
    'learning',
    'curriculum',
  ];
  public readonly required_context_types = ['text', 'study_materials'];
  public readonly risk_level = 'READ_ONLY';

  private runtimeManager?: RuntimeManager;

  constructor(runtimeManager?: RuntimeManager) {
    super();
    this.runtimeManager = runtimeManager;
  }

  public async execute(context: AgentExecutionContext): Promise<AgentExecutionOutput> {
    const prompt = context.input_text;

    if (this.runtimeManager) {
      try {
        const infResult = await this.runtimeManager.infer({
          input: `[NEXUS Study Agent] Generate an educational breakdown, key concepts, and self-test questions for: ${prompt}`,
          requestedProvider: 'auto',
        });
        return {
          text: infResult.result.text,
          structured_data: {
            agent_id: this.agent_id,
            study_topic: prompt,
            provider: infResult.provider,
            latency_ms: infResult.latency_ms,
          },
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Inference error';
        return {
          text: `[Study Agent] Study guide for: ${prompt}\nKey Concept: Fundamental definitions and core mechanics.\nReview Question: Explain how this principle operates under standard conditions.`,
          warnings: [msg],
        };
      }
    }

    return {
      text: `[Study Agent Learning Module]\nTopic: ${prompt}\n\n1. Concept Overview:\nFoundational architecture and mechanics broken down clearly.\n\n2. Key Takeaways:\n- Theoretical basis\n- Practical applications\n- Common pitfalls\n\n3. Review & Practice Questions:\nQ1: What are the primary constraints of this concept?\nQ2: How does it compare to alternative approaches?`,
      structured_data: {
        agent_id: this.agent_id,
        topic: prompt,
        questions_count: 2,
      },
    };
  }
}
