import React from 'react';
import { ShieldCheck, Cpu, HardDrive, FolderGit2 } from 'lucide-react';
import type { ContextInfo } from '../../types';
import './ContextIndicator.css';

export interface ContextIndicatorProps {
  context: ContextInfo;
  className?: string;
  compact?: boolean;
}

export const ContextIndicator: React.FC<ContextIndicatorProps> = ({
  context,
  className = '',
  compact = false,
}) => {
  if (compact) {
    return (
      <div className={`nexus-context-compact ${className}`}>
        <span className="nexus-context-chip" title="Active Project">
          <FolderGit2 size={12} className="nexus-context-icon" />
          <span className="nexus-context-text">{context.project}</span>
        </span>
        <span className="nexus-context-separator" aria-hidden="true">•</span>
        <span className="nexus-context-chip" title="Privacy Perimeter">
          <ShieldCheck size={12} className="nexus-context-icon text-cyan" />
          <span className="nexus-context-text">{context.privacy}</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`nexus-context-panel ${className}`}>
      <div className="nexus-context-header">
        <span className="nexus-context-label">CURRENT CONTEXT</span>
        <span className="nexus-context-boundary">Local Edge Boundary</span>
      </div>

      <div className="nexus-context-grid">
        <div className="nexus-context-item">
          <div className="nexus-context-item-icon">
            <FolderGit2 size={16} />
          </div>
          <div className="nexus-context-item-details">
            <span className="nexus-context-item-key">Project</span>
            <span className="nexus-context-item-val">{context.project}</span>
          </div>
        </div>

        <div className="nexus-context-item">
          <div className="nexus-context-item-icon">
            <HardDrive size={16} />
          </div>
          <div className="nexus-context-item-details">
            <span className="nexus-context-item-key">Status</span>
            <span className="nexus-context-item-val nexus-val-ready">{context.status}</span>
          </div>
        </div>

        <div className="nexus-context-item">
          <div className="nexus-context-item-icon">
            <Cpu size={16} />
          </div>
          <div className="nexus-context-item-details">
            <span className="nexus-context-item-key">Runtime</span>
            <span className="nexus-context-item-val">{context.runtime}</span>
          </div>
        </div>

        <div className="nexus-context-item">
          <div className="nexus-context-item-icon nexus-icon-privacy">
            <ShieldCheck size={16} />
          </div>
          <div className="nexus-context-item-details">
            <span className="nexus-context-item-key">Privacy</span>
            <span className="nexus-context-item-val nexus-val-privacy">{context.privacy}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
