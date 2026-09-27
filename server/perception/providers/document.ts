/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine
 * Document Perception Source Adapter
 */

import type {
  PerceptionSource,
  PerceptionInput,
  NexusContextObject,
  PerceptionModality,
  ModalityStatus,
} from '../models.js';
import { DocumentExtractor } from '../extractor.js';
import { PrivacyGuard } from '../privacy.js';

export interface DocumentProcessInput {
  filePath: string;
  filename: string;
  sizeBytes: number;
  mimeType?: string;
}

export class DocumentPerceptionSource implements PerceptionSource<DocumentProcessInput, NexusContextObject> {
  public readonly sourceId = 'source-document-parser';
  public readonly modality: PerceptionModality = 'document';
  private privacyGuard = PrivacyGuard.getInstance();

  public isAvailable(): boolean {
    return process.env.NEXUS_DOCUMENT_ENABLED !== 'false';
  }

  public getPermissionState(): ModalityStatus {
    return this.isAvailable() ? 'READY' : 'UNAVAILABLE';
  }

  public async process(
    input: DocumentProcessInput,
    options?: { requestId?: string }
  ): Promise<NexusContextObject> {
    const { filePath, filename, sizeBytes, mimeType } = input;
    const validation = this.privacyGuard.validateDocumentFile(filename, sizeBytes, mimeType);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const parseResult = await DocumentExtractor.extract(filePath, filename, mimeType);
    const contextId = `ctx-doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const context: NexusContextObject = {
      context_id: contextId,
      request_id: options?.requestId,
      timestamp: new Date().toISOString(),
      source: 'document',
      modality: 'document',
      content_type: mimeType || 'application/octet-stream',
      content: {
        text: parseResult.text,
        filename,
        fileSize: sizeBytes,
      },
      extracted_information: parseResult.extractedInfo,
      source_metadata: {
        mimeType,
      },
      privacy: this.privacyGuard.createPrivacyMetadata('document', true),
      confidence: null,
      provenance: {
        captureMechanism: 'local_file_upload_parser',
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
      modality: 'document',
      source: 'document',
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
