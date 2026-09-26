import { RuntimeProvider } from './providers/base.js';
import { CPUProvider } from './providers/cpu.js';
import { GPUProvider } from './providers/gpu.js';
import { QNNProvider } from './providers/qnn.js';
import type { ProviderId } from '../src/types/runtime.js';

export class ProviderRegistry {
  private providers: Map<ProviderId, RuntimeProvider> = new Map();

  constructor() {
    this.register(new QNNProvider());
    this.register(new GPUProvider());
    this.register(new CPUProvider());
  }

  public register(provider: RuntimeProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  public get(id: ProviderId): RuntimeProvider | undefined {
    return this.providers.get(id);
  }

  public getAll(): RuntimeProvider[] {
    return Array.from(this.providers.values());
  }

  public async initializeAll(): Promise<void> {
    for (const provider of this.providers.values()) {
      try {
        await provider.detect();
        await provider.initialize();
      } catch (err) {
        console.error(`Error initializing provider ${provider.providerId}:`, err);
      }
    }
  }

  public getAvailableProviders(): ProviderId[] {
    const available: ProviderId[] = [];
    for (const [id, provider] of this.providers.entries()) {
      if (provider.isAvailable()) {
        available.push(id);
      }
    }
    return available;
  }
}
