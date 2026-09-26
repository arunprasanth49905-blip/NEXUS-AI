import type {
  ContextCategory,
  IntentType,
  EntityMatch,
  TopicMatch,
  MemoryPersistenceDecision,
  MemoryType,
} from '../../src/types/context_memory.js';

export class ContextClassifier {
  public classify(text: string, modality: string): { category: ContextCategory; intent: IntentType } {
    const lower = text.toLowerCase();

    // Intent detection
    let intent: IntentType = 'GENERAL_CONVERSATION';
    if (/^(what|why|how|when|who|where|is|can|does|which)\b|\?$/i.test(lower.trim())) {
      intent = 'ASK';
    }
    if (/explain|clarify|elaborate|walkthrough|describe/i.test(lower)) {
      intent = 'EXPLAIN';
    }
    if (/create|build(?!\s+(?:fail|error|issue|bug|problem))|scaffold|generate|implement|new/i.test(lower)) {
      intent = 'CREATE';
    }
    if (/error|fail|bug|typeerror|crash|cannot|exception|traceback|fix|debug/i.test(lower)) {
      intent = 'DEBUG';
    }
    if (/modify|update|edit|refactor|change|rename/i.test(lower)) {
      intent = 'MODIFY';
    }
    if (/summarize|recap|tldr|overview/i.test(lower)) {
      intent = 'SUMMARIZE';
    }
    if (/\b(?:search|find\s+(?:file|document|text|code)|locate|query|lookup)\b/i.test(lower)) {
      intent = 'SEARCH';
    }
    if (/analyze|audit|inspect|benchmark|measure/i.test(lower)) {
      intent = 'ANALYZE';
    }
    if (/plan|roadmap|step|strategy|architect/i.test(lower)) {
      intent = 'PLAN';
    }

    // Category detection
    let category: ContextCategory = 'CONVERSATION';
    if (modality === 'document') {
      category = 'DOCUMENT';
    } else if (modality === 'screen' || modality === 'camera') {
      category = 'OBSERVATION';
    } else if (/error|typeerror|exception|stack trace|failed to compile/i.test(lower)) {
      category = 'ERROR';
    } else if (intent === 'DEBUG' || intent === 'CREATE' || intent === 'MODIFY') {
      category = 'TASK';
    } else if (intent === 'ASK' || intent === 'EXPLAIN') {
      category = 'QUESTION';
    } else if (/remember that|i prefer|always use|never use|my name is/i.test(lower)) {
      category = 'PREFERENCE';
    } else if (/my project is|the architecture is|we are using/i.test(lower)) {
      category = 'PROJECT_CONTEXT';
    }

    return { category, intent };
  }

  public extractEntitiesAndTopics(text: string): { entities: EntityMatch[]; topics: TopicMatch[] } {
    const entities: EntityMatch[] = [];
    const topics: TopicMatch[] = [];
    const lower = text.toLowerCase();

    // Recognized Tech / Framework Entities
    const techCatalog: Array<{ name: string; category: EntityMatch['category']; regex: RegExp }> = [
      { name: 'Vercel', category: 'tool', regex: /\bvercel\b/i },
      { name: 'React', category: 'framework', regex: /\breact(?:\.js)?\b/i },
      { name: 'TypeScript', category: 'technology', regex: /\btypescript|\bts\b/i },
      { name: 'Vite', category: 'tool', regex: /\bvite\b/i },
      { name: 'Node.js', category: 'technology', regex: /\bnode(?:\.js)?\b/i },
      { name: 'SQLite', category: 'technology', regex: /\bsqlite\b/i },
      { name: 'Snapdragon', category: 'technology', regex: /\bsnapdragon\b/i },
      { name: 'Qualcomm QNN', category: 'technology', regex: /\bqnn\b|\bqualcomm\b/i },
      { name: 'Docker', category: 'tool', regex: /\bdocker\b/i },
      { name: 'Python', category: 'technology', regex: /\bpython\b/i },
      { name: 'FastAPI', category: 'framework', regex: /\bfastapi\b/i },
      { name: 'Express', category: 'framework', regex: /\bexpress(?:\.js)?\b/i },
    ];

    for (const item of techCatalog) {
      if (item.regex.test(text)) {
        entities.push({
          name: item.name,
          category: item.category,
          confidence: null, // Deterministic / rule-based
        });
      }
    }

    // Topic mappings
    const topicRules: Array<{ topic: string; regex: RegExp; weight: number }> = [
      { topic: 'Deployment', regex: /deploy|vercel|hosting|production|build|publish/i, weight: 0.9 },
      { topic: 'Error Debugging', regex: /error|exception|fail|crash|bug|typeerror|undefined/i, weight: 0.95 },
      { topic: 'Hardware Acceleration', regex: /gpu|npu|qnn|cpu|snapdragon|tops|cuda/i, weight: 0.85 },
      { topic: 'Multimodal Perception', regex: /camera|screen|voice|speech|document|ocr|frame/i, weight: 0.85 },
      { topic: 'Local Edge Privacy', regex: /privacy|perimeter|zero telemetry|local-only|secret|sanitize/i, weight: 0.9 },
      { topic: 'Project Architecture', regex: /architecture|roadmap|refactor|design system|phase/i, weight: 0.8 },
    ];

    for (const rule of topicRules) {
      if (rule.regex.test(lower)) {
        topics.push({ topic: rule.topic, relevance: rule.weight });
      }
    }

    return { entities, topics };
  }

  public decideMemoryPolicy(
    category: ContextCategory,
    content: string,
    explicitUserInstruction?: boolean
  ): { decision: MemoryPersistenceDecision; targetType: MemoryType; reason: string } {
    const lower = content.toLowerCase();

    // Check for explicit "remember" instructions
    if (/remember that|always remember|keep in mind permanently|my preference is/i.test(lower) || explicitUserInstruction) {
      return {
        decision: 'LONG_TERM_MEMORY',
        targetType: 'LONG_TERM',
        reason: 'User explicitly requested long-term retention of preference or instruction.',
      };
    }

    // Project context
    if (category === 'PROJECT_CONTEXT' || /our project is called|project repository is|production domain is/i.test(lower)) {
      return {
        decision: 'PROJECT_MEMORY',
        targetType: 'PROJECT',
        reason: 'Identified enduring project context relevant across sessions.',
      };
    }

    // Errors and temporary debug tasks
    if (category === 'ERROR' || category === 'TEMPORARY_STATE' || category === 'OBSERVATION') {
      return {
        decision: 'SESSION_ONLY',
        targetType: 'SESSION',
        reason: 'Retained within current session context for active troubleshooting.',
      };
    }

    // Default conversation exchange
    return {
      decision: 'SESSION_ONLY',
      targetType: 'SHORT_TERM',
      reason: 'General conversational query retained in active short-term window.',
    };
  }
}
