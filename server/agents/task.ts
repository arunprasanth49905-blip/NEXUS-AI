/**
 * NEXUS-AI Phase 5: Task Model & Classification
 * Deterministic complexity categorization and capability extraction.
 */

import type {
  OrchestrationTask,
  TaskComplexity,
} from './types.js';

export interface TaskClassificationResult {
  complexity: TaskComplexity;
  task_type: string;
  objective: string;
  required_capabilities: string[];
  suggested_agent_id?: string;
  is_multistep: boolean;
}

export class TaskClassifier {
  /**
   * Classify user request into complexity, primary intent/type, and required capabilities.
   * Completely deterministic without fabricated confidence metrics.
   */
  public static classify(
    userRequest: string,
    context?: Record<string, unknown>
  ): TaskClassificationResult {
    const text = userRequest.trim();
    const lower = text.toLowerCase();

    // 1. Check for complex multi-objective indicators
    // Example: "Analyze my project report, identify technical gaps, and create a presentation structure."
    const hasMultipleAndClauses = (lower.match(/,\s*(and\s+)?|;\s*|\band then\b|\bfirst\b.*\bnext\b/g) || []).length >= 2;
    const hasDocumentAndStructure = (lower.includes('report') || lower.includes('document')) && 
      (lower.includes('gap') || lower.includes('technical gap') || lower.includes('findings')) && 
      (lower.includes('presentation') || lower.includes('structure') || lower.includes('plan'));

    const isComplexMultiStep = hasMultipleAndClauses || hasDocumentAndStructure || 
      (lower.includes('analyze') && lower.includes('identify') && lower.includes('create'));

    if (isComplexMultiStep) {
      return {
        complexity: 'COMPLEX',
        task_type: 'multi_step_workflow',
        objective: text,
        required_capabilities: [
          'analyze_uploaded_documents',
          'extract_relevant_information',
          'synthesize_information',
          'create_plans',
        ],
        is_multistep: true,
      };
    }

    // 2. Check for Debug / Error / Code Failure
    const isError = lower.includes('error') || 
      lower.includes('fail') || 
      lower.includes('exception') || 
      lower.includes('typeerror') || 
      lower.includes('cannot find name') || 
      lower.includes('bug') || 
      lower.includes('crash');

    if (isError) {
      return {
        complexity: 'SIMPLE',
        task_type: 'debug',
        objective: text,
        required_capabilities: ['analyze_errors', 'identify_possible_causes', 'suggest_fixes'],
        suggested_agent_id: 'debug-agent',
        is_multistep: false,
      };
    }

    // 3. Check for Visual / Screen / Camera
    const isVisual = (context && (context.screen || context.camera || context.visual)) ||
      lower.includes('screenshot') ||
      lower.includes('screen') ||
      lower.includes('camera') ||
      lower.includes('look at this image') ||
      lower.includes('ui inspection');

    if (isVisual) {
      return {
        complexity: 'SIMPLE',
        task_type: 'vision',
        objective: text,
        required_capabilities: ['reason_over_visual_context', 'interpret_screen_context'],
        suggested_agent_id: 'vision-agent',
        is_multistep: false,
      };
    }

    // 4. Check for Document-specific tasks
    const isDoc = (context && (context.document || context.file)) ||
      lower.includes('summarize this document') ||
      lower.includes('analyze document') ||
      lower.includes('pdf') ||
      lower.includes('csv') ||
      lower.includes('uploaded file');

    if (isDoc) {
      return {
        complexity: 'SIMPLE',
        task_type: 'document_summary',
        objective: text,
        required_capabilities: ['analyze_uploaded_documents', 'summarize_documents'],
        suggested_agent_id: 'document-agent',
        is_multistep: false,
      };
    }

    // 5. Check for Productivity / Outlining / Organizing
    const isProductivity = lower.startsWith('create a plan') ||
      lower.startsWith('organize') ||
      lower.startsWith('create an outline') ||
      lower.startsWith('draft');

    if (isProductivity) {
      return {
        complexity: 'MODERATE',
        task_type: 'planning',
        objective: text,
        required_capabilities: ['create_plans', 'structure_information'],
        suggested_agent_id: 'productivity-agent',
        is_multistep: false,
      };
    }

    // 6. Check for Academic / Study
    const isStudy = lower.includes('practice question') ||
      lower.includes('study plan') ||
      lower.includes('academic') ||
      lower.includes('quiz me');

    if (isStudy) {
      return {
        complexity: 'SIMPLE',
        task_type: 'study',
        objective: text,
        required_capabilities: ['explain_academic_topics', 'generate_practice_questions'],
        suggested_agent_id: 'study-agent',
        is_multistep: false,
      };
    }

    // 7. Check for Research Inquiry
    const isResearch = lower.startsWith('research') ||
      lower.includes('investigate') ||
      lower.includes('literature review');

    if (isResearch) {
      return {
        complexity: 'MODERATE',
        task_type: 'research',
        objective: text,
        required_capabilities: ['structure_research_questions', 'synthesize_information'],
        suggested_agent_id: 'research-agent',
        is_multistep: false,
      };
    }

    // Default: Knowledge Agent (e.g. "Explain what a transformer is.")
    return {
      complexity: 'SIMPLE',
      task_type: 'explanation',
      objective: text,
      required_capabilities: ['answer_questions', 'explain_concepts'],
      suggested_agent_id: 'knowledge-agent',
      is_multistep: false,
    };
  }
}

export function createOrchestrationTask(params: {
  user_request: string;
  session_id?: string;
  context?: Record<string, unknown>;
  task_id?: string;
}): OrchestrationTask {
  const classification = TaskClassifier.classify(params.user_request, params.context);
  const now = new Date().toISOString();

  return {
    task_id: params.task_id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    session_id: params.session_id || 'ses-default',
    request_id: `req-${Date.now()}`,
    user_request: params.user_request,
    task_type: classification.task_type,
    complexity: classification.complexity,
    status: 'CREATED',
    context: params.context || {},
    required_capabilities: classification.required_capabilities,
    created_at: now,
    updated_at: now,
    metadata: {
      is_multistep: classification.is_multistep,
      suggested_agent_id: classification.suggested_agent_id,
    },
  };
}
