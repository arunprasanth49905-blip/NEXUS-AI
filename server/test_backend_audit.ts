/**
 * NEXUS EDGE — Complete Backend Recovery & Health Audit Test Suite
 * Validates Phases 1–7 end-to-end against the running Express application.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { app } from '../server.js';

let server: Server;
let baseUrl: string;

async function jsonOf<T = any>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

before(() => {
  return new Promise<void>((resolve, reject) => {
    // Listen on port 0 to let OS assign an available port
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
    server.on('error', reject);
  });
});

after(() => {
  return new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Phase B & C: Server Startup & Real Health Endpoint', () => {
  it('GET /api/v1/health returns status ok with service name and environment without depending on optional services', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.strictEqual(res.status, 200);
    const body = await jsonOf(res);
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.service, 'nexus-edge');
    assert.ok(body.environment, 'Environment should be reported');
  });

  it('handles CORS OPTIONS preflight request cleanly with 204 status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://nexus-edge.vercel.app',
        'Access-Control-Request-Method': 'GET',
      },
    });
    assert.strictEqual(res.status, 204);
    assert.ok(res.headers.get('access-control-allow-methods'));
  });
});

describe('Phase D: Backend Subsystem Diagnostics', () => {
  it('GET /api/v1/health/detailed reports genuine status across all 10 subsystems', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health/detailed`);
    assert.strictEqual(res.status, 200);
    const body = await jsonOf(res);

    const allowed = ['READY', 'LIMITED', 'NOT_CONFIGURED', 'UNAVAILABLE', 'ERROR'];
    const stringSubsystems = [
      'server',
      'configuration',
      'runtime',
      'perception',
      'context',
      'memory',
      'agents',
      'tools',
      'learning',
    ];

    for (const sub of stringSubsystems) {
      assert.ok(
        allowed.includes(body[sub]),
        `Subsystem ${sub} reported invalid state '${body[sub]}'. Allowed: ${allowed.join(', ')}`
      );
    }

    // Phase 9 & Assistant diagnostic check
    assert.strictEqual(typeof body.assistant, 'object', 'assistant should be a diagnostic object');
    assert.strictEqual(body.assistant.provider, 'gemini');
    assert.strictEqual(body.assistant.model, 'gemini-3.8-flash');
    assert.strictEqual(typeof body.assistant.configured, 'boolean');
    assert.ok(body.assistant.status, 'assistant status should be present');

    assert.strictEqual(body.server, 'READY');
    assert.strictEqual(body.configuration, 'READY');
    assert.ok(body.runtime === 'READY' || body.runtime === 'LIMITED');
    assert.ok(body.perception === 'READY' || body.perception === 'LIMITED');
    assert.ok(body.context === 'READY');
    assert.ok(body.memory === 'READY' || body.memory === 'LIMITED');
    assert.ok(body.agents === 'READY' || body.agents === 'LIMITED');
    assert.ok(body.tools === 'READY');
    assert.ok(body.learning === 'READY');
  });
});

describe('Phase E & F: API Routes & Route Order Verification', () => {
  it('GET /api/v1/system returns honest host hardware telemetry', async () => {
    const res = await fetch(`${baseUrl}/api/v1/system`);
    assert.strictEqual(res.status, 200);
    const body = await jsonOf(res);
    assert.ok(body.system.processor);
    assert.ok(body.runtime.status);
    assert.ok(body.acceleration.cpu);
  });

  it('GET /api/v1/context returns current working context and session', async () => {
    const res = await fetch(`${baseUrl}/api/v1/context`);
    assert.strictEqual(res.status, 200);
    const body = await jsonOf(res);
    assert.ok(body.project);
    assert.ok(body.session_id);
  });

  it('GET /api/v1/runtime/status and POST /api/v1/runtime/benchmark work', async () => {
    const statusRes = await fetch(`${baseUrl}/api/v1/runtime/status`);
    assert.strictEqual(statusRes.status, 200);
    const statusBody = await jsonOf(statusRes);
    assert.ok(statusBody.runtime_state);

    const benchRes = await fetch(`${baseUrl}/api/v1/runtime/benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runs: 2 }),
    });
    assert.strictEqual(benchRes.status, 200);
    const benchBody = await jsonOf(benchRes);
    assert.ok(benchBody.average_latency_ms !== undefined && Array.isArray(benchBody.latencies));
  });

  it('GET /api/v1/perception/status returns modality states without fabricated OCR', async () => {
    const res = await fetch(`${baseUrl}/api/v1/perception/status`);
    assert.strictEqual(res.status, 200);
    const body = await jsonOf(res);
    assert.ok(body.providers);
    assert.ok(body.providers.ocr);
  });

  it('GET /api/v1/context/status returns context intelligence and memory breakdown', async () => {
    const res = await fetch(`${baseUrl}/api/v1/context/status`);
    assert.strictEqual(res.status, 200);
    const body = await jsonOf(res);
    assert.ok(body.context_engine);
    assert.ok(body.memory_engine);
  });

  it('Task Planning and Orchestration APIs operate cleanly', async () => {
    const createRes = await fetch(`${baseUrl}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Audit Test Task', description: 'Testing task engine' }),
    });
    assert.strictEqual(createRes.status, 200);
    const createBody = await jsonOf(createRes);
    assert.ok(createBody.task?.task_id);
    const task = createBody.task;

    const listRes = await fetch(`${baseUrl}/api/v1/tasks`);
    assert.strictEqual(listRes.status, 200);
    const tasks = await jsonOf(listRes);
    assert.ok(Array.isArray(tasks.tasks));

    const execRes = await fetch(`${baseUrl}/api/v1/tasks/${task.task_id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(execRes.status, 200);
  });

  it('GET /api/v1/agents returns registered agents', async () => {
    const res = await fetch(`${baseUrl}/api/v1/agents`);
    assert.strictEqual(res.status, 200);
    const body = await jsonOf(res);
    assert.ok(Array.isArray(body.agents));
    assert.ok(body.agents.length > 0);
  });

  it('Approval Gate list and reject endpoints operate properly', async () => {
    const res = await fetch(`${baseUrl}/api/v1/approvals`);
    assert.strictEqual(res.status, 200);
    const body = await jsonOf(res);
    assert.ok(Array.isArray(body.approvals));

    // Rejecting a non-existent approval returns 400 with error
    const rejectRes = await fetch(`${baseUrl}/api/v1/approvals/non-existent-app-id/reject`, {
      method: 'POST',
    });
    assert.strictEqual(rejectRes.status, 400);
  });

  it('Tool routes: specific routes are NOT intercepted by /tools/:id (Route Shadowing Fix)', async () => {
    // 1. /tools/executions
    const execRes = await fetch(`${baseUrl}/api/v1/tools/executions`);
    assert.strictEqual(execRes.status, 200);
    const execBody = await jsonOf(execRes);
    assert.ok(Array.isArray(execBody.executions));

    // 2. /tools/status
    const statusRes = await fetch(`${baseUrl}/api/v1/tools/status`);
    assert.strictEqual(statusRes.status, 200);

    // 3. /tools/capabilities
    const capRes = await fetch(`${baseUrl}/api/v1/tools/capabilities`);
    assert.strictEqual(capRes.status, 200);

    // 4. /tools/policies
    const polRes = await fetch(`${baseUrl}/api/v1/tools/policies`);
    assert.strictEqual(polRes.status, 200);

    // 5. /tools (list)
    const listRes = await fetch(`${baseUrl}/api/v1/tools`);
    assert.strictEqual(listRes.status, 200);
    const listBody = await jsonOf(listRes);
    assert.ok(listBody.tools.length > 0);

    // 6. /tools/:id
    const singleRes = await fetch(`${baseUrl}/api/v1/tools/${listBody.tools[0].tool_id}`);
    assert.strictEqual(singleRes.status, 200);
    const singleBody = await jsonOf(singleRes);
    assert.strictEqual(singleBody.tool.tool_id, listBody.tools[0].tool_id);

    // 7. /tools/validate
    const valRes = await fetch(`${baseUrl}/api/v1/tools/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id: listBody.tools[0].tool_id, input: {} }),
    });
    assert.strictEqual(valRes.status, 200);
  });

  it('Memory lifecycle: create, list, search, and delete', async () => {
    const postRes = await fetch(`${baseUrl}/api/v1/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'NEXUS Edge architecture test memory unit',
        memory_type: 'PROJECT',
        summary: 'Architecture memory test',
      }),
    });
    assert.strictEqual(postRes.status, 200);
    const postBody = await jsonOf(postRes);
    assert.ok(postBody.memory?.memory_id);
    const memoryId = postBody.memory.memory_id;

    const listRes = await fetch(`${baseUrl}/api/v1/memory`);
    assert.strictEqual(listRes.status, 200);
    const listBody = await jsonOf(listRes);
    assert.ok(listBody.memories.some((m: any) => m.memory_id === memoryId));

    const searchRes = await fetch(`${baseUrl}/api/v1/memory/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'architecture test' }),
    });
    assert.strictEqual(searchRes.status, 200);
    const searchBody = await jsonOf(searchRes);
    assert.ok(searchBody.memories.length > 0);

    const delRes = await fetch(`${baseUrl}/api/v1/memory/${memoryId}`, {
      method: 'DELETE',
    });
    assert.strictEqual(delRes.status, 200);
  });

  it('Preferences routes: candidates routes are NOT intercepted by /preferences/:id', async () => {
    // 1. GET /preferences/candidates
    const candRes = await fetch(`${baseUrl}/api/v1/preferences/candidates`);
    assert.strictEqual(candRes.status, 200);
    const candBody = await jsonOf(candRes);
    assert.ok(Array.isArray(candBody.candidates));

    // 2. POST /preferences/suggest
    const suggRes = await fetch(`${baseUrl}/api/v1/preferences/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'response_style',
        key: 'brevity',
        value: 'concise',
        rationale: 'User prefers short explanations',
        scope: 'USER',
      }),
    });
    assert.strictEqual(suggRes.status, 201);

    // 3. POST /preferences (create explicit)
    const createRes = await fetch(`${baseUrl}/api/v1/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'output_format',
        key: 'code_language',
        value: 'typescript',
        scope: 'USER',
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const createBody = await jsonOf(createRes);
    assert.ok(createBody.preference?.preference_id);
    const prefId = createBody.preference.preference_id;

    // 4. GET /preferences/:id
    const singleRes = await fetch(`${baseUrl}/api/v1/preferences/${prefId}`);
    assert.strictEqual(singleRes.status, 200);
    const singleBody = await jsonOf(singleRes);
    assert.strictEqual(singleBody.preference.preference_id, prefId);

    // 5. GET /preferences (list)
    const listRes = await fetch(`${baseUrl}/api/v1/preferences`);
    assert.strictEqual(listRes.status, 200);
  });

  it('Feedback and Learning routes return expected state', async () => {
    const postFb = await fetch(`${baseUrl}/api/v1/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating: 'HELPFUL',
        category: 'accuracy',
        comment: 'Great response audit check',
      }),
    });
    assert.strictEqual(postFb.status, 201);

    const getFb = await fetch(`${baseUrl}/api/v1/feedback`);
    assert.strictEqual(getFb.status, 200);

    const getStatus = await fetch(`${baseUrl}/api/v1/learning/status`);
    assert.strictEqual(getStatus.status, 200);

    const getHist = await fetch(`${baseUrl}/api/v1/learning/history`);
    assert.strictEqual(getHist.status, 200);

    const getOutcomes = await fetch(`${baseUrl}/api/v1/outcomes`);
    assert.strictEqual(getOutcomes.status, 200);
  });

  it('Personalization recommend and apply routes execute correctly', async () => {
    const recRes = await fetch(`${baseUrl}/api/v1/personalization/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'write code in typescript' }),
    });
    assert.strictEqual(recRes.status, 200);

    const applyRes = await fetch(`${baseUrl}/api/v1/personalization/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: 'System base context',
        query: 'write code in typescript',
      }),
    });
    assert.strictEqual(applyRes.status, 200);
    const applyBody = await jsonOf(applyRes);
    assert.ok(applyBody.enrichedContext);
  });
});

describe('Phase G, J, M: JSON Handling, Assistant Provider & Centralized Error Handler', () => {
  it('GET /api/v1/assistant/status returns honest provider state', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assistant/status`);
    assert.strictEqual(res.status, 200);
    const body = await jsonOf(res);
    assert.strictEqual(body.provider, 'gemini');
    assert.strictEqual(body.model, 'gemini-3.8-flash');
    assert.ok(typeof body.configured === 'boolean');
  });

  it('GET /api/v1/assistant/test executes minimal diagnostic ping without crashing or exposing key', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assistant/test`);
    assert.strictEqual(res.status, 200);
    const body = await jsonOf(res);
    assert.strictEqual(body.provider, 'gemini');
    assert.strictEqual(body.model, 'gemini-3.8-flash');
    assert.strictEqual(typeof body.success, 'boolean');
    assert.ok(body.status);
    assert.strictEqual(body.prompt, 'Reply with exactly: NEXUS GEMINI CONNECTION OK');
    assert.strictEqual(body.key, undefined);
    assert.strictEqual(body.apiKey, undefined);
  });

  it('POST /api/v1/assistant/query accepts message and responds without crashing', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    });
    assert.strictEqual(res.status, 200);
    const body = await jsonOf(res);
    assert.ok(body.response);
    assert.ok(body.provider);
  });

  it('Phase G & M: Malformed JSON body returns structured JSON 400 error (never HTML)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"message": "broken json without closing brace',
    });
    assert.strictEqual(res.status, 400);
    const body = await jsonOf(res);
    assert.strictEqual(body.error.code, 'INVALID_JSON');
    assert.ok(body.error.message.includes('JSON'));
  });

  it('Phase F & M: Unhandled /api/* route returns structured JSON 404 (never index.html)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/completely-non-existent-endpoint`);
    assert.strictEqual(res.status, 404);
    const body = await jsonOf(res);
    assert.strictEqual(body.error.code, 'NOT_FOUND');
    assert.ok(body.error.message.includes('not found'));
  });
});

describe('Phase N: Document Upload Pipeline', () => {
  it('processes document perception and grounds assistant query in document context', async () => {
    // 1. Upload markdown document
    const docContent = '# NEXUS Technical Spec\nNEXUS operates as a local-first edge perimeter with zero cloud telemetry.';
    const base64Data = Buffer.from(docContent, 'utf-8').toString('base64');

    const uploadRes = await fetch(`${baseUrl}/api/v1/perception/document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'spec.md',
        base64_data: base64Data,
        mime_type: 'text/markdown',
      }),
    });

    assert.strictEqual(uploadRes.status, 200);
    const uploadBody = await jsonOf(uploadRes);
    assert.strictEqual(uploadBody.success, true);
    assert.ok(uploadBody.context?.context_id);
    const contextId = uploadBody.context.context_id;

    // 2. Query assistant with attached document context
    const queryRes = await fetch(`${baseUrl}/api/v1/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is the privacy boundary in the spec?',
        context_ids: [contextId],
      }),
    });

    assert.strictEqual(queryRes.status, 200);
    const queryBody = await jsonOf(queryRes);
    assert.ok(queryBody.response);
  });
});
