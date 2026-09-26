import React from 'react';
import { Menu, Search, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import type { NavPage, ContextInfo } from '../../types';
import { ContextIndicator } from '../ui/ContextIndicator';
import './TopBar.css';

export interface TopBarProps {
  currentPage: NavPage;
  context: ContextInfo;
  isBackendConnected: boolean;
  onOpenCommandBar: () => void;
  onToggleMobileNav: () => void;
  onRefreshHealth: () => void;
  isCheckingHealth?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentPage,
  context,
  isBackendConnected,
  onOpenCommandBar,
  onToggleMobileNav,
  onRefreshHealth,
  isCheckingHealth = false,
}) => {
  const getPageTitle = (page: NavPage): string => {
    switch (page) {
      case 'home':
        return 'Overview';
      case 'ask-nexus':
        return 'Ask NEXUS';
      case 'knowledge':
        return 'Knowledge Workspace';
      case 'activity':
        return 'System Activity';
      case 'settings':
        return 'Settings';
      case 'diagnostics':
        return 'Advanced Diagnostics';
    }
  };

  return (
    <header className="nexus-topbar">
      <div className="nexus-topbar-left">
        <button
          type="button"
          className="nexus-topbar-mobile-btn"
          onClick={onToggleMobileNav}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <span className="nexus-topbar-title">{getPageTitle(currentPage)}</span>
      </div>

      <div className="nexus-topbar-center">
        <ContextIndicator context={context} compact={true} />
      </div>

      <div className="nexus-topbar-right">
        {/* Command Palette Trigger */}
        <button
          type="button"
          className="nexus-topbar-search-btn"
          onClick={onOpenCommandBar}
          aria-label="Open command palette"
        >
          <Search size={14} className="nexus-topbar-search-icon" />
          <span className="nexus-topbar-search-text">Search commands...</span>
          <kbd className="nexus-topbar-kbd">Ctrl+K</kbd>
        </button>

        {/* Backend Connection Indicator & Ping */}
        <div
          className={`nexus-topbar-conn-badge ${isBackendConnected ? 'nexus-conn-online' : 'nexus-conn-offline'}`}
          title={isBackendConnected ? 'Local Edge Service: Online' : 'Local Edge Service: Offline / Standalone'}
        >
          {isBackendConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span className="nexus-conn-text">
            {isBackendConnected ? 'Edge Live' : 'Standalone'}
          </span>
          <button
            type="button"
            className={`nexus-conn-refresh-btn ${isCheckingHealth ? 'nexus-spin-fast' : ''}`}
            onClick={onRefreshHealth}
            aria-label="Check service connection"
            title="Check service connection"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>
    </header>
  );
};
