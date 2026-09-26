/**
 * NEXUS-AI Phase 6: File Creator Tool
 * Creates new files safely inside permitted workspace boundaries.
 */

import fs from 'fs';
import path from 'path';
import { BaseTool } from '../base.js';
import type { ToolExecutionContext, ToolInputSchema, ToolOutputSchema } from '../types.js';
import { FilesystemSandbox } from '../sandbox.js';

export class FileCreatorTool extends BaseTool {
  public readonly tool_id = 'file-creator';
  public readonly name = 'File Creator';
  public readonly description = 'Creates a new file inside an explicitly permitted workspace boundary.';
  public readonly version = '1.0.0';
  public readonly category = 'FILE';
  public readonly capabilities = ['file.create'];
  public readonly risk_level = 'LOW_RISK';

  // Requires approval by default unless safe auto-execute is enabled
  public approval_required = true;

  public readonly input_schema: ToolInputSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative or absolute file path to create.', required: true },
      content: { type: 'string', description: 'Text content to write into the new file.', required: true },
      overwrite: { type: 'boolean', description: 'Whether to overwrite if file already exists (default: false).' },
    },
    required: ['path', 'content'],
  };

  public readonly output_schema: ToolOutputSchema = {
    type: 'object',
    properties: {
      created_path: { type: 'string', description: 'Absolute path of created file.' },
      bytes_written: { type: 'number', description: 'Number of bytes written.' },
      status: { type: 'string', description: 'Creation status summary.' },
    },
  };

  public async execute(context: ToolExecutionContext): Promise<Record<string, unknown>> {
    const rawPath = String(context.request.input.path || '');
    const content = String(context.request.input.content ?? '');
    const overwrite = Boolean(context.request.input.overwrite);

    const validation = FilesystemSandbox.validatePath(rawPath);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const resolved = validation.resolvedPath;

    if (fs.existsSync(resolved) && !overwrite) {
      throw new Error(`File '${rawPath}' already exists. Set overwrite to true to replace it.`);
    }

    // Ensure parent directory exists safely within sandbox
    const parentDir = path.dirname(resolved);
    const parentValidation = FilesystemSandbox.validatePath(parentDir);
    if (!parentValidation.allowed) {
      throw new Error(`Access denied: parent directory violates sandbox: ${parentValidation.reason}`);
    }

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(resolved, content, 'utf-8');
    const bytesWritten = Buffer.byteLength(content, 'utf-8');

    return {
      created_path: resolved,
      bytes_written: bytesWritten,
      status: 'File created successfully.',
    };
  }
}
