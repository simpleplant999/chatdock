'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, Chatbot } from '@/lib/api';

const ACCENT = '#0f766e';

export function EmbedPanel({
  bot,
  onUpdated,
}: {
  bot: Chatbot;
  onUpdated: (bot: Chatbot) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://your-domain.com';

  const widgetSrc = `${origin}/embed-widget.js`;
  const embedUrl = `${origin}/embed/${bot.id}`;
  const safeTitle = bot.name.replace(/"/g, '');

  const snippet = useMemo(
    () =>
      [
        `<!-- ChatDock bubble — new session on every page load -->`,
        `<script`,
        `  src="${widgetSrc}"`,
        `  data-bot-id="${bot.id}"`,
        `  data-title="${safeTitle}"`,
        `  defer`,
        `></script>`,
      ].join('\n'),
    [widgetSrc, bot.id, safeTitle],
  );

  const snippetLines = useMemo(() => snippet.split('\n'), [snippet]);

  async function togglePublished() {
    setBusy(true);
    setError('');
    try {
      const updated = await api.updateChatbot(bot.id, {
        published: !bot.published,
      });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setBusy(false);
    }
  }

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Could not copy — select the snippet manually.');
    }
  }

  function refreshPreview() {
    setPreviewOpen(false);
    setPreviewKey((k) => k + 1);
  }

  useEffect(() => {
    setPreviewOpen(false);
    setPreviewKey((k) => k + 1);
  }, [bot.id, bot.published]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      {/* Publish */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-display text-2xl tracking-tight">Website embed</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--ink-soft)]">
          Publish this bot, then paste the script on any site. A chat bubble
          appears at the bottom right. Every page load or refresh starts a new
          chat session.
        </p>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--ink)]">
              Status:{' '}
              <span
                className={
                  bot.published
                    ? 'text-[var(--accent-deep)]'
                    : 'text-[var(--warn)]'
                }
              >
                {bot.published ? 'Published' : 'Unpublished'}
              </span>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
              Unpublished bots cannot be used from other websites.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={togglePublished}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${
              bot.published
                ? 'bg-[var(--ink-soft)] hover:bg-[var(--ink)]'
                : 'bg-[var(--accent)] hover:bg-[var(--accent-deep)]'
            }`}
          >
            {busy
              ? 'Saving…'
              : bot.published
                ? 'Unpublish'
                : 'Publish for embed'}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </section>

      {/* Snippet */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--ink)]">
              Install snippet
            </h3>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Paste this before{' '}
              <code className="rounded bg-[var(--paper-2)] px-1.5 py-0.5 text-[13px] text-[var(--ink)]">
                &lt;/body&gt;
              </code>{' '}
              on your site.
            </p>
          </div>
          <button
            type="button"
            onClick={copySnippet}
            disabled={!bot.published}
            className="shrink-0 rounded-xl border border-[var(--line)] bg-white px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)] disabled:opacity-40"
          >
            {copied ? 'Copied' : 'Copy code'}
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-[#f7f9f8]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--ink-soft)]">
              HTML
            </span>
            <span className="text-xs text-[var(--ink-soft)]">embed-widget.js</span>
          </div>
          <pre
            className="overflow-x-auto p-5 font-mono text-[13px] leading-7 text-[var(--ink)] sm:text-sm sm:leading-8"
            tabIndex={0}
          >
            <code>
              {snippetLines.map((line, i) => (
                <SnippetLine key={i} line={line} />
              ))}
            </code>
          </pre>
        </div>

        {!bot.published && (
          <p className="mt-4 text-sm text-[var(--warn)]">
            Publish the bot first — visitors will see an error until then.
          </p>
        )}
      </section>

      {/* Live bubble preview */}
      {bot.published && (
        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-[var(--ink)]">
                Live preview
              </h3>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Same bubble your visitors get — click it to open chat.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshPreview}
              className="shrink-0 rounded-xl border border-[var(--line)] bg-white px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)]"
            >
              New session
            </button>
          </div>

          <div className="relative mt-5 h-[520px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[#eef3f1] sm:h-[560px]">
            {/* Fake host page */}
            <div className="pointer-events-none select-none p-5 sm:p-6">
              <div className="h-3 w-28 rounded-full bg-white/80" />
              <div className="mt-5 h-5 w-48 rounded-full bg-white/90" />
              <div className="mt-3 h-3 w-full max-w-md rounded-full bg-white/60" />
              <div className="mt-2 h-3 w-3/4 max-w-sm rounded-full bg-white/50" />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="h-24 rounded-xl bg-white/70" />
                <div className="h-24 rounded-xl bg-white/55" />
              </div>
              <p className="mt-6 text-xs text-[var(--ink-soft)]/70">
                Sample website content
              </p>
            </div>

            {/* Contained bubble (not fixed to the admin viewport) */}
            <PreviewBubble
              key={previewKey}
              open={previewOpen}
              onToggle={() => setPreviewOpen((v) => !v)}
              onClose={() => setPreviewOpen(false)}
              embedUrl={embedUrl}
              title={bot.name}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function SnippetLine({ line }: { line: string }) {
  if (line.startsWith('<!--')) {
    return (
      <span className="block text-[#6b7f78]">
        {line}
        {'\n'}
      </span>
    );
  }

  if (line.trim() === '<script' || line.trim() === '></script>') {
    return (
      <span className="block">
        <span className="text-[#0f766e]">{line}</span>
        {'\n'}
      </span>
    );
  }

  if (line.trim() === 'defer') {
    return (
      <span className="block">
        <span className="text-[#115e59]">  defer</span>
        {'\n'}
      </span>
    );
  }

  const attrMatch = line.match(/^(\s+)([\w-]+)=("(.*)")$/);
  if (attrMatch) {
    const [, indent, name, , value] = attrMatch;
    return (
      <span className="block">
        <span>{indent}</span>
        <span className="text-[#0f766e]">{name}</span>
        <span className="text-[var(--ink-soft)]">=</span>
        <span className="text-[#9a3412]">&quot;{value}&quot;</span>
        {'\n'}
      </span>
    );
  }

  return (
    <span className="block">
      {line}
      {'\n'}
    </span>
  );
}

function PreviewBubble({
  open,
  onToggle,
  onClose,
  embedUrl,
  title,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  embedUrl: string;
  title: string;
}) {
  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-3 sm:bottom-5 sm:right-5">
      {open && (
        <div className="relative h-[400px] w-[min(340px,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_50px_rgba(16,35,31,0.28)] sm:w-[360px]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="absolute right-2.5 top-2.5 z-20 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-[var(--ink)] shadow-sm ring-1 ring-black/5 transition hover:bg-white"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <iframe
            title={title}
            src={embedUrl}
            className="h-full w-full border-0 bg-white"
            allow="clipboard-write"
          />
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? 'Close chat' : 'Open chat'}
        aria-expanded={open}
        className="grid h-[58px] w-[58px] place-items-center rounded-full text-white shadow-[0_10px_30px_rgba(16,35,31,0.28)] transition hover:scale-105"
        style={{ background: ACCENT }}
      >
        {open ? (
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v7.4a2.8 2.8 0 0 1-2.8 2.8H9.2L5 20v-3h-.2A2.8 2.8 0 0 1 2 14.2V6.8A2.8 2.8 0 0 1 4 6.8Z"
              fill="currentColor"
              opacity=".95"
            />
            <circle cx="8.2" cy="10.2" r="1.1" fill={ACCENT} />
            <circle cx="12" cy="10.2" r="1.1" fill={ACCENT} />
            <circle cx="15.8" cy="10.2" r="1.1" fill={ACCENT} />
          </svg>
        )}
      </button>
    </div>
  );
}
