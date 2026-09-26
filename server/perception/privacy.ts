import type { PrivacyMetadata, PerceptionModality } from '../../src/types/perception.js';

export interface PrivacyCheckParams {
  modality: PerceptionModality;
  userInitiated: boolean;
  permissionGranted: boolean;
  fileSizeBytes?: number;
  maxSizeBytes?: number;
}

export class PrivacyGuard {
  private static instance: PrivacyGuard;

  // Strict local edge privacy defaults: Zero raw audio/camera/screen persistent storage
  public readonly policy = {
    rawAudioStorage: false,
    rawCameraStorage: false,
    rawScreenStorage: false,
    maxDocumentSizeBytes: 25 * 1024 * 1024, // 25 MB max
    allowedMimeTypes: new Set([
      'application/pdf',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/png',
      'image/jpeg',
      'image/webp',
    ]),
    allowedExtensions: new Set(['.pdf', '.txt', '.md', '.markdown', '.csv', '.docx', '.png', '.jpg', '.jpeg', '.webp']),
  };

  private constructor() {}

  public static getInstance(): PrivacyGuard {
    if (!PrivacyGuard.instance) {
      PrivacyGuard.instance = new PrivacyGuard();
    }
    return PrivacyGuard.instance;
  }

  public validateCapture(params: PrivacyCheckParams): { allowed: boolean; reason?: string } {
    if (!params.userInitiated) {
      return {
        allowed: false,
        reason: 'Privacy Guard Violation: Capture must be explicitly initiated by user interaction.',
      };
    }

    if (['camera', 'screen', 'voice'].includes(params.modality) && !params.permissionGranted) {
      return {
        allowed: false,
        reason: `Privacy Guard: Explicit user consent and browser permission required for ${params.modality}.`,
      };
    }

    if (params.fileSizeBytes && params.maxSizeBytes && params.fileSizeBytes > params.maxSizeBytes) {
      return {
        allowed: false,
        reason: `File size exceeds safety limit of ${(params.maxSizeBytes / (1024 * 1024)).toFixed(0)}MB.`,
      };
    }

    return { allowed: true };
  }

  public createPrivacyMetadata(modality: PerceptionModality, userInitiated = true): PrivacyMetadata {
    return {
      userInitiated,
      permissionRequired: ['camera', 'screen', 'voice'].includes(modality),
      permissionGranted: true,
      rawStorageRetained: false, // NEVER retain raw frames or audio
      zeroCloudTelemetryEnforced: true,
      sanitized: true,
      policy: {
        rawAudioStorage: this.policy.rawAudioStorage,
        rawCameraStorage: this.policy.rawCameraStorage,
        rawScreenStorage: this.policy.rawScreenStorage,
      },
    };
  }

  public validateDocumentFile(filename: string, sizeBytes: number, mimeType?: string): { valid: boolean; reason?: string } {
    if (sizeBytes > this.policy.maxDocumentSizeBytes) {
      return {
        valid: false,
        reason: `Document size (${(sizeBytes / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 25MB.`,
      };
    }

    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    if (!this.policy.allowedExtensions.has(ext)) {
      return {
        valid: false,
        reason: `Unsupported document format '${ext}'. Supported formats: PDF, TXT, MD, DOCX, CSV.`,
      };
    }

    if (mimeType && !this.policy.allowedMimeTypes.has(mimeType.toLowerCase()) && !mimeType.startsWith('text/')) {
      return {
        valid: false,
        reason: `MIME type '${mimeType}' is not permitted by Privacy Guard.`,
      };
    }

    return { valid: true };
  }
}
