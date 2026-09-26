/**
 * NEXUS-AI Phase 6: Text Exporter Tool
 * Exports synthesized content to a user-selected destination file.
 */

import fs from 'fs';
import path from 'path';
import { BaseTool } from '../base.js';
import type { ToolExecutionContext, ToolInputSchema, ToolOutputSchema } from '../types.js';
import { FilesystemSandbox } from '../sandbox.js';

export class TextExporterTool extends BaseTool {
  public readonly tool_id = 'text-exporter';
  public readonly name = 'Text Exporter';
  public readonly description = 'Exports generated reports, outlines, or summaries to a destination file in the workspace.';
  public readonly version = '1.0.0';
  public readonly category = 'PRODUCTIVITY';
  public readonly capabilities = ['text.export', 'file.export'];
  public readonly risk_level = 'LOW_RISK';

  // Requires approval when writing to disk
  public approval_required = true;

  public readonly input_schema: ToolInputSchema = {
    type: 'object',
    properties: {
      destination_path: { type: 'string', description: 'Destination file path.', required: true },
      text: { type: 'string', description: 'Content to export.', required: true },
      format: { type: 'string', description: 'File format (txt, md, json).', enum: ['txt', 'md', 'json'] },
    },
    required: ['destination_path', 'text'],
  };

  public readonly output_schema: ToolOutputSchema = {
    type: 'object',
    properties: {
      destination_path: { type: 'string', description: 'Resolved destination path.' },
      bytes_exported: { type: 'number', description: 'Bytes written.' },
      status: { type: 'string', description: 'Export status.' },
    },
  };

  public async execute(context: ToolExecutionContext): Promise<Record<string, unknown>> {
    const rawPath = String(context.request.input.destination_path || '');
    const text = String(context.request.input.text ?? '');

    const validation = FilesystemSandbox.validatePath(rawPath);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const resolved = validation.resolvedPath;
    const parentDir = path.dirname(resolved);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(resolved, text, 'utf-8');

    return {
      destination_path: resolved,
      created_path: resolved, // for action verification
      bytes_exported: Buffer.byteLength(text, 'utf-8'),
      status: 'Content exported successfully.',
    };
  }
}
