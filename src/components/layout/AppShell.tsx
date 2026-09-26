import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandBar } from '../common/CommandBar';
import { ToastContainer } from '../common/ToastContainer';
import type { NavPage, ContextInfo, SystemStatusType, ToastMessage } from '../../types';
import './AppShell.css';

export interface AppShellProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  context: ContextInfo;
  systemStatus: SystemStatusType;
  isBackendConnected: boolean;
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
  onRunHealthCheck: () => void;
  onQuickAction: (actionPrompt: string) => void;
  isCheckingHealth?: boolean;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentPage,
  onNavigate,
  context,
  systemStatus,
  isBackendConnected,
  toasts,
  onDismissToast,
  onRunHealthCheck,
  onQuickAction,
  isCheckingHealth = false,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open Command Palette: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandBarOpen((prev) => !prev);
        return;
      }

      // Alt+1 to Alt+5 for screen navigation
      if (e.altKey) {
        if (e.key === '1') { e.preventDefault(); onNavigate('home'); }
        else if (e.key === '2') { e.preventDefault(); onNavigate('ask-nexus'); }
        else if (e.key.toLowerCase() === 'm') { e.preventDefault(); onNavigate('memory'); }
        else if (e.key === '3') { e.preventDefault(); onNavigate('knowledge'); }
        else if (e.key === '4') { e.preventDefault(); onNavigate('activity'); }
        else if (e.key === '5') { e.preventDefault(); onNavigate('settings'); }
        else if (e.key.toLowerCase() === 'd') { e.preventDefault(); onNavigate('diagnostics'); }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate]);

  const handleMobileNavClick = (page: NavPage) => {
    onNavigate(page);
    setIsMobileNavOpen(false);
  };

  return (
    <div className="nexus-app-shell">
      {/* Mobile Backdrop */}
      {isMobileNavOpen && (
        <div
          className="nexus-mobile-backdrop"
          onClick={() => setIsMobileNavOpen(false)}
          role="presentation"
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`nexus-sidebar-wrapper ${isMobileNavOpen ? 'nexus-mobile-open' : ''}`}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleMobileNavClick}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          systemStatus={systemStatus}
        />
      </div>

      {/* Main App Viewport */}
      <div className="nexus-main-content-area">
        <TopBar
          currentPage={currentPage}
          context={context}
          isBackendConnected={isBackendConnected}
          onOpenCommandBar={() => setIsCommandBarOpen(true)}
          onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
          onRefreshHealth={onRunHealthCheck}
          isCheckingHealth={isCheckingHealth}
        />

        <main className="nexus-page-container" id="main-content" role="main">
          {children}
        </main>
      </div>

      {/* Command Palette Modal */}
      <CommandBar
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        onNavigate={onNavigate}
        onQuickAction={onQuickAction}
        onRunHealthCheck={onRunHealthCheck}
      />

      {/* Global Notifications */}
      <ToastContainer toasts={toasts} onDismiss={onDismissToast} />
    </div>
  );
};
