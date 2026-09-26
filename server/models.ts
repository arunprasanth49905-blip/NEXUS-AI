import type { ModelMetadata, ProviderId } from '../src/types/runtime.js';

export class ModelManager {
  private models: Map<string, ModelMetadata> = new Map();
  private loadedModels: Set<string> = new Set();

  constructor() {
    this.registerDefaultModels();
  }

  private registerDefaultModels(): void {
    const defaultModels: ModelMetadata[] = [
      {
        id: 'nexus-edge-intent-v1',
        name: 'NEXUS Edge Context Classifier',
        version: '1.2.0',
        format: 'NEXUS_EMBED_WEIGHTS',
        task: 'context-intent',
        inputType: 'text (utf-8 prompt)',
        outputType: 'intent distribution & tokens',
        supportedProviders: ['cpu', 'gpu', 'qnn'],
        path: './models/nexus-intent-v1.json',
        sizeBytes: 142000,
        status: 'READY',
        description: 'Lightweight local edge context categorization and privacy guard classifier.',
      },
      {
        id: 'nexus-edge-summary-v1',
        name: 'NEXUS Edge Distilled Assistant',
        version: '1.0.0',
        format: 'ONNX',
        task: 'text-classification',
        inputType: 'text (utf-8 prompt)',
        outputType: 'text response',
        supportedProviders: ['cpu', 'gpu', 'qnn'],
        path: './models/nexus-summary-v1.onnx',
        sizeBytes: 4500000,
        status: 'READY',
        description: 'Quantized ONNX distillation model for local summarization and troubleshooting.',
      },
      {
        id: 'nexus-snapdragon-npu-v1',
        name: 'NEXUS Snapdragon QNN DLC Tensor Model',
        version: '1.0.0',
        format: 'QNN_DLC',
        task: 'token-generation',
        inputType: 'quantized token tensor',
        outputType: 'logits',
        supportedProviders: ['qnn'],
        path: './models/nexus-npu-hexagon.dlc',
        sizeBytes: 12000000,
        status: 'UNLOADED',
        description: 'Qualcomm Hexagon NPU compiled container (requires Snapdragon hardware with QNN).',
      },
    ];

    for (const model of defaultModels) {
      this.models.set(model.id, model);
      if (model.status === 'READY') {
        this.loadedModels.add(model.id);
      }
    }
  }

  public getModels(): ModelMetadata[] {
    return Array.from(this.models.values());
  }

  public getModel(id: string): ModelMetadata | undefined {
    return this.models.get(id);
  }

  public isCompatible(model: ModelMetadata, providerId: ProviderId): boolean {
    return model.supportedProviders.includes(providerId);
  }

  public loadModel(id: string): boolean {
    const model = this.models.get(id);
    if (!model) return false;
    model.status = 'READY';
    this.loadedModels.add(id);
    return true;
  }

  public unloadModel(id: string): boolean {
    const model = this.models.get(id);
    if (!model) return false;
    model.status = 'UNLOADED';
    this.loadedModels.delete(id);
    return true;
  }
}
