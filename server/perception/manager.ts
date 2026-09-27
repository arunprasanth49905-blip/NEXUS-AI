/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine
 * Perception Manager (Central Coordinator)
 */

import { PrivacyGuard } from './privacy.js';
import { PerceptionStatusReporter } from './status.js';
import { PerceptionContextEngine } from './context.js';
import { TextPerceptionSource } from './providers/text.js';
import { ScreenPerceptionSource } from './providers/screen.js';
import { CameraPerceptionSource } from './providers/camera.js';
import { VoicePerceptionSource } from './providers/voice.js';
import { DocumentPerceptionSource } from './providers/document.js';
import type {
  NexusContextObject,
  UnifiedMultimodalContext,
  PerceptionStatusResponse,
  ScreenCaptureRequest,
  CameraCaptureRequest,
  VoiceTranscriptionRequest,
  PerceptionSource,
  PerceptionModality,
} from './models.js';

export class PerceptionManager {
  private static instance: PerceptionManager;
  private privacyGuard = PrivacyGuard.getInstance();
  private statusReporter = PerceptionStatusReporter.getInstance();

  // Modality Sources
  private textSource = new TextPerceptionSource();
  private screenSource = new ScreenPerceptionSource();
  private cameraSource = new CameraPerceptionSource();
  private voiceSource = new VoicePerceptionSource();
  private documentSource = new DocumentPerceptionSource();

  // In-memory active contexts for current session (bounded, ephemeral)
  private sessionContexts: Map<string, NexusContextObject> = new Map();

  private constructor() {}

  public static getInstance(): PerceptionManager {
    if (!PerceptionManager.instance) {
      PerceptionManager.instance = new PerceptionManager();
    }
    return PerceptionManager.instance;
  }

  public getPrivacyGuard(): PrivacyGuard {
    return this.privacyGuard;
  }

  public getStatus(): PerceptionStatusResponse {
    return this.statusReporter.getStatus();
  }

  public getSource(modality: PerceptionModality): PerceptionSource<unknown, NexusContextObject> | undefined {
    switch (modality) {
      case 'text':
        return this.textSource as unknown as PerceptionSource<unknown, NexusContextObject>;
      case 'screen':
        return this.screenSource as unknown as PerceptionSource<unknown, NexusContextObject>;
      case 'camera':
        return this.cameraSource as unknown as PerceptionSource<unknown, NexusContextObject>;
      case 'voice':
        return this.voiceSource as unknown as PerceptionSource<unknown, NexusContextObject>;
      case 'document':
        return this.documentSource as unknown as PerceptionSource<unknown, NexusContextObject>;
      default:
        return undefined;
    }
  }

  // 1. TEXT PERCEPTION
  public processText(
    text: string,
    clientMeta?: Record<string, string>,
    requestId?: string
  ): NexusContextObject {
    const context = this.textSource.process(text, { clientMeta, requestId });
    this.sessionContexts.set(context.context_id, context);
    return context;
  }

  // 2. SCREEN PERCEPTION
  public async processScreen(
    req: ScreenCaptureRequest,
    requestId?: string
  ): Promise<NexusContextObject> {
    const context = await this.screenSource.process(req, { requestId });
    this.sessionContexts.set(context.context_id, context);
    return context;
  }

  // 3. CAMERA PERCEPTION
  public async processCamera(
    req: CameraCaptureRequest,
    requestId?: string
  ): Promise<NexusContextObject> {
    const context = await this.cameraSource.process(req, { requestId });
    this.sessionContexts.set(context.context_id, context);
    return context;
  }

  // 4. VOICE PERCEPTION
  public processVoice(
    req: VoiceTranscriptionRequest,
    requestId?: string
  ): NexusContextObject {
    const context = this.voiceSource.process(req, { requestId });
    this.sessionContexts.set(context.context_id, context);
    return context;
  }

  // 5. DOCUMENT PERCEPTION
  public async processDocument(
    filePath: string,
    filename: string,
    sizeBytes: number,
    mimeType?: string,
    requestId?: string
  ): Promise<NexusContextObject> {
    const context = await this.documentSource.process(
      { filePath, filename, sizeBytes, mimeType },
      { requestId }
    );
    this.sessionContexts.set(context.context_id, context);
    return context;
  }

  // MULTIMODAL CONTEXT MERGING
  public mergeContexts(contextIds: string[], primaryQuery?: string): UnifiedMultimodalContext {
    const contexts: NexusContextObject[] = [];
    for (const id of contextIds) {
      const ctx = this.sessionContexts.get(id);
      if (ctx) {
        contexts.push(ctx);
      }
    }
    return PerceptionContextEngine.merge(contexts, primaryQuery);
  }

  public getContext(contextId: string): NexusContextObject | undefined {
    return this.sessionContexts.get(contextId);
  }

  public getAllContexts(): NexusContextObject[] {
    return Array.from(this.sessionContexts.values());
  }

  public clearContexts(): void {
    this.sessionContexts.clear();
  }
}
