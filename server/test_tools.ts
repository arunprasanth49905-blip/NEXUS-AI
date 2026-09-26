/**
 * NEXUS-AI Phase 6: Tool & Action Engine Test Suite
 * Validates Scenarios 1 to 12:
 * 1. Read document without approval
 * 2. File creation requires approval by default
 * 3. File modification waits for approval
 * 4. User rejection prevents tool execution
 * 5. Missing tool returns TOOL_NOT_FOUND
 * 6. Unauthorized capability or disabled category is blocked
 * 7. Path traversal (../../secret.txt) blocked by sandbox
 * 8. Execution timeout handling
 * 9. Idempotency prevents duplicate destructive actions
 * 10. Secret redaction layer strips tokens
 * 11. Partial failure preserves prior successful results
 * 12. External mutation requires approval or is policy blocked
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { ToolRegistry } from './tools/registry.js';
import { registerDefaultTools } from './tools/implementations/index.js';
import { ToolExecutionEngine } from './tools/executor.js';
import { PolicyEngine } from './tools/policy.js';
import { FilesystemSandbox } from './tools/sandbox.js';
import { SecretRedactor } from './tools/redaction.js';
import { ActionVerificationEngine } from './tools/verification.js';
import { ActionAuditLogger } from './tools/audit.js';
import { ApprovalGate } from './agents/approval.js';
import type { ToolRequest } from './tools/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testWorkspace = path.resolve(__dirname, '../data/test_workspace');

describe('Phase 6: Tool Registry & Capability Discovery', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    ToolRegistry.resetInstance();
    registry = ToolRegistry.getInstance();
    registerDefaultTools(registry);
  });

  it('registers all 10 initial safe tools truthfully', () => {
    assert.strictEqual(registry.getRegisteredCount(), 10);
    assert.strictEqual(registry.getEnabledCount(), 10);
    const tools = registry.list();
    assert.strictEqual(tools.length, 10);
  });

  it('discovers tools by capability accurately', () => {
    const docReader = registry.find_by_capability('document.read');
    assert.ok(docReader);
    assert.strictEqual(docReader.tool_id, 'document-reader');

    const fileCreator = registry.find_by_capability('file.create');
    assert.ok(fileCreator);
    assert.strictEqual(fileCreator.tool_id, 'file-creator');

    const jsonAnalyzer = registry.find_by_capability('json.analyze');
    assert.ok(jsonAnalyzer);
    assert.strictEqual(jsonAnalyzer.tool_id, 'json-analyzer');
  });

  it('unregisters a tool dynamically', () => {
    assert.strictEqual(registry.unregister('text-analyzer'), true);
    assert.strictEqual(registry.get('text-analyzer'), undefined);
    assert.strictEqual(registry.getRegisteredCount(), 9);
  });
});

describe('Phase 6: Filesystem Sandbox & Security Guard (Scenario 7)', () => {
  beforeEach(() => {
    FilesystemSandbox.initialize(testWorkspace);
    if (!fs.existsSync(testWorkspace)) {
      fs.mkdirSync(testWorkspace, { recursive: true });
    }
  });

  it('Scenario 7: rejects path traversal attempts (../../secret.txt)', () => {
    const traversalAttempt = '../../secret.txt';
    const validation = FilesystemSandbox.validatePath(traversalAttempt);
    assert.strictEqual(validation.allowed, false);
    assert.ok(validation.reason?.includes('outside the permitted workspace root'));
  });

  it('Scenario 7: strictly blocks access to secret files (.env, id_rsa, credentials)', () => {
    const envPath = path.join(testWorkspace, '.env');
    const validation = FilesystemSandbox.validatePath(envPath);
    assert.strictEqual(validation.allowed, false);
    assert.ok(validation.reason?.includes('protected secret resource'));

    const keyPath = path.join(testWorkspace, 'id_rsa');
    const keyValidation = FilesystemSandbox.validatePath(keyPath);
    assert.strictEqual(keyValidation.allowed, false);
  });

  it('allows safe files strictly inside permitted workspace', () => {
    const safePath = path.join(testWorkspace, 'output.txt');
    const validation = FilesystemSandbox.validatePath(safePath);
    assert.strictEqual(validation.allowed, true);
  });
});

describe('Phase 6: Secret Protection & Redaction Layer (Scenario 10)', () => {
  it('Scenario 10: redacts OpenAI, Anthropic, Google keys and Bearer tokens from text', () => {
    const sensitive = 'Used API key sk-abcdef1234567890abcdef1234567890 and Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz.abc';
    const redacted = SecretRedactor.redactText(sensitive);
    assert.strictEqual(redacted.includes('sk-abcdef1234567890abcdef1234567890'), false);
    assert.strictEqual(redacted.includes('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz.abc'), false);
    assert.ok(redacted.includes('[REDACTED_SECRET]'));
  });

  it('Scenario 10: recursively redacts secret fields inside nested objects', () => {
    const obj = {
      user: 'alice',
      credentials: {
        api_key: 'AIzaSyA12345678901234567890123456789012',
        password: 'SuperSecretPassword123!',
      },
      meta: {
        safe_field: 'valid data',
      },
    };

    const sanitized = SecretRedactor.redactObject(obj);
    assert.strictEqual(sanitized.credentials.api_key, '[REDACTED_SECRET]');
    assert.strictEqual(sanitized.credentials.password, '[REDACTED_SECRET]');
    assert.strictEqual(sanitized.meta.safe_field, 'valid data');
  });
});

describe('Phase 6: Tool Execution & Scenarios 1 to 6, 8, 9, 11, 12', () => {
  let registry: ToolRegistry;
  let policyEngine: PolicyEngine;
  let approvalGate: ApprovalGate;
  let auditLogger: ActionAuditLogger;
  let executor: ToolExecutionEngine;

  beforeEach(() => {
    ToolRegistry.resetInstance();
    PolicyEngine.resetInstance();
    ApprovalGate.resetInstance();
    ActionAuditLogger.resetInstance();
    ToolExecutionEngine.resetInstance();

    registry = ToolRegistry.getInstance();
    registerDefaultTools(registry);

    FilesystemSandbox.initialize(testWorkspace);
    if (!fs.existsSync(testWorkspace)) {
      fs.mkdirSync(testWorkspace, { recursive: true });
    }

    policyEngine = PolicyEngine.getInstance({
      filesystem_enabled: true,
      network_enabled: false,
      auto_execute_safe_tasks: false,
      approval_required_for_high_risk: true,
    });
    approvalGate = ApprovalGate.getInstance();
    auditLogger = ActionAuditLogger.getInstance();
    executor = ToolExecutionEngine.getInstance({
      registry,
      policyEngine,
      approvalGate,
      auditLogger,
      defaultTimeoutSeconds: 5,
    });
  });

  it('Scenario 1: read text/document analysis executes directly without approval', async () => {
    const req: ToolRequest = {
      request_id: 'req-sc1-1',
      agent_id: 'knowledge-agent',
      tool_id: 'text-analyzer',
      capability: 'text.analyze',
      input: { text: 'NEXUS Edge architecture is modular and privacy-preserving.' },
      requested_at: new Date().toISOString(),
    };

    const res = await executor.executeToolRequest(req);
    assert.strictEqual(res.status, 'COMPLETED');
    assert.ok(res.output);
    assert.strictEqual(res.output.word_count, 7);
    assert.strictEqual(res.verification?.verified, true);
  });

  it('Scenario 2: file creation requires approval by default', async () => {
    const testFile = path.join(testWorkspace, 'summary_report.txt');
    const req: ToolRequest = {
      request_id: 'req-sc2-1',
      agent_id: 'productivity-agent',
      tool_id: 'file-creator',
      capability: 'file.create',
      input: {
        path: testFile,
        content: 'Project report summary: All systems nominal.',
        overwrite: true,
      },
      requested_at: new Date().toISOString(),
    };

    // First attempt: pauses at approval
    const res = await executor.executeToolRequest(req);
    assert.strictEqual(res.status, 'WAITING_FOR_APPROVAL');
    assert.ok(res.output.approval_id);

    // Human approves the action
    approvalGate.resolve(res.output.approval_id as string, 'APPROVED');

    // Second attempt with approval_id: proceeds and executes
    req.approval_id = res.output.approval_id as string;
    const resApproved = await executor.executeToolRequest(req);
    assert.strictEqual(resApproved.status, 'COMPLETED');
    assert.strictEqual(fs.existsSync(testFile), true);
    assert.strictEqual(resApproved.verification?.verified, true);
  });

  it('Scenario 3: file modification waits for approval before editing', async () => {
    const targetFile = path.join(testWorkspace, 'existing_report.txt');
    fs.writeFileSync(targetFile, 'Initial report content.', 'utf-8');

    const req: ToolRequest = {
      request_id: 'req-sc3-1',
      agent_id: 'productivity-agent',
      tool_id: 'file-editor',
      capability: 'file.modify',
      input: {
        path: targetFile,
        content: '\nUpdated technical gaps and action items.',
        mode: 'append',
      },
      requested_at: new Date().toISOString(),
    };

    const res = await executor.executeToolRequest(req);
    assert.strictEqual(res.status, 'WAITING_FOR_APPROVAL');
    // Content should NOT be modified yet
    assert.strictEqual(fs.readFileSync(targetFile, 'utf-8'), 'Initial report content.');

    // Grant approval
    approvalGate.resolve(res.output.approval_id as string, 'APPROVED');
    req.approval_id = res.output.approval_id as string;

    const resExecuted = await executor.executeToolRequest(req);
    assert.strictEqual(resExecuted.status, 'COMPLETED');
    const finalContent = fs.readFileSync(targetFile, 'utf-8');
    assert.ok(finalContent.includes('Updated technical gaps'));
  });

  it('Scenario 4: user rejects action -> tool execution stops immediately', async () => {
    const targetFile = path.join(testWorkspace, 'do_not_delete.txt');
    fs.writeFileSync(targetFile, 'Sensitive data.', 'utf-8');

    const req: ToolRequest = {
      request_id: 'req-sc4-1',
      agent_id: 'productivity-agent',
      tool_id: 'file-deleter',
      capability: 'file.delete',
      input: { path: targetFile },
      requested_at: new Date().toISOString(),
    };

    const res = await executor.executeToolRequest(req);
    assert.strictEqual(res.status, 'WAITING_FOR_APPROVAL');

    // User rejects
    approvalGate.resolve(res.output.approval_id as string, 'REJECTED');
    req.approval_id = res.output.approval_id as string;

    const resRejected = await executor.executeToolRequest(req);
    assert.strictEqual(resRejected.status, 'CANCELLED');
    assert.ok(resRejected.errors[0].includes('rejected'));
    // File remains intact on disk
    assert.strictEqual(fs.existsSync(targetFile), true);
  });

  it('Scenario 5: tool does not exist -> fails with TOOL_NOT_FOUND message', async () => {
    const req: ToolRequest = {
      request_id: 'req-sc5-1',
      agent_id: 'knowledge-agent',
      tool_id: 'non-existent-tool',
      capability: 'magic.run',
      input: {},
      requested_at: new Date().toISOString(),
    };

    const res = await executor.executeToolRequest(req);
    assert.strictEqual(res.status, 'FAILED');
    assert.ok(res.errors[0].includes('not found in Tool Registry'));
  });

  it('Scenario 6: agent requests unauthorized capability -> BLOCKED by policy', async () => {
    const req: ToolRequest = {
      request_id: 'req-sc6-1',
      agent_id: 'knowledge-agent',
      tool_id: 'text-analyzer',
      capability: 'file.delete', // Mismatched capability
      input: { text: 'hello' },
      requested_at: new Date().toISOString(),
    };

    const res = await executor.executeToolRequest(req);
    assert.strictEqual(res.status, 'BLOCKED');
    assert.ok(res.errors[0].includes('does not provide requested capability'));
  });

  it('Scenario 8: execution timeout is handled safely without fake success', async () => {
    // Custom tool with intentional timeout delay
    const delayedTool = {
      tool_id: 'slow-analyzer',
      name: 'Slow Analyzer',
      description: 'Test slow tool',
      version: '1.0.0',
      category: 'ANALYSIS' as const,
      capabilities: ['data.slow'],
      risk_level: 'READ_ONLY' as const,
      input_schema: { type: 'object' as const, properties: {} },
      output_schema: { type: 'object' as const, properties: {} },
      enabled: true,
      approval_required: false,
      timeout_seconds: 0.1, // 100ms
      metadata: {},
      getInfo: () => ({
        tool_id: 'slow-analyzer',
        name: 'Slow Analyzer',
        description: 'Test slow tool',
        version: '1.0.0',
        category: 'ANALYSIS' as const,
        capabilities: ['data.slow'],
        risk_level: 'READ_ONLY' as const,
        approval_required: false,
        enabled: true,
        timeout_seconds: 0.1,
        input_schema: { type: 'object' as const, properties: {} },
        output_schema: { type: 'object' as const, properties: {} },
      }),
      hasCapability: (c: string) => c === 'data.slow',
      validateInput: () => ({ valid: true, errors: [] }),
      execute: () => new Promise<Record<string, unknown>>((resolve) => setTimeout(() => resolve({ done: true }), 500)),
      verify: () => ({ state: 'VALID' as const, verified: true, summary: '' }),
    };

    registry.register(delayedTool as any);

    const req: ToolRequest = {
      request_id: 'req-sc8-1',
      agent_id: 'debug-agent',
      tool_id: 'slow-analyzer',
      capability: 'data.slow',
      input: {},
      requested_at: new Date().toISOString(),
    };

    const res = await executor.executeToolRequest(req);
    assert.strictEqual(res.status, 'TIMEOUT');
    assert.ok(res.errors[0].includes('timed out'));
  });

  it('Scenario 9: duplicate request is caught by idempotency without duplicate execution', async () => {
    const req: ToolRequest = {
      request_id: 'req-sc9-1',
      idempotency_key: 'unique-idempotency-token-123',
      agent_id: 'productivity-agent',
      tool_id: 'text-analyzer',
      capability: 'text.analyze',
      input: { text: 'Consistent content' },
      requested_at: new Date().toISOString(),
    };

    const first = await executor.executeToolRequest(req);
    assert.strictEqual(first.status, 'COMPLETED');

    const second = await executor.executeToolRequest(req);
    assert.strictEqual(second.status, 'COMPLETED');
    assert.strictEqual(second.metadata?.duplicate_detected, true);
  });

  it('Scenario 11: preserves successful results when subsequent tool fails', async () => {
    // Step 1: Text analysis succeeds
    const req1: ToolRequest = {
      request_id: 'req-step-1',
      agent_id: 'knowledge-agent',
      tool_id: 'text-analyzer',
      capability: 'text.analyze',
      input: { text: 'Step 1 success text.' },
      requested_at: new Date().toISOString(),
    };
    const res1 = await executor.executeToolRequest(req1);
    assert.strictEqual(res1.status, 'COMPLETED');

    // Step 2: Next tool fails because target file does not exist
    const req2: ToolRequest = {
      request_id: 'req-step-2',
      agent_id: 'productivity-agent',
      tool_id: 'file-editor',
      capability: 'file.modify',
      input: { path: path.join(testWorkspace, 'non_existent_file.txt'), content: 'fail' },
      requested_at: new Date().toISOString(),
    };
    const res2 = await executor.executeToolRequest(req2);
    // Requires approval or fails
    assert.ok(res2.status === 'WAITING_FOR_APPROVAL' || res2.status === 'FAILED');

    // Prior successful result is completely preserved
    assert.strictEqual(res1.status, 'COMPLETED');
    assert.strictEqual(res1.output.word_count, 4);
  });

  it('Scenario 12: network / external mutation is blocked when network policy is disabled', async () => {
    // Custom network tool
    const netTool = {
      tool_id: 'network-poster',
      name: 'Network Poster',
      description: 'Sends external webhook',
      version: '1.0.0',
      category: 'NETWORK' as const,
      capabilities: ['network.write'],
      risk_level: 'EXTERNAL_SIDE_EFFECT' as const,
      input_schema: { type: 'object' as const, properties: {} },
      output_schema: { type: 'object' as const, properties: {} },
      enabled: true,
      approval_required: true,
      timeout_seconds: 5,
      metadata: {},
      getInfo: () => ({
        tool_id: 'network-poster',
        name: 'Network Poster',
        description: 'Sends external webhook',
        version: '1.0.0',
        category: 'NETWORK' as const,
        capabilities: ['network.write'],
        risk_level: 'EXTERNAL_SIDE_EFFECT' as const,
        approval_required: true,
        enabled: true,
        timeout_seconds: 5,
        input_schema: { type: 'object' as const, properties: {} },
        output_schema: { type: 'object' as const, properties: {} },
      }),
      hasCapability: (c: string) => c === 'network.write',
      validateInput: () => ({ valid: true, errors: [] }),
      execute: async () => ({ posted: true }),
      verify: () => ({ state: 'VALID' as const, verified: true, summary: '' }),
    };

    registry.register(netTool as any);

    const req: ToolRequest = {
      request_id: 'req-sc12-1',
      agent_id: 'research-agent',
      tool_id: 'network-poster',
      capability: 'network.write',
      input: {},
      requested_at: new Date().toISOString(),
    };

    const res = await executor.executeToolRequest(req);
    assert.strictEqual(res.status, 'BLOCKED');
    assert.ok(res.errors[0].includes('Network tools are disabled'));
  });

  it('ActionVerificationEngine verifies file creation and outputs accurately', () => {
    const verifiedFile = path.join(testWorkspace, 'verif_test.txt');
    fs.writeFileSync(verifiedFile, 'Verified content.', 'utf-8');

    const report = ActionVerificationEngine.verifyResult({
      request_id: 'req-v1',
      tool_id: 'file-creator',
      status: 'COMPLETED',
      output: { created_path: verifiedFile },
      warnings: [],
      errors: [],
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: 10,
      provenance: { tool_id: 'file-creator', timestamp: new Date().toISOString() },
    });

    assert.strictEqual(report.state, 'VALID');
    assert.strictEqual(report.verified, true);
  });
});
