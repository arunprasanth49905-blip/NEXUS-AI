import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { RuntimeManager } from './server/manager.js';
import type { ProviderId } from './src/types/runtime.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json());

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
const VERSION = '0.2.0';
const PHASE = 'Phase 2 - AI Runtime Engine';
const TAGLINE = "Understand what you're doing. Get intelligent help. Keep your data private.";

// Instantiate and initialize the Hardware-Aware AI Runtime Manager
const runtimeManager = new RuntimeManager();
runtimeManager.initialize().catch((err) => {
  console.error('Failed to initialize RuntimeManager:', err);
});

// 1. Health check (Phase 1 backwards compatibility + Phase 2 status)
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

// 2. System diagnostics (Phase 1 compatibility updated with honest detected hardware)
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
  res.json({
    project: PROJECT_NAME,
    status: status.runtime_state === 'READY' ? 'Ready' : status.runtime_state,
    runtime: `${status.active_provider.toUpperCase()} (Available)`,
    privacy: 'Protected',
    boundary: 'Local-first edge perimeter',
    active_sources: 0,
    phase: PHASE,
    active_model: status.active_model,
  });
});

// ----------------------------------------------------
// PHASE 2 RUNTIME ENGINE APIS
// ----------------------------------------------------

// GET /api/v1/runtime/status
app.get('/api/v1/runtime/status', (_req, res) => {
  res.json(runtimeManager.getRuntimeStatus());
});

// GET /api/v1/runtime/providers
app.get('/api/v1/runtime/providers', (_req, res) => {
  const providers = runtimeManager.getRegistry().getAll().map((p) => p.getInfo());
  res.json({
    providers,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/v1/runtime/capabilities
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

// GET /api/v1/runtime/models
app.get('/api/v1/runtime/models', (_req, res) => {
  res.json({
    models: runtimeManager.getModelManager().getModels(),
    timestamp: new Date().toISOString(),
  });
});

// POST /api/v1/runtime/models/load
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

// POST /api/v1/runtime/models/unload
app.post('/api/v1/runtime/models/unload', (req, res) => {
  const modelId = req.body?.model_id;
  if (!modelId) {
    res.status(400).json({ error: 'model_id is required' });
    return;
  }
  const success = runtimeManager.getModelManager().unloadModel(modelId);
  res.json({ success, model_id: modelId, status: 'UNLOADED' });
});

// POST /api/v1/runtime/select
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

// POST /api/v1/inference
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

// GET /api/v1/runtime/telemetry
app.get('/api/v1/runtime/telemetry', (_req, res) => {
  res.json({
    telemetry: runtimeManager.getTelemetryHistory(),
    timestamp: new Date().toISOString(),
  });
});

// POST /api/v1/runtime/benchmark
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

// 4. Assistant query handler (Phase 1 interface mapped to Phase 2 inference engine)
app.post('/api/v1/assistant/query', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    res.status(400).json({ error: 'Empty message' });
    return;
  }

  try {
    const inferenceResult = await runtimeManager.infer({
      input: message,
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
app.get('/api/info', (_req, res) => {
  res.json({
    service: PROJECT_NAME,
    tagline: TAGLINE,
    phase: PHASE,
    version: VERSION,
    status: 'online',
    runtime: runtimeManager.getRuntimeStatus(),
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
