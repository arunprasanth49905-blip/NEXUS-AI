/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine
 * Screen Perception Source Adapter
 */

import type {
  PerceptionSource,
  PerceptionInput,
  NexusContextObject,
  PerceptionModality,
  ModalityStatus,
  ScreenCaptureRequest,
} from '../models.js';
import { LocalVisionProvider } from './vision.js';
import { LocalOCRProvider } from './ocr.js';
import { PrivacyGuard } from '../privacy.js';

export class ScreenPerceptionSource implements PerceptionSource<ScreenCaptureRequest, NexusContextObject> {
  public readonly sourceId = 'source-screen-capture';
  public readonly modality: PerceptionModality = 'screen';
  private privacyGuard = PrivacyGuard.getInstance();
  private visionProvider = new LocalVisionProvider();
  private ocrProvider = new LocalOCRProvider();

  public isAvailable(): boolean {
    return process.env.NEXUS_SCREEN_ENABLED !== 'false' && process.env.NEXUS_SCREEN_CAPTURE_ENABLED !== 'false';
  }

  public getPermissionState(): ModalityStatus {
    return this.isAvailable() ? 'READY' : 'UNAVAILABLE';
  }

  public async process(
    req: ScreenCaptureRequest,
    options?: { requestId?: string }
  ): Promise<NexusContextObject> {
    const validation = this.privacyGuard.validateCapture({
      modality: 'screen',
      userInitiated: true,
      permissionGranted: true,
    });

    if (!validation.allowed) {
      throw new Error(validation.reason);
    }

    if (!req.image_data_base64) {
      throw new Error('image_data_base64 is required for screen perception.');
    }

    const contextId = `ctx-screen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const vision = this.visionProvider.inspectFrame(req.image_data_base64);
    const ocr = await this.ocrProvider.extractText(req.image_data_base64);

    const dims = vision.dimensions || { width: req.width || 1920, height: req.height || 1080 };

    const context: NexusContextObject = {
      context_id: contextId,
      request_id: options?.requestId,
      timestamp: req.timestamp || new Date().toISOString(),
      source: 'screen',
      modality: 'visual',
      content_type: 'image/png',
      content: {
        previewUrl: `[Local Screen Capture Frame: ${dims.width}x${dims.height}]`,
        dataUrlPreview: req.image_data_base64.slice(0, 100) + '...',
      },
      extracted_information: {
        visualMetadata: {
          dimensions: dims,
          format: vision.format,
          hasTextContent: ocr.hasText,
          ocrAvailable: this.ocrProvider.isAvailable(),
          visionAvailable: this.visionProvider.isAvailable(),
        },
        textSnippet: ocr.hasText ? ocr.text : undefined,
      },
      source_metadata: {
        resolution: `${dims.width}x${dims.height}`,
        mimeType: 'image/png',
      },
      privacy: this.privacyGuard.createPrivacyMetadata('screen', true),
      confidence: null,
      provenance: {
        captureMechanism: 'browser_getDisplayMedia_single_frame',
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
      modality: 'visual',
      source: 'screen',
      content: context.content,
      contentType: context.content_type,
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
