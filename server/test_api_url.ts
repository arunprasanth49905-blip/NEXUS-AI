/**
 * Unit Tests for Frontend URL Construction and API Base URL Normalization
 * Verifies Task 1 to Task 9 requirements:
 * - Trailing slash handling (https://example.onrender.com/)
 * - Accidental quotes handling ("https://example.onrender.com")
 * - Accidental /api/v1 in base handling (https://example.onrender.com/api/v1)
 * - Preventing /api/v1/api/v1 duplication
 * - Relative vs absolute URL construction
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeApiBaseUrl, buildApiUrl } from '../src/services/apiUrl.js';

describe('Vite API Base URL Normalization (normalizeApiBaseUrl)', () => {
  it('normalizes standard Render service base URL', () => {
    assert.strictEqual(
      normalizeApiBaseUrl('https://nexus-ai.onrender.com'),
      'https://nexus-ai.onrender.com'
    );
  });

  it('safely handles trailing slashes without producing double slashes', () => {
    assert.strictEqual(
      normalizeApiBaseUrl('https://nexus-ai.onrender.com/'),
      'https://nexus-ai.onrender.com'
    );
    assert.strictEqual(
      normalizeApiBaseUrl('https://nexus-ai.onrender.com///'),
      'https://nexus-ai.onrender.com'
    );
  });

  it('safely strips accidental surrounding double and single quotes', () => {
    assert.strictEqual(
      normalizeApiBaseUrl('"https://nexus-ai.onrender.com"'),
      'https://nexus-ai.onrender.com'
    );
    assert.strictEqual(
      normalizeApiBaseUrl("'https://nexus-ai.onrender.com/'"),
      'https://nexus-ai.onrender.com'
    );
  });

  it('strips accidental /api/v1 in base URL to avoid /api/v1/api/v1 duplication', () => {
    assert.strictEqual(
      normalizeApiBaseUrl('https://nexus-ai.onrender.com/api/v1'),
      'https://nexus-ai.onrender.com'
    );
    assert.strictEqual(
      normalizeApiBaseUrl('https://nexus-ai.onrender.com/api/v1/'),
      'https://nexus-ai.onrender.com'
    );
  });

  it('handles leading and trailing whitespace', () => {
    assert.strictEqual(
      normalizeApiBaseUrl('   https://nexus-ai.onrender.com/   '),
      'https://nexus-ai.onrender.com'
    );
  });

  it('handles empty and undefined inputs safely', () => {
    assert.strictEqual(normalizeApiBaseUrl(''), '');
    assert.strictEqual(normalizeApiBaseUrl(undefined), '');
  });
});

describe('API URL Construction (buildApiUrl)', () => {
  const RENDER_BASE = 'https://nexus-ai.onrender.com';

  it('constructs /api/v1/health from /health', () => {
    assert.strictEqual(
      buildApiUrl('/health', RENDER_BASE),
      'https://nexus-ai.onrender.com/api/v1/health'
    );
  });

  it('constructs /api/v1/health when endpoint has no leading slash', () => {
    assert.strictEqual(
      buildApiUrl('health', RENDER_BASE),
      'https://nexus-ai.onrender.com/api/v1/health'
    );
  });

  it('handles trailing slash on base without producing double slashes', () => {
    assert.strictEqual(
      buildApiUrl('/health', 'https://nexus-ai.onrender.com/'),
      'https://nexus-ai.onrender.com/api/v1/health'
    );
  });

  it('constructs /api/v1/context from /context', () => {
    assert.strictEqual(
      buildApiUrl('/context', RENDER_BASE),
      'https://nexus-ai.onrender.com/api/v1/context'
    );
  });

  it('constructs /api/v1/assistant/query from /assistant/query', () => {
    assert.strictEqual(
      buildApiUrl('/assistant/query', RENDER_BASE),
      'https://nexus-ai.onrender.com/api/v1/assistant/query'
    );
  });

  it('NEVER creates /api/v1/api/v1 when endpoint already contains /api/v1', () => {
    assert.strictEqual(
      buildApiUrl('/api/v1/health', RENDER_BASE),
      'https://nexus-ai.onrender.com/api/v1/health'
    );
    assert.strictEqual(
      buildApiUrl('/api/v1/assistant/query', RENDER_BASE),
      'https://nexus-ai.onrender.com/api/v1/assistant/query'
    );
  });

  it('NEVER creates /api/v1/api/v1 when base already contains /api/v1', () => {
    assert.strictEqual(
      buildApiUrl('/health', 'https://nexus-ai.onrender.com/api/v1'),
      'https://nexus-ai.onrender.com/api/v1/health'
    );
    assert.strictEqual(
      buildApiUrl('/assistant/query', 'https://nexus-ai.onrender.com/api/v1/'),
      'https://nexus-ai.onrender.com/api/v1/assistant/query'
    );
  });

  it('preserves query parameters correctly', () => {
    assert.strictEqual(
      buildApiUrl('/memory?type=PROJECT', RENDER_BASE),
      'https://nexus-ai.onrender.com/api/v1/memory?type=PROJECT'
    );
    assert.strictEqual(
      buildApiUrl('/preferences?scope=global&enabled=true', RENDER_BASE),
      'https://nexus-ai.onrender.com/api/v1/preferences?scope=global&enabled=true'
    );
    assert.strictEqual(
      buildApiUrl('/actions?limit=50', RENDER_BASE),
      'https://nexus-ai.onrender.com/api/v1/actions?limit=50'
    );
  });

  it('falls back to relative path /api/v1/... when base is empty (same-origin local dev)', () => {
    assert.strictEqual(buildApiUrl('/health', ''), '/api/v1/health');
    assert.strictEqual(buildApiUrl('/context', ''), '/api/v1/context');
    assert.strictEqual(buildApiUrl('/assistant/query', ''), '/api/v1/assistant/query');
  });

  it('buildApiUrl("") returns the base API prefix', () => {
    assert.strictEqual(buildApiUrl('', RENDER_BASE), 'https://nexus-ai.onrender.com/api/v1');
    assert.strictEqual(buildApiUrl('', ''), '/api/v1');
  });
});
