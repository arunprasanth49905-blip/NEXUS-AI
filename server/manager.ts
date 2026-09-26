import { performance } from 'perf_hooks';
import { ProviderRegistry } from './registry.js';
import { ModelManager } from './models.js';
import { SelectionEngine } from './selection.js';
import { detectHardware } from './detector.js';
import type {
  ProviderId,
  RuntimeState,
  InferenceResponse,
  InferenceTelemetry,
  BenchmarkRunResult,
  RuntimeStatusResponse,
} from '../src/types/runtime.js';

export class RuntimeManager {
  private registry: ProviderRegistry;
  private modelManager: ModelManager;
  private selectionEngine: SelectionEngine;
  private runtimeState: RuntimeState = 'PROCESSING';
  private telemetryHistory: InferenceTelemetry[] = [];

  constructor() {
    this.registry = new ProviderRegistry();
    this.modelManager = new ModelManager();
    this.selectionEngine = new SelectionEngine();
  }

  public async initialize(): Promise<void> {
    try {
      await this.registry.initializeAll();
      const available = this.registry.getAvailableProviders();
      if (available.length > 0) {
        this.runtimeState = 'READY';
      } else {
        this.runtimeState = 'DEGRADED';
      }
      console.log(`[NEXUS Runtime] Initialized. Available providers: [${available.join(', ')}]`);
    } catch (err) {
      console.error('[NEXUS Runtime] Initialization error:', err);
      this.runtimeState = 'ERROR';
    }
  }

  public getHardware() {
    return detectHardware();
  }

  public getRegistry(): ProviderRegistry {
    return this.registry;
  }

  public getModelManager(): ModelManager {
    return this.modelManager;
  }

  public getRuntimeStatus(): RuntimeStatusResponse {
    const hardware = this.getHardware();
    const models = this.modelManager.getModels();
    const defaultModel = models[0];

    const selection = this.selectionEngine.select(this.registry, {
      requestedProvider: 'auto',
      model: defaultModel,
      hardware,
    });

    const activeProvider = selection.selected_provider;
    const providers = this.registry.getAll().map((p) => p.getInfo());

    // Compute explanation
    let whyThisRuntime = '';
    if (activeProvider === 'cpu') {
      whyThisRuntime =
        'Qualcomm QNN was not detected and no compatible GPU inference provider is available. ' +
        'CPU is available and selected as the fallback execution path.';
    } else if (activeProvider === 'qnn') {
      whyThisRuntime =
        'Qualcomm QNN is initialized and the selected model supports the available Snapdragon NPU execution path.';
    } else {
      whyThisRuntime =
        'GPU acceleration is active and compatible with the target model execution requirements.';
    }

    const totalInferences = this.telemetryHistory.length;
    const avgLatency =
      totalInferences > 0
        ? +(
            this.telemetryHistory.reduce((acc, t) => acc + t.inference_latency_ms, 0) /
            totalInferences
          ).toFixed(2)
        : null;

    const memoryRssMb = +(process.memoryUsage().rss / (1024 * 1024)).toFixed(2);

    return {
      runtime_state: this.runtimeState,
      active_provider: activeProvider,
      active_model: defaultModel.id,
      explanation: {
        summary: `Execution path: ${activeProvider.toUpperCase()} (${selection.reason})`,
        details: selection.fallback_used
          ? `Fallback active: ${selection.fallback_reason}`
          : 'Direct execution without fallback.',
        why_this_runtime: whyThisRuntime,
      },
      selection,
      hardware,
      providers,
      models,
      telemetry_summary: {
        total_inferences: totalInferences,
        average_latency_ms: avgLatency,
        active_memory_mb: memoryRssMb,
      },
    };
  }

  public async infer(params: {
    modelId?: string;
    input: string;
    requestedProvider?: ProviderId | 'auto';
  }): Promise<InferenceResponse> {
    const { modelId, input, requestedProvider = 'auto' } = params;
    const models = this.modelManager.getModels();
    const model = (modelId ? this.modelManager.getModel(modelId) : null) || models[0];

    if (!model) {
      throw new Error(`Model not found.`);
    }

    const hardware = this.getHardware();
    const selection = this.selectionEngine.select(this.registry, {
      requestedProvider,
      model,
      hardware,
    });

    const provider = this.registry.get(selection.selected_provider);
    if (!provider || !provider.isAvailable()) {
      throw new Error(`Selected provider '${selection.selected_provider}' is not available.`);
    }

    const startExecution = performance.now();
    const executionResult = await provider.infer(model, input);
    const measuredLatency = +(performance.now() - startExecution).toFixed(2);

    const memoryRssMb = +(process.memoryUsage().rss / (1024 * 1024)).toFixed(2);

    const telemetry: InferenceTelemetry = {
      inference_latency_ms: measuredLatency,
      model_load_time_ms: 0, // Cached in memory
      provider: provider.providerId,
      model: model.id,
      timestamp: new Date().toISOString(),
      success: true,
      fallback_used: selection.fallback_used,
      fallback_reason: selection.fallback_reason,
      input_chars: input.length,
      output_tokens: executionResult.outputTokens,
      hardware_measured: {
        cpu_cores_active: hardware.cpuLogicalThreads,
        memory_rss_mb: memoryRssMb,
      },
    };

    this.telemetryHistory.push(telemetry);
    if (this.telemetryHistory.length > 50) {
      this.telemetryHistory.shift();
    }

    return {
      success: true,
      model: model.id,
      provider: provider.providerId,
      fallback_used: selection.fallback_used,
      fallback_reason: selection.fallback_reason,
      latency_ms: measuredLatency,
      result: {
        text: executionResult.text,
        intent: executionResult.intent,
        confidence: executionResult.confidence,
        tokens: executionResult.tokens,
      },
      telemetry,
    };
  }

  public async benchmark(params: {
    providerId?: ProviderId;
    modelId?: string;
    runs?: number;
  }): Promise<BenchmarkRunResult> {
    const runsCount = Math.min(Math.max(params.runs || 5, 1), 20);
    const models = this.modelManager.getModels();
    const model = (params.modelId ? this.modelManager.getModel(params.modelId) : null) || models[0];

    const targetProviderId = params.providerId || 'cpu';
    const provider = this.registry.get(targetProviderId);

    if (!provider || !provider.isAvailable()) {
      throw new Error(`Provider '${targetProviderId.toUpperCase()}' is not available for benchmarking on this machine.`);
    }

    const samplePrompt = 'Analyze local edge execution latency under repeated inference iterations.';
    const latencies: number[] = [];
    let successfulRuns = 0;
    let failedRuns = 0;

    for (let i = 0; i < runsCount; i++) {
      try {
        const start = performance.now();
        await provider.infer(model, `${samplePrompt} Run ${i + 1}`);
        const elapsed = +(performance.now() - start).toFixed(2);
        latencies.push(elapsed);
        successfulRuns++;
      } catch {
        failedRuns++;
      }
    }

    if (latencies.length === 0) {
      throw new Error('All benchmark runs failed.');
    }

    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const avg = +(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);

    return {
      provider: targetProviderId,
      model: model.id,
      runs: runsCount,
      successful_runs: successfulRuns,
      failed_runs: failedRuns,
      min_latency_ms: min,
      max_latency_ms: max,
      average_latency_ms: avg,
      latencies,
      timestamp: new Date().toISOString(),
    };
  }

  public getTelemetryHistory(): InferenceTelemetry[] {
    return [...this.telemetryHistory];
  }
}
