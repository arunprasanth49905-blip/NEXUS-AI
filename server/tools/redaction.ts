/**
 * NEXUS-AI Phase 6: Secret Protection & Redaction Layer
 * Prevents credentials, API keys, and sensitive tokens from leaking in tool outputs and audit logs.
 */

export class SecretRedactor {
  // Regex patterns targeting standard credentials, tokens, and keys
  private static readonly SECRET_PATTERNS = [
    // OpenAI / Anthropic / Gemini API keys
    /sk-[a-zA-Z0-9_-]{20,}/g,
    /sk-ant-[a-zA-Z0-9_-]{20,}/g,
    /AIza[0-9A-Za-z-_]{35}/g,
    // GitHub / GitLab / Slack tokens
    /ghp_[a-zA-Z0-9]{36}/g,
    /gho_[a-zA-Z0-9]{36}/g,
    /glpat-[a-zA-Z0-9_-]{20,}/g,
    /xox[baprs]-[0-9a-zA-Z]{10,}/g,
    // Bearer tokens & JWTs
    /Bearer\s+([a-zA-Z0-9\-._~+/]+=*)/gi,
    /eyJ[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}/g,
    // AWS / Cloud credentials
    /AKIA[0-9A-Z]{16}/g,
    // Private key blocks
    /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
    // Generic password / secret assignments (e.g. password = "xyz", secret_key: "abc")
    /(password|passwd|secret|api_key|access_token|private_key)\s*[:=]\s*["']([^"'\s]{4,})["']/gi,
  ];

  public static redactText(text: string): string {
    if (!text || typeof text !== 'string') return text;

    let sanitized = text;
    for (const pattern of this.SECRET_PATTERNS) {
      sanitized = sanitized.replace(pattern, (match, p1, p2) => {
        // If it's a key=value pattern
        if (p1 && p2) {
          return `${p1}="[REDACTED_SECRET]"`;
        }
        if (match.toLowerCase().startsWith('bearer ')) {
          return 'Bearer [REDACTED_SECRET]';
        }
        return '[REDACTED_SECRET]';
      });
    }

    return sanitized;
  }

  public static redactObject<T>(data: T): T {
    if (data === null || data === undefined) return data;

    if (typeof data === 'string') {
      return this.redactText(data) as unknown as T;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.redactObject(item)) as unknown as T;
    }

    if (typeof data === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        // Redact values under sensitive keys immediately
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('password') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('token') ||
          lowerKey.includes('api_key') ||
          lowerKey.includes('apikey') ||
          lowerKey.includes('credential') ||
          lowerKey.includes('auth')
        ) {
          if (typeof value === 'string' && value.length > 0) {
            result[key] = '[REDACTED_SECRET]';
            continue;
          }
        }
        result[key] = this.redactObject(value);
      }
      return result as unknown as T;
    }

    return data;
  }
}
