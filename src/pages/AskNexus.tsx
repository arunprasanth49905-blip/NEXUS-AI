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
import { ContextPanel } from '../components/ui/ContextPanel';
import { PlanExecutionCard } from '../components/ui/PlanExecutionCard';
import type { ChatMessage, ContextInfo, NexusContextObject } from '../types';
import type { OrchestrationTask, TaskPlan, OrchestrationResult } from '../types/agent';
import { api } from '../services/api';
import { agentService } from '../services/agent';
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

  // Phase 4 Context & Memory State
  const [activeTask, setActiveTask] = useState<string | null>(context.active_task || null);
  const [lastContextUnderstanding, setLastContextUnderstanding] = useState<{
    category?: string;
    intent?: string;
    entities?: string[];
    topics?: string[];
    retrieved_memories_count?: number;
    estimated_tokens?: number;
  }>({});

  // Phase 5 Agent Orchestration & Planning State
  const [currentTask, setCurrentTask] = useState<OrchestrationTask | null>(null);
  const [currentPlan, setCurrentPlan] = useState<TaskPlan | null>(null);
  const [currentResult, setCurrentResult] = useState<OrchestrationResult | null>(null);
  const [isExecutingPlan, setIsExecutingPlan] = useState(false);

  const starterExamples = [
    {
      title: 'Plan Multi-Step Task',
      desc: 'Analyze report, identify gaps, structure presentation',
      prompt: 'Analyze my project report, identify technical gaps, and create a presentation structure.',
    },
    {
      title: 'Analyze System Architecture',
      desc: 'Evaluate Phase 1-5 edge capabilities and runtime layer',
      prompt: 'Analyze how the Phase 2 runtime engine interacts with Phase 5 agent orchestration.',
    },
    {
      title: 'Fix Deployment Failure',
      desc: 'Anchor active task goal and track build error context',
      prompt: 'Help me fix my Vercel build error: Cannot find name useCallback in CameraModal.tsx.',
    },
    {
      title: 'Remember Project Stack',
      desc: 'Store enduring project constraints in memory',
      prompt: 'Remember that our project uses React 19, TypeScript, and SQLite for local persistent memory.',
    },
    {
      title: 'Privacy Perimeter Guardrails',
      desc: 'Review zero-cloud telemetry and secret protection rules',
      prompt: 'How does NEXUS EDGE prevent secret keys and background recordings from entering memory?',
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
      // 1. Check if user request is a multi-step workflow or requests a plan
      const lower = text.toLowerCase();
      const isMultiStepGoal = (lower.includes('analyze') && lower.includes('identify') && lower.includes('create')) ||
        lower.startsWith('create a plan') ||
        lower.includes('technical gaps') ||
        lower.includes('presentation structure') ||
        lower.includes('plan for');

      if (isMultiStepGoal) {
        try {
          const taskRes = await agentService.createTask(text, { attachedContextIds: currentContextIds });
          if (taskRes.task && taskRes.plan) {
            setCurrentTask(taskRes.task);
            setCurrentPlan(taskRes.plan);
            setCurrentResult(null);
            if (taskRes.task.task_type) {
              setActiveTask(taskRes.task.task_type);
            }

            const assistantMessage: ChatMessage = {
              id: `msg-nexus-${Date.now()}`,
              role: 'assistant',
              content: `I have analyzed your objective and decomposed it into a ${taskRes.task.complexity.toLowerCase()} execution plan with ${taskRes.plan.steps.length} steps across specialized agents. Review the plan below and click "Run Plan" to execute.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              executionMode: `Agent Orchestrator (${taskRes.plan.steps.length} Steps Planned)`,
            };

            setMessages((prev) => [...prev, assistantMessage]);
            setIsLoading(false);
            return;
          }
        } catch {
          // Fall back to standard query if planning endpoint fails
        }
      }

      // 2. Call backend API with query and attached multimodal context IDs
      const result = await api.sendAssistantQuery(text, currentContextIds);

      if (result.context_understanding) {
        setLastContextUnderstanding(result.context_understanding);
        if (result.context_understanding.active_task) {
          setActiveTask(result.context_understanding.active_task);
        }
      }
      
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
        contextUnderstanding: result.context_understanding,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      // Graceful truthful Phase 4 response when running in standalone mode
      const assistantMessage: ChatMessage = {
        id: `msg-nexus-${Date.now()}`,
        role: 'assistant',
        content: (
          `NEXUS EDGE received query: "${text}".\n\n` +
          `[Phase 4 Context Intelligence & Memory Active]\n` +
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

  // Phase 5 Plan Execution Handlers
  const handleExecutePlan = async (taskId: string) => {
    setIsExecutingPlan(true);
    onAddToast('Plan Execution Started', 'Coordinating agents across dependency graph...', 'info');
    try {
      const res = await agentService.executeTask(taskId);
      setCurrentResult(res);
      if (res.plan) setCurrentPlan(res.plan);
      setCurrentTask((prev) => (prev ? { ...prev, status: res.status } : null));

      const assistantMessage: ChatMessage = {
        id: `msg-nexus-exec-${Date.now()}`,
        role: 'assistant',
        content: res.final_output,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        executionMode: `Orchestrator (${res.verification.state})`,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (res.status === 'WAITING_FOR_APPROVAL') {
        onAddToast('Action Requires Approval', 'Execution paused: user confirmation required.', 'warning');
      } else if (res.status === 'COMPLETED') {
        onAddToast('Plan Completed', `Verified: ${res.verification.completed_steps}/${res.verification.total_steps} steps.`, 'success');
      } else {
        onAddToast('Plan Execution Notice', `Execution ended with status ${res.status}.`, 'warning');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Execution error';
      onAddToast('Execution Failed', msg, 'error');
    } finally {
      setIsExecutingPlan(false);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await agentService.cancelTask(taskId);
      setCurrentTask((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      if (currentPlan) {
        setCurrentPlan({ ...currentPlan, status: 'CANCELLED' });
      }
      onAddToast('Task Cancelled', 'Execution stopped safely; completed outputs preserved.', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cancellation error';
      onAddToast('Cancel Failed', msg, 'error');
    }
  };

  const handleApproveAction = async (approvalId: string) => {
    try {
      onAddToast('Approval Granted', 'Resuming agent plan...', 'info');
      const res = await agentService.approveAction(approvalId);
      if (res.result) {
        setCurrentResult(res.result);
        if (res.result.plan) setCurrentPlan(res.result.plan);
        setCurrentTask((prev) => (prev ? { ...prev, status: res.result!.status } : null));
      }
      onAddToast('Action Approved', 'Agent resumed and completed execution.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval error';
      onAddToast('Approval Error', msg, 'error');
    }
  };

  const handleRejectAction = async (approvalId: string) => {
    try {
      await agentService.rejectAction(approvalId);
      onAddToast('Action Rejected', 'Step was skipped / cancelled per user decision.', 'warning');
      if (currentTask) {
        setCurrentTask({ ...currentTask, status: 'CANCELLED' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rejection error';
      onAddToast('Rejection Error', msg, 'error');
    }
  };

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

  const handleClearActiveTask = async () => {
    try {
      await api.clearActiveTask();
      setActiveTask(null);
      onAddToast('Task Cleared', 'Active goal reset for current session.', 'info');
    } catch {
      setActiveTask(null);
    }
  };

  // --- Multimodal Action Handlers ---
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

  const handleTriggerCamera = () => {
    setIsCameraModalOpen(true);
  };

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
        subtitle="Context-aware reasoning across text, screen, camera, voice, documents, and memory."
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

      {/* Phase 4 Context Inspector Panel */}
      <ContextPanel
        activeTask={activeTask}
        category={lastContextUnderstanding.category}
        intent={lastContextUnderstanding.intent}
        entities={lastContextUnderstanding.entities}
        topics={lastContextUnderstanding.topics}
        retrievedMemoriesCount={lastContextUnderstanding.retrieved_memories_count}
        sourcesCount={attachedContexts.length}
        estimatedTokens={lastContextUnderstanding.estimated_tokens}
        onClearTask={handleClearActiveTask}
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
                Ask questions directly, attach an application window, capture a camera frame, inspect local documents, or recall project memory.
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
                <strong>Phase 4 Context & Memory:</strong> Tracks active goals, anchors session context, extracts entities, and transparently retrieves project memory before runtime inference.
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
                      {msg.contextUnderstanding?.active_task && (
                        <span className="nexus-msg-mode-tag text-amber">Goal: {msg.contextUnderstanding.active_task}</span>
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

            {/* Phase 5 Interactive Plan & Execution Card */}
            {currentTask && currentPlan && (
              <PlanExecutionCard
                task={currentTask}
                plan={currentPlan}
                result={currentResult}
                isRunning={isExecutingPlan}
                onExecutePlan={handleExecutePlan}
                onCancelTask={handleCancelTask}
                onApproveAction={handleApproveAction}
                onRejectAction={handleRejectAction}
              />
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
            placeholder="Type your message or combine with screen, camera, voice, documents, and memory..."
            rows={2}
            aria-label="Ask NEXUS message"
          />

          <div className="nexus-composer-footer-row">
            <span className="nexus-composer-hint">
              Local edge processing • Context-aware memory • Secret protection guard
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
