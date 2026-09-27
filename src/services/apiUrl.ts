/**
 * NEXUS-AI Canonical API URL Normalization & Construction Engine
 * Phase 1 through Phase 7 Unified API Routing
 */

/**
 * Normalizes raw VITE_API_BASE_URL string.
 * Strips:
 * - Leading and trailing whitespace
 * - Surrounding quotes ("..." or '...')
 * - All trailing slashes (e.g. https://example.onrender.com/ -> https://example.onrender.com)
 * - Accidental trailing /api/v1 (e.g. https://example.onrender.com/api/v1 -> https://example.onrender.com)
 */
export function normalizeApiBaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  let cleaned = rawUrl.trim();

  // Strip accidental quotes
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Strip all trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');

  // Strip accidental trailing /api/v1 or /api/v1/ to prevent /api/v1/api/v1 duplication
  cleaned = cleaned.replace(/\/+api\/v1\/?$/i, '');

  return cleaned.replace(/\/+$/, '');
}

/**
 * Constructs the canonical endpoint URL:
 * `${API_BASE_URL}/api/v1/${endpoint}`
 *
 * Guarantees:
 * 1. Base URL has no trailing slashes.
 * 2. Exactly one /api/v1 segment is present.
 * 3. Never produces double slashes (e.g. onrender.com//api/v1).
 * 4. Never produces duplicated paths (e.g. /api/v1/api/v1).
 * 5. Safely handles endpoints starting with or without slashes or /api/v1.
 * 6. Correctly preserves query parameters (e.g. /memory?type=PROJECT).
 */
export function buildApiUrl(endpoint: string, base: string = ''): string {
  const cleanBase = normalizeApiBaseUrl(base);
  let cleanEndpoint = (endpoint || '').trim();

  // Strip leading slash
  if (cleanEndpoint.startsWith('/')) {
    cleanEndpoint = cleanEndpoint.slice(1);
  }

  // If endpoint already starts with api/v1/ or api/v1, strip it to prevent /api/v1/api/v1
  if (cleanEndpoint.toLowerCase().startsWith('api/v1/')) {
    cleanEndpoint = cleanEndpoint.slice('api/v1/'.length);
  } else if (cleanEndpoint.toLowerCase() === 'api/v1') {
    cleanEndpoint = '';
  }

  const path = cleanEndpoint ? `/api/v1/${cleanEndpoint}` : '/api/v1';

  // If cleanBase is empty (e.g. Vercel deployment where VITE_API_BASE_URL was omitted),
  // warn on non-localhost hosts in browser console so user knows why Vercel returns 404
  const win = typeof globalThis !== 'undefined' ? (globalThis as any).window : undefined;
  if (!cleanBase && win && win.location) {
    const isLocalhost =
      win.location.hostname === 'localhost' ||
      win.location.hostname === '127.0.0.1';
    if (!isLocalhost && !win.__nexusWarnedBaseUrl) {
      win.__nexusWarnedBaseUrl = true;
      console.warn(
        `[NEXUS API WARNING] VITE_API_BASE_URL is not configured at build time! ` +
        `API requests are defaulting to current origin (${win.location.origin}${path}) ` +
        `which returns 404 on Vercel static hosting. ` +
        `Please set VITE_API_BASE_URL=https://<your-render-service>.onrender.com in Vercel project settings and trigger a Redeploy.`
      );
    }
  }

  return cleanBase ? `${cleanBase}${path}` : path;
}
