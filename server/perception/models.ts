/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine
 * Core Model Definitions & Interfaces
 */

import type {
  NexusContextObject,
  UnifiedMultimodalContext,
  PerceptionStatusResponse,
  PerceptionModality,
  ModalityStatus,
  PrivacyMetadata,
  ExtractedInformation,
  ScreenCaptureRequest,
  CameraCaptureRequest,
  VoiceTranscriptionRequest,
} from '../../src/types/perception.js';

export type {
  NexusContextObject,
  UnifiedMultimodalContext,
  PerceptionStatusResponse,
  PerceptionModality,
  ModalityStatus,
  PrivacyMetadata,
  ExtractedInformation,
  ScreenCaptureRequest,
  CameraCaptureRequest,
  VoiceTranscriptionRequest,
};

/**
 * Standardized Perception Error
 */
export interface PerceptionErrorDetails {
  code: string;
  category: 'VALIDATION_ERROR' | 'PRIVACY_VIOLATION' | 'UNSUPPORTED_MODALITY' | 'CAPABILITY_UNAVAILABLE' | 'EXTRACTION_ERROR' | 'INTERNAL_ERROR';
  message: string;
  details?: Record<string, unknown> | string;
}

/**
 * Standardized Normalized Perception Input
 */
export interface PerceptionInput {
  id: string;
  requestId?: string;
  timestamp: string;
  modality: 'text' | 'visual' | 'audio' | 'document';
  source: PerceptionModality;
  content: {
    text?: string;
    rawInput?: string;
    filename?: string;
    fileSize?: number;
    previewUrl?: string;
    dataUrlPreview?: string;
  };
  contentType: string;
  extractedText?: string;
  extractedObjects?: string[];
  extractedMetadata?: Record<string, unknown>;
  extractedInformation: ExtractedInformation;
  provenance: {
    captureMechanism: string;
    pipelineVersion: string;
    sourceDevice?: string;
  };
  privacyLevel: 'strictly_local' | 'sanitized_edge' | 'ephemeral';
  persistencePolicy: {
    retainRaw: boolean;
    ttlSeconds?: number;
  };
  confidence: number | null; // Strictly null when unavailable; never fabricated
}

/**
 * Common Perception Source Interface
 * Every perception modality adapter implements this contract.
 */
export interface PerceptionSource<TInput = unknown, TOutput = NexusContextObject> {
  readonly sourceId: string;
  readonly modality: PerceptionModality;
  isAvailable(): boolean;
  getPermissionState(): ModalityStatus;
  process(input: TInput, options?: { requestId?: string; clientMeta?: Record<string, string> }): Promise<TOutput> | TOutput;
  normalize(context: TOutput): PerceptionInput;
}
