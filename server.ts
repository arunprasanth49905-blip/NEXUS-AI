import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RuntimeManager } from './server/manager.js';
import { PerceptionManager } from './server/perception/manager.js';
import { ContextMemoryEngine } from './server/context_memory/manager.js';
import { AgentOrchestrator } from './server/agents/orchestrator.js';
import { ToolRegistry } from './server/tools/registry.js';
import { registerDefaultTools } from './server/tools/implementations/index.js';
import { ToolExecutionEngine } from './server/tools/executor.js';
import { FilesystemSandbox } from './server/tools/sandbox.js';
import { ActionAuditLogger } from './server/tools/audit.js';
import { AdaptiveEngine } from './server/adaptation/index.js';
import type { ProviderId } from './src/types/runtime.js';
import type { ScreenCaptureRequest, CameraCaptureRequest, VoiceTranscriptionRequest } from './src/types/perception.js';
import type { MemoryType } from './src/types/context_memory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Limit JSON payload up to 25MB for base64 screen/camera frames and file uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// CORS configuration for local development / testing
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

const PROJECT_NAME = 'NEXUS EDGE';
const VERSION = '0.7.0';
const PHASE = 'Phase 7 - Adaptive Intelligence, User Preferences & Continuous Improvement';
const TAGLINE = "Understand what you're doing. Get intelligent help. Keep your data private.";

// Initialize Filesystem Sandbox to workspace root
FilesystemSandbox.initialize(__dirname);

// Instantiate Hardware-Aware AI Runtime Manager (Phase 2)
const runtimeManager = new RuntimeManager();
runtimeManager.initialize().catch((err) => {
  console.error('Failed to initialize RuntimeManager:', err);
});

// Instantiate Multimodal Perception Manager (Phase 3)
const perceptionManager = PerceptionManager.getInstance();

// Instantiate Context Intelligence & Memory Engine (Phase 4)
const contextMemoryEngine = ContextMemoryEngine.getInstance();

// Instantiate Agent Orchestration & Task Planning Engine (Phase 5)
const agentOrchestrator = AgentOrchestrator.getInstance({ runtimeManager });

// Instantiate Tool & Action Engine (Phase 6)
const toolRegistry = ToolRegistry.getInstance();
registerDefaultTools(toolRegistry);
const toolExecutionEngine = ToolExecutionEngine.getInstance({ registry: toolRegistry });
const actionAuditLogger = ActionAuditLogger.getInstance();

// Instantiate Adaptive Intelligence & Continuous Learning Engine (Phase 7)
const adaptiveEngine = AdaptiveEngine.getInstance();

// 1. Health check
app.get('/api/v1/health', (_req, res) => {
  const runtimeStatus = runtimeManager.getRuntimeStatus();
  res.json({
    status: runtimeStatus.runtime_state === 'READY' ? 'ready' : 'limited',
    service: PROJECT_NAME,
    version: VERSION,
    phase: PHASE,
    timestamp: new Date().toISOString(),
    runtime_ready: runtimeStatus.runtime_state === 'READY',
    privacy: 'protected',
    active_provider: runtimeStatus.active_provider,
  });
});

// 2. System diagnostics
app.get('/api/v1/system', (_req, res) => {
  const status = runtimeManager.getRuntimeStatus();
  const hw = status.hardware;

  res.json({
    system: {
      os: hw.os,
      os_family: hw.osFamily,
      os_version: hw.osVersion,
      architecture: hw.architecture,
      processor: hw.processor,
      cpu_physical_cores: hw.cpuPhysicalCores,
      cpu_logical_threads: hw.cpuLogicalThreads,
      total_memory_gb: hw.totalMemoryGb,
      available_memory_gb: hw.availableMemoryGb,
      memory_usage_percent: hw.memoryUsagePercent,
    },
    runtime: {
      status: status.runtime_state === 'READY' ? 'Ready' : status.runtime_state,
      provider: `NEXUS Edge Engine (${status.active_provider.toUpperCase()})`,
      model: status.active_model,
      execution_mode: `Hardware-Aware (${status.active_provider.toUpperCase()})`,
      phase: PHASE,
      privacy_boundary: 'Local-only / Zero Cloud Telemetry',
    },
    acceleration: {
      cpu: `Detected (${hw.processor})`,
      gpu: hw.gpuDeviceDetected
        ? `${hw.gpuDeviceName} (Inference: ${hw.gpuInferenceProviderAvailable ? 'Ready' : 'Not configured'})`
        : 'Not configured',
      npu: hw.npuAvailable
        ? 'Snapdragon NPU Available'
        : (hw.snapdragonDetected ? 'Snapdragon detected (QNN lib unconfigured)' : 'Not detected'),
      qnn_runtime: hw.qnnEnvironmentDetected
        ? 'Configured (Qualcomm QNN Ready)'
        : (hw.qnnStatus === 'NOT_CONFIGURED' ? 'SDK present (libs missing)' : 'Not detected / Not configured'),
      inference_engine: `${status.active_provider.toUpperCase()} (${status.selection.reason})`,
      tops_rating: hw.npuAvailable ? 'Hardware Rated' : 'Unknown',
    },
    timestamp: new Date().toISOString(),
  });
});

// 3. Current working context
app.get('/api/v1/context', (_req, res) => {
  const status = runtimeManager.getRuntimeStatus();
  const session = contextMemoryEngine.getSession();
  const activeTask = contextMemoryEngine.getActiveTask();

  res.json({
    project: PROJECT_NAME,
    status: status.runtime_state === 'READY' ? 'Ready' : status.runtime_state,
    runtime: `${status.active_provider.toUpperCase()} (Available)`,
    privacy: 'Protected',
    boundary: 'Local-first edge perimeter',
    active_sources: perceptionManager.getAllContexts().length,
    phase: PHASE,
    active_model: status.active_model,
    active_task: activeTask ? activeTask.title : null,
    session_id: session.session_id,
  });
});

// ----------------------------------------------------
// PHASE 2 RUNTIME ENGINE APIS
// ----------------------------------------------------

app.get('/api/v1/runtime/status', (_req, res) => {
  res.json(runtimeManager.getRuntimeStatus());
});

app.get('/api/v1/runtime/providers', (_req, res) => {
  const providers = runtimeManager.getRegistry().getAll().map((p) => p.getInfo());
  res.json({
    providers,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/runtime/capabilities', (_req, res) => {
  const providers = runtimeManager.getRegistry().getAll();
  const caps: Record<string, unknown> = {};
  for (const p of providers) {
    caps[p.providerId] = {
      name: p.name,
      status: p.getStatus(),
      available: p.isAvailable(),
      capabilities: p.getCapabilities(),
    };
  }
  res.json({
    capabilities: caps,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/runtime/models', (_req, res) => {
  res.json({
    models: runtimeManager.getModelManager().getModels(),
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/v1/runtime/models/load', (req, res) => {
  const modelId = req.body?.model_id;
  if (!modelId) {
    res.status(400).json({ error: 'model_id is required' });
    return;
  }
  const success = runtimeManager.getModelManager().loadModel(modelId);
  if (!success) {
    res.status(404).json({ error: `Model '${modelId}' not found.` });
    return;
  }
  res.json({ success: true, model_id: modelId, status: 'READY' });
});

app.post('/api/v1/runtime/models/unload', (req, res) => {
  const modelId = req.body?.model_id;
  if (!modelId) {
    res.status(400).json({ error: 'model_id is required' });
    return;
  }
  const success = runtimeManager.getModelManager().unloadModel(modelId);
  res.json({ success, model_id: modelId, status: 'UNLOADED' });
});

app.post('/api/v1/runtime/select', (req, res) => {
  const requestedProvider = req.body?.provider || 'auto';
  const modelId = req.body?.model_id;
  const models = runtimeManager.getModelManager().getModels();
  const model = (modelId ? runtimeManager.getModelManager().getModel(modelId) : null) || models[0];

  const hw = runtimeManager.getHardware();
  const selection = runtimeManager.getRuntimeStatus().selection;
  res.json({
    selection,
    requested_provider: requestedProvider,
    target_model: model.id,
    hardware: hw,
  });
});

app.post('/api/v1/inference', async (req, res) => {
  try {
    const input = typeof req.body?.input === 'string' ? req.body.input : (req.body?.message || '');
    const model = req.body?.model;
    const provider = req.body?.provider as ProviderId | 'auto' | undefined;

    if (!input.trim()) {
      res.status(400).json({ error: 'Input message/prompt is required' });
      return;
    }

    const result = await runtimeManager.infer({
      input,
      modelId: model,
      requestedProvider: provider,
    });

    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Inference failed';
    res.status(500).json({
      success: false,
      error: msg,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/api/v1/runtime/telemetry', (_req, res) => {
  res.json({
    telemetry: runtimeManager.getTelemetryHistory(),
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/v1/runtime/benchmark', async (req, res) => {
  try {
    const provider = req.body?.provider as ProviderId | undefined;
    const model = req.body?.model as string | undefined;
    const runs = typeof req.body?.runs === 'number' ? req.body.runs : 5;

    const result = await runtimeManager.benchmark({
      providerId: provider,
      modelId: model,
      runs,
    });

    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Benchmark execution failed';
    res.status(400).json({
      error: msg,
      timestamp: new Date().toISOString(),
    });
  }
});

// ----------------------------------------------------
// PHASE 3 MULTIMODAL PERCEPTION APIS
// ----------------------------------------------------

app.get('/api/v1/perception/status', (_req, res) => {
  res.json(perceptionManager.getStatus());
});

app.post('/api/v1/perception/text', (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) {
    res.status(400).json({ error: 'Text content is required' });
    return;
  }
  const context = perceptionManager.processText(text, { userAgent: req.headers['user-agent'] || 'Browser' });
  res.json({ success: true, context });
});

app.post('/api/v1/perception/screen', async (req, res) => {
  try {
    const body: ScreenCaptureRequest = req.body;
    if (!body?.image_data_base64) {
      res.status(400).json({ error: 'image_data_base64 is required for screen perception.' });
      return;
    }
    const context = await perceptionManager.processScreen(body);
    res.json({ success: true, context });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Screen capture perception failed';
    res.status(400).json({ success: false, error: msg });
  }
});

app.post('/api/v1/perception/camera', async (req, res) => {
  try {
    const body: CameraCaptureRequest = req.body;
    if (!body?.image_data_base64) {
      res.status(400).json({ error: 'image_data_base64 is required for camera perception.' });
      return;
    }
    const context = await perceptionManager.processCamera(body);
    res.json({ success: true, context });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Camera perception failed';
    res.status(400).json({ success: false, error: msg });
  }
});

app.post('/api/v1/perception/voice', (req, res) => {
  try {
    const body: VoiceTranscriptionRequest = req.body;
    if (!body?.transcript || !body.transcript.trim()) {
      res.status(400).json({ error: 'Transcript is required for voice perception.' });
      return;
    }
    const context = perceptionManager.processVoice(body);
    res.json({ success: true, context });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Voice perception failed';
    res.status(400).json({ success: false, error: msg });
  }
});

app.post('/api/v1/perception/document', async (req, res) => {
  try {
    const filename = req.body?.filename;
    const base64Data = req.body?.base64_data;
    const mimeType = req.body?.mime_type;

    if (!filename || !base64Data) {
      res.status(400).json({ error: 'filename and base64_data are required for document perception.' });
      return;
    }

    const tmpDir = path.resolve(__dirname, 'data', 'tmp', 'documents');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const safeFilename = `${Date.now()}-${path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(tmpDir, safeFilename);

    const buffer = Buffer.from(base64Data.replace(/^data:.*?;base64,/, ''), 'base64');
    await fs.promises.writeFile(filePath, buffer);

    try {
      const context = await perceptionManager.processDocument(filePath, filename, buffer.length, mimeType);
      res.json({ success: true, context });
    } finally {
      fs.promises.unlink(filePath).catch(() => {});
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Document perception failed';
    res.status(400).json({ success: false, error: msg });
  }
});

app.get('/api/v1/perception/context', (_req, res) => {
  res.json({
    contexts: perceptionManager.getAllContexts(),
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/v1/perception/context/merge', (req, res) => {
  const contextIds: string[] = Array.isArray(req.body?.context_ids) ? req.body.context_ids : [];
  const primaryQuery = req.body?.primary_query || '';
  const merged = perceptionManager.mergeContexts(contextIds, primaryQuery);
  res.json({ success: true, unified_context: merged });
});

// ----------------------------------------------------
// PHASE 4 CONTEXT INTELLIGENCE & MEMORY APIS
// ----------------------------------------------------

// 1. Context Status
app.get('/api/v1/context/status', async (_req, res) => {
  const status = await contextMemoryEngine.getStatus();
  res.json(status);
});

// 2. Current Session
app.get('/api/v1/context/session', (_req, res) => {
  res.json({ session: contextMemoryEngine.getSession() });
});

app.post('/api/v1/context/session', (req, res) => {
  const title = req.body?.title || 'New Workspace Session';
  const session = contextMemoryEngine.resetSession(title);
  res.json({ session });
});

// ----------------------------------------------------
// PHASE 4 & PHASE 5 TASK & AGENT ORCHESTRATION APIS
// ----------------------------------------------------

// Active Task Management (Phase 4 backward compatibility)
app.get('/api/v1/tasks/current', (_req, res) => {
  res.json({ active_task: contextMemoryEngine.getActiveTask() });
});

app.delete('/api/v1/tasks/current', (_req, res) => {
  contextMemoryEngine.clearActiveTask();
  res.json({ success: true, message: 'Active task cleared.' });
});

// Phase 5 Task Creation & Planning
app.post('/api/v1/tasks', (req, res) => {
  const userRequest = req.body?.user_request || req.body?.prompt;
  const title = req.body?.title;
  const description = req.body?.description || 'User-initiated task';
  const context = req.body?.context || {};

  if (!userRequest && !title) {
    res.status(400).json({ error: 'Either user_request or title is required.' });
    return;
  }

  // Anchor active task in Phase 4 context memory engine
  const activeTaskTitle = title || (userRequest.length > 50 ? `${userRequest.slice(0, 47)}...` : userRequest);
  const activeTask = contextMemoryEngine.setActiveTask(activeTaskTitle, description);

  // Create Phase 5 Orchestration Task & Decomposed Plan
  const effectiveRequest = userRequest || `${title}: ${description}`;
  const { task, plan } = agentOrchestrator.createTaskAndPlan({
    user_request: effectiveRequest,
    session_id: contextMemoryEngine.getSession().session_id,
    context: { ...context, title },
  });

  res.json({
    active_task: activeTask,
    task,
    plan,
  });
});

// List all orchestration tasks
app.get('/api/v1/tasks', (_req, res) => {
  res.json({
    tasks: agentOrchestrator.listTasks(),
  });
});

// Get specific task
app.get('/api/v1/tasks/:task_id', (req, res) => {
  const task = agentOrchestrator.getTask(req.params.task_id);
  if (!task) {
    res.status(404).json({ error: `Task '${req.params.task_id}' not found.` });
    return;
  }
  res.json({ task });
});

// Generate or retrieve plan for task
app.post('/api/v1/tasks/:task_id/plan', (req, res) => {
  const task = agentOrchestrator.getTask(req.params.task_id);
  if (!task) {
    res.status(404).json({ error: `Task '${req.params.task_id}' not found.` });
    return;
  }
  if (!task.plan) {
    const { plan } = agentOrchestrator.createTaskAndPlan({
      user_request: task.user_request,
      task_id: task.task_id,
      session_id: task.session_id,
      context: task.context,
    });
    res.json({ plan });
    return;
  }
  res.json({ plan: task.plan });
});

app.get('/api/v1/tasks/:task_id/plan', (req, res) => {
  const task = agentOrchestrator.getTask(req.params.task_id);
  if (!task || !task.plan) {
    res.status(404).json({ error: `Plan for task '${req.params.task_id}' not found.` });
    return;
  }
  res.json({ plan: task.plan });
});

// Execute task plan through DAG
app.post('/api/v1/tasks/:task_id/execute', async (req, res) => {
  try {
    const result = await agentOrchestrator.executePlan(req.params.task_id);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Execution failed';
    res.status(400).json({ error: msg });
  }
});

// Get task status
app.get('/api/v1/tasks/:task_id/status', (req, res) => {
  const task = agentOrchestrator.getTask(req.params.task_id);
  if (!task) {
    res.status(404).json({ error: `Task '${req.params.task_id}' not found.` });
    return;
  }
  res.json({
    task_id: task.task_id,
    status: task.status,
    plan_id: task.plan_id,
    plan_status: task.plan?.status,
    steps: task.plan?.steps,
  });
});

// Cancel task
app.post('/api/v1/tasks/:task_id/cancel', (req, res) => {
  const success = agentOrchestrator.cancelTask(req.params.task_id);
  if (!success) {
    res.status(404).json({ error: `Task '${req.params.task_id}' not found or cannot be cancelled.` });
    return;
  }
  res.json({ success: true, task_id: req.params.task_id, status: 'CANCELLED' });
});

// ----------------------------------------------------
// AGENT REGISTRY & CAPABILITY APIS
// ----------------------------------------------------

app.get('/api/v1/agents', (_req, res) => {
  const agents = agentOrchestrator.getRegistry().list();
  res.json({
    agents,
    total: agents.length,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/agents/capabilities', (_req, res) => {
  const agents = agentOrchestrator.getRegistry().getAll();
  const capMap: Record<string, string[]> = {};
  for (const agent of agents) {
    for (const cap of agent.capabilities) {
      if (!capMap[cap]) capMap[cap] = [];
      capMap[cap].push(agent.agent_id);
    }
  }
  res.json({
    capabilities: capMap,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/agents/:agent_id', (req, res) => {
  const agent = agentOrchestrator.getRegistry().get(req.params.agent_id);
  if (!agent) {
    res.status(404).json({ error: `Agent '${req.params.agent_id}' not found.` });
    return;
  }
  res.json({ agent: agent.getInfo() });
});

// ----------------------------------------------------
// APPROVAL GATE APIS
// ----------------------------------------------------

app.get('/api/v1/approvals', (_req, res) => {
  res.json({
    approvals: agentOrchestrator.getApprovalGate().listPending(),
  });
});

app.post('/api/v1/approvals/:approval_id/approve', async (req, res) => {
  const resolution = agentOrchestrator.getApprovalGate().resolve(req.params.approval_id, 'APPROVED');
  if (!resolution.success) {
    res.status(400).json({ error: resolution.error });
    return;
  }

  try {
    const approval = resolution.approval!;
    const executionResult = await agentOrchestrator.resumeAfterApproval(approval.task_id, approval.approval_id);
    res.json({ success: true, approval, result: executionResult });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error resuming after approval';
    res.status(500).json({ error: msg });
  }
});

app.post('/api/v1/approvals/:approval_id/reject', (req, res) => {
  const resolution = agentOrchestrator.getApprovalGate().resolve(req.params.approval_id, 'REJECTED');
  if (!resolution.success) {
    res.status(400).json({ error: resolution.error });
    return;
  }
  res.json({ success: true, approval: resolution.approval });
});

// ----------------------------------------------------
// EXECUTION ENGINE APIS & ADVANCED DIAGNOSTICS STATUS
// ----------------------------------------------------

app.get('/api/v1/executions', (_req, res) => {
  res.json({
    executions: agentOrchestrator.getExecutionEngine().listExecutions(),
  });
});

app.get('/api/v1/executions/:execution_id', (req, res) => {
  const exec = agentOrchestrator.getExecutionEngine().getExecution(req.params.execution_id);
  if (!exec) {
    res.status(404).json({ error: `Execution '${req.params.execution_id}' not found.` });
    return;
  }
  res.json({ execution: exec });
});

app.get('/api/v1/orchestrator/status', (_req, res) => {
  res.json(agentOrchestrator.getStatusReport());
});

// ----------------------------------------------------
// PHASE 6: TOOL & ACTION ENGINE APIS
// ----------------------------------------------------

app.get('/api/v1/tools', (_req, res) => {
  res.json({
    tools: toolRegistry.listInfos(),
    total: toolRegistry.getRegisteredCount(),
    enabled: toolRegistry.getEnabledCount(),
  });
});

app.get('/api/v1/tools/capabilities', (_req, res) => {
  const capMap: Record<string, string[]> = {};
  for (const tool of toolRegistry.list()) {
    for (const cap of tool.capabilities) {
      if (!capMap[cap]) capMap[cap] = [];
      capMap[cap].push(tool.tool_id);
    }
  }
  res.json({ capabilities: capMap, timestamp: new Date().toISOString() });
});

app.get('/api/v1/tools/status', (_req, res) => {
  res.json(toolExecutionEngine.getStatusReport());
});

app.get('/api/v1/tools/policies', (_req, res) => {
  res.json({
    filesystem_enabled: toolExecutionEngine.policyEngine.filesystem_enabled,
    network_enabled: toolExecutionEngine.policyEngine.network_enabled,
    browser_enabled: toolExecutionEngine.policyEngine.browser_enabled,
    external_api_enabled: toolExecutionEngine.policyEngine.external_api_enabled,
    auto_execute_safe_tasks: toolExecutionEngine.policyEngine.auto_execute_safe_tasks,
    approval_required_for_high_risk: toolExecutionEngine.policyEngine.approval_required_for_high_risk,
    allowed_workspace_roots: FilesystemSandbox.getAllowedRoots(),
    max_file_size_mb: FilesystemSandbox.getMaxFileSizeMB(),
  });
});

app.get('/api/v1/tools/:tool_id', (req, res) => {
  const tool = toolRegistry.get(req.params.tool_id);
  if (!tool) {
    res.status(404).json({ error: `Tool '${req.params.tool_id}' not found.` });
    return;
  }
  res.json({ tool: tool.getInfo() });
});

app.post('/api/v1/tools/validate', (req, res) => {
  const { tool_id, input } = req.body || {};
  const tool = toolRegistry.get(tool_id);
  if (!tool) {
    res.status(404).json({ error: `Tool '${tool_id}' not found.` });
    return;
  }
  const validation = tool.validateInput(input || {});
  res.json(validation);
});

app.post('/api/v1/tools/execute', async (req, res) => {
  const { tool_id, capability, input, task_id, agent_id, approval_id, idempotency_key } = req.body || {};
  if (!tool_id || !input) {
    res.status(400).json({ error: 'tool_id and input are required.' });
    return;
  }

  const toolRequest = {
    request_id: `req-api-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    task_id,
    agent_id: agent_id || 'api-caller',
    tool_id,
    capability: capability || (toolRegistry.get(tool_id)?.capabilities[0] ?? ''),
    input,
    requested_at: new Date().toISOString(),
    approval_id,
    idempotency_key,
  };

  try {
    const result = await toolExecutionEngine.executeToolRequest(toolRequest);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Tool execution failed';
    res.status(500).json({ error: msg });
  }
});

app.get('/api/v1/tools/executions', (_req, res) => {
  res.json({
    executions: toolExecutionEngine.listExecutions(),
  });
});

app.get('/api/v1/tools/executions/:execution_id', (req, res) => {
  const exec = toolExecutionEngine.getExecution(req.params.execution_id);
  if (!exec) {
    res.status(404).json({ error: `Execution '${req.params.execution_id}' not found.` });
    return;
  }
  res.json({ execution: exec });
});

app.post('/api/v1/tools/executions/:execution_id/cancel', (req, res) => {
  const cancelled = toolExecutionEngine.cancelExecution(req.params.execution_id);
  res.json({ success: cancelled, execution_id: req.params.execution_id });
});

app.get('/api/v1/actions', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  res.json({
    actions: actionAuditLogger.listEvents(limit),
    total: actionAuditLogger.getTotalEventsCount(),
  });
});

app.get('/api/v1/actions/:action_id', (req, res) => {
  const event = actionAuditLogger.getEvent(req.params.action_id);
  if (!event) {
    res.status(404).json({ error: `Action '${req.params.action_id}' not found.` });
    return;
  }
  res.json({ action: event });
});

// 4. Memory List & Search
app.get('/api/v1/memory', async (req, res) => {
  const memoryType = req.query.type as MemoryType | undefined;
  const memories = await contextMemoryEngine.getRepository().list({
    memory_type: memoryType,
  });
  res.json({ memories, total: memories.length });
});

app.post('/api/v1/memory', async (req, res) => {
  const content = req.body?.content;
  const memoryType = (req.body?.memory_type as MemoryType) || 'PROJECT';
  const summary = req.body?.summary;

  if (!content) {
    res.status(400).json({ error: 'Memory content is required' });
    return;
  }

  const result = await contextMemoryEngine.evaluateAndStoreMemory({
    content,
    summary,
    memory_type: memoryType,
    source: 'user_explicit',
    user_controlled: true,
    reason: 'Saved explicitly by user in Memory Center',
  });

  if (!result.stored) {
    res.status(400).json({ error: result.reason });
    return;
  }

  res.json({ success: true, memory: result.memory, reason: result.reason });
});

app.post('/api/v1/memory/search', async (req, res) => {
  const query = req.body?.query || '';
  const results = await contextMemoryEngine.getRetrievalEngine().retrieve({
    query,
    limit: 10,
  });
  res.json({
    query,
    total_found: results.length,
    retrieval_strategy: 'Deterministic Multi-Factor Relevance Ranking',
    memories: results,
  });
});

app.delete('/api/v1/memory/session', async (_req, res) => {
  const session = contextMemoryEngine.getSession();
  const count = await contextMemoryEngine.getRepository().deleteBySession(session.session_id);
  res.json({ success: true, deleted_count: count });
});

app.delete('/api/v1/memory/project', async (_req, res) => {
  const session = contextMemoryEngine.getSession();
  const count = await contextMemoryEngine.getRepository().deleteByProject(session.project_id);
  res.json({ success: true, deleted_count: count });
});

app.delete('/api/v1/memory/:id', async (req, res) => {
  const memoryId = req.params.id;
  const deleted = await contextMemoryEngine.getRepository().delete(memoryId);
  if (!deleted) {
    res.status(404).json({ error: `Memory '${memoryId}' not found.` });
    return;
  }
  res.json({ success: true, memory_id: memoryId });
});

// ====================================================
// PHASE 7: ADAPTIVE INTELLIGENCE & USER PREFERENCES
// ====================================================

// 1. List user preferences
app.get('/api/v1/preferences', (req, res) => {
  const scope = req.query.scope as any;
  const category = req.query.category as any;
  const project_id = req.query.project_id as string;
  const enabled_only = req.query.enabled_only === 'true';

  const preferences = adaptiveEngine.preferenceRepo.listPreferences({
    scope,
    category,
    project_id,
    enabled_only,
  });

  res.json({
    preferences,
    total: preferences.length,
    timestamp: new Date().toISOString(),
  });
});

// 2. Create preference (explicit or setting)
app.post('/api/v1/preferences', (req, res) => {
  const { category, key, value, scope, project_id, task_id, source_instruction } = req.body || {};

  if (!category || !key || !value) {
    res.status(400).json({ error: 'Missing required fields: category, key, value' });
    return;
  }

  // Precedence / Security Guard (Scenario 6)
  const safetyCheck = adaptiveEngine.policyEngine.isPreferenceSafe(key, value);
  if (!safetyCheck.safe) {
    res.status(400).json({
      error: safetyCheck.reason || 'Preference rejected by Security Policy',
      security_violation: true,
    });
    return;
  }

  const pref = adaptiveEngine.preferenceManager.createExplicitPreference({
    category,
    key,
    value,
    scope: scope || 'USER',
    project_id,
    task_id,
    source_instruction,
  });

  adaptiveEngine.recordHistory({
    title: `Saved preference: ${pref.key}`,
    detail: `Set ${pref.key} to "${pref.value}" (Scope: ${pref.scope})`,
    category: 'preference',
  });

  res.status(201).json({ success: true, preference: pref });
});

// 3. Get single preference
app.get('/api/v1/preferences/:id', (req, res) => {
  const pref = adaptiveEngine.preferenceRepo.getPreference(req.params.id);
  if (!pref) {
    res.status(404).json({ error: `Preference '${req.params.id}' not found.` });
    return;
  }
  res.json({ preference: pref });
});

// 4. Update preference
app.patch('/api/v1/preferences/:id', (req, res) => {
  const { value, enabled, scope, category } = req.body || {};
  if (value !== undefined) {
    const safetyCheck = adaptiveEngine.policyEngine.isPreferenceSafe('update', value);
    if (!safetyCheck.safe) {
      res.status(400).json({ error: safetyCheck.reason, security_violation: true });
      return;
    }
  }

  const updated = adaptiveEngine.preferenceRepo.updatePreference(req.params.id, {
    value,
    enabled,
    scope,
    category,
  });

  if (!updated) {
    res.status(404).json({ error: `Preference '${req.params.id}' not found.` });
    return;
  }

  adaptiveEngine.recordHistory({
    title: `Updated preference: ${updated.key}`,
    detail: `Updated status: ${updated.enabled ? 'Enabled' : 'Disabled'}`,
    category: 'preference',
  });

  res.json({ success: true, preference: updated });
});

// 5. Delete preference (Scenario 5)
app.delete('/api/v1/preferences/:id', (req, res) => {
  const deleted = adaptiveEngine.preferenceRepo.deletePreference(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: `Preference '${req.params.id}' not found.` });
    return;
  }

  adaptiveEngine.recordHistory({
    title: 'Deleted preference',
    detail: `Removed preference id: ${req.params.id}`,
    category: 'preference',
  });

  res.json({ success: true, preference_id: req.params.id });
});

// 6. List feedback
app.get('/api/v1/feedback', (req, res) => {
  const rating = req.query.rating as any;
  const category = req.query.category as any;
  const task_id = req.query.task_id as string;
  const limit = req.query.limit ? Number(req.query.limit) : 50;

  const items = adaptiveEngine.feedbackRepo.listFeedback({ rating, category, task_id, limit });
  res.json({ feedback: items, total: items.length });
});

// 7. Record user feedback (Section 9)
app.post('/api/v1/feedback', (req, res) => {
  const { rating, category, comment, task_id, execution_id, response_id, source } = req.body || {};

  if (!rating || (rating !== 'HELPFUL' && rating !== 'NOT_HELPFUL')) {
    res.status(400).json({ error: 'Valid rating (HELPFUL | NOT_HELPFUL) is required.' });
    return;
  }

  const fb = adaptiveEngine.feedbackManager.recordFeedback({
    rating,
    category,
    comment,
    task_id,
    execution_id,
    response_id,
    source,
  });

  // Emit learning signal
  const signal = adaptiveEngine.signalManager.emitSignal({
    type: 'USER_FEEDBACK',
    source: source || 'user_interface',
    task_id,
    execution_id,
    context: {
      rating,
      category,
      comment: fb.comment,
    },
  });

  adaptiveEngine.processLearningSignal(signal);

  res.status(201).json({ success: true, feedback: fb, signal_id: signal.signal_id });
});

// 8. List learning signals
app.get('/api/v1/learning/signals', (req, res) => {
  const type = req.query.type as any;
  const task_id = req.query.task_id as string;
  const limit = req.query.limit ? Number(req.query.limit) : 50;

  const signals = adaptiveEngine.signalRepo.listSignals({ type, task_id, limit });
  res.json({ signals, total: signals.length });
});

// 9. Post learning signal
app.post('/api/v1/learning/signals', (req, res) => {
  const { type, source, task_id, execution_id, context, scope } = req.body || {};

  if (!type || !source) {
    res.status(400).json({ error: 'type and source are required.' });
    return;
  }

  const signal = adaptiveEngine.signalManager.emitSignal({
    type,
    source,
    task_id,
    execution_id,
    context,
    scope,
  });

  const evaluation = adaptiveEngine.processLearningSignal(signal);
  res.status(201).json({ success: true, signal, evaluation });
});

// 10. Adaptive engine status report (Section 29)
app.get('/api/v1/learning/status', (_req, res) => {
  res.json(adaptiveEngine.getStatusReport());
});

// 11. User-friendly adaptation history (Section 28)
app.get('/api/v1/learning/history', (_req, res) => {
  res.json({ history: adaptiveEngine.getHistory() });
});

// 12. Learning controls / settings
app.get('/api/v1/learning/settings', (_req, res) => {
  res.json(adaptiveEngine.policyEngine.getSettings());
});

app.patch('/api/v1/learning/settings', (req, res) => {
  const updated = adaptiveEngine.policyEngine.updateSettings(req.body || {});
  res.json({ success: true, settings: updated });
});

// 13. Task outcomes
app.get('/api/v1/outcomes', (req, res) => {
  const task_id = req.query.task_id as string;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const outcomes = adaptiveEngine.outcomeRepo.listOutcomes({ task_id, limit });
  res.json({ outcomes, total: outcomes.length });
});

app.get('/api/v1/outcomes/:id', (req, res) => {
  const outcome = adaptiveEngine.outcomeRepo.getOutcome(req.params.id);
  if (!outcome) {
    res.status(404).json({ error: `Outcome '${req.params.id}' not found.` });
    return;
  }
  res.json({ outcome });
});

// 14. Personalization recommendations
app.post('/api/v1/personalization/recommend', (req, res) => {
  const { query, project_id, task_id } = req.body || {};
  const rec = adaptiveEngine.personalizationEngine.getRecommendations({
    query: query || '',
    project_id,
    task_id,
  });
  res.json(rec);
});

// 15. Suggested preference candidates (Section 8 & 38)
app.get('/api/v1/preferences/candidates', (_req, res) => {
  const candidates = adaptiveEngine.preferenceRepo.listPendingCandidates();
  res.json({ candidates, total: candidates.length });
});

app.post('/api/v1/preferences/suggest', (req, res) => {
  const { category, key, value, rationale, scope } = req.body || {};
  if (!category || !key || !value || !rationale) {
    res.status(400).json({ error: 'category, key, value, and rationale are required.' });
    return;
  }

  const candidate = adaptiveEngine.preferenceManager.suggestCandidate({
    category,
    key,
    value,
    rationale,
    scope,
  });

  res.status(201).json({ success: true, candidate });
});

app.post('/api/v1/preferences/candidates/:id/resolve', (req, res) => {
  const { accept } = req.body || {};
  const pref = adaptiveEngine.preferenceRepo.resolveCandidate(req.params.id, Boolean(accept));

  if (accept && pref) {
    adaptiveEngine.recordHistory({
      title: `Approved suggested preference: ${pref.key}`,
      detail: `Value: "${pref.value}" (Scope: ${pref.scope})`,
      category: 'preference',
    });
  }

  res.json({ success: true, accepted: Boolean(accept), preference: pref });
});

// ----------------------------------------------------
// INTEGRATED MULTIMODAL + CONTEXT + RUNTIME INFERENCE
// ----------------------------------------------------
app.post('/api/v1/assistant/query', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const contextIds: string[] = Array.isArray(req.body?.context_ids) ? req.body.context_ids : [];

  if (!message && contextIds.length === 0) {
    res.status(400).json({ error: 'Empty message or context' });
    return;
  }

  try {
    // 1. Process via Phase 3 Multimodal Perception
    let primaryInputText = message;
    let multimodalSummary: string | undefined;

    if (contextIds.length > 0) {
      const mergedContext = perceptionManager.mergeContexts(contextIds, message);
      primaryInputText = mergedContext.merged_text_representation;
      multimodalSummary = `Combined ${mergedContext.active_modalities.length} modalities: [${mergedContext.active_modalities.join(', ')}]`;
    }

    // 1.5 Phase 7 Explicit Preference Detection
    const detectedPref = adaptiveEngine.preferenceManager.extractPreferenceFromInstruction(primaryInputText);
    if (detectedPref) {
      adaptiveEngine.recordHistory({
        title: `Saved preference: ${detectedPref.key}`,
        detail: `Set to "${detectedPref.value}" (Scope: ${detectedPref.scope})`,
        category: 'preference',
      });
    }

    // 2. Process via Phase 4 Context Aggregator & Memory Retrieval
    const canonicalContext = await contextMemoryEngine.aggregateContext({
      user_input: primaryInputText,
      modality: contextIds.length > 0 ? 'screen' : 'text',
    });

    // 3. Construct bounded Context Window
    const contextWindow = contextMemoryEngine.constructContextWindow(canonicalContext);

    // 3.5 Personalization & User Preferences (Phase 7)
    const personalization = adaptiveEngine.personalizationEngine.getRecommendations({
      query: primaryInputText,
    });
    let formattedPrompt = contextWindow.formatted_prompt;
    if (personalization.applied_preferences.length > 0) {
      const prefSnippets = personalization.applied_preferences.map(
        (p) => `- [${p.scope}] ${p.category} -> ${p.key}: ${p.value}`
      );
      formattedPrompt += `\n\n[USER PREFERENCES & ADAPTATION]\n${prefSnippets.join('\n')}`;
    }

    // 4. Pass Context Window to Phase 2 Hardware-Aware AI Runtime
    const inferenceResult = await runtimeManager.infer({
      input: formattedPrompt,
      requestedProvider: 'auto',
    });

    res.json({
      response: inferenceResult.result.text,
      status: 'success',
      phase: PHASE,
      execution_mode: `Hardware-Aware (${inferenceResult.provider.toUpperCase()})`,
      provider: inferenceResult.provider,
      latency_ms: inferenceResult.latency_ms,
      fallback_used: inferenceResult.fallback_used,
      fallback_reason: inferenceResult.fallback_reason,
      multimodal_context: multimodalSummary,
      personalization: {
        applied: personalization.applied_preferences.length > 0,
        explanation: personalization.explanation,
        preferences_count: personalization.applied_preferences.length,
      },
      context_understanding: {
        category: canonicalContext.category,
        intent: canonicalContext.intent,
        active_task: contextWindow.active_task ? contextWindow.active_task.title : null,
        entities: canonicalContext.entities.map((e) => e.name),
        topics: canonicalContext.topics.map((t) => t.topic),
        retrieved_memories_count: contextWindow.retrieved_memories.length,
        estimated_tokens: contextWindow.estimated_tokens,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Local engine query failed';
    res.status(500).json({
      response: `NEXUS Edge Engine error: ${msg}`,
      status: 'error',
      phase: PHASE,
      execution_mode: 'Error Fallback',
      timestamp: new Date().toISOString(),
    });
  }
});

// Root API info endpoint
app.get('/api/info', async (_req, res) => {
  res.json({
    service: PROJECT_NAME,
    tagline: TAGLINE,
    phase: PHASE,
    version: VERSION,
    status: 'online',
    runtime: runtimeManager.getRuntimeStatus(),
    perception: perceptionManager.getStatus(),
    context_memory: await contextMemoryEngine.getStatus(),
    orchestrator: agentOrchestrator.getStatusReport(),
    tools: toolExecutionEngine.getStatusReport(),
    adaptation: adaptiveEngine.getStatusReport(),
  });
});

// Start Vite in dev mode or serve static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[NEXUS EDGE] Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
