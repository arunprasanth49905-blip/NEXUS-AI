import { useState, useEffect, useCallback } from 'react';
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
  CheckCircle2,
  Brain,
  Trash2,
  Plus,
  History,
  AlertCircle
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { NavPage, ContextInfo, SystemStatusType } from '../types';
import type { UserPreference, SuggestedPreferenceCandidate, LearningSettingsState } from '../types/adaptation.js';
import {
  getPreferences,
  createPreference,
  updatePreference,
  deletePreference,
  getCandidates,
  resolveCandidate,
  getLearningSettings,
  updateLearningSettings,
  getLearningHistory,
} from '../services/adaptation.js';
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
  const [activeSection, setActiveSection] = useState<'general' | 'ai' | 'personalization' | 'privacy' | 'runtime' | 'about'>('general');
  
  // Settings values
  const [themeMode, setThemeMode] = useState<'dark' | 'system'>('dark');
  const [compactUi, setCompactUi] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [aiTone, setAiTone] = useState<'concise' | 'technical' | 'balanced'>('balanced');
  const [strictLocalOnly, setStrictLocalOnly] = useState(true);
  const [zeroTelemetry, setZeroTelemetry] = useState(true);

  // Phase 7 Adaptive Intelligence State
  const [learningSettings, setLearningSettings] = useState<LearningSettingsState>({
    learning_enabled: true,
    session_learning_enabled: true,
    project_learning_enabled: true,
    long_term_preferences_enabled: true,
    feedback_enabled: true,
    personalization_enabled: true,
  });
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [candidates, setCandidates] = useState<SuggestedPreferenceCandidate[]>([]);
  const [adaptationHistory, setAdaptationHistory] = useState<
    Array<{ id: string; title: string; detail: string; timestamp: string; category: string }>
  >([]);
  
  // New preference form
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<string>('response_style');
  const [newScope, setNewScope] = useState<string>('USER');

  const loadAdaptationData = useCallback(async () => {
    try {
      const [settingsData, prefsData, candsData, histData] = await Promise.all([
        getLearningSettings(),
        getPreferences(),
        getCandidates(),
        getLearningHistory(),
      ]);
      if (settingsData) setLearningSettings(settingsData);
      setPreferences(prefsData);
      setCandidates(candsData);
      setAdaptationHistory(histData);
    } catch {
      // offline fallback
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'personalization') {
      loadAdaptationData();
    }
  }, [activeSection, loadAdaptationData]);

  const handleToggleLearningSetting = async (key: keyof LearningSettingsState) => {
    const updated = { ...learningSettings, [key]: !learningSettings[key] };
    setLearningSettings(updated);
    await updateLearningSettings(updated);
    onAddToast('Learning Settings Updated', `${String(key)} set to ${updated[key]}`, 'info');
  };

  const handleResolveCandidate = async (candidateId: string, accept: boolean) => {
    const success = await resolveCandidate(candidateId, accept);
    if (success) {
      onAddToast(
        accept ? 'Preference Saved' : 'Candidate Dismissed',
        accept ? 'Inferred suggestion converted to active preference.' : 'Candidate removed.',
        accept ? 'success' : 'info'
      );
      loadAdaptationData();
    }
  };

  const handleTogglePreference = async (pref: UserPreference) => {
    const success = await updatePreference(pref.preference_id, { enabled: !pref.enabled });
    if (success) {
      setPreferences((prev) =>
        prev.map((p) => (p.preference_id === pref.preference_id ? { ...p, enabled: !p.enabled } : p))
      );
      onAddToast('Preference Updated', `${pref.key} is now ${!pref.enabled ? 'active' : 'disabled'}.`, 'info');
    }
  };

  const handleDeletePreference = async (preferenceId: string) => {
    const success = await deletePreference(preferenceId);
    if (success) {
      setPreferences((prev) => prev.filter((p) => p.preference_id !== preferenceId));
      onAddToast('Preference Deleted', 'Preference removed permanently.', 'info');
    }
  };

  const handleCreateExplicitPreference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    const res = await createPreference({
      category: newCategory,
      key: newKey.trim(),
      value: newValue.trim(),
      scope: newScope,
    });

    if (res.success && res.preference) {
      setPreferences((prev) => [res.preference!, ...prev]);
      setNewKey('');
      setNewValue('');
      onAddToast('Preference Created', `Explicit rule for ${newKey} stored safely.`, 'success');
    } else {
      onAddToast('Could Not Save', res.error || 'Security or validation constraint violated', 'error');
    }
  };

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
            { id: 'personalization', label: 'Learning & Preferences', icon: <Brain size={16} /> },
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

          {/* PERSONALIZATION & ADAPTIVE INTELLIGENCE (PHASE 7) */}
          {activeSection === 'personalization' && (
            <div className="nexus-settings-section animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="nexus-section-heading">Adaptive Intelligence & User Preferences</h2>
                  <p className="nexus-section-subheading">
                    Control behavioral adaptation, explicit preferences, and continuous learning policies without model retraining.
                  </p>
                </div>
                <span className="nexus-badge-tag nexus-tag-cyan" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} />
                  Privacy Guard Enforced
                </span>
              </div>

              {/* Master & Scoped Toggles (Section 25) */}
              <Card variant="default" padding="md" className="nexus-settings-card">
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  LEARNING POLICY CONTROLS
                </h3>

                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <span className="nexus-setting-title">Adaptive Intelligence</span>
                    <span className="nexus-setting-desc">Allow NEXUS to adapt responses based on approved feedback and explicit rules.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="nexus-checkbox"
                    checked={learningSettings.learning_enabled}
                    onChange={() => handleToggleLearningSetting('learning_enabled')}
                  />
                </div>

                <div className="nexus-setting-divider" />

                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <span className="nexus-setting-title">Personalization Engine</span>
                    <span className="nexus-setting-desc">Apply relevant saved preferences into planning and prompt context.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="nexus-checkbox"
                    checked={learningSettings.personalization_enabled}
                    onChange={() => handleToggleLearningSetting('personalization_enabled')}
                  />
                </div>

                <div className="nexus-setting-divider" />

                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <span className="nexus-setting-title">Long-Term Preferences</span>
                    <span className="nexus-setting-desc">Persist user-level preferences across sessions.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="nexus-checkbox"
                    checked={learningSettings.long_term_preferences_enabled}
                    onChange={() => handleToggleLearningSetting('long_term_preferences_enabled')}
                  />
                </div>

                <div className="nexus-setting-divider" />

                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <span className="nexus-setting-title">Project-Level Learning</span>
                    <span className="nexus-setting-desc">Scope formatting and workflow preferences strictly to current active project.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="nexus-checkbox"
                    checked={learningSettings.project_learning_enabled}
                    onChange={() => handleToggleLearningSetting('project_learning_enabled')}
                  />
                </div>

                <div className="nexus-setting-divider" />

                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <span className="nexus-setting-title">Session-Only Learning</span>
                    <span className="nexus-setting-desc">Permit temporary conversational adaptations during active session only.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="nexus-checkbox"
                    checked={learningSettings.session_learning_enabled}
                    onChange={() => handleToggleLearningSetting('session_learning_enabled')}
                  />
                </div>

                <div className="nexus-setting-divider" />

                <div className="nexus-setting-row">
                  <div className="nexus-setting-info">
                    <span className="nexus-setting-title">Feedback Collection</span>
                    <span className="nexus-setting-desc">Collect thumbs up/down signals to adapt task strategies.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="nexus-checkbox"
                    checked={learningSettings.feedback_enabled}
                    onChange={() => handleToggleLearningSetting('feedback_enabled')}
                  />
                </div>
              </Card>

              {/* Inferred Preference Candidates (Section 8 & 38) */}
              {candidates.length > 0 && (
                <Card variant="elevated" padding="md" style={{ borderLeft: '3px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <AlertCircle size={16} className="text-cyan" />
                    <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      SUGGESTED PREFERENCES ({candidates.length} Pending Approval)
                    </h3>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    NEXUS noticed behavioral patterns during recent tasks. Suggestions require your explicit approval before being saved.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {candidates.map((c) => (
                      <div
                        key={c.candidate_id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px',
                          background: 'var(--bg-surface-elevated)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                            {c.key}: <span style={{ color: 'var(--accent-primary-hover)' }}>{c.value}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{c.rationale}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleResolveCandidate(c.candidate_id, true)}
                          >
                            Save Preference
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolveCandidate(c.candidate_id, false)}
                          >
                            Ignore
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Add Explicit Preference (Section 6 & 7) */}
              <Card variant="default" padding="md">
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  ADD EXPLICIT USER PREFERENCE
                </h3>
                <form onSubmit={handleCreateExplicitPreference} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      style={{ width: '100%', padding: '6px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '12px' }}
                    >
                      <option value="response_style">Response Style</option>
                      <option value="explanation_depth">Explanation Depth</option>
                      <option value="output_format">Output Format</option>
                      <option value="language">Language</option>
                      <option value="workflow">Workflow</option>
                      <option value="tool_behavior">Tool Behavior</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Preference Key</label>
                    <input
                      type="text"
                      placeholder="e.g. explanation_level"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      style={{ width: '100%', padding: '6px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Value</label>
                    <input
                      type="text"
                      placeholder="e.g. simple"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      style={{ width: '100%', padding: '6px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Scope</label>
                    <select
                      value={newScope}
                      onChange={(e) => setNewScope(e.target.value)}
                      style={{ width: '100%', padding: '6px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '12px' }}
                    >
                      <option value="USER">User (Global)</option>
                      <option value="PROJECT">Project Scoped</option>
                      <option value="TASK">Task Scoped</option>
                      <option value="SESSION">Session Only</option>
                    </select>
                  </div>

                  <Button type="submit" variant="primary" size="sm" leftIcon={<Plus size={14} />}>
                    Save Rule
                  </Button>
                </form>
              </Card>

              {/* Saved Preferences List (Section 25 & 26) */}
              <Card variant="default" padding="md">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    SAVED PREFERENCES ({preferences.length})
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Data priority: Security &gt; Tool Policy &gt; Preferences &gt; Task Context
                  </span>
                </div>

                {preferences.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    No preferences saved yet. Speak to NEXUS (e.g. &ldquo;Always explain things simply&rdquo;) or add one above.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {preferences.map((p) => (
                      <div
                        key={p.preference_id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: 'var(--bg-surface-elevated)',
                          borderRadius: 'var(--radius-sm)',
                          borderLeft: p.enabled ? '3px solid var(--accent-green)' : '3px solid var(--text-tertiary)',
                          opacity: p.enabled ? 1 : 0.6,
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                              {p.key}: <span style={{ color: 'var(--accent-primary-hover)' }}>{p.value}</span>
                            </span>
                            <span className="nexus-badge-tag" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                              {p.scope}
                            </span>
                            <span className="nexus-badge-tag" style={{ fontSize: '10px' }}>
                              {p.category}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Source: {p.source.replace(/_/g, ' ')} • Created: {new Date(p.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePreference(p)}
                          >
                            {p.enabled ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeletePreference(p.preference_id)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Adaptation History (Section 28) */}
              <Card variant="default" padding="md">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <History size={15} className="text-blue" />
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    ADAPTATION HISTORY
                  </h3>
                </div>

                {adaptationHistory.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    No adaptation events recorded yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                    {adaptationHistory.slice(0, 10).map((h) => (
                      <div
                        key={h.id}
                        style={{
                          fontSize: '12px',
                          padding: '6px 10px',
                          background: 'var(--bg-surface-elevated)',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{h.title}</span>
                          <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{h.detail}</span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          {new Date(h.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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
                    <span className="nexus-about-val">0.4.0</span>
                  </div>
                  <div className="nexus-about-item">
                    <span className="nexus-about-label">ARCHITECTURE PHASE</span>
                    <span className="nexus-about-val text-blue">Phase 4: Context & Memory</span>
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
