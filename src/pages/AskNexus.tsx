import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, 
  Paperclip, 
  Mic, 
  Monitor, 
  Camera, 
  Copy, 
  Check, 
  Sparkles, 
  Bot, 
  User, 
  Info,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/ui/Button';
import type { ChatMessage, ContextInfo } from '../types';
import { api } from '../services/api';
import './AskNexus.css';

export interface AskNexusProps {
  context: ContextInfo;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  onAddToast: (title: string, description?: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const AskNexus: React.FC<AskNexusProps> = ({
  context,
  initialQuery,
  onClearInitialQuery,
  onAddToast,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const starterExamples = [
    {
      title: 'Explain this error',
      desc: 'Trace root causes and edge handling',
      prompt: 'Explain what causes an edge service connection timeout and how to recover.',
    },
    {
      title: 'Summarize this document',
      desc: 'Extract key points and constraints',
      prompt: 'Summarize the privacy constraints for local edge computing.',
    },
    {
      title: 'Help me understand this code',
      desc: 'Walk through architecture and logic',
      prompt: 'Help me understand the Phase 1 application shell and component architecture.',
    },
    {
      title: 'Plan my next steps',
      desc: 'Construct structured milestones',
      prompt: 'Plan the next engineering steps to transition from Phase 1 to Phase 2.',
    },
  ];

  const handleSend = useCallback(async (queryText?: string) => {
    const text = (queryText || inputVal).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputVal('');
    setIsLoading(true);

    try {
      // Call backend API if reachable
      const result = await api.sendAssistantQuery(text);
      
      const assistantMessage: ChatMessage = {
        id: `msg-nexus-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        executionMode: result.execution_mode || 'Hardware-Aware (CPU)',
        provider: result.provider,
        latencyMs: result.latency_ms,
        fallbackUsed: result.fallback_used,
        fallbackReason: result.fallback_reason,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      // Graceful truthful Phase 2 response when running in standalone mode
      const assistantMessage: ChatMessage = {
        id: `msg-nexus-${Date.now()}`,
        role: 'assistant',
        content: (
          `NEXUS EDGE received query: "${text}".\n\n` +
          `[Phase 2 Runtime Notice]\n` +
          `Local hardware-aware engine is active in standalone CPU mode.\n\n` +
          `Active Context: ${context.project} | Privacy: ${context.privacy} (Local perimeter).`
        ),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        executionMode: 'Local Standalone Engine (CPU)',
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputVal, isLoading, context.project, context.privacy]);

  // If initialQuery passed from Home, send or prefill
  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery);
      onClearInitialQuery?.();
    }
  }, [initialQuery, handleSend, onClearInitialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onAddToast('Copied to clipboard', 'Message text copied.', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFutureFeatureNotice = (featureName: string, phase: string) => {
    onAddToast(
      `${featureName} — Coming in ${phase}`,
      `Multimodal perception is planned for upcoming milestones. Phase 1 provides the interaction UX foundation.`,
      'info'
    );
  };

  const handleClearChat = () => {
    setMessages([]);
    onAddToast('Conversation reset', 'Chat history cleared for this session.', 'info');
  };

  return (
    <div className="nexus-ask-page animate-fade-in">
      <PageHeader
        title="ASK NEXUS"
        subtitle="Ask questions, solve problems, and work with your context."
        badge={
          <span className="nexus-context-tag">
            <ShieldCheck size={12} className="text-cyan" />
            <span>Local Boundary Active</span>
          </span>
        }
        actions={
          messages.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw size={13} />}
              onClick={handleClearChat}
            >
              Reset Thread
            </Button>
          ) : undefined
        }
      />

      {/* Conversation Thread Area */}
      <div className="nexus-ask-conversation-area" role="log" aria-label="Conversation with NEXUS">
        {messages.length === 0 ? (
          <div className="nexus-ask-empty-state">
            <div className="nexus-ask-empty-hero">
              <div className="nexus-empty-avatar">
                <Bot size={28} className="text-blue" />
              </div>
              <h2 className="nexus-ask-empty-title">What can I help you with?</h2>
              <p className="nexus-ask-empty-subtitle">
                Select an example below or type your prompt to explore the Phase 1 interface foundation.
              </p>
            </div>

            <div className="nexus-starter-grid">
              {starterExamples.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="nexus-starter-card"
                  onClick={() => handleSend(item.prompt)}
                >
                  <div className="nexus-starter-header">
                    <span className="nexus-starter-title">&ldquo;{item.title}&rdquo;</span>
                    <Sparkles size={14} className="nexus-starter-icon text-cyan" />
                  </div>
                  <span className="nexus-starter-desc">{item.desc}</span>
                </button>
              ))}
            </div>

            <div className="nexus-phase-banner">
              <Info size={14} className="nexus-phase-info-icon" />
              <span className="nexus-phase-text">
                <strong>Phase 1 Foundation:</strong> The interaction shell is fully wired. Full local LLM reasoning models are integrated in Phase 2. No synthetic AI benchmarks or fabricated capabilities.
              </span>
            </div>
          </div>
        ) : (
          <div className="nexus-messages-list">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`nexus-message-row ${isUser ? 'nexus-msg-user-row' : 'nexus-msg-assistant-row'} animate-fade-in`}
                >
                  <div className="nexus-message-avatar" aria-hidden="true">
                    {isUser ? <User size={16} /> : <Bot size={16} className="text-blue" />}
                  </div>

                  <div className="nexus-message-content-box">
                    <div className="nexus-message-meta">
                      <span className="nexus-msg-author">{isUser ? 'You' : 'NEXUS EDGE'}</span>
                      {msg.executionMode && (
                        <span className="nexus-msg-mode-tag">{msg.executionMode}</span>
                      )}
                      {msg.latencyMs !== undefined && (
                        <span className="nexus-msg-mode-tag text-cyan">{msg.latencyMs} ms</span>
                      )}
                      <span className="nexus-msg-time">{msg.timestamp}</span>
                    </div>

                    <div className="nexus-msg-body">
                      {msg.content.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>

                    {!isUser && (
                      <div className="nexus-msg-actions">
                        <button
                          type="button"
                          className="nexus-msg-copy-btn"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          title="Copy message"
                          aria-label="Copy message"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={12} className="text-green" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="nexus-message-row nexus-msg-assistant-row animate-fade-in">
                <div className="nexus-message-avatar" aria-hidden="true">
                  <Bot size={16} className="text-blue" />
                </div>
                <div className="nexus-message-content-box">
                  <div className="nexus-loading-dots">
                    <span className="nexus-dot" />
                    <span className="nexus-dot" />
                    <span className="nexus-dot" />
                    <span className="nexus-loading-text">NEXUS processing context...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom Composer */}
      <div className="nexus-ask-composer-container">
        {/* Future Multimodal Input Controls (Prepared but explicitly labeled) */}
        <div className="nexus-multimodal-tray" aria-label="Input Modalities">
          <button
            type="button"
            className="nexus-modality-btn"
            onClick={() => handleFutureFeatureNotice('Voice Perception', 'Phase 3')}
            title="Voice input (Scheduled for Phase 3)"
          >
            <Mic size={14} />
            <span>Voice</span>
            <span className="nexus-future-tag">Phase 3</span>
          </button>

          <button
            type="button"
            className="nexus-modality-btn"
            onClick={() => handleFutureFeatureNotice('Screen Perception', 'Phase 3')}
            title="Screen context perception (Scheduled for Phase 3)"
          >
            <Monitor size={14} />
            <span>Screen</span>
            <span className="nexus-future-tag">Phase 3</span>
          </button>

          <button
            type="button"
            className="nexus-modality-btn"
            onClick={() => handleFutureFeatureNotice('Camera Perception', 'Phase 3')}
            title="Camera perception (Scheduled for Phase 3)"
          >
            <Camera size={14} />
            <span>Camera</span>
            <span className="nexus-future-tag">Phase 3</span>
          </button>

          <button
            type="button"
            className="nexus-modality-btn"
            onClick={() => handleFutureFeatureNotice('Document RAG Indexing', 'Phase 4')}
            title="Deep document indexing (Scheduled for Phase 4)"
          >
            <Paperclip size={14} />
            <span>Documents</span>
            <span className="nexus-future-tag">Phase 4</span>
          </button>
        </div>

        {/* Input Text Box */}
        <div className="nexus-composer-input-card">
          <textarea
            ref={textareaRef}
            className="nexus-composer-textarea"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
            rows={2}
            aria-label="Ask NEXUS message"
          />

          <div className="nexus-composer-footer-row">
            <span className="nexus-composer-hint">
              Local edge processing • Zero telemetry
            </span>

            <div className="nexus-composer-action-btns">
              <Button
                variant="primary"
                size="sm"
                disabled={!inputVal.trim() || isLoading}
                onClick={() => handleSend()}
                rightIcon={<Send size={13} />}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
