import React from 'react';
import { 
  FileText, 
  Monitor, 
  Camera, 
  Mic, 
  X, 
  Eye 
} from 'lucide-react';
import type { NexusContextObject } from '../../types';
import './ContextPreviewBar.css';

export interface ContextPreviewBarProps {
  contexts: NexusContextObject[];
  onRemoveContext: (contextId: string) => void;
  onClearAll: () => void;
}

export const ContextPreviewBar: React.FC<ContextPreviewBarProps> = ({
  contexts,
  onRemoveContext,
  onClearAll,
}) => {
  if (contexts.length === 0) return null;

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'screen':
        return <Monitor size={12} className="text-cyan" />;
      case 'camera':
        return <Camera size={12} className="text-purple" />;
      case 'voice':
        return <Mic size={12} className="text-amber" />;
      case 'document':
        return <FileText size={12} className="text-blue" />;
      default:
        return <FileText size={12} className="text-secondary" />;
    }
  };

  const getLabel = (ctx: NexusContextObject) => {
    if (ctx.source === 'document') {
      return ctx.content.filename || 'Document';
    }
    if (ctx.source === 'screen') {
      return `Screen Frame (${ctx.source_metadata.resolution || '1080p'})`;
    }
    if (ctx.source === 'camera') {
      return `Camera Snapshot (${ctx.source_metadata.resolution || 'VGA'})`;
    }
    if (ctx.source === 'voice') {
      return `Voice: "${(ctx.content.text || '').slice(0, 20)}..."`;
    }
    return ctx.source;
  };

  return (
    <div className="nexus-context-preview-container animate-fade-in">
      <div className="nexus-context-preview-header">
        <div className="nexus-context-preview-title">
          <Eye size={13} className="text-cyan" />
          <span>Active Attached Multimodal Context ({contexts.length})</span>
        </div>
        <button
          type="button"
          className="nexus-context-clear-btn"
          onClick={onClearAll}
          title="Clear attached contexts"
        >
          Clear all
        </button>
      </div>

      <div className="nexus-context-chips-list">
        {contexts.map((ctx) => (
          <div key={ctx.context_id} className="nexus-context-chip">
            <span className="nexus-context-chip-icon">
              {getSourceIcon(ctx.source)}
            </span>
            <span className="nexus-context-chip-label" title={getLabel(ctx)}>
              {getLabel(ctx)}
            </span>
            <button
              type="button"
              className="nexus-context-chip-remove"
              onClick={() => onRemoveContext(ctx.context_id)}
              aria-label={`Remove ${getLabel(ctx)}`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
