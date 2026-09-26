import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ContextClassifier } from '../server/context_memory/classifier.js';
import { MemoryPrivacyGuard } from '../server/context_memory/privacy.js';
import { ContextMemoryEngine } from '../server/context_memory/manager.js';
import { RuntimeManager } from '../server/manager.js';

describe('Phase 4: Context Classification & Intent Extraction', () => {
  const classifier = new ContextClassifier();

  it('classifies debugging and question intents correctly', () => {
    const res1 = classifier.classify('Why is my Vercel build failing with TypeError?', 'text');
    assert.strictEqual(res1.intent, 'DEBUG');
    assert.strictEqual(res1.category, 'ERROR');

    const res2 = classifier.classify('How does Qualcomm QNN interact with Snapdragon NPU?', 'text');
    assert.strictEqual(res2.intent, 'ASK');
    assert.strictEqual(res2.category, 'QUESTION');
  });

  it('extracts technical entities and topics without fake scores', () => {
    const res = classifier.extractEntitiesAndTopics('Deploying React Vite application on Vercel with SQLite.');
    const entityNames = res.entities.map((e) => e.name);
    assert.ok(entityNames.includes('React'));
    assert.ok(entityNames.includes('Vite'));
    assert.ok(entityNames.includes('Vercel'));
    assert.ok(entityNames.includes('SQLite'));
    assert.strictEqual(res.entities[0].confidence, null); // Truthful: null

    const topicNames = res.topics.map((t) => t.topic);
    assert.ok(topicNames.includes('Deployment'));
  });

  it('decides memory policy based on user instructions and category', () => {
    const pol1 = classifier.decideMemoryPolicy('PREFERENCE', 'Remember that I prefer concise explanations.');
    assert.strictEqual(pol1.decision, 'LONG_TERM_MEMORY');
    assert.strictEqual(pol1.targetType, 'LONG_TERM');

    const pol2 = classifier.decideMemoryPolicy('PROJECT_CONTEXT', 'Our project repository is called NEXUS-AI.');
    assert.strictEqual(pol2.decision, 'PROJECT_MEMORY');
    assert.strictEqual(pol2.targetType, 'PROJECT');

    const pol3 = classifier.decideMemoryPolicy('ERROR', 'TypeError: undefined is not a function');
    assert.strictEqual(pol3.decision, 'SESSION_ONLY');
  });
});

describe('Phase 4: Privacy Guard & Secret Detection', () => {
  const privacyGuard = MemoryPrivacyGuard.getInstance();

  it('rejects candidate containing API key or secret token', () => {
    const badInput = 'My API key is api_key: "sk-1234567890abcdef1234567890"';
    const audit = privacyGuard.auditContent(badInput);
    assert.strictEqual(audit.action, 'REJECT');
    assert.strictEqual(audit.hasSecret, true);
    assert.ok(audit.reason?.includes('credential/secret'));
  });

  it('rejects private key headers', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...';
    const audit = privacyGuard.auditContent(pem);
    assert.strictEqual(audit.action, 'REJECT');
  });

  it('allows safe technical content', () => {
    const safeInput = 'Production port is configured on 3000 using HTTP.';
    const audit = privacyGuard.auditContent(safeInput);
    assert.strictEqual(audit.action, 'ALLOW');
    assert.strictEqual(audit.hasSecret, false);
  });
});

describe('Phase 4: Memory Repository, Deduplication & Deletion', () => {
  it('saves, retrieves, and deduplicates memories', async () => {
    const engine = ContextMemoryEngine.getInstance();
    const repo = engine.getRepository();
    
    // Save memory 1
    const res1 = await engine.evaluateAndStoreMemory({
      content: 'Project uses Tailwind CSS and TypeScript strict mode.',
      memory_type: 'PROJECT',
      source: 'user_explicit',
    });
    assert.strictEqual(res1.stored, true);

    // Attempt duplicate save
    const res2 = await engine.evaluateAndStoreMemory({
      content: 'Project uses Tailwind CSS and TypeScript strict mode.',
      memory_type: 'PROJECT',
      source: 'user_explicit',
    });
    assert.strictEqual(res2.stored, false);
    assert.ok(res2.reason.includes('Duplicate memory'));

    // Verify retrieval
    const mems = await repo.list({ project_id: 'nexus-edge' });
    assert.ok(mems.length > 0);

    // Delete memory
    if (res1.memory) {
      const deleted = await repo.delete(res1.memory.memory_id);
      assert.strictEqual(deleted, true);
    }
  });
});

describe('Phase 4: Context Aggregation, Active Task & Phase 2 Runtime Integration', () => {
  it('anchors active task from user problem and retrieves relevant memory', async () => {
    const engine = ContextMemoryEngine.getInstance();
    engine.resetSession('Unit Test Session');

    // 1. Store a project memory
    await engine.evaluateAndStoreMemory({
      content: 'Production uses Vercel deployment with node runtime.',
      memory_type: 'PROJECT',
      source: 'user_explicit',
    });

    // 2. Set an active task
    const task = engine.setActiveTask('Fix Vercel build', 'Resolve production bundle failure');
    assert.strictEqual(task.status, 'ACTIVE');

    // 3. Aggregate incoming context
    const context = await engine.aggregateContext({
      user_input: 'Why is the Vercel build failing with cannot find module?',
      modality: 'text',
    });

    assert.strictEqual(context.intent, 'DEBUG');
    assert.ok(context.relevant_memories.length > 0);

    // 4. Construct Context Window
    const window = engine.constructContextWindow(context);
    assert.ok(window.formatted_prompt.includes('[Active Task Goal]: Fix Vercel build'));
    assert.ok(window.formatted_prompt.includes('[Retrieved Memory]'));
    assert.ok(window.estimated_tokens > 0);

    // 5. Pass to Phase 2 Hardware-Aware Runtime
    const runtime = new RuntimeManager();
    await runtime.initialize();

    const result = await runtime.infer({
      input: window.formatted_prompt,
      requestedProvider: 'auto',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.provider, 'cpu');
    assert.ok(result.latency_ms >= 0);
  });
});
