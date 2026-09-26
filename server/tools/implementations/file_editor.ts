/**
 * NEXUS-AI Phase 6: File Editor Tool
 * Safely modifies existing files in the permitted workspace boundary.
 */

import fs from 'fs';
import { BaseTool } from '../base.js';
import type { ToolExecutionContext, ToolInputSchema, ToolOutputSchema } from '../types.js';
import { FilesystemSandbox } from '../sandbox.js';

export class FileEditorTool extends BaseTool {
  public readonly tool_id = 'file-editor';
  public readonly name = 'File Editor';
  public readonly description = 'Modifies a user-selected file with replacement content or append operations.';
  public readonly version = '1.0.0';
  public readonly category = 'FILE';
  public readonly capabilities = ['file.modify'];
  public readonly risk_level = 'HIGH_RISK';

  // High risk requires human approval
  public approval_required = true;

  public readonly input_schema: ToolInputSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to modify.', required: true },
      content: { type: 'string', description: 'New full content or text chunk.', required: true },
      mode: { type: 'string', description: 'Operation mode: "overwrite" or "append".', enum: ['overwrite', 'append'] },
    },
    required: ['path', 'content'],
  };

  public readonly output_schema: ToolOutputSchema = {
    type: 'object',
    properties: {
      modified_path: { type: 'string', description: 'Path to modified file.' },
      original_size_bytes: { type: 'number', description: 'Size before edit.' },
      new_size_bytes: { type: 'number', description: 'Size after edit.' },
      status: { type: 'string', description: 'Modification status summary.' },
    },
  };

  public async execute(context: ToolExecutionContext): Promise<Record<string, unknown>> {
    const rawPath = String(context.request.input.path || '');
    const newContent = String(context.request.input.content ?? '');
    const mode = (context.request.input.mode as string) || 'overwrite';

    const validation = FilesystemSandbox.validatePath(rawPath);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const resolved = validation.resolvedPath;
    if (!fs.existsSync(resolved)) {
      throw new Error(`Cannot edit file '${rawPath}': file does not exist.`);
    }

    const statsBefore = fs.statSync(resolved);
    if (statsBefore.isDirectory()) {
      throw new Error(`Target '${rawPath}' is a directory, not a file.`);
    }

    if (mode === 'append') {
      fs.appendFileSync(resolved, newContent, 'utf-8');
    } else {
      fs.writeFileSync(resolved, newContent, 'utf-8');
    }

    const statsAfter = fs.statSync(resolved);

    return {
      modified_path: resolved,
      original_size_bytes: statsBefore.size,
      new_size_bytes: statsAfter.size,
      mode,
      status: 'File modified successfully.',
    };
  }
}
