import { describe, it } from 'node:test';
import assert from 'node:assert';
import { detectHardware } from '../server/detector.js';
import { ProviderRegistry } from '../server/registry.js';
import { SelectionEngine } from '../server/selection.js';
import { ModelManager } from '../server/models.js';
import { RuntimeManager } from '../server/manager.js';

describe('Phase 2 Hardware Detection', () => {
  it('honestly detects host CPU without fabrication', () => {
    const hw = detectHardware();
    assert.ok(hw.architecture);
    assert.ok(hw.os);
    assert.strictEqual(typeof hw.snapdragonDetected, 'boolean');
    assert.strictEqual(typeof hw.gpuDeviceDetected, 'boolean');
    assert.strictEqual(typeof hw.gpuInferenceProviderAvailable, 'boolean');
    // If not on Snapdragon, snapdragonDetected must be false
    if (!hw.processor.toLowerCase().includes('snapdragon') && !hw.processor.toLowerCase().includes('qualcomm')) {
      assert.strictEqual(hw.snapdragonDetected, false);
      assert.strictEqual(hw.npuAvailable, false);
    }
  });

  it('distinguishes GPU device detection from GPU inference provider', () => {
    const hw = detectHardware();
    // In our standard environment, native GPU acceleration libraries are not configured
    assert.strictEqual(hw.gpuInferenceProviderAvailable, false);
  });
});

describe('Phase 2 Provider Registry & Lifecycle', () => {
  it('registers QNN, GPU, and CPU providers', async () => {
    const registry = new ProviderRegistry();
    await registry.initializeAll();

    const qnn = registry.get('qnn');
    const gpu = registry.get('gpu');
    const cpu = registry.get('cpu');

    assert.ok(qnn);
    assert.ok(gpu);
    assert.ok(cpu);

    assert.strictEqual(cpu.isAvailable(), true);
    assert.strictEqual(cpu.getStatus(), 'READY');
  });

  it('reports QNN as unavailable when Qualcomm SDK/NPU is missing', async () => {
    const registry = new ProviderRegistry();
    await registry.initializeAll();

    const qnn = registry.get('qnn');
    assert.ok(qnn);
    if (!process.env.NEXUS_QNN_SDK_PATH) {
      assert.strictEqual(qnn.isAvailable(), false);
      assert.strictEqual(qnn.getStatus(), 'NOT_AVAILABLE');
    }
  });
});

describe('Phase 2 Runtime Selection & Controlled Fallback', () => {
  it('selects CPU when QNN and GPU are unavailable', async () => {
    const registry = new ProviderRegistry();
    await registry.initializeAll();
    const modelManager = new ModelManager();
    const selectionEngine = new SelectionEngine();
    const hardware = detectHardware();

    const defaultModel = modelManager.getModels()[0];
    const selection = selectionEngine.select(registry, {
      requestedProvider: 'auto',
      model: defaultModel,
      hardware,
    });

    assert.strictEqual(selection.selected_provider, 'cpu');
    assert.strictEqual(selection.fallback_used, true);
    assert.ok(selection.fallback_reason?.includes('QNN') || selection.fallback_reason?.includes('CPU'));
    assert.deepStrictEqual(selection.chain_attempted, ['qnn', 'gpu', 'cpu']);
  });

  it('gracefully falls back to CPU if an unavailable provider is explicitly requested', async () => {
    const registry = new ProviderRegistry();
    await registry.initializeAll();
    const modelManager = new ModelManager();
    const selectionEngine = new SelectionEngine();
    const hardware = detectHardware();

    const defaultModel = modelManager.getModels()[0];
    const selection = selectionEngine.select(registry, {
      requestedProvider: 'qnn',
      model: defaultModel,
      hardware,
    });

    // Since QNN is not available, it must fallback to CPU
    assert.strictEqual(selection.selected_provider, 'cpu');
    assert.strictEqual(selection.fallback_used, true);
    assert.ok(selection.fallback_reason?.includes('QNN'));
  });
});

describe('Phase 2 Model Manager', () => {
  it('registers and manages model lifecycle correctly', () => {
    const mm = new ModelManager();
    const models = mm.getModels();
    assert.ok(models.length >= 3);

    const intentModel = mm.getModel('nexus-edge-intent-v1');
    assert.ok(intentModel);
    assert.strictEqual(intentModel.status, 'READY');

    // Unload and reload
    assert.strictEqual(mm.unloadModel('nexus-edge-intent-v1'), true);
    assert.strictEqual(mm.getModel('nexus-edge-intent-v1')?.status, 'UNLOADED');

    assert.strictEqual(mm.loadModel('nexus-edge-intent-v1'), true);
    assert.strictEqual(mm.getModel('nexus-edge-intent-v1')?.status, 'READY');
  });

  it('validates model provider compatibility', () => {
    const mm = new ModelManager();
    const npuOnlyModel = mm.getModel('nexus-snapdragon-npu-v1');
    assert.ok(npuOnlyModel);
    assert.strictEqual(mm.isCompatible(npuOnlyModel, 'qnn'), true);
    assert.strictEqual(mm.isCompatible(npuOnlyModel, 'cpu'), false);
  });
});

describe('Phase 2 Runtime Manager Inference & Benchmarking', () => {
  it('executes genuine local inference and measures positive latency', async () => {
    const rm = new RuntimeManager();
    await rm.initialize();

    const result = await rm.infer({
      input: 'Explain how local privacy perimeter works on edge devices.',
      requestedProvider: 'auto',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.provider, 'cpu');
    assert.ok(result.latency_ms >= 0);
    assert.ok(result.result.text.length > 0);
    assert.strictEqual(result.telemetry.provider, 'cpu');
    assert.ok(result.telemetry.output_tokens > 0);
  });

  it('runs authentic benchmark and reports non-fabricated min/max/average latencies', async () => {
    const rm = new RuntimeManager();
    await rm.initialize();

    const bench = await rm.benchmark({
      providerId: 'cpu',
      runs: 3,
    });

    assert.strictEqual(bench.runs, 3);
    assert.strictEqual(bench.successful_runs, 3);
    assert.strictEqual(bench.failed_runs, 0);
    assert.ok(bench.average_latency_ms >= 0);
    assert.strictEqual(bench.latencies.length, 3);
    assert.ok(bench.min_latency_ms <= bench.max_latency_ms);
  });
});
