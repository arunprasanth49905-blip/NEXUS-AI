import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PerceptionManager } from '../server/perception/manager.js';
import { PrivacyGuard } from '../server/perception/privacy.js';
import { DocumentExtractor } from '../server/perception/extractor.js';
import { RuntimeManager } from '../server/manager.js';

describe('Phase 3 Multimodal Perception - Status & Privacy Guard', () => {
  it('reports truthful perception status without fabricated OCR', () => {
    const pm = PerceptionManager.getInstance();
    const status = pm.getStatus();

    assert.strictEqual(status.modalities.text.available, true);
    assert.strictEqual(status.modalities.screen.available, true);
    assert.strictEqual(status.modalities.camera.available, true);
    assert.strictEqual(status.modalities.voice.available, true);
    assert.strictEqual(status.modalities.document.available, true);

    // OCR should be honestly reported as NOT_AVAILABLE unless native binary exists
    assert.strictEqual(status.providers.ocr.status, 'NOT_AVAILABLE');
    assert.strictEqual(status.providers.vision.available, true);
    assert.strictEqual(status.privacy_guard.enforce_zero_raw_retention, true);
  });

  it('rejects capture if not user initiated', () => {
    const pg = PrivacyGuard.getInstance();
    const result = pg.validateCapture({
      modality: 'camera',
      userInitiated: false,
      permissionGranted: true,
    });
    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason?.includes('user interaction'));
  });

  it('rejects file larger than 25MB limit', () => {
    const pg = PrivacyGuard.getInstance();
    const result = pg.validateDocumentFile('large.pdf', 30 * 1024 * 1024);
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason?.includes('exceeds maximum limit'));
  });

  it('rejects unsupported file extensions', () => {
    const pg = PrivacyGuard.getInstance();
    const result = pg.validateDocumentFile('dangerous.exe', 1024);
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason?.includes('Unsupported document format'));
  });
});

describe('Phase 3 Modality Adapters & Extraction', () => {
  it('processes text perception and extracts technical error markers', () => {
    const pm = PerceptionManager.getInstance();
    const ctx = pm.processText('TypeError: cannot read property of undefined in api.ts');

    assert.strictEqual(ctx.source, 'text');
    assert.strictEqual(ctx.modality, 'text');
    assert.strictEqual(ctx.content.text, 'TypeError: cannot read property of undefined in api.ts');
    assert.strictEqual(ctx.confidence, null); // Strictly null
    assert.ok(ctx.extracted_information.errorsDetected);
    assert.strictEqual(ctx.privacy.rawStorageRetained, false);
  });

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
    assert.strictEqual(ctx.extracted_information.visualMetadata?.format, 'PNG');
  });

  it('processes voice transcript without audio persistence', () => {
    const pm = PerceptionManager.getInstance();
    const ctx = pm.processVoice({
      transcript: 'Explain how the edge runtime operates with local privacy perimeter.',
      duration_seconds: 4,
    });

    assert.strictEqual(ctx.source, 'voice');
    assert.strictEqual(ctx.modality, 'audio');
    assert.strictEqual(ctx.content.text, 'Explain how the edge runtime operates with local privacy perimeter.');
    assert.strictEqual(ctx.confidence, null);
    assert.strictEqual(ctx.privacy.policy.rawAudioStorage, false);
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

describe('Phase 3 Multimodal Context Merging & Phase 2 Runtime Integration', () => {
  it('merges multiple modalities into a single unified context', () => {
    const pm = PerceptionManager.getInstance();
    const textCtx = pm.processText('Why is the application failing?');
    const voiceCtx = pm.processVoice({ transcript: 'Check the server logs on port 3000.' });

    const merged = pm.mergeContexts([textCtx.context_id, voiceCtx.context_id], 'Primary query: debug request');
    assert.strictEqual(merged.active_modalities.length, 2);
    assert.ok(merged.active_modalities.includes('text'));
    assert.ok(merged.active_modalities.includes('voice'));
    assert.ok(merged.merged_text_representation.includes('Primary query: debug request'));
    assert.ok(merged.merged_text_representation.includes('Why is the application failing?'));
  });

  it('passes unified multimodal context to Phase 2 Runtime Manager for inference', async () => {
    const pm = PerceptionManager.getInstance();
    const rm = new RuntimeManager();
    await rm.initialize();

    const textCtx = pm.processText('Hardware status audit');
    const voiceCtx = pm.processVoice({ transcript: 'Check CPU execution status' });

    const merged = pm.mergeContexts([textCtx.context_id, voiceCtx.context_id], 'Execute diagnostics audit');
    assert.ok(merged.merged_text_representation.length > 0);

    const inferenceResult = await rm.infer({
      input: merged.merged_text_representation,
      requestedProvider: 'auto',
    });

    assert.strictEqual(inferenceResult.success, true);
    assert.strictEqual(inferenceResult.provider, 'cpu');
    assert.ok(inferenceResult.latency_ms >= 0);
    assert.strictEqual(inferenceResult.result.intent, 'system_diagnostics');
  });
});
