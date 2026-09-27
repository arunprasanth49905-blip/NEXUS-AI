/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine
 * Speech Provider Abstraction
 */

import type { ModalityStatus } from '../models.js';

export interface SpeechResult {
  text: string;
  durationSeconds?: number;
  engine: string;
  confidence: number | null;
  status: ModalityStatus;
}

export interface ISpeechProvider {
  isAvailable(): boolean;
  getStatus(): ModalityStatus;
  getEngine(): string;
  normalizeTranscript(rawTranscript: string, durationSeconds?: number): SpeechResult;
}

export class SpeechProvider implements ISpeechProvider {
  private available = true;
  private status: ModalityStatus = 'READY';
  private engine = 'Browser Native SpeechRecognition / Local Push-To-Talk';

  public isAvailable(): boolean {
    return this.available;
  }

  public getStatus(): ModalityStatus {
    return this.status;
  }

  public getEngine(): string {
    return this.engine;
  }

  public normalizeTranscript(rawTranscript: string, durationSeconds?: number): SpeechResult {
    const text = (rawTranscript || '').trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return {
      text,
      durationSeconds: durationSeconds || Math.max(1, Math.round(wordCount / 2.5)),
      engine: this.engine,
      confidence: null, // Strictly null; truthful representation
      status: this.status,
    };
  }
}
