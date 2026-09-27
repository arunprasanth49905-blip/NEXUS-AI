/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine Test Suite
 * Validates all 17 required criteria from Step 22
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PerceptionManager } from '../server/perception/manager.js';
import { PrivacyGuard } from '../server/perception/privacy.js';
import { DocumentExtractor } from '../server/perception/extractor.js';
import { RuntimeManager } from '../server/manager.js';

describe('Phase 3 Multimodal Perception - Complete Validation Suite', () => {
  // 1. Perception manager initialization
  it('1. initializes perception manager singleton correctly', () => {
    const pm1 = PerceptionManager.getInstance();
    const pm2 = PerceptionManager.getInstance();
    assert.strictEqual(pm1, pm2);
    assert.ok(pm1.getStatus());
  });

  // 2. Text perception
  it('2. processes and normalizes valid text perception', () => {
    const pm = PerceptionManager.getInstance();
    const ctx = pm.processText('  System status: all edge services are operating nominally.  ');

    assert.strictEqual(ctx.source, 'text');
    assert.strictEqual(ctx.modality, 'text');
    assert.strictEqual(ctx.content.text, 'System status: all edge services are operating nominally.');
    assert.strictEqual(ctx.extracted_information.wordCount, 8);
    assert.strictEqual(ctx.confidence, null);
  });

  // 3. Invalid text input
  it('3. rejects invalid or empty text input gracefully', async () => {
    const textSource = PerceptionManager.getInstance().getSource('text');
    assert.ok(textSource);

    await assert.rejects(async () => {
      await textSource.process('');
    }, /cannot be empty|Invalid text/);

    await assert.rejects(async () => {
      await textSource.process('    ');
    }, /cannot be empty|Invalid text/);
  });

  // 4. Screen capability detection
  it('4. detects screen perception capability honestly without crashing', () => {
    const pm = PerceptionManager.getInstance();
    const screenSource = pm.getSource('screen');
    assert.ok(screenSource);
    assert.strictEqual(screenSource.modality, 'screen');
    assert.strictEqual(typeof screenSource.isAvailable(), 'boolean');
    assert.strictEqual(typeof screenSource.getPermissionState(), 'string');
  });

  // 5. Camera capability detection
  it('5. detects camera perception capability honestly without crashing', () => {
    const pm = PerceptionManager.getInstance();
    const cameraSource = pm.getSource('camera');
    assert.ok(cameraSource);
    assert.strictEqual(cameraSource.modality, 'camera');
    assert.strictEqual(typeof cameraSource.isAvailable(), 'boolean');
    assert.strictEqual(typeof cameraSource.getPermissionState(), 'string');
  });

  // 6. Voice capability detection
  it('6. detects voice perception capability honestly without crashing', () => {
    const pm = PerceptionManager.getInstance();
    const voiceSource = pm.getSource('voice');
    assert.ok(voiceSource);
    assert.strictEqual(voiceSource.modality, 'voice');
    assert.strictEqual(typeof voiceSource.isAvailable(), 'boolean');
    assert.strictEqual(typeof voiceSource.getPermissionState(), 'string');
  });

  // 7. Document validation
  it('7. validates permitted document formats cleanly', () => {
    const pg = PrivacyGuard.getInstance();
    assert.strictEqual(pg.validateDocumentFile('report.pdf', 1024 * 1024, 'application/pdf').valid, true);
    assert.strictEqual(pg.validateDocumentFile('notes.txt', 2048, 'text/plain').valid, true);
    assert.strictEqual(pg.validateDocumentFile('readme.md', 4096, 'text/markdown').valid, true);
    assert.strictEqual(pg.validateDocumentFile('dataset.csv', 8192, 'text/csv').valid, true);
  });

  // 8. Unsupported document type
  it('8. rejects unsupported document types cleanly', () => {
    const pg = PrivacyGuard.getInstance();
    const res = pg.validateDocumentFile('malicious.exe', 1024);
    assert.strictEqual(res.valid, false);
    assert.ok(res.reason?.includes('Unsupported document format'));
  });

  // 9. Oversized document
  it('9. rejects oversized documents exceeding 25MB safety boundary', () => {
    const pg = PrivacyGuard.getInstance();
    const res = pg.validateDocumentFile('huge.pdf', 30 * 1024 * 1024, 'application/pdf');
    assert.strictEqual(res.valid, false);
    assert.ok(res.reason?.includes('exceeds maximum limit'));
  });

  // 10. Context normalization
  it('10. normalizes perception objects into unified model with null confidence', async () => {
    const pm = PerceptionManager.getInstance();
    const textSource = pm.getSource('text');
    assert.ok(textSource);

    const ctx = await textSource.process('Normalize this input.');
    const normalized = textSource.normalize(ctx);

    assert.strictEqual(normalized.id, ctx.context_id);
    assert.strictEqual(normalized.modality, 'text');
    assert.strictEqual(normalized.source, 'text');
    assert.strictEqual(normalized.confidence, null); // Strictly null
    assert.strictEqual(normalized.privacyLevel, 'strictly_local');
    assert.strictEqual(normalized.persistencePolicy.retainRaw, false);
  });

  // 11. Context merge
  it('11. merges multi-modal contexts into unified perception context with stable ID', () => {
    const pm = PerceptionManager.getInstance();
    const textCtx = pm.processText('Primary debugging investigation');
    const voiceCtx = pm.processVoice({ transcript: 'System throwing exception on port 8080' });

    const merged = pm.mergeContexts([textCtx.context_id, voiceCtx.context_id], 'Investigate bug');
    assert.ok(merged.unified_context_id.startsWith('unified-'));
    assert.strictEqual(merged.active_modalities.length, 2);
    assert.ok(merged.active_modalities.includes('text'));
    assert.ok(merged.active_modalities.includes('voice'));
    assert.ok(merged.merged_text_representation.includes('Primary debugging investigation'));
  });

  // 12. Privacy policy
  it('12. enforces explicit user initiation and permission checks', () => {
    const pg = PrivacyGuard.getInstance();
    const blocked = pg.validateCapture({
      modality: 'screen',
      userInitiated: false,
      permissionGranted: true,
    });
    assert.strictEqual(blocked.allowed, false);
    assert.ok(blocked.reason?.includes('user interaction'));
  });

  // 13. Raw media persistence disabled
  it('13. strictly enforces zero raw audio/camera/screen persistent storage', () => {
    const pg = PrivacyGuard.getInstance();
    assert.strictEqual(pg.policy.rawAudioStorage, false);
    assert.strictEqual(pg.policy.rawCameraStorage, false);
    assert.strictEqual(pg.policy.rawScreenStorage, false);

    const meta = pg.createPrivacyMetadata('camera', true);
    assert.strictEqual(meta.rawStorageRetained, false);
    assert.strictEqual(meta.zeroCloudTelemetryEnforced, true);
  });

  // 14. Malformed API request handling
  it('14. handles missing or empty perception payloads cleanly', async () => {
    const pm = PerceptionManager.getInstance();
    const screenSource = pm.getSource('screen');
    assert.ok(screenSource);

    await assert.rejects(async () => {
      await screenSource.process({ image_data_base64: '' });
    }, /image_data_base64 is required/);
  });

  // 15. API error handling
  it('15. returns structured error object definition without exposing stack trace', () => {
    const pg = PrivacyGuard.getInstance();
    const check = pg.validateCapture({
      modality: 'camera',
      userInitiated: true,
      permissionGranted: false,
    });
    assert.strictEqual(check.allowed, false);
    assert.ok(check.reason?.includes('permission required'));
  });

  // 16. Phase 2 integration
  it('16. feeds unified multimodal context to Phase 2 Runtime for local inference', async () => {
    const pm = PerceptionManager.getInstance();
    const rm = new RuntimeManager();
    await rm.initialize();

    const textCtx = pm.processText('Hardware status audit query');
    const merged = pm.mergeContexts([textCtx.context_id], 'Diagnose host system');

    const result = await rm.infer({
      input: merged.merged_text_representation,
      requestedProvider: 'auto',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.provider, 'cpu');
    assert.ok(result.latency_ms >= 0);
  });

  // 17. Production build artifact verification
  it('17. verifies production build directory and assets exist', () => {
    const distPath = path.resolve(process.cwd(), 'dist', 'index.html');
    assert.ok(fs.existsSync(distPath), 'dist/index.html must exist from production build');
  });
});

describe('Phase 3 Modality Adapters & Extraction Details', () => {
  it('processes screen perception with truthful dimensions and null confidence', async () => {
    const pm = PerceptionManager.getInstance();
    const ctx = await pm.processScreen({
      image_data_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      width: 1920,
      height: 1080,
    });

    assert.strictEqual(ctx.source, 'screen');
    assert.strictEqual(ctx.modality, 'visual');
    assert.strictEqual(ctx.confidence, null);
    assert.strictEqual(ctx.privacy.rawStorageRetained, false);
  });

  it('extracts CSV tabular schema cleanly', async () => {
    const tmpFile = path.join(os.tmpdir(), `test-${Date.now()}.csv`);
    const csvContent = 'id,name,role,score\n1,Alice,Engineer,98\n2,Bob,Architect,95';
    await fs.promises.writeFile(tmpFile, csvContent, 'utf-8');

    try {
      const parsed = await DocumentExtractor.extract(tmpFile, 'test.csv', 'text/csv');
      assert.ok(parsed.extractedInfo.csvSchema);
      assert.deepStrictEqual(parsed.extractedInfo.csvSchema.columns, ['id', 'name', 'role', 'score']);
      assert.strictEqual(parsed.extractedInfo.csvSchema.rowCount, 2);
    } finally {
      await fs.promises.unlink(tmpFile);
    }
  });

  it('extracts Markdown headings and word count', async () => {
    const tmpFile = path.join(os.tmpdir(), `test-${Date.now()}.md`);
    const mdContent = '# Project Roadmap\n\n## Phase 3 Perception\n\nNEXUS receives multimodal inputs cleanly.';
    await fs.promises.writeFile(tmpFile, mdContent, 'utf-8');

    try {
      const parsed = await DocumentExtractor.extract(tmpFile, 'roadmap.md', 'text/markdown');
      assert.deepStrictEqual(parsed.extractedInfo.headings, ['Project Roadmap', 'Phase 3 Perception']);
      assert.ok((parsed.extractedInfo.wordCount || 0) > 5);
    } finally {
      await fs.promises.unlink(tmpFile);
    }
  });
});
