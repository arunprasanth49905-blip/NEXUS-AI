import { useState, useEffect, useCallback } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Home } from './pages/Home';
import { AskNexus } from './pages/AskNexus';
import { Knowledge } from './pages/Knowledge';
import { Activity } from './pages/Activity';
import { Settings } from './pages/Settings';
import { AdvancedDiagnostics } from './pages/AdvancedDiagnostics';
import type { NavPage, ContextInfo, SystemStatusType, ToastMessage } from './types';
import { fetchSystemStatus, fetchActiveContext, fallbackContext } from './services/system';
import './App.css';

export function App() {
  const [currentPage, setCurrentPage] = useState<NavPage>('home');
  const [context, setContext] = useState<ContextInfo>(fallbackContext);
  const [systemStatus, setSystemStatus] = useState<SystemStatusType>('ready');
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((
    title: string,
    description?: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    duration = 4000
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newToast: ToastMessage = { id, title, description, type, duration };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // System Health Polling
  const checkHealth = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsCheckingHealth(true);
    }
    try {
      const res = await fetchSystemStatus();
      if (res.health && res.status === 'ready') {
        setIsBackendConnected(true);
        setSystemStatus('ready');
        if (isManual) {
          addToast('Service Healthy', `Connected to ${res.health.service} (${res.health.phase}).`, 'success');
        }
      } else {
        setIsBackendConnected(false);
        setSystemStatus('limited');
        if (isManual) {
          addToast(
            'Standalone Mode',
            res.error || 'Local edge service is offline. Standalone UI active.',
            'warning'
          );
        }
      }

      // Fetch context
      const ctxRes = await fetchActiveContext();
      setContext(ctxRes.context);
    } catch {
      setIsBackendConnected(false);
      setSystemStatus('limited');
    } finally {
      setIsCheckingHealth(false);
    }
  }, [addToast]);

  useEffect(() => {
    checkHealth(false);
    // Periodic subtle check every 30 seconds
    const intervalId = setInterval(() => checkHealth(false), 30000);
    return () => clearInterval(intervalId);
  }, [checkHealth]);

  const handleStartConversation = (query: string) => {
    setInitialPrompt(query);
    setCurrentPage('ask-nexus');
  };

  const renderActivePage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <Home
            context={context}
            onNavigate={setCurrentPage}
            onStartConversation={handleStartConversation}
          />
        );
      case 'ask-nexus':
        return (
          <AskNexus
            context={context}
            initialQuery={initialPrompt}
            onClearInitialQuery={() => setInitialPrompt('')}
            onAddToast={addToast}
          />
        );
      case 'knowledge':
        return <Knowledge onAddToast={addToast} />;
      case 'activity':
        return <Activity onAddToast={addToast} />;
      case 'settings':
        return (
          <Settings
            context={context}
            systemStatus={systemStatus}
            isBackendConnected={isBackendConnected}
            onNavigate={setCurrentPage}
            onAddToast={addToast}
          />
        );
      case 'diagnostics':
        return (
          <AdvancedDiagnostics
            onNavigate={setCurrentPage}
            onAddToast={addToast}
          />
        );
      default:
        return (
          <Home
            context={context}
            onNavigate={setCurrentPage}
            onStartConversation={handleStartConversation}
          />
        );
    }
  };

  return (
    <AppShell
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      context={context}
      systemStatus={systemStatus}
      isBackendConnected={isBackendConnected}
      toasts={toasts}
      onDismissToast={dismissToast}
      onRunHealthCheck={() => checkHealth(true)}
      onQuickAction={handleStartConversation}
      isCheckingHealth={isCheckingHealth}
    >
      {renderActivePage()}
    </AppShell>
  );
}

export default App;
