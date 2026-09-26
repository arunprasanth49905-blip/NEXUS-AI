/**
 * NEXUS-AI Phase 6: Default Tools Registration Factory
 */

import type { ToolRegistry } from '../registry.js';
import { TextAnalyzerTool } from './text_analyzer.js';
import { DocumentReaderTool } from './document_reader.js';
import { FileInspectorTool } from './file_inspector.js';
import { DirectoryInspectorTool } from './directory_inspector.js';
import { FileCreatorTool } from './file_creator.js';
import { FileEditorTool } from './file_editor.js';
import { FileDeleterTool } from './file_deleter.js';
import { TextExporterTool } from './text_exporter.js';
import { JsonAnalyzerTool } from './json_analyzer.js';
import { CsvAnalyzerTool } from './csv_analyzer.js';

export {
  TextAnalyzerTool,
  DocumentReaderTool,
  FileInspectorTool,
  DirectoryInspectorTool,
  FileCreatorTool,
  FileEditorTool,
  FileDeleterTool,
  TextExporterTool,
  JsonAnalyzerTool,
  CsvAnalyzerTool,
};

export function registerDefaultTools(registry: ToolRegistry): void {
  registry.register(new TextAnalyzerTool());
  registry.register(new DocumentReaderTool());
  registry.register(new FileInspectorTool());
  registry.register(new DirectoryInspectorTool());
  registry.register(new FileCreatorTool());
  registry.register(new FileEditorTool());
  registry.register(new FileDeleterTool());
  registry.register(new TextExporterTool());
  registry.register(new JsonAnalyzerTool());
  registry.register(new CsvAnalyzerTool());
}
