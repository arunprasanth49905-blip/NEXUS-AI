/**
 * NEXUS-AI Phase 5: Task Decomposer
 * Decomposes classified tasks into structured, dependency-aware execution steps.
 */

import type { OrchestrationTask, TaskPlan } from './types.js';
import { createPlanStep, createTaskPlan } from './plan.js';

export class TaskDecomposer {
  public static decompose(task: OrchestrationTask): TaskPlan {
    const text = task.user_request.trim();

    // 1. Complex Multi-Step Task Scenario (Section 11 example)
    // "Analyze my project report, identify technical gaps, and create a presentation structure."
    if (task.complexity === 'COMPLEX') {
      const step1 = createPlanStep({
        step_id: 'step-1',
        title: 'Analyze document',
        description: 'Process uploaded project report, extract sections, tables, and raw text representations.',
        agent_id: 'document-agent',
        required_capabilities: ['analyze_uploaded_documents', 'extract_relevant_information'],
        dependencies: [],
        risk_level: 'READ_ONLY',
      });

      const step2 = createPlanStep({
        step_id: 'step-2',
        title: 'Extract findings',
        description: 'Synthesize primary architectural findings and metrics from the analyzed document.',
        agent_id: 'knowledge-agent',
        required_capabilities: ['extract_relevant_information', 'summarize_information'],
        dependencies: ['step-1'],
        risk_level: 'READ_ONLY',
      });

      const step3 = createPlanStep({
        step_id: 'step-3',
        title: 'Identify technical gaps',
        description: 'Examine extracted findings to pinpoint missing components, bottlenecks, and technical risks.',
        agent_id: 'knowledge-agent',
        required_capabilities: ['synthesize_information', 'compare_information'],
        dependencies: ['step-2'],
        risk_level: 'READ_ONLY',
      });

      const step4 = createPlanStep({
        step_id: 'step-4',
        title: 'Create presentation structure',
        description: 'Structure findings and gap remediation into an executive slide deck outline and action plan.',
        agent_id: 'productivity-agent',
        required_capabilities: ['structure_information', 'create_plans'],
        dependencies: ['step-3'],
        risk_level: 'READ_ONLY',
      });

      return createTaskPlan({
        task_id: task.task_id,
        objective: task.user_request,
        steps: [step1, step2, step3, step4],
      });
    }

    // 2. Moderate Task: Research & Synthesis or Planning
    if (task.complexity === 'MODERATE') {
      if (task.task_type === 'planning') {
        const step1 = createPlanStep({
          step_id: 'step-1',
          title: 'Analyze Goal & Scope',
          description: 'Evaluate objective constraints and determine prerequisite milestones.',
          agent_id: 'knowledge-agent',
          required_capabilities: ['explain_concepts', 'summarize_information'],
          dependencies: [],
        });
        const step2 = createPlanStep({
          step_id: 'step-2',
          title: 'Generate Action Plan',
          description: 'Structure actionable workstreams, task owners, and deliverables.',
          agent_id: 'productivity-agent',
          required_capabilities: ['create_plans', 'structure_information'],
          dependencies: ['step-1'],
        });
        return createTaskPlan({
          task_id: task.task_id,
          objective: task.user_request,
          steps: [step1, step2],
        });
      }

      if (task.task_type === 'research') {
        const step1 = createPlanStep({
          step_id: 'step-1',
          title: 'Frame Research Questions',
          description: 'Define core hypotheses and synthesize local workspace evidence.',
          agent_id: 'research-agent',
          required_capabilities: ['structure_research_questions', 'organize_available_information'],
          dependencies: [],
        });
        const step2 = createPlanStep({
          step_id: 'step-2',
          title: 'Synthesize Findings',
          description: 'Analyze synthesized workspace findings and outline remaining information gaps.',
          agent_id: 'knowledge-agent',
          required_capabilities: ['synthesize_information'],
          dependencies: ['step-1'],
        });
        return createTaskPlan({
          task_id: task.task_id,
          objective: task.user_request,
          steps: [step1, step2],
        });
      }
    }

    // 3. Simple Task: 1 targeted step for the matched agent
    const suggestedAgent = (task.metadata?.suggested_agent_id as string) || 'knowledge-agent';
    const singleStep = createPlanStep({
      step_id: 'step-1',
      title: getStepTitleForAgent(suggestedAgent, text),
      description: `Execute ${suggestedAgent} for: ${text.slice(0, 100)}`,
      agent_id: suggestedAgent,
      required_capabilities: [...task.required_capabilities],
      dependencies: [],
      risk_level: 'READ_ONLY',
    });

    return createTaskPlan({
      task_id: task.task_id,
      objective: task.user_request,
      steps: [singleStep],
    });
  }
}

function getStepTitleForAgent(agentId: string, prompt: string): string {
  switch (agentId) {
    case 'document-agent':
      return 'Summarize document';
    case 'debug-agent':
      return 'Analyze and diagnose error';
    case 'vision-agent':
      return 'Inspect visual context';
    case 'study-agent':
      return 'Generate study guide';
    case 'productivity-agent':
      return 'Structure plan';
    case 'research-agent':
      return 'Organize research inquiry';
    default:
      return prompt.length > 40 ? `${prompt.slice(0, 37)}...` : prompt;
  }
}
