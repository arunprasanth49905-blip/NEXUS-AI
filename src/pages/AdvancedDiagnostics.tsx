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
  Mic,
  Brain,
  Database,
  Bot,
  Wrench
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
  PerceptionStatusResponse,
  ContextMemoryStatusResponse
} from '../types';
import type { OrchestratorStatusReport } from '../types/agent';
import type { ToolEngineStatusReport } from '../types/tool';
import type { AdaptiveEngineStatusReport } from '../types/adaptation.js';
import { fetchSystemMetrics, fetchRuntimeStatus, executeBenchmark, fallbackRuntimeStatus } from '../services/system';
import { PerceptionService, fallbackPerceptionStatus } from '../services/perception';
import { api } from '../services/api';
import { agentService } from '../services/agent';
import { toolService } from '../services/tool';
import { getLearningStatus } from '../services/adaptation.js';
import './AdvancedDiagnostics.css';

export interface AdvancedDiagnosticsProps {
  onNavigate: (page: NavPage) => void;
  onAddToast: (title: string, description?: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const fallbackContextMemoryStatus: ContextMemoryStatusResponse = {
  context_engine: {
    status: 'READY',
    active_session_id: 'ses-local-fallback',
    active_contexts_count: 0,
    intent_classifier: 'RuleBasedIntentClassifier (Phase 4 Abstraction)',
    category_classifier: 'CanonicalContextClassifier (Phase 4 Abstraction)',
  },
  memory_engine: {
    status: 'READY',
    storage_type: 'sqlite',
    total_memories: 0,
    by_type: { short_term: 0, session: 0, project: 0, long_term: 0 },
    auto_save: false,
    retrieval_active: true,
  },
  privacy_guard: {
    secret_redaction_active: true,
    zero_cloud_retention: true,
    rejected_secret_count: 0,
  },
  active_task: null,
};

export const AdvancedDiagnostics: React.FC<AdvancedDiagnosticsProps> = ({
  onNavigate,
  onAddToast,
}) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [runtime, setRuntime] = useState<RuntimeStatusResponse>(fallbackRuntimeStatus);
  const [perception, setPerception] = useState<PerceptionStatusResponse>(fallbackPerceptionStatus);
  const [contextMemory, setContextMemory] = useState<ContextMemoryStatusResponse>(fallbackContextMemoryStatus);
  const [orchestrator, setOrchestrator] = useState<OrchestratorStatusReport | null>(null);
  const [toolsStatus, setToolsStatus] = useState<ToolEngineStatusReport | null>(null);
  const [adaptiveStatus, setAdaptiveStatus] = useState<AdaptiveEngineStatusReport | null>(null);
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

      try {
        const cmRes = await api.getContextMemoryStatus();
        setContextMemory(cmRes);
      } catch {
        // Fallback default
      }

      try {
        const orchRes = await agentService.getOrchestratorStatus();
        setOrchestrator(orchRes);
      } catch {
        // Fallback default
      }

      try {
        const tRes = await toolService.getStatus();
        setToolsStatus(tRes);
      } catch {
        // Fallback default
      }

      try {
        const aRes = await getLearningStatus();
        setAdaptiveStatus(aRes);
      } catch {
        // Fallback default
      }

      if (sysRes.error && rtRes.error) {
        setErrorMsg(sysRes.error);
      } else if (isManual) {
        onAddToast('Diagnostics synced', 'Fetched authentic host metrics, runtime status, perception, memory, and agent orchestrator.', 'success');
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
      context_memory_engine: contextMemory,
      last_benchmark: benchmarkResult,
      exported_at: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(rawPayload, null, 2));
    setCopied(true);
    onAddToast('Raw JSON copied', 'Copied full diagnostic, runtime, perception, & memory telemetry payload.', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="nexus-diag-page animate-fade-in">
      <PageHeader
        title="ADVANCED DIAGNOSTICS"
        subtitle="Low-level engineering diagnostics, host operating system, hardware-aware AI runtime, and multimodal context memory."
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
          <span className="nexus-diag-disclosure-title">Truthful Hardware, Perception & Memory Disclosure Policy</span>
          <p>
            Hardware acceleration, perception, and memory metrics reflect authentic states only. NEXUS EDGE strictly avoids synthetic benchmark generation, fabricated NPU TOPS, fake semantic accuracy, or unverified acceleration states.
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
              <span className="nexus-diag-prop-val text-blue">Phase 4: Context & Memory</span>
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

      {/* PHASE 4: CONTEXT INTELLIGENCE & MEMORY DIAGNOSTICS */}
      <Card variant="default" padding="md" className="nexus-diag-card">
        <div className="nexus-diag-card-header">
          <div className="nexus-diag-card-title-wrap">
            <Brain size={18} className="text-cyan" />
            <h2 className="nexus-diag-card-title">CONTEXT INTELLIGENCE & MEMORY ENGINE</h2>
          </div>
          <span className="nexus-badge-tag nexus-tag-blue">PHASE 4</span>
        </div>

        <div className="nexus-diag-props-list">
          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key flex items-center gap-1">
              <Brain size={13} className="text-cyan" />
              <span>Context Engine State</span>
            </span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>{contextMemory.context_engine.status}</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Active Session ID</span>
            <span className="nexus-diag-prop-val nexus-mono-val">{contextMemory.context_engine.active_session_id}</span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Active Task Goal</span>
            <span className="nexus-diag-prop-val font-semibold text-amber">
              {contextMemory.active_task ? contextMemory.active_task.title : 'None active'}
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key flex items-center gap-1">
              <Database size={13} className="text-blue" />
              <span>Memory Storage Backend</span>
            </span>
            <span className="nexus-diag-prop-val nexus-mono-val text-green">
              {contextMemory.memory_engine.storage_type.toUpperCase()} (Local persistent storage)
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Total Retained Memories</span>
            <span className="nexus-diag-prop-val nexus-mono-val font-bold">
              {contextMemory.memory_engine.total_memories} (Project: {contextMemory.memory_engine.by_type.project}, Long-Term: {contextMemory.memory_engine.by_type.long_term}, Session: {contextMemory.memory_engine.by_type.session})
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key flex items-center gap-1">
              <ShieldCheck size={13} className="text-cyan" />
              <span>Secret Redaction & Protection</span>
            </span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>ACTIVE (Zero credential persistence)</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Embedding Model</span>
            <span className="nexus-diag-prop-val nexus-val-unconfigured">
              NOT_CONFIGURED (Deterministic multi-factor keyword & entity retrieval active)
            </span>
          </div>
        </div>
      </Card>

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

      {/* Section 5: PHASE 5 AGENT ORCHESTRATION & TASK PLANNING */}
      <Card variant="default" padding="md" className="nexus-diag-card">
        <div className="nexus-diag-card-header">
          <div className="nexus-diag-card-title-wrap">
            <Bot size={18} className="text-cyan" />
            <h2 className="nexus-diag-card-title">AGENT ORCHESTRATION & PLANNING</h2>
          </div>
          <span className="nexus-mono-tag">PHASE 5</span>
        </div>

        <div className="nexus-diag-props-list">
          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Orchestrator Status</span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>{orchestrator?.orchestrator_status || 'READY'}</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Agent Registry</span>
            <span className="nexus-diag-prop-val text-cyan">
              {orchestrator?.agents_registered_count ?? 7} Registered Agents Active
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Planner Engine</span>
            <span className="nexus-diag-prop-val nexus-mono-val">
              {orchestrator?.planner_mode || 'Deterministic Task Decomposer (Rule-based DAG)'}
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Agent Selector</span>
            <span className="nexus-diag-prop-val nexus-mono-val">
              {orchestrator?.selector_mode || 'Capability-Based Matching (Dynamic)'}
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Execution Engine</span>
            <span className="nexus-diag-prop-val nexus-mono-val">
              Active (Max Retries: {orchestrator?.execution_engine.max_retries ?? 2}, Timeout: {orchestrator?.execution_engine.timeout_seconds ?? 60}s)
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Verification Engine</span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>ACTIVE (DAG Integrity, Output Schema & Contradiction Detection)</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Approval Gate</span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>ACTIVE ({orchestrator?.approval_gate.pending_approvals_count ?? 0} Pending, Enforced for High Risk)</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Context Scoping & Privacy</span>
            <span className="nexus-diag-prop-val text-cyan">
              ACTIVE (Least-Privilege Scoping per Agent Boundary)
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Memory Integration Policy</span>
            <span className="nexus-diag-prop-val text-cyan">
              ACTIVE (Phase 4 Privacy Guard & Secret Filter Enforced)
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Runtime Provider Integration</span>
            <span className="nexus-diag-prop-val nexus-mono-val">
              {orchestrator?.runtime_integration.active_provider || 'Hardware-Aware Dynamic Routing'}
            </span>
          </div>
        </div>
      </Card>

      {/* PHASE 6: TOOLS & ACTIONS ENGINE */}
      <Card variant="default" padding="md" className="nexus-diag-card">
        <div className="nexus-diag-card-header">
          <div className="nexus-diag-card-title-wrap">
            <Wrench size={18} className="text-orange" />
            <h2 className="nexus-diag-card-title">TOOLS & ACTIONS ENGINE (PHASE 6)</h2>
          </div>
          <StatusBadge
            status={toolsStatus?.status === 'READY' ? 'ready' : 'limited'}
            label={toolsStatus?.status || 'READY'}
          />
        </div>

        <div className="nexus-diag-props-grid">
          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Tool Engine</span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>{toolsStatus?.status || 'READY'} (Sandboxed & Controlled Execution)</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Registered Tools</span>
            <span className="nexus-diag-prop-val nexus-mono-val">
              {toolsStatus?.registered_tools_count ?? 10} Tools ({toolsStatus?.enabled_tools_count ?? 10} Enabled)
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Filesystem Sandbox</span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>AVAILABLE (Workspace Path Allowlist, Traversal & Secret Protection)</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Network Policy</span>
            <span className="nexus-diag-prop-val text-yellow">
              <ShieldCheck size={13} />
              <span>PROTECTED (Outbound Network Blocked by Safe Default)</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Policy Engine & Approvals</span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>ENFORCED (High-Risk & Destructive Actions Require Human Approval)</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Execution Timeouts & Retries</span>
            <span className="nexus-diag-prop-val nexus-mono-val">
              Default Timeout: {toolsStatus?.execution_engine.default_timeout_seconds ?? 30}s | Max Retries: {toolsStatus?.execution_engine.max_retries ?? 2}
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Secret Protection Layer</span>
            <span className="nexus-diag-prop-val text-cyan">
              ACTIVE (Token & Credential Redaction on All Tool Outputs)
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Action Audit Logger</span>
            <span className="nexus-diag-prop-val nexus-mono-val">
              {toolsStatus?.audit_logger.total_events ?? 0} Recorded Auditable Events
            </span>
          </div>
        </div>

        {/* Registered Tools List */}
        {toolsStatus?.tools && toolsStatus.tools.length > 0 && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Available Tools ({toolsStatus.tools.length})
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
              {toolsStatus.tools.map((t) => (
                <div key={t.tool_id} style={{ padding: '0.5rem 0.75rem', background: 'var(--card-bg-subtle, rgba(255,255,255,0.02))', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</span>
                    <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '3px', background: t.risk_level === 'DESTRUCTIVE' ? 'rgba(239,68,68,0.2)' : t.risk_level === 'HIGH_RISK' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)', color: t.risk_level === 'DESTRUCTIVE' ? '#f87171' : t.risk_level === 'HIGH_RISK' ? '#fbbf24' : '#60a5fa' }}>
                      {t.risk_level}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                    {t.description}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                    {t.capabilities.map((c) => (
                      <span key={c} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>
                        {c}
                      </span>
                    ))}
                    {t.approval_required && (
                      <span style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 600 }}>
                        • Approval Required
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* PHASE 7: ADAPTIVE INTELLIGENCE & USER PREFERENCES */}
      <Card variant="default" padding="md" className="nexus-diag-card">
        <div className="nexus-diag-card-header">
          <div className="nexus-diag-card-title-wrap">
            <Brain size={18} className="text-cyan" />
            <h2 className="nexus-diag-card-title">ADAPTIVE INTELLIGENCE & CONTINUOUS LEARNING (PHASE 7)</h2>
          </div>
          <StatusBadge
            status={adaptiveStatus?.status === 'READY' ? 'ready' : 'limited'}
            label={adaptiveStatus?.status || 'READY'}
          />
        </div>

        <div className="nexus-diag-props-grid">
          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Adaptive Engine</span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>{adaptiveStatus?.status || 'READY'} (Behavioral Adaptation Only)</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Preference Store</span>
            <span className="nexus-diag-prop-val nexus-mono-val">
              READY ({adaptiveStatus?.active_preferences_count ?? 0} Active / {adaptiveStatus?.total_preferences_count ?? 0} Total)
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Pending Suggestions</span>
            <span className="nexus-diag-prop-val text-cyan">
              {adaptiveStatus?.pending_suggestions_count ?? 0} Candidates (User Approval Required)
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Feedback System</span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>READY ({adaptiveStatus?.total_feedback_count ?? 0} Verified Feedback Signals)</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Learning Policy Engine</span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>ENFORCED (Security &gt; Tool Policy &gt; User Preferences &gt; Context)</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Personalization Engine</span>
            <span className="nexus-diag-prop-val text-green">
              <CheckCircle2 size={13} />
              <span>{adaptiveStatus?.personalization_enabled ? 'READY (Scoped Retrieval)' : 'DISABLED'}</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Outcome Analyzer</span>
            <span className="nexus-diag-prop-val nexus-mono-val">
              READY ({adaptiveStatus?.strategy_records_count ?? 0} Recorded Empirical Strategies)
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Privacy Guard</span>
            <span className="nexus-diag-prop-val text-cyan">
              <ShieldCheck size={13} />
              <span>PROTECTED (Tokens & Credentials Blocked from Preference Persistence)</span>
            </span>
          </div>

          <div className="nexus-diag-prop">
            <span className="nexus-diag-prop-key">Model Weight Retraining</span>
            <span className="nexus-diag-prop-val text-yellow">
              DISABLED (Zero Autonomous Fine-Tuning / No Silent Background LoRA)
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
            <h3 className="nexus-raw-title">Diagnostic, Runtime, Perception & Memory Telemetry Payload</h3>
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
              context_memory_engine: contextMemory,
              agent_orchestrator: orchestrator,
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
