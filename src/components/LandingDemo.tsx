'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

const KNOWLEDGE: { keys: string[]; answer: string }[] = [
  {
    keys: ['plan', 'pricing', 'price', 'cost', 'pro', 'business', 'free'],
    answer:
      'Acme offers three plans: Free (up to 3 members, 1 workspace), Pro at $12 per member / month with unlimited workspaces, and Business at $24 per member / month with SSO and audit logs.',
  },
  {
    keys: ['refund', 'money back', 'cancel'],
    answer:
      'You can request a refund within 14 days of purchase if you have used fewer than 10 task actions.',
  },
  {
    keys: ['support', 'help', 'hours', 'contact'],
    answer:
      'Live chat support runs Monday–Friday, 9am–6pm UTC. Email support@acme.example.com anytime. Business-plan urgent issues get a response within 2 hours.',
  },
  {
    keys: ['signup', 'sign up', 'invite', 'getting started', 'start'],
    answer:
      'Create an account at acme.example.com/signup, invite teammates from Settings → Members, then create your first project board.',
  },
];

const SUGGESTIONS = [
  'What pricing plans do you offer?',
  'How do refunds work?',
  'What are your support hours?',
];

function answerFromDemo(question: string): string {
  const q = question.toLowerCase();
  const hit = KNOWLEDGE.find((item) =>
    item.keys.some((key) => q.includes(key)),
  );
  if (hit) return hit.answer;
  return "I don't have enough information in the knowledge base to answer that. Try asking about pricing, refunds, or support hours.";
}

export function LandingDemo() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        "Hi — I'm Athena. Ask about plans, refunds, or support. I only answer from sample docs.",
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, busy]);

  async function ask(question: string) {
    const content = question.trim();
    if (!content || busy) return;
    setBusy(true);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content }]);

    await new Promise((r) => setTimeout(r, 700 + Math.random() * 500));
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: answerFromDemo(content) },
    ]);
    setBusy(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  return (
    <div className="flex h-[min(520px,70vh)] flex-col overflow-hidden rounded-[1.35rem] border border-white/15 bg-[#0c1a17]/shadow-[0_30px_80px_rgba(8,20,18,0.45)]">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
          AB
        </span>
        <div>
          <p className="text-sm font-semibold text-white">Athena</p>
          <p className="text-[11px] text-white/50">Live demo · sample knowledge</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-300/90">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Online
        </span>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-br-md bg-[var(--accent)] text-white'
                  : 'rounded-bl-md bg-white/8 text-white/90'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-white/8 px-3.5 py-2.5">
              <span className="thinking-dots">
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 px-3 pb-3 pt-2">
        <div className="mb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => ask(s)}
              className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] text-white/75 transition hover:border-white/25 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the demo bot…"
            disabled={busy}
            className="min-w-0 flex-1 rounded-full border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
