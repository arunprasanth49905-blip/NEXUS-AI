import React, { useState, useEffect } from 'react';
import { 
  Activity as ActivityIcon, 
  MessageSquare, 
  FolderGit2, 
  Terminal, 
  Clock, 
  Download, 
  Trash2, 
  Info,
  CheckCircle2,
  Bot,
  Wrench
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import type { ActivityEntry } from '../types';
import { agentService } from '../services/agent';
import { toolService } from '../services/tool';
import './Activity.css';

export interface ActivityProps {
  onAddToast: (title: string, description?: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const Activity: React.FC<ActivityProps> = ({ onAddToast }) => {
  const [filter, setFilter] = useState<string>('all');
  const [activities, setActivities] = useState<ActivityEntry[]>([
    {
      id: 'a-p5-1',
      timestamp: 'Today, 11:15 AM',
      relativeTime: '11:15',
      title: 'Verification completed',
      category: 'agent',
      details: 'All 4 plan steps verified successfully with valid DAG integrity.',
      isDemo: true,
    },
    {
      id: 'a-p5-2',
      timestamp: 'Today, 11:14 AM',
      relativeTime: '11:14',
      title: 'Execution is waiting for approval',
      category: 'agent',
      details: 'Elevated risk action paused pending user approval gate confirmation.',
      isDemo: true,
    },
    {
      id: 'a-p5-3',
      timestamp: 'Today, 11:12 AM',
      relativeTime: '11:12',
      title: 'Knowledge Agent extracted key findings',
      category: 'agent',
      details: 'Synthesized architectural report insights and identified technical gaps.',
      isDemo: true,
    },
    {
      id: 'a-p5-4',
      timestamp: 'Today, 11:10 AM',
      relativeTime: '11:10',
      title: 'Document Agent completed analysis',
      category: 'agent',
      details: 'Processed report document and extracted structured sections and tables.',
      isDemo: true,
    },
    {
      id: 'a-p5-5',
      timestamp: 'Today, 11:09 AM',
      relativeTime: '11:09',
      title: 'Document Agent started analyzing the report',
      category: 'agent',
      details: 'Initiated Phase 3 document perception and markdown/table extraction.',
      isDemo: true,
    },
    {
      id: 'a-1',
      timestamp: 'Today, 10:42 AM',
      relativeTime: '10:42',
      title: 'Asked NEXUS to explain an error',
      category: 'query',
      details: 'Query processed via local baseline edge pipeline.',
      isDemo: true,
    },
    {
      id: 'a-2',
      timestamp: 'Today, 09:15 AM',
      relativeTime: '09:15',
      title: 'Opened NEXUS EDGE',
      category: 'session',
      details: 'Initialized UI shell, mounted local diagnostics listeners.',
      isDemo: true,
    },
    {
      id: 'a-3',
      timestamp: 'Yesterday, 04:30 PM',
      relativeTime: 'Yesterday',
      title: 'Analyzed project information',
      category: 'context',
      details: 'Validated workspace boundary specifications and files.',
      isDemo: true,
    },
    {
      id: 'a-4',
      timestamp: 'Yesterday, 02:15 PM',
      relativeTime: 'Yesterday',
      title: 'System Diagnostics Health Ping',
      category: 'system',
      details: 'Verified local host OS, RAM, and truthful acceleration readiness.',
      isDemo: true,
    },
    {
      id: 'a-5',
      timestamp: 'Sep 24, 2026',
      relativeTime: 'Sep 24',
      title: 'Initial workspace repository initialized',
      category: 'context',
      details: 'Configured local directory boundaries and zero telemetry rules.',
      isDemo: true,
    },
  ]);

  useEffect(() => {
    // Load authentic execution records from backend if present
    Promise.all([
      agentService.getExecutions().catch(() => ({ executions: [] })),
      toolService.getActions().catch(() => ({ actions: [] })),
    ]).then(([agentRes, toolRes]) => {
      const liveEntries: ActivityEntry[] = [];

      if (agentRes.executions && agentRes.executions.length > 0) {
        for (const e of agentRes.executions) {
          liveEntries.push({
            id: `exec-${e.execution_id}`,
            timestamp: new Date(e.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            relativeTime: 'Recent',
            title: `${e.agent_id} completed step ${e.step_id || ''}`,
            category: 'agent',
            details: `Status: ${e.status}. Latency/Execution recorded in local orchestrator.`,
            isDemo: false,
          });
        }
      }

      if (toolRes.actions && toolRes.actions.length > 0) {
        for (const a of toolRes.actions) {
          liveEntries.push({
            id: `action-${a.audit_id}`,
            timestamp: new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            relativeTime: 'Recent',
            title: `${a.action}`,
            category: 'action',
            details: `Tool: ${a.tool_id} | Status: ${a.execution_status} | Risk: ${a.risk_level} | Duration: ${a.duration_ms}ms`,
            isDemo: false,
          });
        }
      }

      if (liveEntries.length > 0) {
        setActivities((prev) => [...liveEntries, ...prev.filter((p) => p.isDemo)]);
      }
    });
  }, []);

  const filtered = activities.filter((item) => {
    if (filter === 'all') return true;
    return item.category === filter;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'action':
        return <Wrench size={15} className="text-orange" />;
      case 'agent':
      case 'orchestration':
        return <Bot size={15} className="text-cyan" />;
      case 'query':
        return <MessageSquare size={15} className="text-blue" />;
      case 'context':
        return <FolderGit2 size={15} className="text-cyan" />;
      case 'system':
        return <Terminal size={15} className="text-amber" />;
      default:
        return <ActivityIcon size={15} className="text-secondary" />;
    }
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activities, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nexus_edge_activity_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onAddToast('Activity log exported', 'Saved local activity records to JSON file.', 'success');
  };

  const handleClear = () => {
    setActivities([]);
    onAddToast('Activity log cleared', 'All local activity entries have been reset.', 'info');
  };

  // Group by timeframe
  const groups: { [key: string]: ActivityEntry[] } = {};
  filtered.forEach((act) => {
    let groupKey = 'Earlier';
    if (act.timestamp.startsWith('Today')) groupKey = 'Today';
    else if (act.timestamp.startsWith('Yesterday')) groupKey = 'Yesterday';

    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(act);
  });

  return (
    <div className="nexus-activity-page animate-fade-in">
      <PageHeader
        title="ACTIVITY"
        subtitle="Chronological audit of queries, context state, and system operations."
        actions={
          activities.length > 0 ? (
            <div className="nexus-activity-header-actions">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download size={14} />}
                onClick={handleExport}
              >
                Export JSON
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 size={14} />}
                onClick={handleClear}
              >
                Clear
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Transparency Note */}
      <div className="nexus-activity-notice">
        <Info size={15} className="text-cyan" />
        <span>
          Sample demonstration activity entries are explicitly marked with the <strong>Demo</strong> badge. Real runtime events are logged locally.
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="nexus-activity-filter-bar">
        {[
          { id: 'all', label: 'All Activity' },
          { id: 'action', label: 'Tools & Actions' },
          { id: 'agent', label: 'Agents & Plans' },
          { id: 'query', label: 'Queries' },
          { id: 'context', label: 'Context Events' },
          { id: 'system', label: 'System & Diagnostics' },
          { id: 'session', label: 'Sessions' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`nexus-activity-filter-btn ${filter === tab.id ? 'nexus-filter-btn-active' : ''}`}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline or Empty State */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Clock size={24} />}
          title="No activity yet."
          description="Local interactions, diagnostic checks, and queries will appear in this timeline as you use NEXUS EDGE."
          actionLabel={activities.length === 0 ? 'Restore Demo Activity' : 'Show All Categories'}
          onAction={() => {
            if (activities.length === 0) {
              setActivities([
                {
                  id: 'a-1',
                  timestamp: 'Today, 10:42 AM',
                  relativeTime: '10:42',
                  title: 'Asked NEXUS to explain an error',
                  category: 'query',
                  details: 'Query processed via local baseline edge pipeline.',
                  isDemo: true,
                },
                {
                  id: 'a-2',
                  timestamp: 'Today, 09:15 AM',
                  relativeTime: '09:15',
                  title: 'Opened NEXUS EDGE',
                  category: 'session',
                  details: 'Initialized UI shell, mounted local diagnostics listeners.',
                  isDemo: true,
                },
              ]);
            } else {
              setFilter('all');
            }
          }}
        />
      ) : (
        <div className="nexus-activity-groups">
          {Object.entries(groups).map(([groupTitle, items]) => (
            <div key={groupTitle} className="nexus-activity-group">
              <span className="nexus-group-title">{groupTitle}</span>
              <div className="nexus-group-items">
                {items.map((item) => (
                  <Card key={item.id} variant="default" padding="sm" className="nexus-activity-item-card">
                    <div className="nexus-act-row">
                      <div className="nexus-act-time-box">
                        <span className="nexus-act-time">{item.relativeTime}</span>
                      </div>

                      <div className="nexus-act-icon-box">{getCategoryIcon(item.category)}</div>

                      <div className="nexus-act-content">
                        <div className="nexus-act-title-row">
                          <span className="nexus-act-title">{item.title}</span>
                          {item.isDemo && (
                            <span className="nexus-demo-badge" title="Sample demonstration record">
                              Demo
                            </span>
                          )}
                        </div>
                        {item.details && <p className="nexus-act-details">{item.details}</p>}
                      </div>

                      <span className="nexus-act-status">
                        <CheckCircle2 size={12} className="text-green" />
                        <span>Logged</span>
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
