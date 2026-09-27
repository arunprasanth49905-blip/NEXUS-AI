/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine
 * Text Perception Source Adapter
 */

import type {
  PerceptionSource,
  PerceptionInput,
  NexusContextObject,
  PerceptionModality,
  ModalityStatus,
} from '../models.js';
import { PerceptionPreprocessor } from '../preprocessing.js';
import { PrivacyGuard } from '../privacy.js';

export class TextPerceptionSource implements PerceptionSource<string, NexusContextObject> {
  public readonly sourceId = 'source-text-input';
  public readonly modality: PerceptionModality = 'text';
  private privacyGuard = PrivacyGuard.getInstance();

  public isAvailable(): boolean {
    return process.env.NEXUS_TEXT_ENABLED !== 'false';
  }

  public getPermissionState(): ModalityStatus {
    return this.isAvailable() ? 'READY' : 'UNAVAILABLE';
  }

  public process(
    input: string,
    options?: { requestId?: string; clientMeta?: Record<string, string> }
  ): NexusContextObject {
    const norm = PerceptionPreprocessor.normalizeText(input);
    if (!norm.valid) {
      throw new Error(norm.error || 'Invalid text content');
    }

    const contextId = `ctx-text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const errors = PerceptionPreprocessor.extractErrorSignals(norm.text);

    const context: NexusContextObject = {
      context_id: contextId,
      request_id: options?.requestId,
      timestamp: new Date().toISOString(),
      source: 'text',
      modality: 'text',
      content_type: 'text/plain',
      content: { text: norm.text, rawInput: input },
      extracted_information: {
        textSnippet: norm.text.slice(0, 300),
        wordCount: norm.wordCount,
        errorsDetected: errors.length > 0 ? errors : undefined,
      },
      source_metadata: {
        browser: options?.clientMeta?.userAgent,
      },
      privacy: this.privacyGuard.createPrivacyMetadata('text', true),
      confidence: null,
      provenance: {
        captureMechanism: 'user_typed_input',
        pipelineVersion: 'Phase 3.0',
      },
    };

    return context;
  }

  public normalize(context: NexusContextObject): PerceptionInput {
    return {
      id: context.context_id,
      requestId: context.request_id,
      timestamp: context.timestamp,
      modality: 'text',
      source: 'text',
      content: context.content,
      contentType: context.content_type,
      extractedText: context.content.text,
      extractedInformation: context.extracted_information,
      provenance: context.provenance,
      privacyLevel: 'strictly_local',
      persistencePolicy: {
        retainRaw: false,
      },
      confidence: null,
    };
  }
}
