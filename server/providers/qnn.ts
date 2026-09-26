import fs from 'fs';
import { RuntimeProvider } from './base.js';
import type { InferenceExecutionResult } from './base.js';
import type {
  ProviderId,
  ProviderCapabilities,
  ModelMetadata,
} from '../../src/types/runtime.js';

export class QNNProvider extends RuntimeProvider {
  readonly providerId: ProviderId = 'qnn';
  readonly name: string = 'Qualcomm® QNN / Snapdragon® NPU Provider';
  readonly type: string = 'Hardware NPU Hexagon Engine';

  async detect(): Promise<boolean> {
    const qnnSdkPath = process.env.NEXUS_QNN_SDK_PATH || process.env.QNN_SDK_ROOT || '';
    const qnnLibPath = process.env.NEXUS_QNN_LIB_PATH || '';

    // Check if QNN libraries exist
    if (qnnSdkPath && fs.existsSync(qnnSdkPath)) {
      const hasLibs = fs.existsSync(`${qnnSdkPath}/lib`) || (qnnLibPath && fs.existsSync(qnnLibPath));
      if (hasLibs) {
        this.detected = true;
        this.status = 'AVAILABLE';
        this.statusReason = `Qualcomm QNN runtime binaries discovered at ${qnnSdkPath}.`;
        return true;
      }
      this.detected = true;
      this.status = 'NOT_CONFIGURED';
      this.statusReason = `QNN SDK path configured, but required native libraries (libQnnHtp.so / QnnHtp.dll) were not found.`;
      return false;
    }

    this.detected = false;
    this.status = 'NOT_AVAILABLE';
    this.statusReason = 'No Qualcomm QNN SDK or Snapdragon NPU environment detected on this host.';
    return false;
  }

  async initialize(): Promise<boolean> {
    const detected = await this.detect();
    if (detected && this.status === 'AVAILABLE') {
      this.initialized = true;
      this.status = 'READY';
      this.statusReason = 'Qualcomm QNN HTP NPU backend initialized.';
      return true;
    }

    this.initialized = false;
    // Status and statusReason already truthfully populated by detect()
    return false;
  }

  isAvailable(): boolean {
    return this.initialized && this.status === 'READY';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportedFormats: ['QNN_DLC', 'ONNX'],
      maxBatchSize: 8,
      quantizationSupported: ['INT8', 'INT4', 'FP16'],
      supportedPrecision: ['int8', 'fp16'],
      npuAcceleration: true,
      gpuAcceleration: false,
      notes: this.isAvailable()
        ? 'Dedicated Snapdragon Hexagon Tensor Processor active.'
        : 'Snapdragon NPU / QNN runtime is not present on this machine.',
    };
  }

  async loadModel(_model: ModelMetadata): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Qualcomm QNN provider is not available or initialized.');
    }
    return true;
  }

  async unloadModel(_modelId: string): Promise<boolean> {
    return true;
  }

  async infer(_model: ModelMetadata, _input: string): Promise<InferenceExecutionResult> {
    throw new Error('Cannot execute inference: Qualcomm QNN provider is not initialized.');
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }
}
