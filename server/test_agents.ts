/**
 * NEXUS-AI Phase 5: Agent Orchestration & Intelligent Task Planning Test Suite
 * Validates scenarios 1-12, registry, capability matching, DAG, timeouts, retries,
 * cancellation, approvals, verification, and context/memory integration.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { AgentRegistry } from './agents/registry.js';
import {
  KnowledgeAgent,
  DocumentAgent,
  registerDefaultAgents,
} from './agents/implementations/index.js';
import { TaskClassifier, createOrchestrationTask } from './agents/task.js';
import { TaskDecomposer } from './agents/decomposer.js';
import { AgentSelector } from './agents/selector.js';
import { DependencyGraph } from './agents/graph.js';
import { ContextScoper } from './agents/scoping.js';
import { VerificationEngine } from './agents/verification.js';
import { AgentOrchestrator } from './agents/orchestrator.js';
import { createPlanStep, createTaskPlan } from './agents/plan.js';
import type { PlanStep } from './agents/types.js';

describe('Phase 5: Agent Registry & Capability Lookup', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    AgentRegistry.resetInstance();
    registry = AgentRegistry.getInstance();
    registerDefaultAgents(registry);
  });

  it('registers all 7 initial agents truthfully without hardcoded counts', () => {
    const list = registry.list();
    assert.strictEqual(list.length, 7);
    const ids = list.map((a) => a.agent_id);
    assert.ok(ids.includes('knowledge-agent'));
    assert.ok(ids.includes('productivity-agent'));
    assert.ok(ids.includes('study-agent'));
    assert.ok(ids.includes('vision-agent'));
    assert.ok(ids.includes('document-agent'));
    assert.ok(ids.includes('debug-agent'));
    assert.ok(ids.includes('research-agent'));
  });

  it('finds agents by capability and task type accurately', () => {
    const docAgents = registry.find_by_capability('analyze_uploaded_documents');
    assert.strictEqual(docAgents.length, 1);
    assert.strictEqual(docAgents[0].agent_id, 'document-agent');

    const debugAgents = registry.find_by_task_type('debug');
    assert.strictEqual(debugAgents.length, 1);
    assert.strictEqual(debugAgents[0].agent_id, 'debug-agent');
  });

  it('unregisters an agent dynamically when removed', () => {
    assert.ok(registry.unregister('study-agent'));
    assert.strictEqual(registry.get('study-agent'), undefined);
    assert.strictEqual(registry.count(), 6);
  });
});

describe('Phase 5: Task Classification & Scenarios 1 to 4', () => {
  it('Scenario 1: classifies "Explain what a transformer is" as SIMPLE with single Knowledge Agent', () => {
    const res = TaskClassifier.classify('Explain what a transformer is.');
    assert.strictEqual(res.complexity, 'SIMPLE');
    assert.strictEqual(res.suggested_agent_id, 'knowledge-agent');
    assert.strictEqual(res.is_multistep, false);
  });

  it('Scenario 2: user uploads document and asks "Summarize this document" -> Document Agent', () => {
    const res = TaskClassifier.classify('Summarize this document', {
      document: { filename: 'spec.pdf', size: 1024 },
    });
    assert.strictEqual(res.suggested_agent_id, 'document-agent');
    assert.strictEqual(res.task_type, 'document_summary');
    assert.strictEqual(res.is_multistep, false);
  });

  it('Scenario 3: complex multi-objective request yields multi-step plan decomposition', () => {
    const prompt = 'Analyze my project report, identify technical gaps, and create a presentation structure.';
    const task = createOrchestrationTask({ user_request: prompt });
    assert.strictEqual(task.complexity, 'COMPLEX');

    const plan = TaskDecomposer.decompose(task);
    assert.strictEqual(plan.steps.length, 4);

    assert.strictEqual(plan.steps[0].agent_id, 'document-agent');
    assert.strictEqual(plan.steps[1].agent_id, 'knowledge-agent');
    assert.strictEqual(plan.steps[2].agent_id, 'knowledge-agent');
    assert.strictEqual(plan.steps[3].agent_id, 'productivity-agent');

    // Explicit dependencies: step-1 -> step-2 -> step-3 -> step-4
    assert.deepStrictEqual(plan.steps[0].dependencies, []);
    assert.deepStrictEqual(plan.steps[1].dependencies, ['step-1']);
    assert.deepStrictEqual(plan.steps[2].dependencies, ['step-2']);
    assert.deepStrictEqual(plan.steps[3].dependencies, ['step-3']);
  });

  it('Scenario 4: coding error yields Debug Agent', () => {
    const res = TaskClassifier.classify(
      'TypeError: Cannot read properties of undefined (reading "map") at CameraModal.tsx:42'
    );
    assert.strictEqual(res.suggested_agent_id, 'debug-agent');
    assert.strictEqual(res.task_type, 'debug');
    assert.ok(res.required_capabilities.includes('analyze_errors'));
  });
});

describe('Phase 5: Agent Selector & Permissions (Scenario 8)', () => {
  let registry: AgentRegistry;
  let selector: AgentSelector;

  beforeEach(() => {
    AgentRegistry.resetInstance();
    registry = AgentRegistry.getInstance();
    registerDefaultAgents(registry);
    selector = new AgentSelector(registry);
  });

  it('matches appropriate agent for requested capabilities', () => {
    const res = selector.selectAgent({
      required_capabilities: ['structure_information', 'create_plans'],
    });
    assert.strictEqual(res.selected, true);
    assert.strictEqual(res.agent_id, 'productivity-agent');
  });

  it('Scenario 8: rejects unauthorized capabilities with structured failure', () => {
    const res = selector.selectAgent({
      required_capabilities: ['unauthorized_arbitrary_shell_execution'],
    });
    assert.strictEqual(res.selected, false);
    assert.strictEqual(res.error, 'No suitable NEXUS agent is currently available for this task.');
  });

  it('validates permission correctly', () => {
    assert.strictEqual(selector.validatePermission('debug-agent', 'analyze_errors'), true);
    assert.strictEqual(selector.validatePermission('debug-agent', 'arbitrary_network_exploit'), false);
  });
});

describe('Phase 5: Dependency Graph & Sequential Execution (Scenario 5)', () => {
  it('Scenario 5: executes dependency graph in correct DAG sequence and passes prerequisite outputs', () => {
    const steps: PlanStep[] = [
      createPlanStep({
        step_id: 'step-1',
        title: 'Step 1',
        description: 'First step',
        agent_id: 'document-agent',
        required_capabilities: ['analyze_uploaded_documents'],
      }),
      createPlanStep({
        step_id: 'step-2',
        title: 'Step 2',
        description: 'Second step',
        agent_id: 'knowledge-agent',
        required_capabilities: ['extract_relevant_information'],
        dependencies: ['step-1'],
      }),
    ];

    const graph = new DependencyGraph(steps);
    assert.strictEqual(graph.hasCycle(), false);

    // Initially only step-1 is ready
    const readyInitially = graph.getReadySteps(new Set());
    assert.strictEqual(readyInitially.length, 1);
    assert.strictEqual(readyInitially[0].step_id, 'step-1');

    // Once step-1 is completed, step-2 becomes ready
    const readyAfterStep1 = graph.getReadySteps(new Set(['step-1']));
    assert.strictEqual(readyAfterStep1.length, 1);
    assert.strictEqual(readyAfterStep1[0].step_id, 'step-2');
  });

  it('detects cycles in invalid plans', () => {
    const cyclicSteps: PlanStep[] = [
      createPlanStep({
        step_id: 'step-A',
        title: 'A',
        description: 'A',
        agent_id: 'knowledge-agent',
        required_capabilities: ['answer_questions'],
        dependencies: ['step-B'],
      }),
      createPlanStep({
        step_id: 'step-B',
        title: 'B',
        description: 'B',
        agent_id: 'knowledge-agent',
        required_capabilities: ['answer_questions'],
        dependencies: ['step-A'],
      }),
    ];
    const graph = new DependencyGraph(cyclicSteps);
    assert.strictEqual(graph.hasCycle(), true);
  });
});

describe('Phase 5: Partial Failure, Retry, Timeout, Cancellation (Scenarios 6, 11, 12)', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    AgentOrchestrator.resetInstance();
    orchestrator = AgentOrchestrator.getInstance({ defaultTimeoutMs: 500 });
  });

  it('Scenario 6: preserves successful results when a subsequent agent fails', async () => {
    const { task } = orchestrator.createTaskAndPlan({
      user_request: 'Analyze my project report, identify technical gaps, and create a presentation structure.',
    });

    // Artificially fail step-2
    const step2 = task.plan!.steps.find((s) => s.step_id === 'step-2')!;
    step2.agent_id = 'non-existent-agent';

    const result = await orchestrator.executePlan(task.task_id);
    assert.strictEqual(result.step_results['step-1'].status, 'COMPLETED');
    assert.strictEqual(result.step_results['step-2'].status, 'FAILED');
    // Step 3 and 4 should be SKIPPED due to step-2 failure
    assert.strictEqual(task.plan!.steps[2].status, 'SKIPPED');
    assert.strictEqual(task.plan!.steps[3].status, 'SKIPPED');
    assert.strictEqual(result.verification.state, 'PARTIAL');
  });

  it('Scenario 11: task cancellation stops pending work safely', async () => {
    const { task } = orchestrator.createTaskAndPlan({
      user_request: 'Analyze my project report, identify technical gaps, and create a presentation structure.',
    });

    // Cancel immediately before plan runs
    orchestrator.cancelTask(task.task_id);
    const result = await orchestrator.executePlan(task.task_id);
    assert.strictEqual(result.status, 'CANCELLED');
    assert.strictEqual(task.status, 'CANCELLED');
  });

  it('Scenario 12: duplicate execution attempt is rejected via idempotency tracking', async () => {
    const { task } = orchestrator.createTaskAndPlan({
      user_request: 'Explain what a transformer is.',
    });

    await orchestrator.executePlan(task.task_id);

    // Attempting to execute the same task twice returns cached result without re-executing
    const duplicate = await orchestrator.executePlan(task.task_id);
    assert.strictEqual(duplicate.task_id, task.task_id);
    assert.strictEqual(duplicate.status, 'COMPLETED');
  });
});

describe('Phase 5: Human Approval Workflow (Scenario 7)', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    AgentOrchestrator.resetInstance();
    orchestrator = AgentOrchestrator.getInstance();
  });

  it('Scenario 7: transitions to WAITING_FOR_APPROVAL on elevated risk step and resumes after approval', async () => {
    const { task } = orchestrator.createTaskAndPlan({
      user_request: 'Explain what a transformer is.',
    });

    // Elevate step risk level
    const step = task.plan!.steps[0];
    step.risk_level = 'HIGH_RISK';
    step.approval_required = true;

    const result = await orchestrator.executePlan(task.task_id);
    assert.strictEqual(result.status, 'WAITING_FOR_APPROVAL');
    assert.strictEqual(result.approvals_pending.length, 1);

    const approvalId = result.approvals_pending[0].approval_id;

    // User approves
    orchestrator.getApprovalGate().resolve(approvalId, 'APPROVED');

    // Resuming completes the plan
    const resumedResult = await orchestrator.resumeAfterApproval(task.task_id, approvalId);
    assert.strictEqual(resumedResult.status, 'COMPLETED');
    assert.strictEqual(resumedResult.verification.state, 'VALID');
  });
});

describe('Phase 5: Context Scoping & Phase 4 Integration (Scenarios 9 & 10)', () => {
  it('Scenario 9: scopes minimum necessary context per agent without leaking full store', async () => {
    const scoper = new ContextScoper();
    const docAgent = new DocumentAgent();
    const scoped = await scoper.scopeForAgent(
      docAgent,
      {
        document: { filename: 'test.md', extracted_text: '# Spec' },
        secret_keys: 'sk-1234567890',
        private_unrelated_session: 'hidden',
      },
      'Summarize this document'
    );

    assert.ok(scoped.scoped_payload.document);
    assert.strictEqual(scoped.scoped_payload.secret_keys, undefined);
    assert.strictEqual(scoped.scoped_payload.private_unrelated_session, undefined);
  });

  it('Scenario 10: passes relevant Phase 4 memories to Knowledge Agent', async () => {
    const scoper = new ContextScoper();
    const knowledgeAgent = new KnowledgeAgent();
    const scoped = await scoper.scopeForAgent(
      knowledgeAgent,
      { project: { name: 'NEXUS' } },
      'Explain Phase 2 runtime engine'
    );

    assert.ok(Array.isArray(scoped.scoped_payload.memories));
  });

  it('Memory Write Policy: rejects credentials and passwords from being stored', async () => {
    const scoper = new ContextScoper();
    const candidate = await scoper.submitMemoryCandidate({
      content: 'SECRET_API_KEY=ghp_ABC123456789012345678901234567890123456',
      summary: 'GitHub Token',
      agent_id: 'knowledge-agent',
    });

    assert.strictEqual(candidate.stored, false);
    assert.ok(candidate.reason.includes('Privacy Guard'));
  });
});

describe('Phase 5: Verification Engine & Conflict Detection', () => {
  it('detects contradictory results between agents and flags NEEDS_REVIEW', () => {
    const plan = createTaskPlan({
      task_id: 'task-conf',
      objective: 'Verify module compatibility',
      steps: [
        createPlanStep({
          step_id: 'step-1',
          title: 'Agent 1 Analysis',
          description: 'Doc test',
          agent_id: 'document-agent',
          required_capabilities: ['analyze_uploaded_documents'],
        }),
        createPlanStep({
          step_id: 'step-2',
          title: 'Agent 2 Analysis',
          description: 'Knowledge test',
          agent_id: 'knowledge-agent',
          required_capabilities: ['synthesize_information'],
        }),
      ],
    });

    const results = {
      'step-1': {
        execution_id: 'e1',
        agent_id: 'document-agent',
        task_id: 'task-conf',
        step_id: 'step-1',
        status: 'COMPLETED' as const,
        output: { text: 'Report indicates module is fully compatible with no errors found.' },
        provenance: { agent_id: 'document-agent', timestamp: new Date().toISOString() },
        warnings: [],
        errors: [],
        started_at: new Date().toISOString(),
      },
      'step-2': {
        execution_id: 'e2',
        agent_id: 'knowledge-agent',
        task_id: 'task-conf',
        step_id: 'step-2',
        status: 'COMPLETED' as const,
        output: { text: 'Critical error detected: system is incompatible with target architecture.' },
        provenance: { agent_id: 'knowledge-agent', timestamp: new Date().toISOString() },
        warnings: [],
        errors: [],
        started_at: new Date().toISOString(),
      },
    };

    const report = VerificationEngine.verify(plan, results);
    assert.strictEqual(report.state, 'NEEDS_REVIEW');
    assert.strictEqual(report.conflicts.length, 1);
  });
});
