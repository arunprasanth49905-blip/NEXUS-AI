/**
 * NEXUS-AI Phase 6: Directory Inspector Tool
 * Safely lists files and subdirectories in an explicitly permitted workspace folder.
 */

import fs from 'fs';
import path from 'path';
import { BaseTool } from '../base.js';
import type { ToolExecutionContext, ToolInputSchema, ToolOutputSchema } from '../types.js';
import { FilesystemSandbox } from '../sandbox.js';

export class DirectoryInspectorTool extends BaseTool {
  public readonly tool_id = 'directory-inspector';
  public readonly name = 'Directory Inspector';
  public readonly description = 'Lists files and folders within a permitted workspace directory without path traversal.';
  public readonly version = '1.0.0';
  public readonly category = 'FILE';
  public readonly capabilities = ['directory.read', 'file.list'];
  public readonly risk_level = 'READ_ONLY';

  public readonly input_schema: ToolInputSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Directory path to list.', required: true },
      recursive: { type: 'boolean', description: 'Whether to list recursively (limited depth: 2).' },
    },
    required: ['path'],
  };

  public readonly output_schema: ToolOutputSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Resolved directory path.' },
      entries: { type: 'array', description: 'List of files and directories.' },
      total_count: { type: 'number', description: 'Total entries found.' },
    },
  };

  public async execute(context: ToolExecutionContext): Promise<Record<string, unknown>> {
    const rawPath = String(context.request.input.path || '.');
    const validation = FilesystemSandbox.validatePath(rawPath);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const resolved = validation.resolvedPath;
    if (!fs.existsSync(resolved)) {
      throw new Error(`Directory '${rawPath}' does not exist.`);
    }

    const stats = fs.statSync(resolved);
    if (!stats.isDirectory()) {
      throw new Error(`Path '${rawPath}' is not a directory.`);
    }

    const items = fs.readdirSync(resolved, { withFileTypes: true });
    const entries = items.map((item) => {
      const itemPath = path.join(resolved, item.name);
      let size = 0;
      try {
        if (!item.isDirectory()) {
          size = fs.statSync(itemPath).size;
        }
      } catch {
        // ignore unreadable stats
      }
      return {
        name: item.name,
        type: item.isDirectory() ? 'directory' : 'file',
        size_bytes: size,
      };
    });

    return {
      path: resolved,
      entries,
      total_count: entries.length,
    };
  }
}
