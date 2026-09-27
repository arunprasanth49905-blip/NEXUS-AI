/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine
 * Camera Perception Source Adapter
 */

import type {
  PerceptionSource,
  PerceptionInput,
  NexusContextObject,
  PerceptionModality,
  ModalityStatus,
  CameraCaptureRequest,
} from '../models.js';
import { LocalVisionProvider } from './vision.js';
import { PrivacyGuard } from '../privacy.js';

export class CameraPerceptionSource implements PerceptionSource<CameraCaptureRequest, NexusContextObject> {
  public readonly sourceId = 'source-camera-snapshot';
  public readonly modality: PerceptionModality = 'camera';
  private privacyGuard = PrivacyGuard.getInstance();
  private visionProvider = new LocalVisionProvider();

  public isAvailable(): boolean {
    return process.env.NEXUS_CAMERA_ENABLED !== 'false';
  }

  public getPermissionState(): ModalityStatus {
    return this.isAvailable() ? 'READY' : 'UNAVAILABLE';
  }

  public async process(
    req: CameraCaptureRequest,
    options?: { requestId?: string }
  ): Promise<NexusContextObject> {
    const validation = this.privacyGuard.validateCapture({
      modality: 'camera',
      userInitiated: true,
      permissionGranted: true,
    });

    if (!validation.allowed) {
      throw new Error(validation.reason);
    }

    if (!req.image_data_base64) {
      throw new Error('image_data_base64 is required for camera perception.');
    }

    const contextId = `ctx-cam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const vision = this.visionProvider.inspectFrame(req.image_data_base64);
    const dims = vision.dimensions || { width: req.width || 640, height: req.height || 480 };

    const context: NexusContextObject = {
      context_id: contextId,
      request_id: options?.requestId,
      timestamp: req.timestamp || new Date().toISOString(),
      source: 'camera',
      modality: 'visual',
      content_type: 'image/jpeg',
      content: {
        previewUrl: `[Local Camera Snapshot: ${dims.width}x${dims.height}]`,
      },
      extracted_information: {
        visualMetadata: {
          dimensions: dims,
          format: vision.format,
          visionAvailable: this.visionProvider.isAvailable(),
        },
      },
      source_metadata: {
        resolution: `${dims.width}x${dims.height}`,
        mimeType: 'image/jpeg',
      },
      privacy: this.privacyGuard.createPrivacyMetadata('camera', true),
      confidence: null,
      provenance: {
        captureMechanism: 'browser_getUserMedia_user_triggered_snapshot',
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
      source: 'camera',
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
