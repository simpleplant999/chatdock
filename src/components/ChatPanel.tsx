'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, ChatMessage, ChatSession } from '@/lib/api';

const THINKING_STEPS = [
  'Reading your question…',
  'Searching the knowledge base…',
  'Gathering relevant details…',
  'Drafting a detailed answer…',
];

export function ChatPanel({ chatbotId }: { chatbotId: string }) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setLoading(true);
      setError('');
      try {
        const [sessions, suggestionRes] = await Promise.all([
          api.listSessions(chatbotId),
          api.listSuggestions(chatbotId).catch(() => ({ suggestions: [] })),
        ]);
        let next: ChatSession;
        if (sessions[0]) {
          next = await api.getSession(chatbotId, sessions[0].id);
        } else {
          next = await api.createSession(chatbotId);
        }
        if (!cancelled) {
          setSession(next);
          setSuggestions(suggestionRes.suggestions);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to start chat');
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

  async function newChat() {
    setError('');
    try {
      const [next, suggestionRes] = await Promise.all([
        api.createSession(chatbotId),
        api.listSuggestions(chatbotId).catch(() => ({ suggestions: [] })),
      ]);
      setSession(next);
      setSuggestions(suggestionRes.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    }
  }

  async function ask(raw: string) {
    if (!session || !raw.trim() || sending) return;
    const content = raw.trim();
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
      const result = await api.sendMessage(chatbotId, session.id, content);
      const elapsed = Date.now() - startedAt;
      if (elapsed < 1100) {
        await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
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

  function onSend(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-white p-6 text-sm text-[var(--ink-soft)]">
        Starting chat session…
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-3 py-2.5">
        <div>
          <p className="text-sm font-semibold">Playground</p>
          <p className="text-[11px] text-[var(--ink-soft)]">
            Answers from your knowledge base
          </p>
        </div>
        <button
          type="button"
          onClick={newChat}
          className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--ink-soft)] transition hover:bg-[var(--paper)] hover:text-[var(--ink)]"
        >
          New chat
        </button>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-3 py-3"
      >
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-[var(--danger)]">
            {error}
          </p>
        )}
        {session?.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-[13px] leading-snug ${
                message.role === 'user'
                  ? 'rounded-br-md bg-[var(--ink)] text-white'
                  : message.guardrail?.blocked
                    ? 'rounded-bl-md border border-amber-200 bg-amber-50 text-[var(--ink)]'
                    : 'rounded-bl-md bg-[var(--paper-2)] text-[var(--ink)]'
              }`}
            >
              {message.role === 'assistant' && message.guardrail?.blocked && (
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--warn)]">
                  Guardrail · {message.guardrail.code || 'blocked'}
                </p>
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-2xl rounded-bl-md border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2 text-[13px] text-[var(--ink-soft)]">
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

      <div className="shrink-0 border-t border-[var(--line)] bg-[var(--paper)]/60 p-2.5">
        {suggestions.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={sending || !session}
                onClick={() => ask(s)}
                className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)] disabled:opacity-50"
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              disabled={sending || !session}
              onClick={() => inputRef.current?.focus()}
              className="rounded-full border border-dashed border-[var(--line)] bg-white px-3 py-1 text-[11px] text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)] disabled:opacity-50"
            >
              Other
            </button>
          </div>
        )}
        <form onSubmit={onSend} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something covered by your sources…"
            className="min-w-0 flex-1 rounded-full border border-[var(--line)] bg-white px-3.5 py-2 text-[13px] outline-none ring-[var(--accent)] transition focus:ring-2"
            disabled={sending || !session}
          />
          <button
            type="submit"
            disabled={sending || !input.trim() || !session}
            className="shrink-0 rounded-full bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:opacity-50"
          >
            {sending ? '…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
