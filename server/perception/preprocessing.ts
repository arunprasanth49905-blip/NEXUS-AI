/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine
 * Preprocessing & Normalization Utilities
 */

export class PerceptionPreprocessor {
  /**
   * Normalizes textual inputs:
   * - strips redundant whitespace
   * - normalizes Unicode to canonical NFC form
   * - validates safe length boundaries
   */
  public static normalizeText(
    rawText: string,
    options: { maxLength?: number; allowEmpty?: boolean } = {}
  ): { text: string; wordCount: number; valid: boolean; error?: string } {
    const maxLength = options.maxLength || 50000;
    const allowEmpty = options.allowEmpty ?? false;

    if (typeof rawText !== 'string') {
      return { text: '', wordCount: 0, valid: false, error: 'Input must be a valid text string.' };
    }

    // Unicode normalization
    let normalized = rawText.normalize('NFC').trim();

    // Whitespace collapse (preserve single linebreaks)
    normalized = normalized.replace(/[^\S\r\n]+/g, ' ');

    if (!allowEmpty && normalized.length === 0) {
      return { text: '', wordCount: 0, valid: false, error: 'Text content cannot be empty.' };
    }

    if (normalized.length > maxLength) {
      return {
        text: normalized.slice(0, maxLength),
        wordCount: normalized.slice(0, maxLength).split(/\s+/).filter(Boolean).length,
        valid: false,
        error: `Text content exceeds maximum character limit of ${maxLength}.`,
      };
    }

    const words = normalized.split(/\s+/).filter(Boolean);
    return {
      text: normalized,
      wordCount: words.length,
      valid: true,
    };
  }

  /**
   * Extracts error markers and technical signals from text locally without cloud AI
   */
  public static extractErrorSignals(text: string): string[] {
    const detected: string[] = [];
    if (/error|exception|fail|timeout|typeerror|referenceerror|fatal|unhandled/i.test(text)) {
      const match = text.match(/(?:error|exception|fail|fatal|typeerror):\s*([^\n.]+)/i);
      if (match && match[0]) {
        detected.push(match[0].trim());
      }
    }
    return detected;
  }

  /**
   * Safe inspection of base64 image data URL headers (PNG, JPEG, WebP)
   */
  public static inspectImageBase64(base64Data: string): {
    format: 'PNG' | 'JPEG' | 'WEBP' | 'UNKNOWN';
    dimensions?: { width: number; height: number };
    isValidBase64: boolean;
  } {
    if (!base64Data || typeof base64Data !== 'string') {
      return { format: 'UNKNOWN', isValidBase64: false };
    }

    try {
      const commaIdx = base64Data.indexOf(',');
      const rawBase64 = commaIdx !== -1 ? base64Data.slice(commaIdx + 1) : base64Data;
      const buffer = Buffer.from(rawBase64.slice(0, 128), 'base64');

      if (buffer.length < 8) {
        return { format: 'UNKNOWN', isValidBase64: true };
      }

      // Check PNG: 89 50 4E 47
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        if (buffer.length >= 24) {
          const width = buffer.readUInt32BE(16);
          const height = buffer.readUInt32BE(20);
          return { format: 'PNG', dimensions: { width, height }, isValidBase64: true };
        }
        return { format: 'PNG', isValidBase64: true };
      }

      // Check JPEG: FF D8
      if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        return { format: 'JPEG', isValidBase64: true };
      }

      // Check WEBP: RIFF ... WEBP
      if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
        return { format: 'WEBP', isValidBase64: true };
      }

      return { format: 'UNKNOWN', isValidBase64: true };
    } catch {
      return { format: 'UNKNOWN', isValidBase64: false };
    }
  }
}
