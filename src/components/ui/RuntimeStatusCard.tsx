import React, { useState } from 'react';
import { 
  Cpu, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Card } from './Card';
import type { RuntimeStatusResponse, ProviderId } from '../../types';
import './RuntimeStatusCard.css';

export interface RuntimeStatusCardProps {
  runtime: RuntimeStatusResponse;
  onRunBenchmark?: (provider: ProviderId) => void;
  isBenchmarking?: boolean;
}

export const RuntimeStatusCard: React.FC<RuntimeStatusCardProps> = ({
  runtime,
  onRunBenchmark,
  isBenchmarking = false,
}) => {
  const [showExplanation, setShowExplanation] = useState(false);

  const getProviderIcon = (status: string) => {
    switch (status) {
      case 'READY':
      case 'AVAILABLE':
        return <CheckCircle2 size={13} className="text-green" />;
      case 'NOT_CONFIGURED':
        return <AlertTriangle size={13} className="text-amber" />;
      default:
        return <XCircle size={13} className="text-zinc-500" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'READY':
      case 'AVAILABLE':
        return 'nexus-tag-green';
      case 'NOT_CONFIGURED':
        return 'nexus-tag-amber';
      default:
        return 'nexus-tag-zinc';
    }
  };

  return (
    <Card variant="default" padding="md" className="nexus-runtime-card">
      <div className="nexus-runtime-card-header">
        <div className="nexus-runtime-title-wrap">
          <Cpu size={18} className="text-cyan" />
          <h2 className="nexus-runtime-card-title">AI RUNTIME ENGINE</h2>
        </div>
        <div className="nexus-runtime-header-right">
          <span className="nexus-mono-tag">HARDWARE-AWARE</span>
          <span className="nexus-badge-tag nexus-tag-blue">PHASE 2</span>
        </div>
      </div>

      {/* Provider Quick Grid */}
      <div className="nexus-runtime-providers-grid">
        {runtime.providers.map((p) => {
          const isActive = p.provider_id === runtime.active_provider;
          return (
            <div 
              key={p.provider_id} 
              className={`nexus-runtime-provider-item ${isActive ? 'nexus-provider-active' : ''}`}
            >
              <div className="nexus-provider-item-top">
                <span className="nexus-provider-name">
                  {p.provider_id === 'qnn' ? 'QUALCOMM QNN' : p.provider_id.toUpperCase()}
                </span>
                <span className={`nexus-badge-tag ${getStatusBadgeClass(p.status)}`}>
                  {p.status.replace('_', ' ')}
                </span>
              </div>
              <div className="nexus-provider-item-details">
                <span className="nexus-provider-sub">
                  {getProviderIcon(p.status)}
                  <span>{p.type}</span>
                </span>
                {isActive && (
                  <span className="nexus-active-indicator">
                    <Zap size={11} className="text-cyan" />
                    <span>ACTIVE</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Provider & Selected Reason */}
      <div className="nexus-runtime-active-banner">
        <div className="nexus-active-info">
          <span className="nexus-active-label">ACTIVE EXECUTION PROVIDER</span>
          <div className="nexus-active-main">
            <span className="nexus-active-name">{runtime.active_provider.toUpperCase()}</span>
            <span className="nexus-active-model-tag">Model: {runtime.active_model}</span>
          </div>
        </div>

        {onRunBenchmark && (
          <button
            type="button"
            className="nexus-bench-button"
            disabled={isBenchmarking}
            onClick={() => onRunBenchmark(runtime.active_provider)}
          >
            <Zap size={13} className={isBenchmarking ? 'nexus-spin-slow text-amber' : 'text-cyan'} />
            <span>{isBenchmarking ? 'Benchmarking...' : 'Benchmark Active Provider'}</span>
          </button>
        )}
      </div>

      {/* "Why This Runtime?" Expandable Explanation */}
      <div className="nexus-why-runtime-wrapper">
        <button
          type="button"
          className="nexus-why-runtime-trigger"
          onClick={() => setShowExplanation((prev) => !prev)}
          aria-expanded={showExplanation}
        >
          <div className="nexus-why-title">
            <HelpCircle size={14} className="text-blue" />
            <span>Why is NEXUS using {runtime.active_provider.toUpperCase()}?</span>
          </div>
          {showExplanation ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {showExplanation && (
          <div className="nexus-why-runtime-body animate-fade-in">
            <p className="nexus-why-lead">{runtime.explanation.why_this_runtime}</p>
            
            <div className="nexus-selection-chain">
              <span className="nexus-chain-label">Selection Hierarchy Evaluation:</span>
              <div className="nexus-chain-steps">
                {runtime.selection.chain_attempted.map((item, idx) => {
                  const isSelected = item === runtime.active_provider;
                  return (
                    <React.Fragment key={item}>
                      <span className={`nexus-chain-node ${isSelected ? 'nexus-node-active' : 'nexus-node-bypassed'}`}>
                        {item.toUpperCase()}
                        {isSelected && ' (Selected)'}
                      </span>
                      {idx < runtime.selection.chain_attempted.length - 1 && (
                        <ArrowRight size={12} className="nexus-chain-arrow" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {runtime.selection.fallback_used && (
              <div className="nexus-fallback-note">
                <AlertTriangle size={13} className="text-amber flex-shrink-0" />
                <span>
                  <strong>Fallback Note:</strong> {runtime.selection.fallback_reason}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
