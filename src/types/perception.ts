/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine Type Definitions
 */

export type PerceptionModality = 'text' | 'screen' | 'camera' | 'voice' | 'document';

export type ModalityStatus = 
  | 'READY' 
  | 'ACTIVE' 
  | 'LISTENING' 
  | 'SHARING' 
  | 'CAPTURED' 
  | 'BLOCKED' 
  | 'UNAVAILABLE' 
  | 'NOT_AVAILABLE' 
  | 'NOT_CONFIGURED' 
  | 'ERROR';

export interface PrivacyMetadata {
  userInitiated: boolean;
  permissionRequired: boolean;
  permissionGranted: boolean;
  rawStorageRetained: boolean;
  zeroCloudTelemetryEnforced: boolean;
  sanitized: boolean;
  policy: {
    rawAudioStorage: boolean;
    rawCameraStorage: boolean;
    rawScreenStorage: boolean;
  };
}

export interface ExtractedInformation {
  textSnippet?: string;
  wordCount?: number;
  headings?: string[];
  tables?: Array<{ headers: string[]; rowCount: number }>;
  csvSchema?: {
    columns: string[];
    rowCount: number;
    sampleRows?: Record<string, string | number>[];
  };
  errorsDetected?: string[];
  codeSnippets?: string[];
  visualMetadata?: {
    dimensions?: { width: number; height: number };
    format?: string;
    hasTextContent?: boolean;
    ocrAvailable?: boolean;
    visionAvailable?: boolean;
  };
  audioMetadata?: {
    durationSeconds?: number;
    mimeType?: string;
    transcriptionEngine?: string;
  };
}

export interface NexusContextObject {
  context_id: string;
  request_id?: string;
  timestamp: string;
  source: PerceptionModality;
  modality: 'text' | 'visual' | 'audio' | 'document';
  content_type: string;
  content: {
    text?: string;
    rawInput?: string;
    filename?: string;
    fileSize?: number;
    previewUrl?: string;
    dataUrlPreview?: string; // transient in memory only
  };
  extracted_information: ExtractedInformation;
  source_metadata: {
    browser?: string;
    resolution?: string;
    mimeType?: string;
    deviceLabel?: string;
  };
  privacy: PrivacyMetadata;
  confidence: number | null; // Truthful: null if not provided by provider
  provenance: {
    captureMechanism: string;
    pipelineVersion: string;
  };
}

export interface UnifiedMultimodalContext {
  unified_context_id: string;
  created_at: string;
  primary_query: string;
  active_modalities: PerceptionModality[];
  contexts: NexusContextObject[];
  merged_text_representation: string;
  extracted_signals: {
    errors: string[];
    code: string[];
    document_summaries: string[];
    intent_hints: string[];
  };
  privacy_summary: {
    all_local: boolean;
    raw_media_purged: boolean;
  };
}

export interface PerceptionStatusResponse {
  modalities: {
    text: { available: boolean; status: ModalityStatus; reason?: string };
    screen: { available: boolean; status: ModalityStatus; reason?: string };
    camera: { available: boolean; status: ModalityStatus; reason?: string };
    voice: { available: boolean; status: ModalityStatus; reason?: string };
    document: { available: boolean; status: ModalityStatus; reason?: string };
  };
  providers: {
    ocr: { available: boolean; status: ModalityStatus; engine: string; reason?: string };
    vision: { available: boolean; status: ModalityStatus; engine: string; reason?: string };
    speech: { available: boolean; status: ModalityStatus; engine: string; reason?: string };
  };
  privacy_guard: {
    active: boolean;
    enforce_zero_raw_retention: boolean;
    max_document_size_mb: number;
  };
}

export interface DocumentUploadResponse {
  success: boolean;
  context: NexusContextObject;
  warning?: string;
}

export interface ScreenCaptureRequest {
  image_data_base64: string; // Transient frame sent by user
  width?: number;
  height?: number;
  timestamp?: string;
}

export interface CameraCaptureRequest {
  image_data_base64: string; // Single user-triggered frame
  width?: number;
  height?: number;
  timestamp?: string;
}

export interface VoiceTranscriptionRequest {
  transcript: string;
  duration_seconds?: number;
  speech_engine?: string;
}
