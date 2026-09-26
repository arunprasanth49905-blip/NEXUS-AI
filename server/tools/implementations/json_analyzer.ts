/**
 * NEXUS-AI Phase 6: JSON Analyzer Tool
 * Analyzes JSON data structure, keys, depth, and schema properties.
 */

import { BaseTool } from '../base.js';
import type { ToolExecutionContext, ToolInputSchema, ToolOutputSchema } from '../types.js';

export class JsonAnalyzerTool extends BaseTool {
  public readonly tool_id = 'json-analyzer';
  public readonly name = 'JSON Analyzer';
  public readonly description = 'Validates and analyzes JSON data structures, schema keys, item counts, and nest depth.';
  public readonly version = '1.0.0';
  public readonly category = 'ANALYSIS';
  public readonly capabilities = ['data.analyze', 'json.analyze'];
  public readonly risk_level = 'READ_ONLY';

  public readonly input_schema: ToolInputSchema = {
    type: 'object',
    properties: {
      json_string: { type: 'string', description: 'Raw JSON string to parse and analyze.', required: true },
    },
    required: ['json_string'],
  };

  public readonly output_schema: ToolOutputSchema = {
    type: 'object',
    properties: {
      is_valid: { type: 'boolean', description: 'Whether the JSON is valid.' },
      data_type: { type: 'string', description: '"array" or "object".' },
      key_count: { type: 'number', description: 'Number of top-level keys or elements.' },
      keys: { type: 'array', description: 'Top-level key names.' },
      max_depth: { type: 'number', description: 'Maximum nesting depth.' },
    },
  };

  private calculateDepth(obj: unknown, currentDepth: number = 1): number {
    if (!obj || typeof obj !== 'object') return currentDepth;
    let max = currentDepth;
    for (const val of Object.values(obj)) {
      if (typeof val === 'object' && val !== null) {
        const d = this.calculateDepth(val, currentDepth + 1);
        if (d > max) max = d;
      }
    }
    return max;
  }

  public async execute(context: ToolExecutionContext): Promise<Record<string, unknown>> {
    const raw = String(context.request.input.json_string || '');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        is_valid: false,
        error: `Invalid JSON: ${msg}`,
      };
    }

    const isArray = Array.isArray(parsed);
    const isObject = typeof parsed === 'object' && parsed !== null && !isArray;
    const keys = isObject ? Object.keys(parsed as Record<string, unknown>) : [];
    const count = isArray ? (parsed as unknown[]).length : keys.length;
    const depth = this.calculateDepth(parsed);

    return {
      is_valid: true,
      data_type: isArray ? 'array' : isObject ? 'object' : typeof parsed,
      key_count: count,
      keys: keys.slice(0, 50),
      max_depth: depth,
      summary: `Valid JSON containing ${count} ${isArray ? 'elements' : 'keys'} with max depth ${depth}.`,
    };
  }
}
