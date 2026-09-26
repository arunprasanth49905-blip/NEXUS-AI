import type { ProviderId, ModelMetadata, RuntimeSelectionResult, HardwareDetectionResult } from '../src/types/runtime.js';
import { ProviderRegistry } from './registry.js';

export interface SelectionRequest {
  requestedProvider?: ProviderId | 'auto';
  model: ModelMetadata;
  hardware: HardwareDetectionResult;
}

export class SelectionEngine {
  // Preferred selection hierarchy: QNN/NPU -> GPU -> CPU
  private readonly preferredChain: ProviderId[] = ['qnn', 'gpu', 'cpu'];

  public select(
    registry: ProviderRegistry,
    req: SelectionRequest
  ): RuntimeSelectionResult {
    const { requestedProvider = 'auto', model, hardware } = req;
    const available = registry.getAvailableProviders();
    const chainAttempted: ProviderId[] = [];

    // If a specific provider was explicitly requested (not 'auto')
    if (requestedProvider !== 'auto') {
      chainAttempted.push(requestedProvider);
      const target = registry.get(requestedProvider);

      if (target && target.isAvailable()) {
        if (model.supportedProviders.includes(requestedProvider)) {
          return {
            selected_provider: requestedProvider,
            reason: `Explicitly requested provider '${requestedProvider.toUpperCase()}' is available and model '${model.id}' is compatible.`,
            fallback_used: false,
            fallback_reason: null,
            chain_attempted: chainAttempted,
            available_providers: available,
          };
        } else {
          // Incompatible model with requested provider, trigger fallback
          const fallback = this.resolveFallback(registry, model, requestedProvider, chainAttempted, available);
          return {
            ...fallback,
            fallback_used: true,
            fallback_reason: `Requested provider '${requestedProvider.toUpperCase()}' does not support model '${model.id}'. Fallback invoked.`,
          };
        }
      } else {
        // Requested provider is not available
        const fallback = this.resolveFallback(registry, model, requestedProvider, chainAttempted, available);
        return {
          ...fallback,
          fallback_used: true,
          fallback_reason: `Requested provider '${requestedProvider.toUpperCase()}' is not available or initialized on this system. Fallback invoked.`,
        };
      }
    }

    // Auto selection based on preferred hierarchy: QNN -> GPU -> CPU
    for (const providerId of this.preferredChain) {
      chainAttempted.push(providerId);
      const provider = registry.get(providerId);

      if (provider && provider.isAvailable()) {
        if (model.supportedProviders.includes(providerId)) {
          const isFallback = providerId !== 'qnn';
          let fallbackReason: string | null = null;
          let reason = '';

          if (providerId === 'qnn') {
            reason = 'Qualcomm QNN is initialized and the selected model supports the Snapdragon NPU execution path.';
          } else if (providerId === 'gpu') {
            reason = 'GPU execution is available and compatible with the target model.';
            fallbackReason = 'Qualcomm QNN / Snapdragon NPU was not detected or not initialized on this machine.';
          } else {
            reason = 'CPU is currently the available compatible execution provider.';
            fallbackReason = hardware.snapdragonDetected
              ? 'Snapdragon hardware detected, but QNN native libraries are not configured. Falling back to host CPU execution.'
              : 'Qualcomm QNN was not detected and no compatible GPU inference provider is available.';
          }

          return {
            selected_provider: providerId,
            reason,
            fallback_used: isFallback,
            fallback_reason: fallbackReason,
            chain_attempted: chainAttempted,
            available_providers: available,
          };
        }
      }
    }

    // If nothing succeeded, throw or return baseline CPU attempt
    return {
      selected_provider: 'cpu',
      reason: 'No accelerated provider available; fallback CPU engine selected.',
      fallback_used: true,
      fallback_reason: 'All hardware acceleration checks exhausted.',
      chain_attempted: chainAttempted,
      available_providers: available,
    };
  }

  private resolveFallback(
    registry: ProviderRegistry,
    model: ModelMetadata,
    failedId: ProviderId,
    chainAttempted: ProviderId[],
    available: ProviderId[]
  ): RuntimeSelectionResult {
    for (const nextId of this.preferredChain) {
      if (nextId === failedId) continue;
      chainAttempted.push(nextId);
      const candidate = registry.get(nextId);
      if (candidate && candidate.isAvailable() && model.supportedProviders.includes(nextId)) {
        return {
          selected_provider: nextId,
          reason: `Fell back to ${nextId.toUpperCase()} execution path.`,
          fallback_used: true,
          fallback_reason: null, // Will be filled by caller
          chain_attempted: chainAttempted,
          available_providers: available,
        };
      }
    }

    return {
      selected_provider: 'cpu',
      reason: 'Fell back to host CPU baseline execution.',
      fallback_used: true,
      fallback_reason: 'Fallback to CPU baseline.',
      chain_attempted: chainAttempted,
      available_providers: available,
    };
  }
}
