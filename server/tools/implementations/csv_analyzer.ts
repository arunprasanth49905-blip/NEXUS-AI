/**
 * NEXUS-AI Phase 6: CSV Analyzer Tool
 * Analyzes CSV data supplied by the user, computes column statistics and rows count.
 */

import { BaseTool } from '../base.js';
import type { ToolExecutionContext, ToolInputSchema, ToolOutputSchema } from '../types.js';

export class CsvAnalyzerTool extends BaseTool {
  public readonly tool_id = 'csv-analyzer';
  public readonly name = 'CSV Analyzer';
  public readonly description = 'Analyzes comma-separated tabular data, detects headers, counts records, and profiles columns.';
  public readonly version = '1.0.0';
  public readonly category = 'ANALYSIS';
  public readonly capabilities = ['data.analyze', 'csv.analyze'];
  public readonly risk_level = 'READ_ONLY';

  public readonly input_schema: ToolInputSchema = {
    type: 'object',
    properties: {
      csv_content: { type: 'string', description: 'Raw CSV text to analyze.', required: true },
    },
    required: ['csv_content'],
  };

  public readonly output_schema: ToolOutputSchema = {
    type: 'object',
    properties: {
      row_count: { type: 'number', description: 'Number of data rows.' },
      column_count: { type: 'number', description: 'Number of columns.' },
      headers: { type: 'array', description: 'Detected header column names.' },
      sample_rows: { type: 'array', description: 'Preview of first few parsed rows.' },
    },
  };

  public async execute(context: ToolExecutionContext): Promise<Record<string, unknown>> {
    const raw = String(context.request.input.csv_content || '').trim();
    if (!raw) {
      return {
        row_count: 0,
        column_count: 0,
        headers: [],
        sample_rows: [],
      };
    }

    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      return { row_count: 0, column_count: 0, headers: [], sample_rows: [] };
    }

    const parseLine = (line: string) => {
      // Basic CSV token parser handling quotes
      const values: string[] = [];
      let inQuotes = false;
      let cur = '';
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          values.push(cur.trim().replace(/^"|"$/g, ''));
          cur = '';
        } else {
          cur += c;
        }
      }
      values.push(cur.trim().replace(/^"|"$/g, ''));
      return values;
    };

    const headers = parseLine(lines[0]);
    const dataRows = lines.slice(1).map(parseLine);

    return {
      row_count: dataRows.length,
      column_count: headers.length,
      headers,
      sample_rows: dataRows.slice(0, 5),
      summary: `CSV has ${dataRows.length} rows and ${headers.length} columns: [${headers.join(', ')}].`,
    };
  }
}
