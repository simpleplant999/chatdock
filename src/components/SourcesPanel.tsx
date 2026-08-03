'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ContextSource } from '@/lib/api';

export function SourcesPanel({ chatbotId }: { chatbotId: string }) {
  const [sources, setSources] = useState<ContextSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'file' | 'link' | 'text'>('file');
  const [url, setUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [textName, setTextName] = useState('');
  const [textContent, setTextContent] = useState('');

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

  async function onRemove(sourceId: string, name: string) {
    if (!confirm(`Remove source “${name}”?`)) return;
    try {
      await api.removeContext(chatbotId, sourceId);
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
          Supported files: .md, .pdf, .txt, .doc, .docx — or paste a public URL.
        </p>

        <div className="mt-4 flex gap-1 rounded-xl bg-[var(--paper)] p-1">
          {(['file', 'link', 'text'] as const).map((key) => (
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
              {key}
            </button>
          ))}
        </div>

        <div className="mt-4">
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
                <div>
                  <p className="font-medium">{source.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                    {source.type}
                    {source.url ? ` · ${source.url}` : ''} · {source.charCount}{' '}
                    chars · {source.chunkCount} chunks
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-[var(--ink-soft)]">
                    {source.preview}
                  </p>
                </div>
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
    </div>
  );
}
