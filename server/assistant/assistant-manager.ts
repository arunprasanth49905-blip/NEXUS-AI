import { AssistantProviderRegistry } from './provider-registry.js';
import type {
  AssistantProvider,
  AssistantGenerateParams,
  AssistantResponse,
  AssistantProviderStatus,
} from './types.js';
import { MemoryPrivacyGuard } from '../context_memory/privacy.js';

export class AssistantManager {
  private registry: AssistantProviderRegistry;
  private privacyGuard: MemoryPrivacyGuard;

  constructor(registry?: AssistantProviderRegistry) {
    this.registry = registry || new AssistantProviderRegistry();
    this.privacyGuard = MemoryPrivacyGuard.getInstance();
  }

  public get configuredProviderName(): string {
    return (process.env.NEXUS_ASSISTANT_PROVIDER || 'gemini').toLowerCase().trim();
  }

  public get modelName(): string {
    return process.env.NEXUS_ASSISTANT_MODEL || 'gemini-3.8-flash';
  }

  public getActiveProvider(): AssistantProvider {
    const configured = this.configuredProviderName;

    if (configured === 'auto') {
      const gemini = this.registry.get('gemini');
      if (gemini && gemini.isConfigured()) {
        return gemini;
      }
      return this.registry.get('local')!;
    }

    const provider = this.registry.get(configured);
    if (provider) {
      return provider;
    }

    // Default to Gemini
    return this.registry.get('gemini') || this.registry.get('local')!;
  }

  public getStatus(): AssistantProviderStatus {
    const active = this.getActiveProvider();
    const activeStatus = active.getStatus();

    return {
      provider: active.id,
      model: active.model,
      configured: active.isConfigured(),
      available: active.isAvailable(),
      execution_mode: activeStatus.execution_mode,
      reason: activeStatus.reason,
    };
  }

  public async generateResponse(params: AssistantGenerateParams): Promise<AssistantResponse> {
    const provider = this.getActiveProvider();

    // If provider is Gemini and it is not configured, return explicit error per requirements
    if (provider.id === 'gemini' && !provider.isConfigured()) {
      return {
        text: 'Gemini is not configured. Add NEXUS_GEMINI_API_KEY to the backend environment.',
        provider: 'gemini',
        model: this.modelName,
        latency_ms: 0,
        warnings: ['NEXUS_GEMINI_API_KEY missing in environment'],
        provenance: {
          timestamp: new Date().toISOString(),
          executionMode: 'Cloud API (Unconfigured)',
          source: 'NEXUS Assistant Engine',
        },
      };
    }

    // Privacy Guard Sanitization: audit user message & context to prevent secret leaks
    const auditedMessage = this.privacyGuard.auditContent(params.userMessage).sanitizedContent;
    const auditedContext = params.context ? this.privacyGuard.auditContent(params.context).sanitizedContent : undefined;

    // Sanitize document contents
    const sanitizedDocs = params.documents?.map((doc) => ({
      ...doc,
      content: this.privacyGuard.auditContent(doc.content).sanitizedContent,
    }));

    // Sanitize memories
    const sanitizedMemories = params.memories?.map((m) => ({
      ...m,
      content: this.privacyGuard.auditContent(m.content).sanitizedContent,
    }));

    const sanitizedParams: AssistantGenerateParams = {
      ...params,
      userMessage: auditedMessage,
      context: auditedContext,
      documents: sanitizedDocs,
      memories: sanitizedMemories,
    };

    return provider.generateResponse(sanitizedParams);
  }
}

export const assistantManager = new AssistantManager();
