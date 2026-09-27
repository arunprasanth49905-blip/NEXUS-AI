import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AssistantManager } from './assistant/assistant-manager.js';
import { AssistantProviderRegistry } from './assistant/provider-registry.js';
import {
  GeminiAssistantProvider,
  classifyGeminiError,
  sanitizeGeminiLog,
} from './assistant/providers/gemini.js';
import { LocalAssistantProvider } from './assistant/providers/local.js';
import type {
  AssistantProvider,
  AssistantGenerateParams,
  AssistantResponse,
  AssistantProviderStatus,
} from './assistant/types.js';

// Mock Gemini Provider for tests without network or real API keys
class MockGeminiProvider implements AssistantProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini (Mock)';
  public readonly model = 'gemini-3.8-flash';
  public shouldFail = false;
  public failureType?: 'auth' | 'model' | 'timeout' | 'network';
  public lastReceivedParams?: AssistantGenerateParams;

  public isConfigured(): boolean {
    return true;
  }

  public isAvailable(): boolean {
    return !this.shouldFail;
  }

  public getStatus(): AssistantProviderStatus {
    return {
      provider: 'gemini',
      model: this.model,
      configured: true,
      status: this.shouldFail ? 'ERROR' : 'READY',
      available: !this.shouldFail,
      execution_mode: 'Cloud API (Mock)',
      reason: this.shouldFail ? 'Simulated failure' : 'Ready',
    };
  }

  public async generateResponse(params: AssistantGenerateParams): Promise<AssistantResponse> {
    this.lastReceivedParams = params;
    if (this.shouldFail) {
      const category =
        this.failureType === 'auth'
          ? 'permission/authentication failure'
          : this.failureType === 'model'
          ? 'model not found'
          : this.failureType === 'timeout'
          ? 'timeout'
          : this.failureType === 'network'
          ? 'network failure'
          : 'unknown error';

      return {
        text: "NEXUS couldn't reach the configured AI provider. Please try again.",
        provider: 'gemini',
        model: this.model,
        latency_ms: 10,
        warnings: [category, `Mock failure triggered: ${category}`],
        provenance: {
          timestamp: new Date().toISOString(),
          executionMode: 'Cloud API (Error)',
          source: 'Mock Provider',
        },
      };
    }

    let responseText = '';
    const cleanMsg = params.userMessage.trim().toLowerCase();

    if (params.documents && params.documents.length > 0) {
      const doc = params.documents[0];
      if (cleanMsg.includes('summarize')) {
        responseText = `Summary of ${doc.filename}: The document covers key findings and metrics based on extracted text: "${doc.content.slice(0, 100)}...".`;
      } else if (cleanMsg.includes('findings') || cleanMsg.includes('problems')) {
        responseText = `Key findings in ${doc.filename}: Significant performance bottlenecks were identified in legacy modules.`;
      } else if (cleanMsg.includes('outline') || cleanMsg.includes('presentation')) {
        responseText = `Presentation Structure for ${doc.filename}:\n1. Introduction\n2. Key Findings\n3. Problems Identified\n4. Recommendations\n5. Next Steps`;
      } else {
        responseText = `Analyzed ${doc.filename} successfully. Content grounded: ${doc.content.slice(0, 50)}...`;
      }
    } else if (cleanMsg === 'hello' || cleanMsg === 'hi') {
      responseText = "Hello! I'm NEXUS. How can I help you today?";
    } else if (cleanMsg.includes('what is machine learning')) {
      responseText = 'Machine learning is a subset of artificial intelligence that enables algorithms to learn patterns from data and make predictions without explicit programming.';
    } else if (cleanMsg.includes('project')) {
      const mem = params.memories && params.memories.length > 0 ? params.memories[0] : undefined;
      responseText = mem ? `Your project is ${mem.content}.` : 'I do not have your project name stored yet.';
    } else {
      responseText = `NEXUS response to: "${params.userMessage}".`;
    }

    if (params.preferences && params.preferences.length > 0) {
      const p = params.preferences[0];
      responseText += ` [Personalized: ${p.key}=${p.value}]`;
    }

    return {
      text: responseText,
      provider: 'gemini',
      model: this.model,
      latency_ms: 15,
      grounded_context: params.documents?.map((d) => `document:${d.filename}`) || [],
      warnings: [],
      provenance: {
        timestamp: new Date().toISOString(),
        executionMode: 'Cloud API (Mock)',
        source: 'Google GenAI SDK Mock',
      },
    };
  }
}

describe('NEXUS Assistant Provider & Gemini Integration Tests', () => {
  // Test 1: Gemini Provider Initialization
  it('1. initializes Gemini provider with default model gemini-3.8-flash', () => {
    const provider = new GeminiAssistantProvider();
    assert.strictEqual(provider.id, 'gemini');
    assert.strictEqual(provider.name, 'Google Gemini');
    assert.strictEqual(provider.model, 'gemini-3.8-flash');
    assert.strictEqual(provider.getStatus().execution_mode, 'Cloud API');
  });

  // Test 2: Missing API Key
  it('2. returns explicit capability error when API key is missing', async () => {
    const originalKey = process.env.NEXUS_GEMINI_API_KEY;
    delete process.env.NEXUS_GEMINI_API_KEY;
    try {
      const provider = new GeminiAssistantProvider();
      assert.strictEqual(provider.isConfigured(), false);
      const status = provider.getStatus();
      assert.strictEqual(status.status, 'NOT_CONFIGURED');
      assert.strictEqual(status.configured, false);
      assert.strictEqual(status.available, false);

      const res = await provider.generateResponse({ userMessage: 'hello' });
      assert.strictEqual(
        res.text,
        'Gemini is not configured. Add NEXUS_GEMINI_API_KEY to the backend environment.'
      );
      assert.ok(res.warnings.includes('missing API key'));
    } finally {
      if (originalKey) process.env.NEXUS_GEMINI_API_KEY = originalKey;
    }
  });

  // Test 3: Provider Selection (gemini, local, auto)
  it('3. selects configured provider correctly across gemini, local, and auto modes', () => {
    const registry = new AssistantProviderRegistry();
    const mockGemini = new MockGeminiProvider();
    registry.register(mockGemini);

    process.env.NEXUS_ASSISTANT_PROVIDER = 'local';
    const mgrLocal = new AssistantManager(registry);
    assert.strictEqual(mgrLocal.getActiveProvider().id, 'local');

    process.env.NEXUS_ASSISTANT_PROVIDER = 'gemini';
    const mgrGemini = new AssistantManager(registry);
    assert.strictEqual(mgrGemini.getActiveProvider().id, 'gemini');

    process.env.NEXUS_ASSISTANT_PROVIDER = 'auto';
    const mgrAuto = new AssistantManager(registry);
    assert.strictEqual(mgrAuto.getActiveProvider().id, 'gemini');
  });

  // Test 4: Assistant Query Pipeline Execution
  it('4. executes assistant query pipeline successfully', async () => {
    const registry = new AssistantProviderRegistry();
    const mockGemini = new MockGeminiProvider();
    registry.register(mockGemini);
    const manager = new AssistantManager(registry);

    const res = await manager.generateResponse({
      userMessage: 'Test prompt',
    });
    assert.ok(res.text);
    assert.strictEqual(res.provider, 'gemini');
    assert.strictEqual(res.model, 'gemini-3.8-flash');
  });

  // Test 5: "hello" Normal Chat
  it('5. responds to "hello" with natural conversational greeting without diagnostic dump', async () => {
    const registry = new AssistantProviderRegistry();
    const mockGemini = new MockGeminiProvider();
    registry.register(mockGemini);
    const manager = new AssistantManager(registry);

    const res = await manager.generateResponse({ userMessage: 'hello' });
    assert.strictEqual(res.text, "Hello! I'm NEXUS. How can I help you today?");
    assert.ok(!res.text.includes('[Phase 4 Context Intelligence & Memory Active]'));
    assert.ok(!res.text.includes('Local hardware-aware engine is active'));
  });

  // Test 6: General Question (What is machine learning?)
  it('6. generates informative explanation for "What is machine learning?"', async () => {
    const registry = new AssistantProviderRegistry();
    const mockGemini = new MockGeminiProvider();
    registry.register(mockGemini);
    const manager = new AssistantManager(registry);

    const res = await manager.generateResponse({ userMessage: 'What is machine learning?' });
    assert.ok(res.text.includes('subset of artificial intelligence'));
  });

  // Test 7: Document Context Grounding
  it('7. grounds document questions in actual uploaded document content', async () => {
    const registry = new AssistantProviderRegistry();
    const mockGemini = new MockGeminiProvider();
    registry.register(mockGemini);
    const manager = new AssistantManager(registry);

    const doc = {
      filename: 'quarterly_report.pdf',
      content: 'Q3 Financials: Revenue increased by 24% to $12M. Operating expenses decreased by 5%.',
      wordCount: 15,
    };

    const summaryRes = await manager.generateResponse({
      userMessage: 'Summarize this document.',
      documents: [doc],
    });
    assert.ok(summaryRes.text.includes('quarterly_report.pdf'));

    const outlineRes = await manager.generateResponse({
      userMessage: 'Create a presentation outline from this document.',
      documents: [doc],
    });
    assert.ok(outlineRes.text.includes('Presentation Structure'));
  });

  // Test 8: Memory Context Grounding
  it('8. grounds responses in retrieved user memory', async () => {
    const registry = new AssistantProviderRegistry();
    const mockGemini = new MockGeminiProvider();
    registry.register(mockGemini);
    const manager = new AssistantManager(registry);

    const res = await manager.generateResponse({
      userMessage: 'What is my project called?',
      memories: [
        {
          memory_id: 'mem-1',
          memory_type: 'PROJECT',
          content: 'NEXUS-AI Edge Platform',
        },
      ],
    });
    assert.ok(res.text.includes('NEXUS-AI Edge Platform'));
  });

  // Test 9: Preference Context Personalization
  it('9. applies user preferences in assistant reasoning context', async () => {
    const registry = new AssistantProviderRegistry();
    const mockGemini = new MockGeminiProvider();
    registry.register(mockGemini);
    const manager = new AssistantManager(registry);

    const res = await manager.generateResponse({
      userMessage: 'Explain our architecture',
      preferences: [
        {
          key: 'tone',
          value: 'concise',
          category: 'response_style',
        },
      ],
    });
    assert.ok(res.text.includes('Personalized: tone=concise'));
  });

  // Test 10: Provider Failure Handling
  it('10. handles provider failures with friendly user message and zero crash', async () => {
    const registry = new AssistantProviderRegistry();
    const mockGemini = new MockGeminiProvider();
    mockGemini.shouldFail = true;
    registry.register(mockGemini);
    const manager = new AssistantManager(registry);

    const res = await manager.generateResponse({ userMessage: 'test failure' });
    assert.strictEqual(
      res.text,
      "NEXUS couldn't reach the configured AI provider. Please try again."
    );
    assert.ok(res.warnings.length > 0);
  });

  // Test 11: Secret Redaction Before Egress
  it('11. redacts API keys and tokens before passing context to assistant provider', async () => {
    const registry = new AssistantProviderRegistry();
    const mockGemini = new MockGeminiProvider();
    registry.register(mockGemini);
    const manager = new AssistantManager(registry);

    const secretInput = 'My secret key is AIzaSyD9x7a28K19aB81xLk29Zp10Q71hJa201k.';
    await manager.generateResponse({
      userMessage: secretInput,
      context: 'Internal server config: api_key="sk-12345678901234567890123456789012"',
    });

    const received = mockGemini.lastReceivedParams;
    assert.ok(received);
    assert.ok(!received.userMessage.includes('AIzaSyD9x7a28K19aB81xLk29Zp10Q71hJa201k'));
    assert.ok(received.userMessage.includes('[REDACTED_SECRET]'));
  });

  // Test 12: Response Schema Verification
  it('12. satisfies structured AssistantResponse schema', async () => {
    const registry = new AssistantProviderRegistry();
    const mockGemini = new MockGeminiProvider();
    registry.register(mockGemini);
    const manager = new AssistantManager(registry);

    const res = await manager.generateResponse({ userMessage: 'test schema' });
    assert.strictEqual(typeof res.text, 'string');
    assert.strictEqual(typeof res.provider, 'string');
    assert.strictEqual(typeof res.model, 'string');
    assert.strictEqual(typeof res.latency_ms, 'number');
    assert.ok(Array.isArray(res.warnings));
    assert.ok(res.provenance);
    assert.strictEqual(typeof res.provenance.timestamp, 'string');
  });

  // Test 13: Local Provider Mode
  it('13. Local provider operates in deterministic mode without pretending to be LLM', async () => {
    const local = new LocalAssistantProvider();
    assert.strictEqual(local.id, 'local');
    assert.strictEqual(local.getStatus().execution_mode, 'Local CPU (Deterministic)');
    assert.strictEqual(local.getStatus().status, 'READY');

    const res = await local.generateResponse({ userMessage: 'hello' });
    assert.ok(res.text.includes('conversational provider (Gemini) is currently not configured'));
  });

  // Test 14: Assistant Status Structure
  it('14. assistant status returns truthful details without exposing API key', () => {
    const registry = new AssistantProviderRegistry();
    const manager = new AssistantManager(registry);
    const status = manager.getStatus();

    assert.ok(status.provider);
    assert.ok(status.model);
    assert.strictEqual(typeof status.configured, 'boolean');
    assert.ok(['READY', 'NOT_CONFIGURED', 'INVALID_CONFIGURATION', 'UNAVAILABLE', 'ERROR'].includes(status.status));
    assert.strictEqual(typeof status.available, 'boolean');
    assert.ok(status.execution_mode);
    assert.strictEqual((status as any).apiKey, undefined);
  });

  // Test 15: Hardware Runtime Separation
  it('15. maintains strict distinction between Cloud Assistant and Local Hardware Runtime', () => {
    process.env.NEXUS_ASSISTANT_PROVIDER = 'gemini';
    const registry = new AssistantProviderRegistry();
    const manager = new AssistantManager(registry);
    const status = manager.getStatus();

    assert.strictEqual(status.execution_mode, 'Cloud API');
    assert.ok(!status.execution_mode.toLowerCase().includes('npu'));
  });

  // Test 16: Gemini Error Classification (Auth, Model, Quota, Network, Timeout)
  it('16. accurately classifies Gemini API errors', () => {
    assert.strictEqual(
      classifyGeminiError(new Error('API_KEY_INVALID: API key not valid.')),
      'invalid API key'
    );
    assert.strictEqual(
      classifyGeminiError(new Error('PERMISSION_DENIED: User not authenticated')),
      'permission/authentication failure'
    );
    assert.strictEqual(
      classifyGeminiError(new Error('models/gemini-3.8-flash is not found 404')),
      'model not found'
    );
    assert.strictEqual(
      classifyGeminiError(new Error('RESOURCE_EXHAUSTED: Rate limit exceeded (429)')),
      'quota/rate limit'
    );
    assert.strictEqual(
      classifyGeminiError(new Error('fetch failed: connect ETIMEDOUT 172.217.112.4:443')),
      'network failure'
    );
    assert.strictEqual(
      classifyGeminiError(new Error('Request aborted due to timeout: AbortError')),
      'timeout'
    );
    assert.strictEqual(
      classifyGeminiError(new Error('INVALID_ARGUMENT: malformed request')),
      'malformed request'
    );
  });

  // Test 17: Log Sanitizer Never Leaks API Keys or Authorization Headers
  it('17. log sanitizer strips raw Gemini API keys and auth headers', () => {
    const rawError = 'Failed to fetch from https://generativelanguage.googleapis.com/v1beta?key=AIzaSyD9x7a28K19aB81xLk29Zp10Q71hJa201k with Authorization: Bearer secret-token-xyz';
    const sanitized = sanitizeGeminiLog(rawError);

    assert.ok(!sanitized.includes('AIzaSyD9x7a28K19aB81xLk29Zp10Q71hJa201k'));
    assert.ok(!sanitized.includes('secret-token-xyz'));
    assert.ok(sanitized.includes('[REDACTED_SECRET]'));
  });

  // Test 18: Placeholder or Invalid Configuration Detection
  it('18. identifies placeholder API key as INVALID_CONFIGURATION', () => {
    const originalKey = process.env.NEXUS_GEMINI_API_KEY;
    try {
      process.env.NEXUS_GEMINI_API_KEY = '<YOUR_API_KEY>';
      const provider = new GeminiAssistantProvider();
      assert.strictEqual(provider.isConfigured(), false);
      const status = provider.getStatus();
      assert.strictEqual(status.status, 'INVALID_CONFIGURATION');
      assert.strictEqual(status.configured, false);
      assert.strictEqual(status.available, false);
    } finally {
      if (originalKey) {
        process.env.NEXUS_GEMINI_API_KEY = originalKey;
      } else {
        delete process.env.NEXUS_GEMINI_API_KEY;
      }
    }
  });

  // Test 19: Configurable Model via NEXUS_ASSISTANT_MODEL
  it('19. respects NEXUS_ASSISTANT_MODEL environment variable', () => {
    const originalModel = process.env.NEXUS_ASSISTANT_MODEL;
    try {
      process.env.NEXUS_ASSISTANT_MODEL = 'gemini-1.5-pro';
      const provider = new GeminiAssistantProvider();
      assert.strictEqual(provider.model, 'gemini-1.5-pro');
      assert.strictEqual(provider.getStatus().model, 'gemini-1.5-pro');
    } finally {
      if (originalModel) {
        process.env.NEXUS_ASSISTANT_MODEL = originalModel;
      } else {
        delete process.env.NEXUS_ASSISTANT_MODEL;
      }
    }
  });
});
