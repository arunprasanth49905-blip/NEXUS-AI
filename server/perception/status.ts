/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine
 * Perception Status Aggregator & Health Reporter
 */

import type { PerceptionStatusResponse } from './models.js';
import { LocalOCRProvider } from './providers/ocr.js';
import { LocalVisionProvider } from './providers/vision.js';
import { SpeechProvider } from './providers/speech.js';

export class PerceptionStatusReporter {
  private static instance: PerceptionStatusReporter;
  private ocrProvider = new LocalOCRProvider();
  private visionProvider = new LocalVisionProvider();
  private speechProvider = new SpeechProvider();

  public static getInstance(): PerceptionStatusReporter {
    if (!PerceptionStatusReporter.instance) {
      PerceptionStatusReporter.instance = new PerceptionStatusReporter();
    }
    return PerceptionStatusReporter.instance;
  }

  public getStatus(): PerceptionStatusResponse {
    const textEnabled = process.env.NEXUS_TEXT_ENABLED !== 'false';
    const screenEnabled = process.env.NEXUS_SCREEN_ENABLED !== 'false' && process.env.NEXUS_SCREEN_CAPTURE_ENABLED !== 'false';
    const cameraEnabled = process.env.NEXUS_CAMERA_ENABLED !== 'false';
    const voiceEnabled = process.env.NEXUS_VOICE_ENABLED !== 'false';
    const documentEnabled = process.env.NEXUS_DOCUMENT_ENABLED !== 'false';

    return {
      modalities: {
        text: { available: textEnabled, status: textEnabled ? 'READY' : 'UNAVAILABLE' },
        screen: { available: screenEnabled, status: screenEnabled ? 'READY' : 'UNAVAILABLE' },
        camera: { available: cameraEnabled, status: cameraEnabled ? 'READY' : 'UNAVAILABLE' },
        voice: { available: voiceEnabled, status: voiceEnabled ? 'READY' : 'UNAVAILABLE' },
        document: { available: documentEnabled, status: documentEnabled ? 'READY' : 'UNAVAILABLE' },
      },
      providers: {
        ocr: {
          available: this.ocrProvider.isAvailable(),
          status: this.ocrProvider.getStatus(),
          engine: this.ocrProvider.getEngine(),
          reason: 'Native OCR binary not configured; image metadata parsed without fabricated text.',
        },
        vision: {
          available: this.visionProvider.isAvailable(),
          status: this.visionProvider.getStatus(),
          engine: this.visionProvider.getEngine(),
        },
        speech: {
          available: this.speechProvider.isAvailable(),
          status: this.speechProvider.getStatus(),
          engine: this.speechProvider.getEngine(),
        },
      },
      privacy_guard: {
        active: true,
        enforce_zero_raw_retention: true,
        max_document_size_mb: 25,
      },
    };
  }
}
