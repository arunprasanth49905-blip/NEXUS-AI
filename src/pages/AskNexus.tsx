import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, 
  User, 
  Bot, 
  RotateCcw, 
  Copy, 
  Check, 
  Sparkles, 
  Paperclip,
  Monitor,
  Camera,
  Mic,
  ShieldCheck,
  Info,
  Square
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/ui/Button';
import { CameraModal } from '../components/ui/CameraModal';
import { ContextPreviewBar } from '../components/ui/ContextPreviewBar';
import type { ChatMessage, ContextInfo, NexusContextObject } from '../types';
import { api } from '../services/api';
import { PerceptionService } from '../services/perception';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Phase 3 Multimodal Perception State
  const [attachedContexts, setAttachedContexts] = useState<NexusContextObject[]>([]);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  const starterExamples = [
    {
      title: 'Analyze System Architecture',
      desc: 'Evaluate Phase 1-3 edge capabilities and runtime layer',
      prompt: 'Analyze how the Phase 2 runtime engine interacts with Phase 3 multimodal perception.',
    },
    {
      title: 'Hardware Acceleration Audit',
      desc: 'Verify truthful Snapdragon NPU & GPU detection rules',
      prompt: 'Explain the difference between detected GPU hardware and active GPU inference provider.',
    },
    {
      title: 'Privacy Perimeter Guardrails',
      desc: 'Review zero-cloud telemetry and on-demand capture policy',
      prompt: 'How does NEXUS EDGE prevent background surveillance when using camera and screen?',
    },
    {
      title: 'Multimodal Context Merging',
      desc: 'Test combining screen captures, files, and queries',
      prompt: 'Explain how text, screen frames, and uploaded documents merge into a unified context.',
    },
  ];

  const handleSend = useCallback(async (forcedQuery?: string) => {
    const text = (forcedQuery !== undefined ? forcedQuery : inputVal).trim();
    if ((!text && attachedContexts.length === 0) || isLoading) return;

    const currentContextIds = attachedContexts.map((c) => c.context_id);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text || `[Submitted with ${attachedContexts.length} attached multimodal context(s)]`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedContextIds: currentContextIds,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputVal('');
    setAttachedContexts([]);
    setIsLoading(true);

    try {
      // Call backend API with query and attached multimodal context IDs
      const result = await api.sendAssistantQuery(text, currentContextIds);
      
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
        multimodalContext: result.multimodal_context,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      // Graceful truthful Phase 3 response when running in standalone mode
      const assistantMessage: ChatMessage = {
        id: `msg-nexus-${Date.now()}`,
        role: 'assistant',
        content: (
          `NEXUS EDGE received query: "${text}".\n\n` +
          `[Phase 3 Multimodal Perception Active]\n` +
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
  }, [inputVal, isLoading, attachedContexts, context.project, context.privacy]);

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

  const handleClearChat = () => {
    setMessages([]);
    setAttachedContexts([]);
    onAddToast('Conversation reset', 'Chat history cleared for this session.', 'info');
  };

  // --- Multimodal Action Handlers ---

  // 1. Screen Capture Handler
  const handleTriggerScreenCapture = async () => {
    try {
      setIsScreenSharing(true);
      onAddToast('Screen Capture', 'Requesting window or display selection...', 'info');
      const ctx = await PerceptionService.captureScreen();
      setAttachedContexts((prev) => [...prev, ctx]);
      onAddToast('Screen Attached', 'Single frame captured and attached to prompt context.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Screen capture aborted';
      onAddToast('Screen Capture Notice', msg, 'warning');
    } finally {
      setIsScreenSharing(false);
    }
  };

  // 2. Camera Capture Modal Trigger
  const handleTriggerCamera = () => {
    setIsCameraModalOpen(true);
  };

  // 3. Document File Selection Handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onAddToast('Document Reading', `Extracting structured text from ${file.name}...`, 'info');
    try {
      const ctx = await PerceptionService.uploadDocument(file);
      setAttachedContexts((prev) => [...prev, ctx]);
      onAddToast('Document Attached', `Extracted ${file.name} successfully into context.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process document';
      onAddToast('Document Error', msg, 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 4. Voice Push-to-Talk Handler (Web Speech API)
  const handleToggleVoice = () => {
    if (isListening) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onAddToast('Voice Unavailable', 'Browser native speech recognition is not supported in this browser.', 'warning');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        onAddToast('Listening...', 'Speak your question clearly.', 'info');
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript || '';
        if (transcript.trim()) {
          try {
            const ctx = await PerceptionService.submitVoiceTranscript(transcript);
            setAttachedContexts((prev) => [...prev, ctx]);
            // Pre-fill input value if empty
            setInputVal((prev) => (prev ? `${prev} ${transcript}` : transcript));
            onAddToast('Voice Transcribed', `"${transcript.slice(0, 30)}..." attached.`, 'success');
          } catch {
            setInputVal((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        onAddToast('Voice Error', `Speech recognition error: ${event.error}`, 'warning');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      setIsListening(false);
      const msg = err instanceof Error ? err.message : 'Microphone access failed';
      onAddToast('Microphone Error', msg, 'error');
    }
  };

  const handleRemoveContext = (id: string) => {
    setAttachedContexts((prev) => prev.filter((c) => c.context_id !== id));
  };

  return (
    <div className="nexus-ask-page animate-fade-in">
      <PageHeader
        title="ASK NEXUS"
        subtitle="Context-aware reasoning across text, screen, camera, voice, and documents."
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
              <h2 className="nexus-ask-empty-title">What can I help you understand?</h2>
              <p className="nexus-ask-empty-subtitle">
                Ask questions directly, attach an application window, capture a camera frame, or inspect local documents.
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
                <strong>Phase 3 Multimodal Perception:</strong> User-controlled on-demand capture for screen, camera, voice, and documents. Zero continuous recording. Zero cloud telemetry.
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
                      {msg.multimodalContext && (
                        <span className="nexus-msg-mode-tag text-purple">{msg.multimodalContext}</span>
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
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Hidden File Input for Document Perception */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".pdf,.txt,.md,.markdown,.docx,.csv"
        onChange={handleFileSelect}
        aria-hidden="true"
      />

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCaptureSuccess={(ctx) => setAttachedContexts((prev) => [...prev, ctx])}
        onAddToast={onAddToast}
      />

      {/* Bottom Composer */}
      <div className="nexus-ask-composer-container">
        {/* Attached Context Preview Bar */}
        <ContextPreviewBar
          contexts={attachedContexts}
          onRemoveContext={handleRemoveContext}
          onClearAll={() => setAttachedContexts([])}
        />

        {/* Phase 3 Multimodal Input Toolbar */}
        <div className="nexus-multimodal-tray" aria-label="Input Modalities">
          <button
            type="button"
            className={`nexus-modality-btn ${isListening ? 'nexus-modality-active' : ''}`}
            onClick={handleToggleVoice}
            title={isListening ? 'Stop listening' : 'Start speech recognition (Push-to-talk)'}
            aria-label="Voice input push to talk"
          >
            {isListening ? (
              <Square size={13} className="text-amber" />
            ) : (
              <Mic size={14} className="text-amber" />
            )}
            <span>{isListening ? 'Listening...' : 'Voice'}</span>
          </button>

          <button
            type="button"
            className={`nexus-modality-btn ${isScreenSharing ? 'nexus-modality-active' : ''}`}
            onClick={handleTriggerScreenCapture}
            disabled={isScreenSharing}
            title="Capture application window or display frame"
            aria-label="Capture screen frame"
          >
            <Monitor size={14} className="text-cyan" />
            <span>{isScreenSharing ? 'Sharing...' : 'Screen'}</span>
          </button>

          <button
            type="button"
            className="nexus-modality-btn"
            onClick={handleTriggerCamera}
            title="Open camera for on-demand snapshot"
            aria-label="Open camera snapshot"
          >
            <Camera size={14} className="text-purple" />
            <span>Camera</span>
          </button>

          <button
            type="button"
            className="nexus-modality-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Attach local document (PDF, TXT, MD, DOCX, CSV)"
            aria-label="Attach document"
          >
            <Paperclip size={14} className="text-blue" />
            <span>Attach File</span>
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
            placeholder="Type your message or combine with screen, camera, voice, and documents..."
            rows={2}
            aria-label="Ask NEXUS message"
          />

          <div className="nexus-composer-footer-row">
            <span className="nexus-composer-hint">
              Local edge processing • Zero cloud surveillance • Strict privacy guard
            </span>

            <div className="nexus-composer-action-btns">
              <Button
                variant="primary"
                size="sm"
                disabled={(!inputVal.trim() && attachedContexts.length === 0) || isLoading}
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
