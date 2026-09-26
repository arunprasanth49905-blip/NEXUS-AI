/**
 * NEXUS-AI Phase 4 Memory Privacy Guard
 * Inspects memory candidates, detects secrets/credentials, redacts or rejects them.
 */

export interface SecretAuditResult {
  hasSecret: boolean;
  sanitizedContent: string;
  detectedTypes: string[];
  action: 'ALLOW' | 'REDACT' | 'REJECT';
  reason?: string;
}

export class MemoryPrivacyGuard {
  private static instance: MemoryPrivacyGuard;
  private rejectedSecretsCount = 0;

  // Patterns for authentic secret detection
  private readonly secretPatterns: Array<{ type: string; regex: RegExp; severity: 'REJECT' | 'REDACT' }> = [
    { type: 'API Key (Generic)', regex: /(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token)\s*[:=]\s*['"]?([a-zA-Z0-9_-]{16,})['"]?/i, severity: 'REJECT' },
    { type: 'OpenAI/Anthropic/Google Token', regex: /(?:sk-[a-zA-Z0-9]{20,}|AIzaSy[a-zA-Z0-9_-]{33}|ghp_[a-zA-Z0-9]{36})/g, severity: 'REJECT' },
    { type: 'JWT Bearer Token', regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, severity: 'REJECT' },
    { type: 'RSA/Private Key Header', regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i, severity: 'REJECT' },
    { type: 'Password Field', regex: /(?:password|passwd|pwd)\s*[:=]\s*['"]?([^'"\s]{6,})['"]?/i, severity: 'REJECT' },
    { type: 'Credit Card Number', regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g, severity: 'REJECT' },
  ];

  private constructor() {}

  public static getInstance(): MemoryPrivacyGuard {
    if (!MemoryPrivacyGuard.instance) {
      MemoryPrivacyGuard.instance = new MemoryPrivacyGuard();
    }
    return MemoryPrivacyGuard.instance;
  }

  public auditContent(content: string): SecretAuditResult {
    let sanitized = content;
    const detected: string[] = [];
    let shouldReject = false;

    for (const rule of this.secretPatterns) {
      if (rule.regex.test(content)) {
        detected.push(rule.type);
        if (rule.severity === 'REJECT') {
          shouldReject = true;
        }
        sanitized = sanitized.replace(rule.regex, '[REDACTED_SECRET]');
      }
    }

    if (shouldReject) {
      this.rejectedSecretsCount++;
      return {
        hasSecret: true,
        sanitizedContent: sanitized,
        detectedTypes: detected,
        action: 'REJECT',
        reason: `Memory storage rejected by Privacy Guard: contains detected credential/secret patterns (${detected.join(', ')}).`,
      };
    }

    if (detected.length > 0) {
      return {
        hasSecret: true,
        sanitizedContent: sanitized,
        detectedTypes: detected,
        action: 'REDACT',
        reason: `Sensitive terms were redacted before retention: ${detected.join(', ')}.`,
      };
    }

    return {
      hasSecret: false,
      sanitizedContent: content,
      detectedTypes: [],
      action: 'ALLOW',
    };
  }

  public getRejectedCount(): number {
    return this.rejectedSecretsCount;
  }
}
