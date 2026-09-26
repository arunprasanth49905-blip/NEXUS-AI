import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Home, 
  MessageSquare, 
  BookOpen, 
  Activity as ActivityIcon, 
  Settings as SettingsIcon, 
  Cpu, 
  HelpCircle, 
  FileText, 
  Terminal, 
  ListOrdered,
  ArrowRight,
  X
} from 'lucide-react';
import type { NavPage } from '../../types';
import './CommandBar.css';

export interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: NavPage) => void;
  onQuickAction: (actionPrompt: string) => void;
  onRunHealthCheck: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Diagnostics';
  icon: React.ReactNode;
  shortcut?: string;
  run: () => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onQuickAction,
  onRunHealthCheck,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: 'nav-home',
      title: 'Go to Home',
      category: 'Navigation',
      icon: <Home size={16} />,
      shortcut: 'Alt+1',
      run: () => { onNavigate('home'); onClose(); },
    },
    {
      id: 'nav-ask',
      title: 'Go to Ask NEXUS',
      category: 'Navigation',
      icon: <MessageSquare size={16} />,
      shortcut: 'Alt+2',
      run: () => { onNavigate('ask-nexus'); onClose(); },
    },
    {
      id: 'nav-knowledge',
      title: 'Go to Knowledge',
      category: 'Navigation',
      icon: <BookOpen size={16} />,
      shortcut: 'Alt+3',
      run: () => { onNavigate('knowledge'); onClose(); },
    },
    {
      id: 'nav-activity',
      title: 'Go to Activity',
      category: 'Navigation',
      icon: <ActivityIcon size={16} />,
      shortcut: 'Alt+4',
      run: () => { onNavigate('activity'); onClose(); },
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      category: 'Navigation',
      icon: <SettingsIcon size={16} />,
      shortcut: 'Alt+5',
      run: () => { onNavigate('settings'); onClose(); },
    },
    {
      id: 'nav-diagnostics',
      title: 'Open Advanced Diagnostics',
      category: 'Diagnostics',
      icon: <Cpu size={16} />,
      shortcut: 'Alt+D',
      run: () => { onNavigate('diagnostics'); onClose(); },
    },
    {
      id: 'act-explain',
      title: 'Explain something',
      category: 'Actions',
      icon: <HelpCircle size={16} />,
      run: () => { onQuickAction('Explain how the local edge architecture protects data privacy.'); onClose(); },
    },
    {
      id: 'act-doc',
      title: 'Analyze a document',
      category: 'Actions',
      icon: <FileText size={16} />,
      run: () => { onQuickAction('Analyze the registered project documents in the knowledge base.'); onClose(); },
    },
    {
      id: 'act-debug',
      title: 'Help me debug',
      category: 'Actions',
      icon: <Terminal size={16} />,
      run: () => { onQuickAction('Help me debug this issue: '); onClose(); },
    },
    {
      id: 'act-plan',
      title: 'Plan something',
      category: 'Actions',
      icon: <ListOrdered size={16} />,
      run: () => { onQuickAction('Plan next steps for deploying edge AI components.'); onClose(); },
    },
    {
      id: 'diag-ping',
      title: 'Run System Health Ping',
      category: 'Diagnostics',
      icon: <Cpu size={16} />,
      run: () => { onRunHealthCheck(); onClose(); },
    },
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].run();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="nexus-command-overlay" onClick={onClose} role="presentation">
      <div 
        className="nexus-command-dialog animate-fade-in" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        <div className="nexus-command-search-bar">
          <Search size={18} className="nexus-command-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="nexus-command-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, screen, or action..."
            aria-autocomplete="list"
          />
          {query ? (
            <button
              type="button"
              className="nexus-command-clear"
              onClick={() => setQuery('')}
              aria-label="Clear query"
            >
              <X size={16} />
            </button>
          ) : (
            <kbd className="nexus-command-esc-kbd">ESC</kbd>
          )}
        </div>

        <div className="nexus-command-results" role="listbox">
          {filtered.length === 0 ? (
            <div className="nexus-command-empty">
              No matching commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  className={`nexus-command-row ${isSelected ? 'nexus-command-row-selected' : ''}`}
                  onClick={() => item.run()}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="nexus-command-item-icon">{item.icon}</span>
                  <div className="nexus-command-item-content">
                    <span className="nexus-command-item-title">{item.title}</span>
                    <span className="nexus-command-item-category">{item.category}</span>
                  </div>
                  {item.shortcut ? (
                    <kbd className="nexus-command-item-shortcut">{item.shortcut}</kbd>
                  ) : (
                    <ArrowRight size={14} className="nexus-command-item-arrow" />
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="nexus-command-footer">
          <span>Use <strong>↑</strong> <strong>↓</strong> to navigate</span>
          <span><strong>↵</strong> to select</span>
          <span><strong>ESC</strong> to close</span>
        </div>
      </div>
    </div>
  );
};
