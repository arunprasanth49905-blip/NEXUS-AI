import { useState, useEffect, useCallback } from 'react';
import { 
  Cpu, 
  HardDrive, 
  ShieldCheck, 
  RefreshCw, 
  Copy, 
  Check, 
  AlertTriangle, 
  Terminal,
  CheckCircle2,
  Server
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { SystemMetrics, NavPage } from '../types';
import { fetchSystemMetrics } from '../services/system';
import './AdvancedDiagnostics.css';

export interface AdvancedDiagnosticsProps {
  onNavigate: (page: NavPage) => void;
  onAddToast: (title: string, description?: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const AdvancedDiagnostics: React.FC<AdvancedDiagnosticsProps> = ({
  onNavigate,
  onAddToast,
}) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadDiagnostics = useCallback(async (isManual = false) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchSystemMetrics();
      setMetrics(res.metrics);
      setIsLive(res.isLive);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (isManual) {
        onAddToast('Diagnostics synced', 'Fetched authentic host metrics.', 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Diagnostic retrieval failed';
      setErrorMsg(msg);
      onAddToast('Diagnostic error', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onAddToast]);

  useEffect(() => {
    loadDiagnostics(false);
  }, [loadDiagnostics]);

  const handleCopyRaw = () => {
    if (!metrics) return;
    navigator.clipboard.writeText(JSON.stringify(metrics, null, 2));
    setCopied(true);
    onAddToast('Raw JSON copied', 'Copied diagnostic payload to clipboard.', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="nexus-diag-page animate-fade-in">
      <PageHeader
        title="ADVANCED DIAGNOSTICS"
        subtitle="Low-level engineering diagnostics, host operating system, and truthful acceleration status."
        breadcrumbs={[
          { label: 'Settings', onClick: () => onNavigate('settings') },
          { label: 'Advanced Diagnostics' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            isLoading={isLoading}
            leftIcon={<RefreshCw size={14} />}
            onClick={loadDiagnostics}
          >
            Refresh Diagnostics
          </Button>
        }
      />

      {/* Strict Truthfulness Warning Banner */}
      <div className="nexus-diag-disclosure" role="alert">
        <ShieldCheck size={18} className="text-cyan flex-shrink-0" />
        <div className="nexus-diag-disclosure-text">
          <span className="nexus-diag-disclosure-title">Truthful Hardware Disclosure</span>
          <p>
            Hardware acceleration metrics reflect authentic detected devices only. NEXUS EDGE strictly avoids synthetic benchmark generation, fabricated NPU TOPS, or unverified acceleration states.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="nexus-diag-error-banner">
          <AlertTriangle size={15} className="text-amber" />
          <span>Local edge service unreachable: displaying baseline host fallback. ({errorMsg})</span>
        </div>
      )}

      {/* Main Diagnostics Grid */}
      <div className="nexus-diag-grid">
        {/* Section 1: SYSTEM */}
        <Card variant="default" padding="md" className="nexus-diag-card">
          <div className="nexus-diag-card-header">
            <div className="nexus-diag-card-title-wrap">
              <Server size={18} className="text-blue" />
              <h2 className="nexus-diag-card-title">SYSTEM</h2>
            </div>
            <span className="nexus-mono-tag">HOST OS</span>
          </div>

          <div className="nexus-diag-props-list">
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Operating System</span>
              <span className="nexus-diag-prop-val">{metrics?.system.os || 'Detecting...'}</span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Architecture</span>
              <span className="nexus-diag-prop-val nexus-mono-val">{metrics?.system.architecture || 'Unknown'}</span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Processor / CPU</span>
              <span className="nexus-diag-prop-val">{metrics?.system.processor || 'Unknown'}</span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">CPU Physical Cores</span>
              <span className="nexus-diag-prop-val nexus-mono-val">{String(metrics?.system.cpu_physical_cores ?? 'Unknown')}</span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">CPU Logical Threads</span>
              <span className="nexus-diag-prop-val nexus-mono-val">{String(metrics?.system.cpu_logical_threads ?? 'Unknown')}</span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Total Memory</span>
              <span className="nexus-diag-prop-val nexus-mono-val">
                {metrics?.system.total_memory_gb ? `${metrics.system.total_memory_gb} GB` : 'Not available'}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Available Memory</span>
              <span className="nexus-diag-prop-val nexus-mono-val">
                {metrics?.system.available_memory_gb ? `${metrics.system.available_memory_gb} GB` : 'Not available'}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Memory Usage</span>
              <span className="nexus-diag-prop-val nexus-mono-val">
                {metrics?.system.memory_usage_percent ? `${metrics.system.memory_usage_percent}%` : 'Unknown'}
              </span>
            </div>
          </div>
        </Card>

        {/* Section 2: RUNTIME */}
        <Card variant="default" padding="md" className="nexus-diag-card">
          <div className="nexus-diag-card-header">
            <div className="nexus-diag-card-title-wrap">
              <Cpu size={18} className="text-cyan" />
              <h2 className="nexus-diag-card-title">RUNTIME</h2>
            </div>
            <span className="nexus-mono-tag">PROCESS STATE</span>
          </div>

          <div className="nexus-diag-props-list">
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Runtime Status</span>
              <span className="nexus-diag-prop-val">
                <StatusBadge status={isLive ? 'ready' : 'limited'} size="sm" label={metrics?.runtime.status || 'Ready'} />
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Provider</span>
              <span className="nexus-diag-prop-val">{metrics?.runtime.provider || 'NEXUS Local Edge Engine'}</span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Model Pipeline</span>
              <span className="nexus-diag-prop-val nexus-val-unconfigured">
                {metrics?.runtime.model || 'Not configured (Phase 2)'}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Execution Mode</span>
              <span className="nexus-diag-prop-val">{metrics?.runtime.execution_mode || 'Local Edge UI Shell'}</span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Phase Status</span>
              <span className="nexus-diag-prop-val">{metrics?.runtime.phase || 'Phase 1 - Product Foundation'}</span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Privacy Boundary</span>
              <span className="nexus-diag-prop-val text-cyan">
                {metrics?.runtime.privacy_boundary || 'Local-only / Zero Cloud Telemetry'}
              </span>
            </div>
          </div>
        </Card>

        {/* Section 3: ACCELERATION */}
        <Card variant="default" padding="md" className="nexus-diag-card">
          <div className="nexus-diag-card-header">
            <div className="nexus-diag-card-title-wrap">
              <HardDrive size={18} className="text-amber" />
              <h2 className="nexus-diag-card-title">ACCELERATION</h2>
            </div>
            <span className="nexus-mono-tag">HARDWARE ACCEL</span>
          </div>

          <div className="nexus-diag-props-list">
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">CPU Execution</span>
              <span className="nexus-diag-prop-val text-green">
                <CheckCircle2 size={13} className="text-green" />
                <span>{metrics?.acceleration.cpu || 'Detected'}</span>
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">GPU Device</span>
              <span className="nexus-diag-prop-val nexus-val-unconfigured">
                {metrics?.acceleration.gpu || 'Not configured'}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">NPU Availability</span>
              <span className="nexus-diag-prop-val nexus-val-unconfigured">
                {metrics?.acceleration.npu || 'Not detected'}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Snapdragon / QNN Runtime</span>
              <span className="nexus-diag-prop-val nexus-val-unconfigured">
                {metrics?.acceleration.qnn_runtime || 'Not configured (Edge target runtime)'}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">TOPS Acceleration Rating</span>
              <span className="nexus-diag-prop-val nexus-val-unknown">
                {metrics?.acceleration.tops_rating || 'Unknown'}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Active Inference Engine</span>
              <span className="nexus-diag-prop-val nexus-mono-val">
                {metrics?.acceleration.inference_engine || 'CPU Fallback (Phase 1 Baseline)'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Raw Diagnostic JSON Inspector */}
      <Card variant="elevated" padding="md" className="nexus-raw-diag-card">
        <div className="nexus-raw-header">
          <div className="nexus-raw-title-wrap">
            <Terminal size={16} className="text-blue" />
            <h3 className="nexus-raw-title">Diagnostic Telemetry Payload</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
            onClick={handleCopyRaw}
          >
            {copied ? 'Copied' : 'Copy JSON'}
          </Button>
        </div>

        <pre className="nexus-raw-code" tabIndex={0} aria-label="Raw Diagnostic JSON">
          {metrics ? JSON.stringify(metrics, null, 2) : '// Awaiting diagnostic polling...'}
        </pre>
      </Card>
    </div>
  );
};
