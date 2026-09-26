import React, { useState, useEffect, useCallback } from 'react';
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
  Server,
  Activity as ActivityIcon,
  Play,
  Eye,
  FileText,
  Monitor,
  Camera,
  Mic
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RuntimeStatusCard } from '../components/ui/RuntimeStatusCard';
import type { 
  SystemMetrics, 
  NavPage, 
  RuntimeStatusResponse, 
  BenchmarkRunResult, 
  ProviderId,
  PerceptionStatusResponse 
} from '../types';
import { fetchSystemMetrics, fetchRuntimeStatus, executeBenchmark, fallbackRuntimeStatus } from '../services/system';
import { PerceptionService, fallbackPerceptionStatus } from '../services/perception';
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
  const [runtime, setRuntime] = useState<RuntimeStatusResponse>(fallbackRuntimeStatus);
  const [perception, setPerception] = useState<PerceptionStatusResponse>(fallbackPerceptionStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Benchmarking State
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkRunResult | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkRuns, setBenchmarkRuns] = useState(5);

  const loadDiagnostics = useCallback(async (isManual = false) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [sysRes, rtRes, percRes] = await Promise.all([
        fetchSystemMetrics(),
        fetchRuntimeStatus(),
        PerceptionService.fetchStatus(),
      ]);

      setMetrics(sysRes.metrics);
      setRuntime(rtRes.runtime);
      setPerception(percRes);

      if (sysRes.error && rtRes.error) {
        setErrorMsg(sysRes.error);
      } else if (isManual) {
        onAddToast('Diagnostics synced', 'Fetched authentic host metrics, runtime status, and perception capabilities.', 'success');
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

  const handleRunBenchmark = async (providerId: ProviderId) => {
    setIsBenchmarking(true);
    try {
      onAddToast('Benchmark Started', `Measuring authentic inference latency on ${providerId.toUpperCase()}...`, 'info');
      const res = await executeBenchmark(providerId, undefined, benchmarkRuns);
      setBenchmarkResult(res);
      onAddToast(
        'Benchmark Complete',
        `Avg latency: ${res.average_latency_ms} ms (${res.successful_runs}/${res.runs} successful runs).`,
        'success'
      );
      loadDiagnostics(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Benchmark execution failed';
      onAddToast('Benchmark Failed', msg, 'error');
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleCopyRaw = () => {
    const rawPayload = {
      system_metrics: metrics,
      runtime_engine: runtime,
      perception_engine: perception,
      last_benchmark: benchmarkResult,
      exported_at: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(rawPayload, null, 2));
    setCopied(true);
    onAddToast('Raw JSON copied', 'Copied full diagnostic, runtime, & perception telemetry payload.', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="nexus-diag-page animate-fade-in">
      <PageHeader
        title="ADVANCED DIAGNOSTICS"
        subtitle="Low-level engineering diagnostics, host operating system, hardware-aware AI runtime, and multimodal perception."
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
            onClick={() => loadDiagnostics(true)}
          >
            Refresh Diagnostics
          </Button>
        }
      />

      {/* Strict Truthfulness Warning Banner */}
      <div className="nexus-diag-disclosure" role="alert">
        <ShieldCheck size={18} className="text-cyan flex-shrink-0" />
        <div className="nexus-diag-disclosure-text">
          <span className="nexus-diag-disclosure-title">Truthful Hardware & Perception Disclosure Policy</span>
          <p>
            Hardware acceleration and perception metrics reflect authentic detected devices only. NEXUS EDGE strictly avoids synthetic benchmark generation, fabricated NPU TOPS, fake OCR transcription, or unverified acceleration states.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="nexus-diag-error-banner">
          <AlertTriangle size={15} className="text-amber" />
          <span>Local edge service unreachable: displaying baseline host fallback. ({errorMsg})</span>
        </div>
      )}

      {/* PHASE 2 AI RUNTIME ENGINE STATUS CARD */}
      <RuntimeStatusCard
        runtime={runtime}
        onRunBenchmark={handleRunBenchmark}
        isBenchmarking={isBenchmarking}
      />

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
                {metrics?.system.total_memory_gb !== null && metrics?.system.total_memory_gb !== undefined
                  ? `${metrics.system.total_memory_gb} GB`
                  : 'Not available'}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Available Memory</span>
              <span className="nexus-diag-prop-val nexus-mono-val">
                {metrics?.system.available_memory_gb !== null && metrics?.system.available_memory_gb !== undefined
                  ? `${metrics.system.available_memory_gb} GB`
                  : 'Not available'}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Memory Usage</span>
              <span className="nexus-diag-prop-val nexus-mono-val">
                {metrics?.system.memory_usage_percent !== null && metrics?.system.memory_usage_percent !== undefined
                  ? `${metrics.system.memory_usage_percent}%`
                  : 'Unknown'}
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
              <span className="nexus-diag-prop-key">Runtime State</span>
              <span className="nexus-diag-prop-val">
                <StatusBadge 
                  status={runtime.runtime_state === 'READY' ? 'ready' : 'limited'} 
                  size="sm" 
                  label={runtime.runtime_state} 
                />
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Active Provider</span>
              <span className="nexus-diag-prop-val nexus-mono-val text-cyan font-semibold">
                {runtime.active_provider.toUpperCase()}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Active Model</span>
              <span className="nexus-diag-prop-val nexus-mono-val">
                {runtime.active_model}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Fallback Status</span>
              <span className={`nexus-diag-prop-val ${runtime.selection.fallback_used ? 'text-amber' : 'text-green'}`}>
                {runtime.selection.fallback_used ? 'Fallback Active' : 'Primary Path'}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Phase Status</span>
              <span className="nexus-diag-prop-val text-blue">Phase 3: Multimodal Perception</span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Privacy Boundary</span>
              <span className="nexus-diag-prop-val text-cyan">
                Local-only / Zero Cloud Telemetry
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
                <span>Detected (Baseline Ready)</span>
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">GPU Device</span>
              <span className="nexus-diag-prop-val nexus-val-unconfigured">
                {runtime.hardware.gpuDeviceDetected
                  ? (runtime.hardware.gpuDeviceName || 'Detected')
                  : 'Not detected'}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">GPU Inference Provider</span>
              <span className={`nexus-diag-prop-val ${runtime.hardware.gpuInferenceProviderAvailable ? 'text-green' : 'nexus-val-unconfigured'}`}>
                {runtime.hardware.gpuInferenceProviderAvailable ? 'Available' : 'Not configured'}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Snapdragon Hardware</span>
              <span className={`nexus-diag-prop-val ${runtime.hardware.snapdragonDetected ? 'text-green' : 'nexus-val-unconfigured'}`}>
                {runtime.hardware.snapdragonDetected ? 'Detected' : 'Not detected'}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">Qualcomm QNN Runtime</span>
              <span className="nexus-diag-prop-val nexus-val-unconfigured">
                {runtime.hardware.qnnStatus.replace('_', ' ')}
              </span>
            </div>
            <div className="nexus-diag-prop">
              <span className="nexus-diag-prop-key">TOPS Acceleration Rating</span>
              <span className="nexus-diag-prop-val nexus-val-unknown">
                {runtime.hardware.npuAvailable ? 'Hardware Rated' : 'Unknown'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* PHASE 3: MULTIMODAL PERCEPTION SECTION */}
      <Card variant="default" padding="md" className="nexus-diag-card">
        <div className="nexus-diag-card-header">
          <div className="nexus-diag-card-title-wrap">
            <Eye size={18} className="text-cyan" />
            <h2 className="nexus-diag-card-title">MULTIMODAL PERCEPTION CAPABILITIES</h2>
          </div>
          <span className="nexus-badge-tag nexus-tag-blue">PHASE 3</span>
        </div>

        <div className="nexus-diag-props-list">
          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key flex items-center gap-1">
              <FileText size={13} className="text-secondary" />
              <span>Text Perception</span>
            </span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>{perception.modalities.text.status}</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key flex items-center gap-1">
              <Monitor size={13} className="text-cyan" />
              <span>Screen Perception (On-Demand User Share)</span>
            </span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>{perception.modalities.screen.status}</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key flex items-center gap-1">
              <Camera size={13} className="text-purple" />
              <span>Camera Perception (User-Triggered Snapshot)</span>
            </span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>{perception.modalities.camera.status}</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key flex items-center gap-1">
              <Mic size={13} className="text-amber" />
              <span>Voice Perception (Push-to-Talk)</span>
            </span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>{perception.modalities.voice.status}</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key flex items-center gap-1">
              <FileText size={13} className="text-blue" />
              <span>Document Perception (PDF, DOCX, TXT, MD, CSV)</span>
            </span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>{perception.modalities.document.status}</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">OCR Provider</span>
            <span className="nexus-diag-prop-val nexus-val-unconfigured">
              {perception.providers.ocr.status.replace('_', ' ')} (Native OCR not installed)
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Vision Structure Provider</span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>{perception.providers.vision.status} ({perception.providers.vision.engine})</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Privacy Guard</span>
            <span className="nexus-diag-prop-val text-cyan">
              ACTIVE (Zero Raw Audio/Camera/Screen Persistent Storage)
            </span>
          </div>
        </div>
      </Card>

      {/* BENCHMARKING SECTION */}
      <Card variant="default" padding="md" className="nexus-diag-card">
        <div className="nexus-diag-card-header">
          <div className="nexus-diag-card-title-wrap">
            <ActivityIcon size={18} className="text-blue" />
            <h2 className="nexus-diag-card-title">RUNTIME BENCHMARKING & LATENCY</h2>
          </div>
          <div className="nexus-bench-controls">
            <label htmlFor="bench-runs-select" className="text-xs text-secondary">Runs:</label>
            <select
              id="bench-runs-select"
              className="nexus-bench-select"
              value={benchmarkRuns}
              onChange={(e) => setBenchmarkRuns(Number(e.target.value))}
            >
              <option value={3}>3 iterations</option>
              <option value={5}>5 iterations</option>
              <option value={10}>10 iterations</option>
            </select>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Play size={13} />}
              isLoading={isBenchmarking}
              onClick={() => handleRunBenchmark(runtime.active_provider)}
            >
              Execute Benchmark
            </Button>
          </div>
        </div>

        {benchmarkResult ? (
          <div className="nexus-bench-results-panel animate-fade-in">
            <div className="nexus-bench-metrics-row">
              <div className="nexus-bench-metric">
                <span className="nexus-bench-label">PROVIDER</span>
                <span className="nexus-bench-val text-cyan">{benchmarkResult.provider.toUpperCase()}</span>
              </div>
              <div className="nexus-bench-metric">
                <span className="nexus-bench-label">AVERAGE LATENCY</span>
                <span className="nexus-bench-val nexus-mono-val">{benchmarkResult.average_latency_ms} ms</span>
              </div>
              <div className="nexus-bench-metric">
                <span className="nexus-bench-label">MIN LATENCY</span>
                <span className="nexus-bench-val nexus-mono-val">{benchmarkResult.min_latency_ms} ms</span>
              </div>
              <div className="nexus-bench-metric">
                <span className="nexus-bench-label">MAX LATENCY</span>
                <span className="nexus-bench-val nexus-mono-val">{benchmarkResult.max_latency_ms} ms</span>
              </div>
              <div className="nexus-bench-metric">
                <span className="nexus-bench-label">RUNS SUCCESS</span>
                <span className="nexus-bench-val text-green">
                  {benchmarkResult.successful_runs} / {benchmarkResult.runs}
                </span>
              </div>
            </div>

            <div className="nexus-bench-latencies-list">
              <span className="nexus-bench-subhead">Measured Run Latencies (ms):</span>
              <div className="nexus-latency-tags">
                {benchmarkResult.latencies.map((lat, idx) => (
                  <span key={idx} className="nexus-lat-pill">
                    #{idx + 1}: {lat} ms
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="nexus-bench-placeholder">
            <p>No benchmark executed for this session. Click &quot;Execute Benchmark&quot; to test real execution latency on the active provider.</p>
          </div>
        )}
      </Card>

      {/* Raw Diagnostic JSON Inspector */}
      <Card variant="elevated" padding="md" className="nexus-raw-diag-card">
        <div className="nexus-raw-header">
          <div className="nexus-raw-title-wrap">
            <Terminal size={16} className="text-blue" />
            <h3 className="nexus-raw-title">Diagnostic, Runtime & Perception Telemetry Payload</h3>
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
          {JSON.stringify(
            {
              system_metrics: metrics,
              runtime_engine: runtime,
              perception_engine: perception,
              last_benchmark: benchmarkResult,
            },
            null,
            2
          )}
        </pre>
      </Card>
    </div>
  );
};
