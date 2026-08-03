'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ContextSource, ContextSourceDetail } from '@/lib/api';
import { ChatMarkdown } from '@/components/ChatMarkdown';

export function SourcesPanel({ chatbotId }: { chatbotId: string }) {
  const [sources, setSources] = useState<ContextSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'file' | 'link' | 'text' | 'feed'>('feed');
  const [url, setUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [textName, setTextName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [feedContent, setFeedContent] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSources(await api.listContext(chatbotId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources');
    } finally {
      setLoading(false);
    }
  }, [chatbotId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onUploadFile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('file') as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await api.addContextFile(chatbotId, file);
      form.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function onAddLink(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.addContextLink(chatbotId, url.trim(), linkName.trim() || undefined);
      setUrl('');
      setLinkName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add link');
    } finally {
      setBusy(false);
    }
  }

  async function onAddText(e: FormEvent) {
    e.preventDefault();
    if (!textName.trim() || !textContent.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.addContextText(chatbotId, textName.trim(), textContent.trim());
      setTextName('');
      setTextContent('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add text');
    } finally {
      setBusy(false);
    }
  }

  async function onFeedLiving(e: FormEvent) {
    e.preventDefault();
    if (!feedContent.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.feedLivingKnowledge(chatbotId, feedContent.trim());
      setFeedContent('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save knowledge');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(sourceId: string, name: string) {
    if (!confirm(`Remove source “${name}”?`)) return;
    try {
      await api.removeContext(chatbotId, sourceId);
      if (previewId === sourceId) setPreviewId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove source');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl border border-[var(--line)] bg-white/90 p-5 shadow-[0_1px_0_rgba(16,35,31,0.04)]">
        <h2 className="font-display text-2xl">Add context</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Feed facts into one Living Knowledge file, or upload extra docs (.md,
          .pdf, .txt, .doc, .docx) / links.
        </p>

        <div className="mt-4 flex flex-wrap gap-1 rounded-xl bg-[var(--paper)] p-1">
          {(['feed', 'file', 'link', 'text'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize transition ${
                tab === key
                  ? 'bg-white text-[var(--ink)] shadow-sm'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              {key === 'feed' ? 'Teach' : key}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === 'feed' && (
            <form onSubmit={onFeedLiving} className="space-y-3">
              <p className="text-xs text-[var(--ink-soft)]">
                Appends to a single{' '}
                <span className="font-medium text-[var(--ink)]">
                  Living Knowledge.md
                </span>{' '}
                source. Each save updates that same file.
              </p>
              <textarea
                value={feedContent}
                onChange={(e) => setFeedContent(e.target.value)}
                placeholder="e.g. Jhomell’s contract is employment-2024.pdf under Contracts…"
                rows={8}
                required
                className="w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm outline-none ring-[var(--accent)] focus:ring-2"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:opacity-60"
              >
                {busy ? 'Saving…' : 'Save to Living Knowledge'}
              </button>
            </form>
          )}

          {tab === 'file' && (
            <form onSubmit={onUploadFile} className="space-y-4">
              <input
                name="file"
                type="file"
                accept=".md,.markdown,.pdf,.txt,.doc,.docx,text/plain,application/pdf"
                required
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--accent-soft)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--accent-deep)]"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:opacity-60"
              >
                {busy ? 'Uploading…' : 'Upload file'}
              </button>
            </form>
          )}

          {tab === 'link' && (
            <form onSubmit={onAddLink} className="space-y-3">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/docs"
                type="url"
                required
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm outline-none ring-[var(--accent)] focus:ring-2"
              />
              <input
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="Optional display name"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm outline-none ring-[var(--accent)] focus:ring-2"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:opacity-60"
              >
                {busy ? 'Fetching…' : 'Add link'}
              </button>
            </form>
          )}

          {tab === 'text' && (
            <form onSubmit={onAddText} className="space-y-3">
              <input
                value={textName}
                onChange={(e) => setTextName(e.target.value)}
                placeholder="Source name"
                required
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm outline-none ring-[var(--accent)] focus:ring-2"
              />
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste knowledge here…"
                rows={8}
                required
                className="w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm outline-none ring-[var(--accent)] focus:ring-2"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:opacity-60"
              >
                {busy ? 'Saving…' : 'Add text'}
              </button>
            </form>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white/90 p-5 shadow-[0_1px_0_rgba(16,35,31,0.04)]">
        <h2 className="font-display text-2xl">Knowledge base</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          {loading
            ? 'Loading…'
            : `${sources.length} source${sources.length === 1 ? '' : 's'}`}
        </p>
        <ul className="mt-4 space-y-3">
          {!loading && sources.length === 0 && (
            <li className="rounded-xl border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              No sources yet. Upload a file, add a link, or paste text.
            </li>
          )}
          {sources.map((source) => (
            <li
              key={source.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--paper)]/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewId(source.id)}
                  className="min-w-0 flex-1 rounded-lg text-left transition hover:opacity-90"
                >
                  <p className="font-medium text-[var(--ink)]">
                    {source.name}
                    {source.living ? (
                      <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-deep)]">
                        Living
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                    {source.living ? 'teach · ' : ''}
                    {source.type}
                    {source.url ? ` · ${source.url}` : ''} · {source.charCount}{' '}
                    chars · {source.chunkCount} chunks
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-[var(--ink-soft)]">
                    {source.preview}
                  </p>
                  <p className="mt-2 text-xs font-medium text-[var(--accent-deep)]">
                    Preview →
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(source.id, source.name)}
                  className="shrink-0 text-sm text-[var(--ink-soft)] transition hover:text-[var(--danger)]"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {previewId && (
        <KnowledgePreviewModal
          chatbotId={chatbotId}
          sourceId={previewId}
          onClose={() => setPreviewId(null)}
        />
      )}
    </div>
  );
}

function KnowledgePreviewModal({
  chatbotId,
  sourceId,
  onClose,
}: {
  chatbotId: string;
  sourceId: string;
  onClose: () => void;
}) {
  const [source, setSource] = useState<ContextSourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api.getContextSource(chatbotId, sourceId);
        if (!cancelled) setSource(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load source');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [chatbotId, sourceId]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const content = source?.content || '';
  const looksLikeMarkdown =
    Boolean(content) &&
    (/^#{1,3}\s/m.test(content) ||
      /^[-*]\s/m.test(content) ||
      /^\d+\.\s/m.test(content) ||
      /\*\*[^*]+\*\*/.test(content) ||
      Boolean(source?.name.endsWith('.md')));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--ink)]/45 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kb-preview-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(860px,92dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
              Knowledge base
            </p>
            <h2
              id="kb-preview-title"
              className="mt-1 truncate font-display text-xl text-[var(--ink)] sm:text-2xl"
            >
              {source?.name || 'Source preview'}
            </h2>
            {source && (
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                {source.type}
                {source.url ? ` · ${source.url}` : ''} · {source.charCount} chars
                · {source.chunkCount} chunks
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--line)] text-[var(--ink-soft)] transition hover:bg-[var(--paper)] hover:text-[var(--ink)]"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {loading && (
            <p className="text-sm text-[var(--ink-soft)]">Loading content…</p>
          )}
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
          {!loading && !error && source && (
            looksLikeMarkdown ? (
              <ChatMarkdown content={source.content} />
            ) : (
              <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-[var(--ink)]">
                {source.content}
              </pre>
            )
          )}
        </div>
      </div>
    </div>
  );
}
