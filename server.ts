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
import { assistantManager } from './server/assistant/assistant-manager.js';
import { getGeminiConfigDiagnostics } from './server/assistant/providers/gemini.js';
import type { AssistantDocumentContext } from './server/assistant/types.js';
import type { ProviderId } from './src/types/runtime.js';
import type { ScreenCaptureRequest, CameraCaptureRequest, VoiceTranscriptionRequest } from './src/types/perception.js';
import type { MemoryType } from './src/types/context_memory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Support native Node.js .env loading if present
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    // .env is optional
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// Safely diagnose assistant environment configuration at startup
const startupConfig = getGeminiConfigDiagnostics();
console.log('[ASSISTANT STARTUP]');
console.log(`provider configured: ${startupConfig.providerConfigured} (${startupConfig.providerName})`);
console.log(`model configured: ${startupConfig.modelConfigured} (${startupConfig.modelName})`);
console.log(`API key configured: ${startupConfig.apiKeyConfigured}`);
console.log(`API key length: ${startupConfig.apiKeyLength}`);
console.log(`API key prefix: ${startupConfig.apiKeyPrefix}`);
if (startupConfig.sourceVariable && startupConfig.sourceVariable !== 'NEXUS_GEMINI_API_KEY') {
  console.log(`API key source: ${startupConfig.sourceVariable}`);
}
if (startupConfig.keyIssues.length > 0) {
  console.log(`API key issues: ${startupConfig.keyIssues.join('; ')}`);
}
console.log(`server binding: ${HOST}:${PORT} (process.env.PORT: ${process.env.PORT || 'not set, default 3000'})`);

// Request ID middleware
app.use((req, res, next) => {
  const reqId = (req.headers['x-request-id'] as string) || `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  (req as any).id = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
});

// Limit JSON payload up to 25MB for base64 screen/camera frames and file uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Gracefully handle malformed JSON bodies with clean JSON error responses
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body.',
        request_id: (req as any).id || undefined,
      },
    });
  }
  next(err);
});

// Dynamic CORS configuration supporting Vercel deployments and local development
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ALLOWED_ORIGINS,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
].filter(Boolean) as string[];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    let isAllowed = false;
    try {
      const parsedOrigin = new URL(origin);
      isAllowed =
        allowedOrigins.includes(origin) ||
        parsedOrigin.hostname.endsWith('.vercel.app') ||
        parsedOrigin.hostname === 'localhost' ||
        parsedOrigin.hostname === '127.0.0.1';
    } catch {
      isAllowed = false;
    }

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
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

// 1. Health check (Phase C: Simple, zero optional dependency requirement)
app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'nexus-edge',
    environment: process.env.NODE_ENV || 'production',
    version: VERSION,
    timestamp: new Date().toISOString(),
  });
});

// 1b. Detailed Subsystem Diagnostics (Phase D: Real state of backend subsystems)
app.get('/api/v1/health/detailed', async (_req, res) => {
  let serverState: 'READY' | 'LIMITED' | 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'ERROR' = 'READY';
  let configState: 'READY' | 'LIMITED' | 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'ERROR' = 'READY';
  let runtimeState: 'READY' | 'LIMITED' | 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'ERROR' = 'READY';
  let perceptionState: 'READY' | 'LIMITED' | 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'ERROR' = 'READY';
  let contextState: 'READY' | 'LIMITED' | 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'ERROR' = 'READY';
  let memoryState: 'READY' | 'LIMITED' | 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'ERROR' = 'READY';
  let agentsState: 'READY' | 'LIMITED' | 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'ERROR' = 'READY';
  let toolsState: 'READY' | 'LIMITED' | 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'ERROR' = 'READY';
  let learningState: 'READY' | 'LIMITED' | 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'ERROR' = 'READY';

  try {
    configState = 'READY';
  } catch {
    configState = 'ERROR';
  }

  try {
    const rStatus = runtimeManager.getRuntimeStatus();
    if (rStatus && rStatus.runtime_state === 'READY') {
      runtimeState = 'READY';
    } else if (rStatus && (rStatus.runtime_state === 'DEGRADED' || rStatus.runtime_state === 'PROCESSING')) {
      runtimeState = 'LIMITED';
    } else {
      runtimeState = 'UNAVAILABLE';
    }
  } catch {
    runtimeState = 'ERROR';
  }

  try {
    const pStatus = perceptionManager.getStatus();
    perceptionState = pStatus ? 'READY' : 'LIMITED';
  } catch {
    perceptionState = 'ERROR';
  }

  try {
    const cStatus = await contextMemoryEngine.getStatus();
    contextState = cStatus.context_engine.status === 'READY' ? 'READY' : 'LIMITED';
    memoryState = contextMemoryEngine.getRepository().isUsingSqlite() ? 'READY' : 'LIMITED';
  } catch {
    contextState = 'ERROR';
    memoryState = 'ERROR';
  }

  try {
    const aReport = agentOrchestrator.getStatusReport();
    agentsState = aReport && aReport.agents_registered_count > 0 ? 'READY' : 'LIMITED';
  } catch {
    agentsState = 'ERROR';
  }

  try {
    const tReport = toolExecutionEngine.getStatusReport();
    toolsState = tReport && tReport.registered_tools_count > 0 ? 'READY' : 'LIMITED';
  } catch {
    toolsState = 'ERROR';
  }

  try {
    const lReport = adaptiveEngine.getStatusReport();
    learningState = lReport ? 'READY' : 'LIMITED';
  } catch {
    learningState = 'ERROR';
  }

  let assistantDiagnostics: any = {
    provider: 'gemini',
    model: 'gemini-3.8-flash',
    configured: false,
    status: 'NOT_CONFIGURED',
  };

  try {
    const astStatus = assistantManager.getStatus();
    assistantDiagnostics = {
      provider: astStatus.provider,
      model: astStatus.model,
      configured: astStatus.configured,
      status: astStatus.status,
      execution_mode: astStatus.execution_mode,
      reason: astStatus.reason,
      ...(astStatus.error_category ? { error_category: astStatus.error_category } : {}),
    };
  } catch {
    assistantDiagnostics = {
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      configured: false,
      status: 'ERROR',
    };
  }

  res.json({
    server: serverState,
    configuration: configState,
    runtime: runtimeState,
    perception: perceptionState,
    context: contextState,
    memory: memoryState,
    agents: agentsState,
    tools: toolsState,
    learning: learningState,
    assistant: assistantDiagnostics,
  });
});

// 1c. Safe Assistant Provider Connectivity Test (Task 4 & 9)
app.all(['/api/v1/assistant/test', '/assistant/test'], async (_req, res) => {
  const activeProvider = assistantManager.getActiveProvider();
  if (activeProvider.id === 'gemini') {
    const geminiProvider = activeProvider as any;
    const testResult = await geminiProvider.testMinimalConnectivity();
    res.json({
      provider: 'gemini',
      model: geminiProvider.model,
      prompt: 'Reply with exactly: NEXUS GEMINI CONNECTION OK',
      ...testResult,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.json({
      success: true,
      provider: activeProvider.id,
      model: activeProvider.model,
      status: 'READY',
      message: `${activeProvider.name} is active in local mode.`,
      latency_ms: 0,
      timestamp: new Date().toISOString(),
    });
  }
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
  const reqId = (req as any).id || `req-${Date.now()}`;
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_TEXT',
        category: 'VALIDATION_ERROR',
        message: 'Text content is required',
        details: 'The request body must include a non-empty text string.',
      },
      requestId: reqId,
    });
    return;
  }
  try {
    const context = perceptionManager.processText(text, { userAgent: req.headers['user-agent'] || 'Browser' }, reqId);
    res.json({ success: true, context, requestId: reqId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Text perception failed';
    res.status(400).json({
      success: false,
      error: {
        code: 'TEXT_PROCESSING_ERROR',
        category: 'VALIDATION_ERROR',
        message: msg,
        details: msg,
      },
      requestId: reqId,
    });
  }
});

app.post('/api/v1/perception/screen', async (req, res) => {
  const reqId = (req as any).id || `req-${Date.now()}`;
  try {
    const body: ScreenCaptureRequest = req.body;
    if (!body?.image_data_base64) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_IMAGE_DATA',
          category: 'VALIDATION_ERROR',
          message: 'image_data_base64 is required for screen perception.',
          details: 'Provide a valid base64 data URL string representing the captured screen frame.',
        },
        requestId: reqId,
      });
      return;
    }
    const context = await perceptionManager.processScreen(body, reqId);
    res.json({ success: true, context, requestId: reqId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Screen capture perception failed';
    res.status(400).json({
      success: false,
      error: {
        code: 'SCREEN_PROCESSING_ERROR',
        category: 'CAPABILITY_UNAVAILABLE',
        message: msg,
        details: msg,
      },
      requestId: reqId,
    });
  }
});

app.post('/api/v1/perception/camera', async (req, res) => {
  const reqId = (req as any).id || `req-${Date.now()}`;
  try {
    const body: CameraCaptureRequest = req.body;
    if (!body?.image_data_base64) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_IMAGE_DATA',
          category: 'VALIDATION_ERROR',
          message: 'image_data_base64 is required for camera perception.',
          details: 'Provide a valid base64 data URL string representing the captured camera snapshot.',
        },
        requestId: reqId,
      });
      return;
    }
    const context = await perceptionManager.processCamera(body, reqId);
    res.json({ success: true, context, requestId: reqId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Camera perception failed';
    res.status(400).json({
      success: false,
      error: {
        code: 'CAMERA_PROCESSING_ERROR',
        category: 'CAPABILITY_UNAVAILABLE',
        message: msg,
        details: msg,
      },
      requestId: reqId,
    });
  }
});

app.post('/api/v1/perception/voice', (req, res) => {
  const reqId = (req as any).id || `req-${Date.now()}`;
  try {
    const body: VoiceTranscriptionRequest = req.body;
    if (!body?.transcript || !body.transcript.trim()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TRANSCRIPT',
          category: 'VALIDATION_ERROR',
          message: 'Transcript is required for voice perception.',
          details: 'Provide transcribed speech text in the transcript field.',
        },
        requestId: reqId,
      });
      return;
    }
    const context = perceptionManager.processVoice(body, reqId);
    res.json({ success: true, context, requestId: reqId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Voice perception failed';
    res.status(400).json({
      success: false,
      error: {
        code: 'VOICE_PROCESSING_ERROR',
        category: 'EXTRACTION_ERROR',
        message: msg,
        details: msg,
      },
      requestId: reqId,
    });
  }
});

app.post('/api/v1/perception/document', async (req, res) => {
  const reqId = (req as any).id || `req-${Date.now()}`;
  try {
    const filename = req.body?.filename;
    const base64Data = req.body?.base64_data;
    const mimeType = req.body?.mime_type;

    if (!filename || !base64Data) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DOCUMENT_PAYLOAD',
          category: 'VALIDATION_ERROR',
          message: 'filename and base64_data are required for document perception.',
          details: 'Both filename and base64_data must be provided in the request body.',
        },
        requestId: reqId,
      });
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
      const context = await perceptionManager.processDocument(filePath, filename, buffer.length, mimeType, reqId);
      res.json({ success: true, context, requestId: reqId });
    } finally {
      fs.promises.unlink(filePath).catch(() => {});
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Document perception failed';
    res.status(400).json({
      success: false,
      error: {
        code: 'DOCUMENT_PROCESSING_ERROR',
        category: 'EXTRACTION_ERROR',
        message: msg,
        details: msg,
      },
      requestId: reqId,
    });
  }
});

app.get('/api/v1/perception/context', (req, res) => {
  const reqId = (req as any).id || `req-${Date.now()}`;
  res.json({
    contexts: perceptionManager.getAllContexts(),
    timestamp: new Date().toISOString(),
    requestId: reqId,
  });
});

app.post('/api/v1/perception/context/merge', (req, res) => {
  const reqId = (req as any).id || `req-${Date.now()}`;
  const contextIds: string[] = Array.isArray(req.body?.context_ids) ? req.body.context_ids : [];
  const primaryQuery = req.body?.primary_query || '';
  const merged = perceptionManager.mergeContexts(contextIds, primaryQuery);
  res.json({ success: true, unified_context: merged, requestId: reqId });
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

app.get(['/api/v1/tools/:tool_id', '/api/v1/tools/:id'], (req, res) => {
  const targetId = req.params.tool_id || (req.params as any).id;
  const tool = toolRegistry.get(targetId);
  if (!tool) {
    res.status(404).json({ error: `Tool '${targetId}' not found.` });
    return;
  }
  res.json({ tool: tool.getInfo() });
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

// Suggested preference candidates (Registered BEFORE /api/v1/preferences/:id to avoid route shadowing)
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

// 14. Personalization recommendations & application
app.post('/api/v1/personalization/recommend', (req, res) => {
  const { query, project_id, task_id } = req.body || {};
  const rec = adaptiveEngine.personalizationEngine.getRecommendations({
    query: query || '',
    project_id,
    task_id,
  });
  res.json(rec);
});

app.post('/api/v1/personalization/apply', (req, res) => {
  const { context, query, project_id, task_id } = req.body || {};
  const baseContext = typeof context === 'string' ? context : '';
  const result = adaptiveEngine.personalizationEngine.applyPersonalizationToContext(baseContext, {
    query: query || '',
    project_id,
    task_id,
  });
  res.json(result);
});

// ----------------------------------------------------
// INTEGRATED MULTIMODAL + CONTEXT + RUNTIME INFERENCE
// ----------------------------------------------------
app.post(['/api/v1/assistant/query', '/assistant/query'], async (req, res) => {
  console.log('[ASSISTANT] request received');
  console.log(`[ASSISTANT] provider=${assistantManager.configuredProviderName}`);
  console.log(`[ASSISTANT] model=${assistantManager.modelName}`);
  console.log(`[ASSISTANT] api_key_configured=${Boolean(process.env.NEXUS_GEMINI_API_KEY?.trim())}`);

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

    // 4. Retrieve any attached documents from Perception Manager
    const attachedDocs: AssistantDocumentContext[] = [];
    for (const cid of contextIds) {
      const ctx = perceptionManager.getContext(cid);
      if (ctx && ctx.source === 'document') {
        attachedDocs.push({
          filename: ctx.content.filename || 'document',
          content: ctx.content.text || ctx.extracted_information?.textSnippet || '',
          mimeType: ctx.content_type,
          wordCount: ctx.extracted_information?.wordCount,
        });
      }
    }

    // 5. Delegate to Assistant Provider (Gemini / Local / Auto)
    const assistantResult = await assistantManager.generateResponse({
      userMessage: message || primaryInputText,
      context: (contextIds.length > 0 || personalization.applied_preferences.length > 0) ? formattedPrompt : undefined,
      documents: attachedDocs,
      memories: canonicalContext.relevant_memories.map((m) => ({
        memory_id: m.memory_id,
        memory_type: m.memory_type,
        content: m.content,
      })),
      preferences: personalization.applied_preferences.map((p) => ({
        key: p.key,
        value: p.value,
        category: p.category,
        scope: p.scope,
      })),
      task: contextWindow.active_task
        ? {
            task_id: contextWindow.active_task.task_id,
            title: contextWindow.active_task.title,
            description: contextWindow.active_task.description,
            status: contextWindow.active_task.status,
          }
        : undefined,
      multimodalSummary,
    });

    const isUnconfigured = assistantResult.warnings.includes('missing API key');
    const isError = assistantResult.warnings.some((w) => w.includes('failed') || w.includes('error') || w === 'AUTHENTICATION_ERROR');
    const isSuccess = !isUnconfigured && !isError;
    const errorCode = assistantResult.error_category || (isUnconfigured ? 'AUTHENTICATION_ERROR' : (isError ? 'API_ERROR' : undefined));

    res.json({
      success: isSuccess,
      provider: assistantResult.provider,
      model: assistantResult.model,
      ...(errorCode ? { error_code: errorCode, message: assistantResult.text } : {}),
      response: assistantResult.text,
      status: isUnconfigured ? 'warning' : (isError ? 'error' : 'success'),
      phase: PHASE,
      execution_mode: assistantResult.provenance?.executionMode || 'Cloud API',
      provider_status: isUnconfigured ? 'NOT_CONFIGURED' : (isError ? 'ERROR' : 'READY'),
      latency_ms: assistantResult.latency_ms,
      fallback_used: assistantResult.provider === 'local' && assistantManager.configuredProviderName === 'auto',
      fallback_reason: assistantResult.warnings.length > 0 ? assistantResult.warnings.join('; ') : null,
      warnings: assistantResult.warnings,
      multimodal_context: multimodalSummary,
      grounded_context: assistantResult.grounded_context,
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
    console.log('[ASSISTANT] response returned');
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

// Assistant status endpoint - aliased for both /api/v1/assistant/status and /assistant/status
app.get(['/api/v1/assistant/status', '/assistant/status'], async (req, res) => {
  if (req.query?.diagnostic === 'true' && assistantManager.getActiveProvider().id === 'gemini') {
    const geminiProvider = assistantManager.getActiveProvider() as any;
    if (typeof geminiProvider.testMinimalConnectivity === 'function') {
      await geminiProvider.testMinimalConnectivity();
    }
  }
  const status = assistantManager.getStatus();
  res.json({
    provider: status.provider,
    model: status.model,
    configured: status.configured,
    status: status.status,
    available: status.available,
    execution_mode: status.execution_mode,
    reason: status.reason,
    ...(status.error_category ? { error_category: status.error_category } : {}),
  });
});

// Root API info endpoint
app.get('/api/info', async (_req, res) => {
  res.json({
    service: PROJECT_NAME,
    tagline: TAGLINE,
    phase: PHASE,
    version: VERSION,
    status: 'online',
    assistant: assistantManager.getStatus(),
    runtime: runtimeManager.getRuntimeStatus(),
    perception: perceptionManager.getStatus(),
    context_memory: await contextMemoryEngine.getStatus(),
    orchestrator: agentOrchestrator.getStatusReport(),
    tools: toolExecutionEngine.getStatusReport(),
    adaptation: adaptiveEngine.getStatusReport(),
  });
});

// Catch unhandled /api/* routes so they NEVER fall through to HTML or Vite SPA
app.all('/api/{*splat}', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `API endpoint '${req.method} ${req.originalUrl}' not found.`,
      request_id: (req as any).id || undefined,
    },
  });
});

// Centralized backend error handler (Phase M)
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const errorCode = err.code || (statusCode === 400 ? 'BAD_REQUEST' : statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'An unexpected internal error occurred';

  // Sanitize message - never expose secrets or keys
  const sanitizedMessage = String(message)
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/(?:bearer|token)\s+[a-zA-Z0-9._-]+/gi, '[REDACTED_TOKEN]');

  console.error(`[BACKEND ERROR] ${req.method} ${req.originalUrl}:`, err.stack || err.message || err);

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: sanitizedMessage,
      request_id: (req as any).id || undefined,
    },
  });
});

// Start Vite in dev mode or serve static files in production
export async function startServer(customPort?: number, customHost?: string) {
  if (process.argv.includes('--dev')) {
    process.env.NODE_ENV = 'development';
  } else if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const listenPort = customPort !== undefined ? customPort : PORT;
  const listenHost = customHost !== undefined ? customHost : HOST;

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
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  return new Promise<import('http').Server>((resolve) => {
    const serverInstance = app.listen(listenPort, listenHost, () => {
      console.log(`[NEXUS EDGE] Server running on http://${listenHost}:${listenPort} (${process.env.NODE_ENV || 'production'})`);
      resolve(serverInstance);
    });
  });
}

export { app };

const isDirectExecution = Boolean(
  process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))
);

if (isDirectExecution) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
