/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine
 * OCR Provider Abstraction
 */

import type { ModalityStatus } from '../models.js';

export interface OCRResult {
  text: string;
  hasText: boolean;
  confidence: number | null; // Truthful: strictly null when unavailable
  engine: string;
  status: ModalityStatus;
  reason?: string;
}

export interface IOCRProvider {
  isAvailable(): boolean;
  getStatus(): ModalityStatus;
  getEngine(): string;
  extractText(base64Image: string): Promise<OCRResult>;
}

export class LocalOCRProvider implements IOCRProvider {
  private available = false;
  private status: ModalityStatus = 'NOT_AVAILABLE';
  private engine = 'Local Pattern/Lightweight OCR';
  private reason = 'Native OCR binary not configured; image metadata parsed without fabricated text.';

  constructor() {
    const ocrEnv = process.env.NEXUS_OCR_PROVIDER;
    if (ocrEnv === 'native_tesseract') {
      this.available = false;
      this.status = 'NOT_AVAILABLE';
      this.reason = 'Native Tesseract OCR binary not found in host environment.';
    } else {
      this.available = false;
      this.status = 'NOT_AVAILABLE';
    }
  }

  public isAvailable(): boolean {
    return this.available;
  }

  public getStatus(): ModalityStatus {
    return this.status;
  }

  public getEngine(): string {
    return this.engine;
  }

  public getReason(): string {
    return this.reason;
  }

  public async extractText(_base64Image: string): Promise<OCRResult> {
    if (!this.available) {
      return {
        text: '',
        hasText: false,
        confidence: null,
        engine: this.engine,
        status: this.status,
        reason: this.reason,
      };
    }

    return {
      text: '',
      hasText: false,
      confidence: null,
      engine: this.engine,
      status: this.status,
    };
  }
}
