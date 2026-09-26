import { MemoryRepository } from './repository.js';
import { MemoryPrivacyGuard } from './privacy.js';
import { ContextClassifier } from './classifier.js';
import { MemoryRetrievalEngine } from './retrieval.js';
import type { NexusContextObject } from '../../src/types/perception.js';
import type {
  CanonicalContext,
  ContextWindow,
  ActiveTask,
  ContextSession,
  MemoryRecord,
  ContextMemoryStatusResponse,
  MemoryType,
} from '../../src/types/context_memory.js';

export class ContextMemoryEngine {
  private static instance: ContextMemoryEngine;
  private repository: MemoryRepository;
  private privacyGuard: MemoryPrivacyGuard;
  private classifier: ContextClassifier;
  private retrievalEngine: MemoryRetrievalEngine;

  // Active state tracking
  private activeSession: ContextSession;
  private activeTask: ActiveTask | null = null;
  private recentContexts: CanonicalContext[] = [];

  private constructor() {
    this.repository = new MemoryRepository();
    this.privacyGuard = MemoryPrivacyGuard.getInstance();
    this.classifier = new ContextClassifier();
    this.retrievalEngine = new MemoryRetrievalEngine(this.repository);

    // Initial default session
    this.activeSession = {
      session_id: `ses-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      title: 'Current Edge Workspace Session',
      status: 'ACTIVE',
      project_id: 'nexus-edge',
      context_count: 0,
      memory_count: 0,
    };
  }

  public static getInstance(): ContextMemoryEngine {
    if (!ContextMemoryEngine.instance) {
      ContextMemoryEngine.instance = new ContextMemoryEngine();
    }
    return ContextMemoryEngine.instance;
  }

  public getSession(): ContextSession {
    return this.activeSession;
  }

  public getActiveTask(): ActiveTask | null {
    return this.activeTask;
  }

  public setActiveTask(title: string, description: string): ActiveTask {
    const { intent } = this.classifier.classify(title, 'text');
    const task: ActiveTask = {
      task_id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      description,
      status: 'ACTIVE',
      intent,
      session_id: this.activeSession.session_id,
      project_id: this.activeSession.project_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      related_context_ids: [],
      related_memory_ids: [],
    };
    this.activeTask = task;
    this.activeSession.active_task_id = task.task_id;
    return task;
  }

  public clearActiveTask(): void {
    this.activeTask = null;
    this.activeSession.active_task_id = null;
  }

  public resetSession(title = 'New Edge Workspace Session'): ContextSession {
    this.activeSession = {
      session_id: `ses-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      title,
      status: 'ACTIVE',
      project_id: 'nexus-edge',
      context_count: 0,
      memory_count: 0,
    };
    this.activeTask = null;
    this.recentContexts = [];
    return this.activeSession;
  }

  /**
   * Transforms input / perception outputs into canonical context and checks memory policies
   */
  public async aggregateContext(params: {
    user_input: string;
    modality?: 'text' | 'screen' | 'camera' | 'voice' | 'document';
    raw_perception?: NexusContextObject;
    explicit_remember?: boolean;
  }): Promise<CanonicalContext> {
    const modality = params.modality || (params.raw_perception?.source as any) || 'text';
    const textContent = params.user_input || params.raw_perception?.content.text || '';

    // 1. Classification & Entity/Topic Extraction
    const { category, intent } = this.classifier.classify(textContent, modality);
    const { entities, topics } = this.classifier.extractEntitiesAndTopics(textContent);

    // 2. Derive active task if none exists and category is TASK or intent is DEBUG/CREATE
    if (!this.activeTask && (category === 'TASK' || intent === 'DEBUG' || intent === 'CREATE')) {
      this.setActiveTask(
        textContent.length > 50 ? `${textContent.slice(0, 47)}...` : textContent,
        `Context-derived active goal: ${intent}`
      );
    }

    // 3. Decide Memory Policy
    const memoryPolicy = this.classifier.decideMemoryPolicy(category, textContent, params.explicit_remember);

    // 4. Retrieve Relevant Memories
    const retrieved = await this.retrievalEngine.retrieve({
      query: textContent,
      session_id: this.activeSession.session_id,
      project_id: this.activeSession.project_id,
      active_task: this.activeTask,
      limit: 3,
    });

    const contextId = `ctx-canon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const canonicalContext: CanonicalContext = {
      context_id: contextId,
      session_id: this.activeSession.session_id,
      timestamp: new Date().toISOString(),
      user_input: textContent,
      modality,
      source: params.raw_perception?.provenance?.captureMechanism || 'direct_user_input',
      content_type: params.raw_perception?.content_type || 'text/plain',
      category,
      intent,
      entities,
      topics,
      active_task: this.activeTask,
      project: this.activeSession.project_id,
      relevant_memories: retrieved.map((r) => r.memory),
      provenance: {
        sourceType: modality,
        sourceSummary: params.raw_perception
          ? `Perception (${params.raw_perception.source}): ${params.raw_perception.content.filename || 'frame'}`
          : 'User dialogue prompt',
        confidence: null, // Truthful: null
      },
      privacy_level: 'local_only',
      persistence_policy: memoryPolicy.decision,
      raw_perception: params.raw_perception,
    };

    // Track in rolling recent contexts (bounded to 20)
    this.recentContexts.push(canonicalContext);
    if (this.recentContexts.length > 20) {
      this.recentContexts.shift();
    }
    this.activeSession.context_count++;
    this.activeSession.updated_at = new Date().toISOString();

    // 5. Store memory if eligible under Privacy Guard and policy
    if (memoryPolicy.decision === 'LONG_TERM_MEMORY' || memoryPolicy.decision === 'PROJECT_MEMORY' || params.explicit_remember) {
      await this.evaluateAndStoreMemory({
        content: textContent,
        summary: `${category}: ${textContent.slice(0, 80)}`,
        memory_type: memoryPolicy.targetType,
        source: modality,
        user_controlled: true,
        reason: memoryPolicy.reason,
        entities: entities.map((e) => e.name),
        topics: topics.map((t) => t.topic),
      });
    }

    return canonicalContext;
  }

  /**
   * Evaluates memory candidate through Privacy Guard, deduplicates, and saves
   */
  public async evaluateAndStoreMemory(params: {
    content: string;
    summary?: string;
    memory_type: MemoryType;
    source: any;
    user_controlled?: boolean;
    reason?: string;
    entities?: string[];
    topics?: string[];
  }): Promise<{ stored: boolean; memory?: MemoryRecord; reason: string }> {
    // 1. Audit for secrets
    const audit = this.privacyGuard.auditContent(params.content);
    if (audit.action === 'REJECT') {
      return {
        stored: false,
        reason: audit.reason || 'Storage rejected: secret/credential patterns detected.',
      };
    }

    const cleanContent = audit.sanitizedContent;

    // 2. Deduplication check: Avoid storing duplicate records
    const existing = await this.repository.list({
      project_id: this.activeSession.project_id,
      memory_type: params.memory_type,
    });

    const isDuplicate = existing.some(
      (m) => m.content.trim().toLowerCase() === cleanContent.trim().toLowerCase()
    );

    if (isDuplicate) {
      return {
        stored: false,
        reason: 'Duplicate memory record already exists in repository.',
      };
    }

    const memRecord: MemoryRecord = {
      memory_id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      memory_type: params.memory_type,
      content: cleanContent,
      summary: params.summary || cleanContent.slice(0, 100),
      source: params.source,
      session_id: this.activeSession.session_id,
      project_id: this.activeSession.project_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [params.memory_type.toLowerCase()],
      entities: params.entities || [],
      topics: params.topics || [],
      provenance: {
        origin: 'NEXUS Context Intelligence',
        captureTime: new Date().toISOString(),
        reasonStored: params.reason || 'Stored per user request or policy',
      },
      privacy_level: 'standard',
      persistence_policy: params.memory_type === 'LONG_TERM' ? 'LONG_TERM_MEMORY' : 'PROJECT_MEMORY',
      user_controlled: params.user_controlled !== false,
      metadata: {
        task_id: this.activeTask?.task_id,
      },
    };

    await this.repository.save(memRecord);
    this.activeSession.memory_count++;
    return {
      stored: true,
      memory: memRecord,
      reason: params.reason || 'Memory record successfully created.',
    };
  }

  /**
   * Constructs an optimized, bounded Context Window for the Phase 2 AI Runtime Engine
   */
  public constructContextWindow(currentContext: CanonicalContext): ContextWindow {
    const windowId = `win-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const explanations: string[] = [];

    // Prior contexts from the active session
    const prior = this.recentContexts
      .filter((c) => c.context_id !== currentContext.context_id)
      .slice(-3);

    const parts: string[] = [];

    if (this.activeTask) {
      parts.push(`[Active Task Goal]: ${this.activeTask.title} (${this.activeTask.description})`);
      explanations.push(`Anchored to active task: "${this.activeTask.title}"`);
    }

    if (currentContext.relevant_memories.length > 0) {
      const memoryLines = currentContext.relevant_memories.map(
        (m) => `• [${m.memory_type} Memory]: ${m.content}`
      );
      parts.push(`[Retrieved Memory]:\n${memoryLines.join('\n')}`);
      explanations.push(`Retrieved ${currentContext.relevant_memories.length} relevant memories`);
    }

    if (prior.length > 0) {
      const priorLines = prior.map((p) => `Context (${p.modality}): ${p.user_input}`);
      parts.push(`[Prior Session Context]:\n${priorLines.join('\n')}`);
    }

    parts.push(`[Current User Input]: ${currentContext.user_input}`);

    const prompt = parts.join('\n\n');
    const estimatedTokens = Math.round(prompt.length / 4);

    return {
      window_id: windowId,
      constructed_at: new Date().toISOString(),
      total_items: 1 + prior.length + currentContext.relevant_memories.length,
      estimated_tokens: estimatedTokens,
      active_task: this.activeTask,
      current_context: currentContext,
      prior_contexts: prior,
      retrieved_memories: currentContext.relevant_memories,
      formatted_prompt: prompt,
      explanations,
    };
  }

  public async getStatus(): Promise<ContextMemoryStatusResponse> {
    const memoryCounts = await this.repository.count();
    return {
      context_engine: {
        status: 'READY',
        active_session_id: this.activeSession.session_id,
        active_contexts_count: this.recentContexts.length,
        intent_classifier: 'RuleBasedIntentClassifier (Phase 4 Abstraction)',
        category_classifier: 'CanonicalContextClassifier (Phase 4 Abstraction)',
      },
      memory_engine: {
        status: 'READY',
        storage_type: this.repository.isUsingSqlite() ? 'sqlite' : 'memory_fallback',
        total_memories: memoryCounts.total,
        by_type: {
          short_term: memoryCounts.byType.SHORT_TERM || 0,
          session: memoryCounts.byType.SESSION || 0,
          project: memoryCounts.byType.PROJECT || 0,
          long_term: memoryCounts.byType.LONG_TERM || 0,
        },
        auto_save: false,
        retrieval_active: true,
      },
      privacy_guard: {
        secret_redaction_active: true,
        zero_cloud_retention: true,
        rejected_secret_count: this.privacyGuard.getRejectedCount(),
      },
      active_task: this.activeTask,
    };
  }

  public getRepository(): MemoryRepository {
    return this.repository;
  }

  public getRetrievalEngine(): MemoryRetrievalEngine {
    return this.retrievalEngine;
  }
}
