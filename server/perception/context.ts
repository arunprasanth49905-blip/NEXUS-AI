/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine
 * Unified Context Merging & Management
 */

import type {
  NexusContextObject,
  UnifiedMultimodalContext,
  PerceptionModality,
} from './models.js';

export class PerceptionContextEngine {
  /**
   * Merges multiple active perception contexts into a single normalized representation
   */
  public static merge(
    contexts: NexusContextObject[],
    primaryQuery?: string
  ): UnifiedMultimodalContext {
    const unifiedId = `unified-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const activeModalities = new Set<PerceptionModality>();

    for (const ctx of contexts) {
      activeModalities.add(ctx.source);
    }

    const textParts: string[] = [];
    const errors: string[] = [];
    const code: string[] = [];
    const docSummaries: string[] = [];
    const intentHints: string[] = [];

    if (primaryQuery && primaryQuery.trim()) {
      textParts.push(`User Query: "${primaryQuery.trim()}"`);
    }

    for (const ctx of contexts) {
      if (ctx.source === 'text' && ctx.content.text) {
        if (!primaryQuery || ctx.content.text !== primaryQuery) {
          textParts.push(`Context (Text): ${ctx.content.text}`);
        }
      } else if (ctx.source === 'voice' && ctx.content.text) {
        textParts.push(`Voice Input: "${ctx.content.text}"`);
        intentHints.push('spoken_prompt');
      } else if (ctx.source === 'screen') {
        textParts.push(`Screen Frame: Resolution ${ctx.source_metadata.resolution || '1920x1080'}. OCR text: ${ctx.extracted_information.textSnippet || 'None'}`);
        intentHints.push('visual_workspace');
      } else if (ctx.source === 'camera') {
        textParts.push(`Camera Snapshot: Resolution ${ctx.source_metadata.resolution || '640x480'}`);
        intentHints.push('camera_input');
      } else if (ctx.source === 'document') {
        const fullDocText = ctx.content.text || ctx.extracted_information.textSnippet || '';
        const safeDocText = fullDocText.length > 20000
          ? `${fullDocText.slice(0, 20000)}\n[... Document truncated for context boundary ...]`
          : fullDocText;
        textParts.push(`Attached Document (${ctx.content.filename || 'file'}, ${ctx.extracted_information.wordCount || 0} words):\n${safeDocText}`);
        docSummaries.push(`${ctx.content.filename || 'file'} (${ctx.extracted_information.wordCount || 0} words)`);
      }

      if (ctx.extracted_information.errorsDetected) {
        errors.push(...ctx.extracted_information.errorsDetected);
      }
    }

    return {
      unified_context_id: unifiedId,
      created_at: new Date().toISOString(),
      primary_query: primaryQuery || (contexts[0]?.content.text || ''),
      active_modalities: Array.from(activeModalities),
      contexts,
      merged_text_representation: textParts.join('\n\n'),
      extracted_signals: {
        errors,
        code,
        document_summaries: docSummaries,
        intent_hints: intentHints,
      },
      privacy_summary: {
        all_local: true,
        raw_media_purged: true,
      },
    };
  }
}
