import type {
  ProviderId,
  ProviderStatus,
  ProviderCapabilities,
  ProviderTelemetry,
  RuntimeProviderInfo,
  ModelMetadata,
} from '../../src/types/runtime.js';

export interface InferenceExecutionResult {
  text: string;
  intent?: string;
  confidence?: number;
  tokens?: string[];
  outputTokens: number;
}

export abstract class RuntimeProvider {
  abstract readonly providerId: ProviderId;
  abstract readonly name: string;
  abstract readonly type: string;

  protected status: ProviderStatus = 'NOT_CONFIGURED';
  protected statusReason: string = 'Provider uninitialized';
  protected detected: boolean = false;
  protected initialized: boolean = false;

  protected telemetry: ProviderTelemetry = {
    inferenceCount: 0,
    totalLatencyMs: 0,
    averageLatencyMs: null,
    lastLatencyMs: null,
    lastExecutionTimestamp: null,
    errorsCount: 0,
  };

  abstract detect(): Promise<boolean>;
  abstract initialize(): Promise<boolean>;
  abstract isAvailable(): boolean;
  abstract getCapabilities(): ProviderCapabilities;
  abstract loadModel(model: ModelMetadata): Promise<boolean>;
  abstract unloadModel(modelId: string): Promise<boolean>;
  abstract infer(model: ModelMetadata, input: string): Promise<InferenceExecutionResult>;
  abstract shutdown(): Promise<void>;

  public getStatus(): ProviderStatus {
    return this.status;
  }

  public getStatusReason(): string {
    return this.statusReason;
  }

  public isDetected(): boolean {
    return this.detected;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getTelemetry(): ProviderTelemetry {
    return { ...this.telemetry };
  }

  public getInfo(): RuntimeProviderInfo {
    return {
      provider_id: this.providerId,
      name: this.name,
      type: this.type,
      status: this.status,
      status_reason: this.statusReason,
      detected: this.detected,
      initialized: this.initialized,
      capabilities: this.getCapabilities(),
      telemetry: this.getTelemetry(),
    };
  }

  protected recordInference(latencyMs: number, success: boolean): void {
    if (success) {
      this.telemetry.inferenceCount += 1;
      this.telemetry.totalLatencyMs += latencyMs;
      this.telemetry.averageLatencyMs = +(this.telemetry.totalLatencyMs / this.telemetry.inferenceCount).toFixed(2);
      this.telemetry.lastLatencyMs = +latencyMs.toFixed(2);
      this.telemetry.lastExecutionTimestamp = new Date().toISOString();
    } else {
      this.telemetry.errorsCount += 1;
    }
  }
}
