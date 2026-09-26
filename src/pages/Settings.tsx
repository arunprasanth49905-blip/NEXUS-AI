import { useState } from 'react';
import { 
  Sliders, 
  ShieldCheck, 
  Cpu, 
  Info, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Check, 
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { NavPage, ContextInfo, SystemStatusType } from '../types';
import './Settings.css';

export interface SettingsProps {
  context: ContextInfo;
  systemStatus: SystemStatusType;
  isBackendConnected: boolean;
  onNavigate: (page: NavPage) => void;
  onAddToast: (title: string, description?: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const Settings: React.FC<SettingsProps> = ({
  context,
  systemStatus,
  isBackendConnected,
  onNavigate,
  onAddToast,
}) => {
  const [activeSection, setActiveSection] = useState<'general' | 'ai' | 'privacy' | 'runtime' | 'about'>('general');
  
  // Settings values
  const [themeMode, setThemeMode] = useState<'dark' | 'system'>('dark');
  const [compactUi, setCompactUi] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [aiTone, setAiTone] = useState<'concise' | 'technical' | 'balanced'>('balanced');
  const [strictLocalOnly, setStrictLocalOnly] = useState(true);
  const [zeroTelemetry, setZeroTelemetry] = useState(true);

  const handleSaveSettings = () => {
    onAddToast('Preferences saved', 'Local settings successfully updated.', 'success');
  };

  const handleResetSettings = () => {
    setThemeMode('dark');
    setCompactUi(false);
    setNotifications(true);
    setAiTone('balanced');
    setStrictLocalOnly(true);
    setZeroTelemetry(true);
    onAddToast('Reset defaults', 'Settings restored to industrial defaults.', 'info');
  };

  return (
    <div className="nexus-settings-page animate-fade-in">
      <PageHeader
        title="SETTINGS"
        subtitle="Manage interface appearance, local privacy boundaries, and edge configuration."
        actions={
          <div className="nexus-settings-header-actions">
            <Button variant="ghost" size="sm" onClick={handleResetSettings} leftIcon={<RotateCcw size={13} />}>
              Restore Defaults
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveSettings} leftIcon={<Check size={14} />}>
              Save Changes
            </Button>
          </div>
        }
      />

      <div className="nexus-settings-layout">
        {/* Settings Sub-Navigation */}
        <aside className="nexus-settings-nav" aria-label="Settings Categories">
          {[
            { id: 'general', label: 'General', icon: <Sliders size={16} /> },
            { id: 'ai', label: 'AI Behavior', icon: <Sparkles size={16} /> },
            { id: 'privacy', label: 'Privacy & Data', icon: <ShieldCheck size={16} /> },
            { id: 'runtime', label: 'Runtime & Edge', icon: <Cpu size={16} /> },
            { id: 'about', label: 'About NEXUS EDGE', icon: <Info size={16} /> },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nexus-settings-nav-item ${activeSection === item.id ? 'nexus-settings-nav-active' : ''}`}
              onClick={() => setActiveSection(item.id as typeof activeSection)}
            >
              <span className="nexus-settings-nav-icon">{item.icon}</span>
              <span className="nexus-settings-nav-label">{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Settings Content Area */}
        <div className="nexus-settings-content">
          {/* GENERAL */}
          {activeSection === 'general' && (
            <div className="nexus-settings-section animate-fade-in">
              <h2 className="nexus-section-heading">General Preferences</h2>
              <p className="nexus-section-subheading">Customize appearance, display density, and notification alerts.</p>

              <Card variant="default" padding="md" className="nexus-settings-card">
                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <span className="nexus-setting-title">Interface Theme</span>
                    <span className="nexus-setting-desc">Tailored charcoal near-black palette engineered for prolonged focus.</span>
                  </div>
                  <div className="nexus-setting-control">
                    <div className="nexus-pill-toggle">
                      <button
                        type="button"
                        className={`nexus-pill-opt ${themeMode === 'dark' ? 'nexus-pill-active' : ''}`}
                        onClick={() => setThemeMode('dark')}
                      >
                        Charcoal Dark
                      </button>
                      <button
                        type="button"
                        className={`nexus-pill-opt ${themeMode === 'system' ? 'nexus-pill-active' : ''}`}
                        onClick={() => setThemeMode('system')}
                      >
                        System Sync
                      </button>
                    </div>
                  </div>
                </div>

                <div className="nexus-setting-divider" />

                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <span className="nexus-setting-title">Compact Workspace Density</span>
                    <span className="nexus-setting-desc">Tighter vertical padding for higher information density.</span>
                  </div>
                  <div className="nexus-setting-control">
                    <input
                      type="checkbox"
                      id="toggle-compact"
                      className="nexus-checkbox"
                      checked={compactUi}
                      onChange={(e) => setCompactUi(e.target.checked)}
                    />
                    <label htmlFor="toggle-compact" className="nexus-toggle-label">
                      {compactUi ? 'Enabled' : 'Disabled'}
                    </label>
                  </div>
                </div>

                <div className="nexus-setting-divider" />

                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <span className="nexus-setting-title">System Status Notifications</span>
                    <span className="nexus-setting-desc">Display in-app toast alerts for connection and file operations.</span>
                  </div>
                  <div className="nexus-setting-control">
                    <input
                      type="checkbox"
                      id="toggle-notifs"
                      className="nexus-checkbox"
                      checked={notifications}
                      onChange={(e) => setNotifications(e.target.checked)}
                    />
                    <label htmlFor="toggle-notifs" className="nexus-toggle-label">
                      {notifications ? 'Enabled' : 'Disabled'}
                    </label>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* AI BEHAVIOR */}
          {activeSection === 'ai' && (
            <div className="nexus-settings-section animate-fade-in">
              <h2 className="nexus-section-heading">AI Interaction Behavior</h2>
              <p className="nexus-section-subheading">Configure output tone, context constraints, and reasoning policies.</p>

              <Card variant="default" padding="md" className="nexus-settings-card">
                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <span className="nexus-setting-title">Response Tone Profile</span>
                    <span className="nexus-setting-desc">Governs verbosity and technical depth of assistant responses.</span>
                  </div>
                  <div className="nexus-setting-control">
                    <div className="nexus-pill-toggle">
                      {(['concise', 'balanced', 'technical'] as const).map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          className={`nexus-pill-opt ${aiTone === tone ? 'nexus-pill-active' : ''}`}
                          onClick={() => setAiTone(tone)}
                        >
                          {tone.charAt(0).toUpperCase() + tone.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="nexus-setting-divider" />

                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <span className="nexus-setting-title">AI Engine Pipeline</span>
                    <span className="nexus-setting-desc">Phase 1 provides the interaction UX and system shell.</span>
                  </div>
                  <span className="nexus-badge-tag">Phase 2 Target: Local Edge Model</span>
                </div>
              </Card>
            </div>
          )}

          {/* PRIVACY */}
          {activeSection === 'privacy' && (
            <div className="nexus-settings-section animate-fade-in">
              <h2 className="nexus-section-heading">Privacy & Edge Guardrails</h2>
              <p className="nexus-section-subheading">Enforce local-only execution boundaries and zero external data relay.</p>

              <Card variant="default" padding="md" className="nexus-settings-card">
                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <div className="nexus-privacy-lock-title">
                      <Lock size={15} className="text-cyan" />
                      <span className="nexus-setting-title">Strict Local Edge Perimeter</span>
                    </div>
                    <span className="nexus-setting-desc">All prompt evaluations and diagnostics stay inside host hardware.</span>
                  </div>
                  <div className="nexus-setting-control">
                    <input
                      type="checkbox"
                      id="toggle-strict-local"
                      className="nexus-checkbox"
                      checked={strictLocalOnly}
                      onChange={(e) => setStrictLocalOnly(e.target.checked)}
                    />
                    <label htmlFor="toggle-strict-local" className="nexus-lock-pill">
                      <CheckCircle2 size={12} className="text-green" />
                      <span>{strictLocalOnly ? 'Enforced' : 'Relaxed'}</span>
                    </label>
                  </div>
                </div>

                <div className="nexus-setting-divider" />

                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <span className="nexus-setting-title">Zero Cloud Telemetry</span>
                    <span className="nexus-setting-desc">No queries, diagnostics, or document contents are transmitted outside.</span>
                  </div>
                  <div className="nexus-setting-control">
                    <input
                      type="checkbox"
                      id="toggle-telemetry"
                      className="nexus-checkbox"
                      checked={zeroTelemetry}
                      onChange={(e) => setZeroTelemetry(e.target.checked)}
                    />
                    <label htmlFor="toggle-telemetry" className="nexus-lock-pill">
                      <CheckCircle2 size={12} className="text-green" />
                      <span>{zeroTelemetry ? 'Active' : 'Disabled'}</span>
                    </label>
                  </div>
                </div>

                <div className="nexus-setting-divider" />

                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <span className="nexus-setting-title">Local Session Cache</span>
                    <span className="nexus-setting-desc">Purge temporary conversation threads and local cache entries.</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddToast('Cache Purged', 'Local browser storage sanitized.', 'info')}
                  >
                    Purge Cache
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* RUNTIME */}
          {activeSection === 'runtime' && (
            <div className="nexus-settings-section animate-fade-in">
              <h2 className="nexus-section-heading">Runtime & Execution Environment</h2>
              <p className="nexus-section-subheading">Review local process state and access low-level engineering diagnostics.</p>

              <Card variant="default" padding="md" className="nexus-settings-card">
                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <span className="nexus-setting-title">Local Edge AI Runtime</span>
                    <span className="nexus-setting-desc">Hardware-aware engine at /api/v1/runtime. Status: {systemStatus.toUpperCase()}</span>
                  </div>
                  <span className={`nexus-badge-tag ${isBackendConnected ? 'nexus-tag-green' : 'nexus-tag-amber'}`}>
                    {isBackendConnected ? 'Online (Phase 2 Active)' : 'Standalone (Offline)'}
                  </span>
                </div>

                <div className="nexus-setting-divider" />

                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <span className="nexus-setting-title">Current Workspace Context</span>
                    <span className="nexus-setting-desc">Active project: {context.project} • Runtime: {context.runtime} • Model: {context.active_model || 'nexus-edge-intent-v1'}</span>
                  </div>
                  <span className="nexus-badge-tag">Hardware-Aware Engine</span>
                </div>

                <div className="nexus-setting-divider" />

                {/* Important Link to Advanced Diagnostics */}
                <div className="nexus-diag-callout-card">
                  <div className="nexus-diag-callout-content">
                    <h3 className="nexus-diag-callout-title">Advanced Engineering Diagnostics</h3>
                    <p className="nexus-diag-callout-desc">
                      Inspect authentic host operating system, physical cores, memory usage, and hardware acceleration states.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => onNavigate('diagnostics')}
                    rightIcon={<ArrowRight size={15} />}
                  >
                    Open Diagnostics
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ABOUT */}
          {activeSection === 'about' && (
            <div className="nexus-settings-section animate-fade-in">
              <h2 className="nexus-section-heading">About NEXUS EDGE</h2>
              <p className="nexus-section-subheading">Context-aware edge AI operating platform.</p>

              <Card variant="default" padding="md" className="nexus-settings-card">
                <div className="nexus-about-header">
                  <div className="nexus-brand-logo-large">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M4 18V6L12 14L20 6V18" stroke="#3b82f6" />
                      <circle cx="20" cy="18" r="2" fill="#06b6d4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="nexus-about-product">NEXUS EDGE</h3>
                    <p className="nexus-about-tagline">&ldquo;Understand what you&apos;re doing. Get intelligent help. Keep your data private.&rdquo;</p>
                  </div>
                </div>

                <div className="nexus-setting-divider" />

                <div className="nexus-about-grid">
                  <div className="nexus-about-item">
                    <span className="nexus-about-label">VERSION</span>
                    <span className="nexus-about-val">0.2.0</span>
                  </div>
                  <div className="nexus-about-item">
                    <span className="nexus-about-label">ARCHITECTURE PHASE</span>
                    <span className="nexus-about-val text-blue">Phase 2: AI Runtime Engine</span>
                  </div>
                  <div className="nexus-about-item">
                    <span className="nexus-about-label">TARGET PLATFORM</span>
                    <span className="nexus-about-val">Snapdragon / Edge Host Runtime</span>
                  </div>
                  <div className="nexus-about-item">
                    <span className="nexus-about-label">RELEASE STAGE</span>
                    <span className="nexus-about-val">Commercial Grade Prototype</span>
                  </div>
                </div>

                <div className="nexus-setting-divider" />

                <div className="nexus-roadmap-box">
                  <span className="nexus-roadmap-title">ENGINEERING ROADMAP</span>
                  <div className="nexus-roadmap-steps">
                    <div className="nexus-roadmap-step nexus-step-current">
                      <span className="nexus-step-num">01</span>
                      <span className="nexus-step-name">Product Foundation + Shell (Current)</span>
                    </div>
                    <div className="nexus-roadmap-step">
                      <span className="nexus-step-num">02</span>
                      <span className="nexus-step-name">Edge AI Runtime & Local Model</span>
                    </div>
                    <div className="nexus-roadmap-step">
                      <span className="nexus-step-num">03</span>
                      <span className="nexus-step-name">Multimodal Perception (Voice/Vision)</span>
                    </div>
                    <div className="nexus-roadmap-step">
                      <span className="nexus-step-num">04</span>
                      <span className="nexus-step-name">Context & Memory RAG</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
