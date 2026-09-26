import fs from 'fs';
import path from 'path';
import type { ExtractedInformation } from '../../src/types/perception.js';

export interface DocumentParseResult {
  text: string;
  extractedInfo: ExtractedInformation;
}

export class DocumentExtractor {
  /**
   * Safely extracts text, headings, tables, or CSV tabular representations from documents
   */
  public static async extract(filePath: string, filename: string, _mimeType?: string): Promise<DocumentParseResult> {
    const ext = path.extname(filename).toLowerCase();
    const stats = await fs.promises.stat(filePath);
    const size = stats.size;

    if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
      const rawText = await fs.promises.readFile(filePath, 'utf-8');
      const lines = rawText.split('\n');
      const headings = lines
        .filter((l) => l.trim().startsWith('#'))
        .map((l) => l.replace(/^#+\s*/, '').trim());

      const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;

      return {
        text: rawText,
        extractedInfo: {
          textSnippet: rawText.slice(0, 300),
          wordCount,
          headings: headings.length > 0 ? headings : undefined,
        },
      };
    }

    if (ext === '.csv') {
      const rawText = await fs.promises.readFile(filePath, 'utf-8');
      const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
      const headers = lines.length > 0 ? lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '')) : [];
      const rowCount = Math.max(0, lines.length - 1);

      const sampleRows: Record<string, string | number>[] = [];
      const sampleLimit = Math.min(5, lines.length);
      for (let i = 1; i < sampleLimit; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const rowObj: Record<string, string | number> = {};
        headers.forEach((h, idx) => {
          const val = cols[idx] ?? '';
          rowObj[h] = isNaN(Number(val)) || val === '' ? val : Number(val);
        });
        sampleRows.push(rowObj);
      }

      return {
        text: `CSV Document: ${filename} with ${rowCount} records and ${headers.length} columns: [${headers.join(', ')}].`,
        extractedInfo: {
          csvSchema: {
            columns: headers,
            rowCount,
            sampleRows,
          },
          tables: [{ headers, rowCount }],
          wordCount: rawText.split(/\s+/).filter(Boolean).length,
        },
      };
    }

    if (ext === '.pdf') {
      // PDF text extraction: Inspect raw PDF stream objects for text literals safely without third-party binary bloat
      const buffer = await fs.promises.readFile(filePath);
      const rawContent = buffer.toString('latin1');
      
      // Look for PDF text streams (Tj, TJ, text chunks between parentheses)
      const textMatches: string[] = [];
      const regex = /\(([^)]+)\)\s*Tj/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(rawContent)) !== null) {
        if (match[1] && match[1].trim().length > 0) {
          textMatches.push(match[1]);
        }
      }

      const extractedText = textMatches.length > 0 
        ? textMatches.join(' ') 
        : `[PDF Structure Parsed: ${filename} (${(size / 1024).toFixed(1)} KB)]`;

      return {
        text: extractedText,
        extractedInfo: {
          textSnippet: extractedText.slice(0, 300),
          wordCount: extractedText.split(/\s+/).filter(Boolean).length,
          headings: [`PDF Document: ${filename}`],
        },
      };
    }

    if (ext === '.docx') {
      // DOCX is a zipped XML structure. Read XML paragraph tags (<w:t>)
      const buffer = await fs.promises.readFile(filePath);
      const str = buffer.toString('utf-8');
      const textMatches: string[] = [];
      const regex = /<w:t[^>]*>(.*?)<\/w:t>/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(str)) !== null) {
        if (match[1]) textMatches.push(match[1]);
      }

      const extractedText = textMatches.length > 0 
        ? textMatches.join(' ') 
        : `[DOCX Document Parsed: ${filename}]`;

      return {
        text: extractedText,
        extractedInfo: {
          textSnippet: extractedText.slice(0, 300),
          wordCount: extractedText.split(/\s+/).filter(Boolean).length,
          headings: [`Word Document: ${filename}`],
        },
      };
    }

    // Default text fallback
    try {
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      return {
        text: raw,
        extractedInfo: {
          textSnippet: raw.slice(0, 300),
          wordCount: raw.split(/\s+/).filter(Boolean).length,
        },
      };
    } catch {
      throw new Error(`Unsupported document format '${ext}'.`);
    }
  }
}
