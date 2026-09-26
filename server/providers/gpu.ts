import fs from 'fs';
import { RuntimeProvider } from './base.js';
import type { InferenceExecutionResult } from './base.js';
import type {
  ProviderId,
  ProviderCapabilities,
  ModelMetadata,
} from '../../src/types/runtime.js';

export class GPUProvider extends RuntimeProvider {
  readonly providerId: ProviderId = 'gpu';
  readonly name: string = 'Hardware GPU Acceleration Provider';
  readonly type: string = 'DirectML / CUDA Compute Engine';

  private deviceName: string | null = null;

  async detect(): Promise<boolean> {
    // Detect if GPU hardware exists vs if inference provider is configured
    const hasCuda = process.env.CUDA_PATH && fs.existsSync(process.env.CUDA_PATH);
    const hasDri = process.platform === 'linux' && fs.existsSync('/dev/dri/renderD128');
    const hasNvHost = process.platform === 'linux' && fs.existsSync('/dev/nvhost-ctrl-gpu');

    if (hasCuda || hasDri || hasNvHost) {
      this.detected = true;
      this.deviceName = hasCuda ? 'NVIDIA CUDA Device' : (hasNvHost ? 'Tegra GPU' : 'DRM GPU Device');
      this.status = 'NOT_CONFIGURED';
      this.statusReason = `GPU device detected (${this.deviceName}), but native GPU inference acceleration libraries (e.g. onnxruntime-node DirectML/CUDA) are not initialized.`;
      return false; // Hardware exists, but inference runtime is not available
    }

    this.detected = false;
    this.status = 'NOT_AVAILABLE';
    this.statusReason = 'No compatible GPU device or compute runtime detected on this host.';
    return false;
  }

  async initialize(): Promise<boolean> {
    await this.detect();
    // Honest: Native accelerated GPU inference runtime (CUDA / DirectML) is not bound
    this.initialized = false;
    this.status = this.detected ? 'NOT_CONFIGURED' : 'NOT_AVAILABLE';
    return false;
  }

  isAvailable(): boolean {
    return this.initialized && this.status === 'READY';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportedFormats: ['ONNX', 'TorchScript', 'TensorRT'],
      maxBatchSize: 64,
      quantizationSupported: ['FP16', 'INT8', 'INT4'],
      supportedPrecision: ['fp16', 'fp32'],
      npuAcceleration: false,
      gpuAcceleration: true,
      notes: this.isAvailable() 
        ? 'High throughput parallel matrix acceleration active.' 
        : 'GPU inference provider not initialized on this machine.',
    };
  }

  async loadModel(_model: ModelMetadata): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('GPU inference provider is not available or configured on this machine.');
    }
    return true;
  }

  async unloadModel(_modelId: string): Promise<boolean> {
    return true;
  }

  async infer(_model: ModelMetadata, _input: string): Promise<InferenceExecutionResult> {
    throw new Error('Cannot execute inference: GPU provider is not initialized.');
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }
}
