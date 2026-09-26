/**
 * NEXUS-AI Phase 6: File Inspector Tool
 * Safely inspects file metadata and contents within the permitted workspace boundary.
 */

import fs from 'fs';
import { BaseTool } from '../base.js';
import type { ToolExecutionContext, ToolInputSchema, ToolOutputSchema } from '../types.js';
import { FilesystemSandbox } from '../sandbox.js';

export class FileInspectorTool extends BaseTool {
  public readonly tool_id = 'file-inspector';
  public readonly name = 'File Inspector';
  public readonly description = 'Inspects file metadata, encoding, size, and reads text contents safely within workspace bounds.';
  public readonly version = '1.0.0';
  public readonly category = 'FILE';
  public readonly capabilities = ['file.read'];
  public readonly risk_level = 'READ_ONLY';

  public readonly input_schema: ToolInputSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative or absolute file path to inspect.', required: true },
      max_bytes: { type: 'number', description: 'Maximum bytes to read (default: 50000).' },
    },
    required: ['path'],
  };

  public readonly output_schema: ToolOutputSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Resolved file path.' },
      size_bytes: { type: 'number', description: 'File size in bytes.' },
      content: { type: 'string', description: 'File content preview or full text.' },
      is_truncated: { type: 'boolean', description: 'Whether content was truncated.' },
    },
  };

  public async execute(context: ToolExecutionContext): Promise<Record<string, unknown>> {
    const rawPath = String(context.request.input.path || '');
    const maxBytes = typeof context.request.input.max_bytes === 'number' ? context.request.input.max_bytes : 50000;

    const validation = FilesystemSandbox.validatePath(rawPath);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const resolved = validation.resolvedPath;
    if (!fs.existsSync(resolved)) {
      throw new Error(`File '${rawPath}' does not exist.`);
    }

    const stats = fs.statSync(resolved);
    if (stats.isDirectory()) {
      throw new Error(`Path '${rawPath}' is a directory. Use directory-inspector instead.`);
    }

    const sizeCheck = FilesystemSandbox.validateFileSize(resolved);
    if (!sizeCheck.valid) {
      throw new Error(sizeCheck.reason || 'File size exceeds maximum allowed limit.');
    }

    const buffer = fs.readFileSync(resolved);
    const isTruncated = buffer.length > maxBytes;
    const content = buffer.subarray(0, maxBytes).toString('utf-8');

    return {
      path: resolved,
      size_bytes: stats.size,
      modified_at: stats.mtime.toISOString(),
      created_at: stats.birthtime.toISOString(),
      content,
      is_truncated: isTruncated,
    };
  }
}
