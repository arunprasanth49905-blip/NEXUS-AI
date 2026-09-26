import React from 'react';
import { 
  Home, 
  MessageSquare, 
  Bookmark,
  BookOpen, 
  Activity, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Shield
} from 'lucide-react';
import type { NavPage, SystemStatusType } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import './Sidebar.css';

export interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  systemStatus: SystemStatusType;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  systemStatus,
}) => {
  const navItems: Array<{ id: NavPage; label: string; icon: React.ReactNode; shortcut: string }> = [
    { id: 'home', label: 'Home', icon: <Home size={18} />, shortcut: 'Alt+1' },
    { id: 'ask-nexus', label: 'Ask NEXUS', icon: <MessageSquare size={18} />, shortcut: 'Alt+2' },
    { id: 'memory', label: 'Memory', icon: <Bookmark size={18} />, shortcut: 'Alt+M' },
    { id: 'knowledge', label: 'Knowledge', icon: <BookOpen size={18} />, shortcut: 'Alt+3' },
    { id: 'activity', label: 'Activity', icon: <Activity size={18} />, shortcut: 'Alt+4' },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} />, shortcut: 'Alt+5' },
  ];

  return (
    <aside
      className={`nexus-sidebar ${isCollapsed ? 'nexus-sidebar-collapsed' : ''}`}
      aria-label="Main Navigation"
    >
      {/* Brand Header */}
      <div className="nexus-sidebar-header">
        <button
          type="button"
          className="nexus-brand-btn"
          onClick={() => onNavigate('home')}
          title="NEXUS EDGE Home"
        >
          <div className="nexus-brand-logo">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 18V6L12 14L20 6V18" stroke="#3b82f6" />
              <circle cx="20" cy="18" r="2" fill="#06b6d4" />
            </svg>
          </div>
          {!isCollapsed && (
            <div className="nexus-brand-meta">
              <span className="nexus-brand-title">NEXUS EDGE</span>
              <span className="nexus-brand-tag">EDGE RUNTIME</span>
            </div>
          )}
        </button>

        <button
          type="button"
          className="nexus-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="nexus-nav-list" role="navigation">
        {navItems.map((item) => {
          const isActive = currentPage === item.id || (item.id === 'settings' && currentPage === 'diagnostics');
          return (
            <button
              key={item.id}
              type="button"
              className={`nexus-nav-item ${isActive ? 'nexus-nav-item-active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              title={isCollapsed ? `${item.label} (${item.shortcut})` : undefined}
            >
              <span className="nexus-nav-icon">{item.icon}</span>
              {!isCollapsed && (
                <>
                  <span className="nexus-nav-label">{item.label}</span>
                  <kbd className="nexus-nav-shortcut">{item.shortcut.replace('Alt+', '')}</kbd>
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer with Status */}
      <div className="nexus-sidebar-footer">
        {!isCollapsed ? (
          <div className="nexus-sidebar-status-box">
            <div className="nexus-sidebar-status-header">
              <span className="nexus-status-title">SYSTEM STATUS</span>
              <StatusBadge status={systemStatus} size="sm" />
            </div>
            <div className="nexus-sidebar-privacy-note">
              <Shield size={12} className="text-cyan" />
              <span>Local Edge Boundary Active</span>
            </div>
          </div>
        ) : (
          <div className="nexus-sidebar-collapsed-status" title={`Status: ${systemStatus}`}>
            <StatusBadge status={systemStatus} size="sm" showIcon={false} label="" />
          </div>
        )}
      </div>
    </aside>
  );
};
