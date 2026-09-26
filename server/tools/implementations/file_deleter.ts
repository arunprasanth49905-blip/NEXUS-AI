/**
 * NEXUS-AI Phase 6: File Deleter Tool
 * Destructive tool for deleting user-selected files within permitted boundaries.
 */

import fs from 'fs';
import { BaseTool } from '../base.js';
import type { ToolExecutionContext, ToolInputSchema, ToolOutputSchema } from '../types.js';
import { FilesystemSandbox } from '../sandbox.js';

export class FileDeleterTool extends BaseTool {
  public readonly tool_id = 'file-deleter';
  public readonly name = 'File Deleter';
  public readonly description = 'Deletes an explicitly selected file in the workspace. Strictly requires human approval.';
  public readonly version = '1.0.0';
  public readonly category = 'FILE';
  public readonly capabilities = ['file.delete'];
  public readonly risk_level = 'DESTRUCTIVE';

  // Strictly always requires approval
  public approval_required = true;

  public readonly input_schema: ToolInputSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file to delete.', required: true },
    },
    required: ['path'],
  };

  public readonly output_schema: ToolOutputSchema = {
    type: 'object',
    properties: {
      deleted_path: { type: 'string', description: 'Deleted file path.' },
      status: { type: 'string', description: 'Deletion status summary.' },
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
      throw new Error(`Cannot delete file '${rawPath}': file does not exist.`);
    }

    const stats = fs.statSync(resolved);
    if (stats.isDirectory()) {
      throw new Error(`Path '${rawPath}' is a directory. File Deleter only deletes single files.`);
    }

    fs.unlinkSync(resolved);

    return {
      deleted_path: resolved,
      status: 'File deleted successfully.',
    };
  }
}
