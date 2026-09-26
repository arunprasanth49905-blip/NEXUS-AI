import React, { useState } from 'react';
import { 
  Brain, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  Sparkles, 
  Tag, 
  ShieldCheck,
  Bookmark
} from 'lucide-react';
import './ContextPanel.css';

export interface ContextPanelProps {
  activeTask?: string | null;
  category?: string;
  intent?: string;
  entities?: string[];
  topics?: string[];
  retrievedMemoriesCount?: number;
  sourcesCount?: number;
  estimatedTokens?: number;
  onClearTask?: () => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  activeTask,
  category = 'CONVERSATION',
  intent = 'GENERAL_CONVERSATION',
  entities = [],
  topics = [],
  retrievedMemoriesCount = 0,
  sourcesCount = 0,
  estimatedTokens,
  onClearTask,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="nexus-context-panel animate-fade-in" aria-label="Context Inspector">
      <div 
        className="nexus-context-panel-bar"
        onClick={() => setIsExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsExpanded((p) => !p); }}
        aria-expanded={isExpanded}
      >
        <div className="nexus-context-summary-left">
          <Brain size={14} className="text-cyan flex-shrink-0" />
          <span className="nexus-context-label">Context Intelligence:</span>
          {activeTask ? (
            <span className="nexus-task-pill" title={`Active Goal: ${activeTask}`}>
              <Target size={11} className="text-amber" />
              <span>{activeTask}</span>
            </span>
          ) : (
            <span className="nexus-context-neutral-state">No Active Task Goal Set</span>
          )}
          
          <div className="nexus-context-quick-tags">
            {sourcesCount > 0 && (
              <span className="nexus-micro-tag text-purple">
                {sourcesCount} source{sourcesCount > 1 ? 's' : ''}
              </span>
            )}
            {retrievedMemoriesCount > 0 && (
              <span className="nexus-micro-tag text-blue">
                {retrievedMemoriesCount} memor{retrievedMemoriesCount > 1 ? 'ies' : 'y'}
              </span>
            )}
            {intent && intent !== 'GENERAL_CONVERSATION' && (
              <span className="nexus-micro-tag text-green">
                Intent: {intent}
              </span>
            )}
          </div>
        </div>

        <div className="nexus-context-summary-right">
          <span className="nexus-context-expand-hint">
            {isExpanded ? 'Hide Context' : 'Inspect Context'}
          </span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {isExpanded && (
        <div className="nexus-context-expanded-drawer animate-fade-in">
          <div className="nexus-context-drawer-grid">
            {/* Active Task Goal */}
            <div className="nexus-context-drawer-col">
              <span className="nexus-drawer-subhead">
                <Target size={12} className="text-amber" />
                <span>ACTIVE TASK GOAL</span>
              </span>
              <p className="nexus-drawer-text">
                {activeTask || 'None detected yet. Asking debug or build questions automatically anchors a task.'}
              </p>
              {activeTask && onClearTask && (
                <button
                  type="button"
                  className="nexus-drawer-action-link"
                  onClick={onClearTask}
                >
                  Clear Task
                </button>
              )}
            </div>

            {/* Understanding Category & Intent */}
            <div className="nexus-context-drawer-col">
              <span className="nexus-drawer-subhead">
                <Sparkles size={12} className="text-cyan" />
                <span>UNDERSTANDING & INTENT</span>
              </span>
              <div className="nexus-drawer-prop-row">
                <span className="text-tertiary">Category:</span>
                <span className="nexus-mono-val">{category}</span>
              </div>
              <div className="nexus-drawer-prop-row">
                <span className="text-tertiary">Intent:</span>
                <span className="nexus-mono-val text-green">{intent}</span>
              </div>
              {estimatedTokens !== undefined && (
                <div className="nexus-drawer-prop-row">
                  <span className="text-tertiary">Est. Context Tokens:</span>
                  <span className="nexus-mono-val">{estimatedTokens}</span>
                </div>
              )}
            </div>

            {/* Entities & Topics */}
            <div className="nexus-context-drawer-col">
              <span className="nexus-drawer-subhead">
                <Tag size={12} className="text-purple" />
                <span>DETECTED TOPICS & ENTITIES</span>
              </span>
              <div className="nexus-drawer-tags-wrap">
                {topics.length > 0 ? (
                  topics.map((t, idx) => (
                    <span key={idx} className="nexus-topic-badge">#{t}</span>
                  ))
                ) : (
                  <span className="text-xs text-tertiary">No specific topic matches</span>
                )}
                {entities.map((e, idx) => (
                  <span key={idx} className="nexus-entity-badge">{e}</span>
                ))}
              </div>
            </div>

            {/* Memory & Provenance */}
            <div className="nexus-context-drawer-col">
              <span className="nexus-drawer-subhead">
                <Bookmark size={12} className="text-blue" />
                <span>PROVENANCE & PRIVACY</span>
              </span>
              <div className="nexus-drawer-prop-row">
                <span className="text-tertiary">Retrieved Memories:</span>
                <span className="nexus-mono-val">{retrievedMemoriesCount}</span>
              </div>
              <div className="nexus-drawer-prop-row">
                <span className="text-tertiary">Privacy Perimeter:</span>
                <span className="text-cyan flex items-center gap-1">
                  <ShieldCheck size={11} />
                  <span>Strict Local Edge</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
