/**
 * NEXUS-AI Phase 6: Document Reader Tool
 * Safely reads documents using Phase 3 document perception and extractors.
 */

import fs from 'fs';
import { BaseTool } from '../base.js';
import type { ToolExecutionContext, ToolInputSchema, ToolOutputSchema } from '../types.js';
import { FilesystemSandbox } from '../sandbox.js';
import { DocumentExtractor } from '../../perception/extractor.js';

export class DocumentReaderTool extends BaseTool {
  public readonly tool_id = 'document-reader';
  public readonly name = 'Document Reader';
  public readonly description = 'Reads supported user-provided documents (PDF, CSV, TXT, MD) using Phase 3 document extractors.';
  public readonly version = '1.0.0';
  public readonly category = 'DOCUMENT';
  public readonly capabilities = ['document.read', 'document.parse'];
  public readonly risk_level = 'READ_ONLY';

  public readonly input_schema: ToolInputSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the document file.', required: true },
    },
    required: ['path'],
  };

  public readonly output_schema: ToolOutputSchema = {
    type: 'object',
    properties: {
      filename: { type: 'string', description: 'Document filename.' },
      content: { type: 'string', description: 'Extracted text content.' },
      word_count: { type: 'number', description: 'Word count of extracted document.' },
      metadata: { type: 'object', description: 'Document metadata.' },
    },
  };

  public async execute(context: ToolExecutionContext): Promise<Record<string, unknown>> {
    const rawPath = String(context.request.input.path || '');
    const validation = FilesystemSandbox.validatePath(rawPath);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const resolved = validation.resolvedPath;
    if (!fs.existsSync(resolved)) {
      throw new Error(`Document '${rawPath}' does not exist.`);
    }

    const sizeCheck = FilesystemSandbox.validateFileSize(resolved);
    if (!sizeCheck.valid) {
      throw new Error(`File validation error: ${sizeCheck.reason}`);
    }

    const filename = resolved.split(/[/\\]/).pop() || 'document';
    const result = await DocumentExtractor.extract(resolved, filename);

    return {
      filename,
      path: resolved,
      content: result.text,
      word_count: result.extractedInfo.wordCount || result.text.split(/\s+/).filter(Boolean).length,
      headings: result.extractedInfo.headings || [],
      metadata: {
        text_snippet: result.extractedInfo.textSnippet,
        word_count: result.extractedInfo.wordCount,
      },
    };
  }
}
