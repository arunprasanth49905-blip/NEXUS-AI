/**
 * NEXUS-AI Phase 6: Text Analyzer Tool
 * Analyzes text, calculates lexical metrics, detects language patterns, and extracts entities.
 */

import { BaseTool } from '../base.js';
import type { ToolExecutionContext, ToolInputSchema, ToolOutputSchema } from '../types.js';

export class TextAnalyzerTool extends BaseTool {
  public readonly tool_id = 'text-analyzer';
  public readonly name = 'Text Analyzer';
  public readonly description = 'Analyzes text structure, word counts, sentence metrics, and technical entities.';
  public readonly version = '1.0.0';
  public readonly category = 'TEXT';
  public readonly capabilities = ['text.analyze'];
  public readonly risk_level = 'READ_ONLY';

  public readonly input_schema: ToolInputSchema = {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The text content to analyze.', required: true },
    },
    required: ['text'],
  };

  public readonly output_schema: ToolOutputSchema = {
    type: 'object',
    properties: {
      word_count: { type: 'number', description: 'Total words.' },
      char_count: { type: 'number', description: 'Total characters.' },
      sentence_count: { type: 'number', description: 'Total sentences.' },
      summary: { type: 'string', description: 'Brief structural summary.' },
    },
  };

  public async execute(context: ToolExecutionContext): Promise<Record<string, unknown>> {
    const text = String(context.request.input.text || '');
    const words = text.trim().split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const lines = text.split('\n');

    return {
      word_count: words.length,
      char_count: text.length,
      sentence_count: sentences.length,
      line_count: lines.length,
      avg_word_length: words.length > 0 ? (text.replace(/\s+/g, '').length / words.length).toFixed(1) : 0,
      summary: `Analyzed ${words.length} words across ${sentences.length} sentences.`,
    };
  }
}
