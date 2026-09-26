import React, { useState } from 'react';
import { 
  Mic, 
  Paperclip, 
  ArrowRight, 
  HelpCircle, 
  FileText, 
  Bug, 
  FileSpreadsheet, 
  ListOrdered, 
  Clock, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import type { ContextInfo, ActivityEntry, NavPage } from '../types';
import { ContextIndicator } from '../components/ui/ContextIndicator';
import { Card } from '../components/ui/Card';
import './Home.css';

export interface HomeProps {
  context: ContextInfo;
  onNavigate: (page: NavPage) => void;
  onStartConversation: (initialQuery: string) => void;
}

export const Home: React.FC<HomeProps> = ({
  context,
  onNavigate,
  onStartConversation,
}) => {
  const [queryInput, setQueryInput] = useState('');

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning.';
    if (hour < 18) return 'Good afternoon.';
    return 'Good evening.';
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    onStartConversation(queryInput.trim());
  };

  const quickActions = [
    {
      id: 'explain',
      label: 'Explain something',
      description: 'Break down complex concepts or code',
      prompt: 'Explain how local edge inference works with low memory footprint.',
      icon: <HelpCircle size={18} className="nexus-action-icon text-blue" />,
    },
    {
      id: 'analyze',
      label: 'Analyze a document',
      description: 'Review technical docs and specs',
      prompt: 'Analyze the system architecture requirements for Phase 1.',
      icon: <FileText size={18} className="nexus-action-icon text-cyan" />,
    },
    {
      id: 'debug',
      label: 'Help me debug',
      description: 'Identify issues and trace errors',
      prompt: 'Help me debug an unexpected connection timeout in local runtime.',
      icon: <Bug size={18} className="nexus-action-icon text-amber" />,
    },
    {
      id: 'summarize',
      label: 'Summarize',
      description: 'Condense logs, notes, or briefings',
      prompt: 'Summarize the primary objectives of the edge computing roadmap.',
      icon: <FileSpreadsheet size={18} className="nexus-action-icon text-green" />,
    },
    {
      id: 'plan',
      label: 'Plan something',
      description: 'Outline steps, milestones, or tests',
      prompt: 'Plan the verification checklist for Phase 1 user interface components.',
      icon: <ListOrdered size={18} className="nexus-action-icon text-purple" />,
    },
  ];

  const recentInteractions: ActivityEntry[] = [
    {
      id: 'act-1',
      timestamp: 'Today, 10:42 AM',
      relativeTime: '10:42',
      title: 'Asked NEXUS to explain system memory boundary',
      category: 'query',
      details: 'Reviewed local-only privacy isolation mechanism',
      isDemo: true,
    },
    {
      id: 'act-2',
      timestamp: 'Today, 09:15 AM',
      relativeTime: '09:15',
      title: 'Opened NEXUS EDGE session',
      category: 'session',
      details: 'Initialized local runtime shell & diagnostics service',
      isDemo: true,
    },
    {
      id: 'act-3',
      timestamp: 'Yesterday, 04:30 PM',
      relativeTime: 'Yesterday',
      title: 'Analyzed project knowledge baseline',
      category: 'context',
      details: 'Registered 3 local workspace document references',
      isDemo: true,
    },
  ];

  return (
    <div className="nexus-home-container animate-fade-in">
      {/* Hero Section */}
      <section className="nexus-home-hero" aria-label="Welcome and Overview">
        <div className="nexus-home-brand-pill">
          <Sparkles size={12} className="text-cyan" />
          <span>Local-first Edge AI Workspace</span>
        </div>

        <h1 className="nexus-home-title">
          <span className="nexus-home-greeting">{getGreeting()}</span>
          <span className="nexus-home-question">What would you like to accomplish?</span>
        </h1>

        <p className="nexus-home-tagline">
          Understand what you&apos;re doing. Get intelligent help. Keep your data private.
        </p>

        {/* Primary Prompt Search Composer */}
        <form className="nexus-home-composer-box" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            className="nexus-home-composer-input"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Ask NEXUS anything..."
            aria-label="Ask NEXUS anything"
          />

          <div className="nexus-home-composer-controls">
            <button
              type="button"
              className="nexus-home-composer-btn"
              title="Voice Input (multimodal perception planned for Phase 3)"
              aria-label="Voice input - Phase 3"
              onClick={() => onStartConversation('Explain voice perception roadmap in Phase 3.')}
            >
              <Mic size={17} />
            </button>
            <button
              type="button"
              className="nexus-home-composer-btn"
              title="Attach Document or Code (Phase 1 local reference)"
              aria-label="Attach document"
              onClick={() => onNavigate('knowledge')}
            >
              <Paperclip size={17} />
            </button>
            <button
              type="submit"
              className="nexus-home-submit-btn"
              disabled={!queryInput.trim()}
              aria-label="Submit query to NEXUS"
            >
              <ArrowRight size={17} />
            </button>
          </div>
        </form>

        {/* Quick Action Tiles */}
        <div className="nexus-home-quick-actions" aria-label="Quick Actions">
          <span className="nexus-quick-actions-label">QUICK ACTIONS</span>
          <div className="nexus-quick-grid">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="nexus-quick-card"
                onClick={() => onStartConversation(action.prompt)}
              >
                <div className="nexus-quick-icon-wrap">{action.icon}</div>
                <div className="nexus-quick-text-wrap">
                  <span className="nexus-quick-label">{action.label}</span>
                  <span className="nexus-quick-desc">{action.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Current Context Section */}
      <section className="nexus-home-context-section" aria-label="Current Context">
        <ContextIndicator context={context} />
      </section>

      {/* Recent Activity Section */}
      <section className="nexus-home-recent-section" aria-label="Recent Activity">
        <div className="nexus-section-header">
          <div className="nexus-section-title-wrap">
            <Clock size={16} className="text-secondary" />
            <h2 className="nexus-section-title">Recent Activity</h2>
          </div>
          <button
            type="button"
            className="nexus-link-btn"
            onClick={() => onNavigate('activity')}
          >
            <span>View all activity</span>
            <ExternalLink size={12} />
          </button>
        </div>

        <div className="nexus-recent-timeline">
          {recentInteractions.map((item) => (
            <Card
              key={item.id}
              variant="interactive"
              padding="sm"
              className="nexus-recent-card"
              onClick={() => onNavigate('activity')}
            >
              <div className="nexus-recent-item-row">
                <div className="nexus-recent-time-col">
                  <span className="nexus-recent-time">{item.relativeTime}</span>
                </div>

                <div className="nexus-recent-body">
                  <div className="nexus-recent-title-line">
                    <span className="nexus-recent-title">{item.title}</span>
                    {item.isDemo && (
                      <span className="nexus-demo-badge" title="Verified interface demonstration data">
                        Demo
                      </span>
                    )}
                  </div>
                  {item.details && <p className="nexus-recent-details">{item.details}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};
