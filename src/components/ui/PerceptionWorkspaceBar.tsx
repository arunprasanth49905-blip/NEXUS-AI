/**
 * NEXUS-AI Phase 3 Multimodal Perception Engine
 * Active Inputs & Perception Context Status Bar
 */

import React from 'react';
import { 
  Eye, 
  ShieldCheck, 
  Layers 
} from 'lucide-react';
import type { NexusContextObject } from '../../types';
import './PerceptionWorkspaceBar.css';

export type ModalityUXState = 
  | 'OFF' 
  | 'REQUESTING' 
  | 'ACTIVE' 
  | 'STOPPED' 
  | 'DENIED' 
  | 'UNAVAILABLE' 
  | 'ERROR';

export interface PerceptionWorkspaceBarProps {
  voiceState: ModalityUXState;
  screenState: ModalityUXState;
  cameraState: ModalityUXState;
  documentCount: number;
  activeContext?: NexusContextObject | null;
}

export const PerceptionWorkspaceBar: React.FC<PerceptionWorkspaceBarProps> = ({
  voiceState,
  screenState,
  cameraState,
  documentCount,
  activeContext,
}) => {
  const getPillClass = (state: string) => {
    switch (state.toUpperCase()) {
      case 'READY':
      case 'ACTIVE':
        return 'active';
      case 'REQUESTING':
        return 'requesting';
      case 'DENIED':
        return 'denied';
      case 'ERROR':
        return 'error';
      case 'UNAVAILABLE':
        return 'unavailable';
      case 'STOPPED':
        return 'stopped';
      case 'OFF':
      default:
        return 'off';
    }
  };

  return (
    <div className="nexus-perception-workspace animate-fade-in" aria-label="Multimodal Perception Workspace">
      {/* 1. ACTIVE INPUTS BAR */}
      <div className="nexus-active-inputs-bar">
        <div className="nexus-active-inputs-header">
          <Layers size={13} className="text-cyan" />
          <span>Active Inputs</span>
        </div>

        <div className="nexus-active-inputs-items">
          <div className="nexus-input-indicator">
            <span className="nexus-indicator-label">Text:</span>
            <span className="nexus-indicator-pill ready">Ready</span>
          </div>

          <div className="nexus-input-indicator">
            <span className="nexus-indicator-label">Voice:</span>
            <span className={`nexus-indicator-pill ${getPillClass(voiceState)}`}>
              {voiceState}
            </span>
          </div>

          <div className="nexus-input-indicator">
            <span className="nexus-indicator-label">Screen:</span>
            <span className={`nexus-indicator-pill ${getPillClass(screenState)}`}>
              {screenState}
            </span>
          </div>

          <div className="nexus-input-indicator">
            <span className="nexus-indicator-label">Camera:</span>
            <span className={`nexus-indicator-pill ${getPillClass(cameraState)}`}>
              {cameraState}
            </span>
          </div>

          <div className="nexus-input-indicator">
            <span className="nexus-indicator-label">Document:</span>
            <span className={`nexus-indicator-pill ${documentCount > 0 ? 'ready' : 'off'}`}>
              {documentCount > 0 ? `${documentCount} Attached` : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. PERCEPTION CONTEXT CARD */}
      {activeContext && (
        <div className="nexus-perception-context-card animate-fade-in">
          <div className="nexus-context-card-title">
            <Eye size={12} className="text-cyan" />
            <span>Perception Context</span>
          </div>

          <div className="nexus-context-card-grid">
            <div className="nexus-context-field">
              <span className="nexus-context-field-key">Source</span>
              <span className="nexus-context-field-val">
                {activeContext.source === 'document' 
                  ? activeContext.content.filename || 'Document' 
                  : activeContext.source.toUpperCase()}
              </span>
            </div>

            <div className="nexus-context-field">
              <span className="nexus-context-field-key">Modality</span>
              <span className="nexus-context-field-val">
                {activeContext.modality.toUpperCase()}
              </span>
            </div>

            <div className="nexus-context-field">
              <span className="nexus-context-field-key">Timestamp</span>
              <span className="nexus-context-field-val">
                {new Date(activeContext.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="nexus-context-field">
              <span className="nexus-context-field-key">Privacy</span>
              <span className="nexus-context-field-val" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <ShieldCheck size={11} className="text-green" />
                <span>Zero Cloud Storage</span>
              </span>
            </div>

            <div className="nexus-context-field">
              <span className="nexus-context-field-key">Status</span>
              <span className="nexus-context-field-val text-cyan">
                Normalized & Attached
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
