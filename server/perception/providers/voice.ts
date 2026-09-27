/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine
 * Voice Perception Source Adapter
 */

import type {
  PerceptionSource,
  PerceptionInput,
  NexusContextObject,
  PerceptionModality,
  ModalityStatus,
  VoiceTranscriptionRequest,
} from '../models.js';
import { SpeechProvider } from './speech.js';
import { PrivacyGuard } from '../privacy.js';

export class VoicePerceptionSource implements PerceptionSource<VoiceTranscriptionRequest, NexusContextObject> {
  public readonly sourceId = 'source-voice-transcription';
  public readonly modality: PerceptionModality = 'voice';
  private privacyGuard = PrivacyGuard.getInstance();
  private speechProvider = new SpeechProvider();

  public isAvailable(): boolean {
    return process.env.NEXUS_VOICE_ENABLED !== 'false';
  }

  public getPermissionState(): ModalityStatus {
    return this.isAvailable() ? 'READY' : 'UNAVAILABLE';
  }

  public process(
    req: VoiceTranscriptionRequest,
    options?: { requestId?: string }
  ): NexusContextObject {
    const validation = this.privacyGuard.validateCapture({
      modality: 'voice',
      userInitiated: true,
      permissionGranted: true,
    });

    if (!validation.allowed) {
      throw new Error(validation.reason);
    }

    if (!req.transcript || !req.transcript.trim()) {
      throw new Error('Transcript is required for voice perception.');
    }

    const normSpeech = this.speechProvider.normalizeTranscript(req.transcript, req.duration_seconds);
    const contextId = `ctx-voice-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const wordCount = normSpeech.text.split(/\s+/).filter(Boolean).length;

    const context: NexusContextObject = {
      context_id: contextId,
      request_id: options?.requestId,
      timestamp: new Date().toISOString(),
      source: 'voice',
      modality: 'audio',
      content_type: 'audio/transcript',
      content: {
        text: normSpeech.text,
      },
      extracted_information: {
        textSnippet: normSpeech.text.slice(0, 300),
        wordCount,
        audioMetadata: {
          durationSeconds: normSpeech.durationSeconds,
          transcriptionEngine: req.speech_engine || normSpeech.engine,
        },
      },
      source_metadata: {
        mimeType: 'audio/webm',
      },
      privacy: this.privacyGuard.createPrivacyMetadata('voice', true),
      confidence: null,
      provenance: {
        captureMechanism: 'browser_push_to_talk_speech_to_text',
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
      modality: 'audio',
      source: 'voice',
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
