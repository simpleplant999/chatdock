'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, ChatMessage, ChatSession } from '@/lib/api';

const THINKING_STEPS = [
  'Reading your question…',
  'Searching the knowledge base…',
  'Gathering relevant details…',
  'Drafting a detailed answer…',
];

/**
 * Embed chat UI. Always starts a brand-new session on mount / page refresh.
 * Does not reuse previous sessions.
 */
export function EmbedChat({ chatbotId }: { chatbotId: string }) {
  const [botName, setBotName] = useState('Assistant');
  const [session, setSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setLoading(true);
      setError('');
      try {
        const [bot, next] = await Promise.all([
          api.getPublicBot(chatbotId),
          api.createPublicSession(chatbotId),
        ]);
        if (!cancelled) {
          setBotName(bot.name);
          setSession(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'This chatbot is unavailable. It may not be published yet.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [chatbotId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [session?.messages.length, sending, thinkingStep]);

  useEffect(() => {
    if (!sending) {
      setThinkingStep(0);
      return;
    }
    setThinkingStep(0);
    const id = window.setInterval(() => {
      setThinkingStep((prev) => (prev + 1) % THINKING_STEPS.length);
    }, 900);
    return () => window.clearInterval(id);
  }, [sending]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!session || !input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    setError('');

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setSession((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev,
    );

    const startedAt = Date.now();

    try {
      const result = await api.sendPublicMessage(
        chatbotId,
        session.id,
        content,
      );
      const elapsed = Date.now() - startedAt;
      if (elapsed < 900) {
        await new Promise((resolve) => setTimeout(resolve, 900 - elapsed));
      }
      setSession(result.session);
    } catch (err) {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.filter((m) => m.id !== optimistic.id),
            }
          : prev,
      );
      setInput(content);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="grid h-full place-items-center bg-white text-sm text-[var(--ink-soft)]">
        Starting chat…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="grid h-full place-items-center bg-white p-4 text-center text-sm text-[var(--danger)]">
        {error || 'Chatbot unavailable'}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-[var(--line)] px-3 py-2.5">
        <p className="text-sm font-semibold text-[var(--ink)]">{botName}</p>
        <p className="text-[11px] text-[var(--ink-soft)]">
          Ask a question — each visit starts a new chat
        </p>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3"
      >
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-[var(--danger)]">
            {error}
          </p>
        )}
        {session.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-3 py-2 text-[13px] leading-snug ${
                message.role === 'user'
                  ? 'rounded-br-md bg-[var(--ink)] text-white'
                  : message.guardrail?.blocked
                    ? 'rounded-bl-md border border-amber-200 bg-amber-50 text-[var(--ink)]'
                    : 'rounded-bl-md bg-[var(--paper-2)] text-[var(--ink)]'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="max-w-[78%] rounded-2xl rounded-bl-md border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2 text-[13px] text-[var(--ink-soft)]">
              <div className="flex items-center gap-2.5">
                <span className="thinking-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <div>
                  <p className="text-[13px] font-medium text-[var(--ink)]">
                    Thinking
                  </p>
                  <p className="text-[11px]">{THINKING_STEPS[thinkingStep]}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={onSend}
        className="shrink-0 border-t border-[var(--line)] bg-[var(--paper)]/60 p-2.5"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question…"
            className="min-w-0 flex-1 rounded-full border border-[var(--line)] bg-white px-3.5 py-2 text-[13px] outline-none ring-[var(--accent)] focus:ring-2"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="shrink-0 rounded-full bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
