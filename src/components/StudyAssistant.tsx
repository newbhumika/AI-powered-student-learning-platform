import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Check,
  Copy,
  Loader2,
  MessageSquarePlus,
  Send,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import type {
  ChatConversation,
  ChatMessage,
  ChatMode,
} from '../shared/types.ts';

const RESPONSE_MODES: { id: ChatMode; label: string; hint: string }[] = [
  {
    id: 'beginner',
    label: 'Explain Like a Beginner',
    hint: 'Intuitive analogies & simple language',
  },
  {
    id: 'detailed',
    label: 'Detailed Explanation',
    hint: 'Full academic theory, edge cases & examples',
  },
  {
    id: 'short',
    label: 'Short Answer',
    hint: 'Crisp 3–6 sentence direct summary',
  },
  {
    id: 'exam',
    label: 'Exam Preparation',
    hint: 'Scoring points, formal definitions & pitfalls',
  },
  {
    id: 'step_by_step',
    label: 'Step-by-Step',
    hint: 'Sequential numbered derivation or walkthrough',
  },
];

const STARTER_QUESTIONS = [
  "Explain Banker's Algorithm for deadlock avoidance with a small matrix example.",
  'What is the difference between 3NF and BCNF in DBMS normalization?',
  'Walk through Dijkstra shortest-path algorithm time complexity using a min-heap.',
  'How does TCP congestion control transition from Slow Start to Congestion Avoidance?',
];

export const StudyAssistant: React.FC = () => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<ChatMode>('detailed');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    apiRequest<{ conversations: ChatConversation[] }>('/api/chat/conversations')
      .then((res) => {
        if (!mounted) return;
        setConversations(res.conversations);
        if (res.conversations.length > 0) {
          setActiveConvId(res.conversations[0].id);
        }
      })
      .catch(() => {
        // Ignore initial empty state error
      })
      .finally(() => {
        if (mounted) setLoadingHistory(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    let mounted = true;
    apiRequest<{ conversation: ChatConversation; messages: ChatMessage[] }>(
      `/api/chat/conversations/${activeConvId}/messages`
    )
      .then((res) => {
        if (mounted) {
          setMessages(res.messages);
          setMode(res.conversation.mode);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load messages.');
        }
      });
    return () => {
      mounted = false;
    };
  }, [activeConvId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleStartNew = () => {
    setActiveConvId(null);
    setMessages([]);
    setError(null);
    setInput('');
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest(`/api/chat/conversations/${id}`, { method: 'DELETE' });
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeConvId === id) {
        setActiveConvId(remaining[0]?.id ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete conversation.');
    }
  };

  const handleSend = async (promptOverride?: string) => {
    const promptText = (promptOverride ?? input).trim();
    if (!promptText || sending) return;

    setError(null);
    setSending(true);
    if (!promptOverride) setInput('');

    // Optimistic user turn preview
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: activeConvId || 'pending',
      userId: 'me',
      role: 'user',
      content: promptText,
      mode,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await apiRequest<{
        conversation: ChatConversation;
        userMessage: ChatMessage;
        assistantMessage: ChatMessage;
      }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: promptText,
          mode,
          conversationId: activeConvId || undefined,
        }),
      });

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        res.userMessage,
        res.assistantMessage,
      ]);

      setActiveConvId(res.conversation.id);
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== res.conversation.id);
        return [res.conversation, ...filtered];
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (!promptOverride) setInput(promptText);
      setError(
        err instanceof Error ? err.message : 'Failed to receive AI response.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-11rem)]">
      {/* Left Conversation History Panel */}
      <div className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-4 flex flex-col max-h-[75vh] lg:max-h-none">
        <button
          type="button"
          onClick={handleStartNew}
          className="w-full py-2.5 px-3.5 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer mb-4"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>

        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 px-1">
          Conversation History
        </p>

        <div className="flex-1 overflow-y-auto space-y-1">
          {loadingHistory ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse"
                />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 px-1 py-4">
              Your saved study threads will appear here automatically.
            </p>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-teal-600/15 text-teal-800 dark:text-teal-300 font-medium'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs truncate">{conv.title}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Delete conversation"
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Chat Workspace */}
      <div className="lg:col-span-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] flex flex-col overflow-hidden">
        {/* Response Mode Selector */}
        <div className="border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-[#0D1519]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              AI Response Mode
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {RESPONSE_MODES.find((m) => m.id === mode)?.hint}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {RESPONSE_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === m.id
                    ? 'bg-teal-700 dark:bg-teal-600 text-white'
                    : 'bg-white dark:bg-[#162229] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-teal-600/50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Viewport */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 max-h-[58vh] min-h-[360px]">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center py-6">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-1">
                Ask any academic or engineering question
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xl">
                Select a pedagogical mode above—such as Explain Like a Beginner or Exam Preparation—or pick a sample syllabus prompt below to start.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    disabled={sending}
                    className="text-left p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-600/60 bg-slate-50/70 dark:bg-[#0B1215] text-xs text-slate-700 dark:text-slate-300 leading-relaxed transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-3xl rounded-xl px-4 py-3.5 ${
                    msg.role === 'user'
                      ? 'bg-teal-700 dark:bg-teal-600 text-white'
                      : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1215] text-slate-800 dark:text-slate-100 w-full'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <>
                      <div className="flex items-center justify-between gap-4 pb-2 mb-2 border-b border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          AI Study Tutor ·{' '}
                          {RESPONSE_MODES.find((m) => m.id === msg.mode)?.label ||
                            msg.mode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed space-y-2.5 [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:font-bold [&_h2]:font-semibold [&_h3]:font-semibold">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1215] px-4 py-3 inline-flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600 dark:text-teal-400" />
                <span>Generating {RESPONSE_MODES.find((m) => m.id === mode)?.label} response...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Prompt Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="border-t border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-[#10191E] flex items-end gap-3"
        >
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask a question or follow-up (Press Enter to send, Shift+Enter for new line)..."
            className="flex-1 resize-none px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-4 py-2.5 h-[42px] rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
