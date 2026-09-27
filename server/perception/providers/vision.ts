/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine
 * Vision Provider Abstraction
 */

import type { ModalityStatus } from '../models.js';
import { PerceptionPreprocessor } from '../preprocessing.js';

export interface VisionResult {
  hasVisualContent: boolean;
  summary: string;
  objects: string[];
  dimensions?: { width: number; height: number };
  format: string;
  confidence: number | null; // Truthful: strictly null
  engine: string;
  status: ModalityStatus;
}

export interface IVisionProvider {
  isAvailable(): boolean;
  getStatus(): ModalityStatus;
  getEngine(): string;
  inspectFrame(base64Data: string): VisionResult;
}

export class LocalVisionProvider implements IVisionProvider {
  private available = true;
  private status: ModalityStatus = 'READY';
  private engine = 'Header & Structural Frame Inspector';

  public isAvailable(): boolean {
    return this.available;
  }

  public getStatus(): ModalityStatus {
    return this.status;
  }

  public getEngine(): string {
    return this.engine;
  }

  public inspectFrame(base64Data: string): VisionResult {
    const inspection = PerceptionPreprocessor.inspectImageBase64(base64Data);

    const dims = inspection.dimensions;
    const summary = dims && dims.width > 0 && dims.height > 0
      ? `Captured visual frame (${dims.width}x${dims.height} px, ${inspection.format}). No cloud transmission.`
      : `Captured visual frame (${inspection.format}). Verified local boundary.`;

    return {
      hasVisualContent: true,
      summary,
      objects: [], // No fake object detection
      dimensions: dims,
      format: inspection.format,
      confidence: null, // Strictly null
      engine: this.engine,
      status: this.status,
    };
  }
}
