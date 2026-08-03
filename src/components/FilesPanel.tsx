'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, LibraryFile } from '@/lib/api';

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function previewUrl(file: LibraryFile) {
  const base = file.downloadUrl.split('?')[0];
  return `${base}?inline=1`;
}

function isImage(mime: string, name: string) {
  if (mime.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
}

function isPdf(mime: string, name: string) {
  if (mime === 'application/pdf') return true;
  return /\.pdf$/i.test(name);
}

function isTextish(mime: string, name: string) {
  if (mime.startsWith('text/')) return true;
  if (mime === 'application/json') return true;
  return /\.(txt|md|markdown|csv|json|log|xml|html?)$/i.test(name);
}

export function FilesPanel({ chatbotId }: { chatbotId: string }) {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [previewFile, setPreviewFile] = useState<LibraryFile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setFiles(await api.listLibraryFiles(chatbotId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [chatbotId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('file') as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !title.trim() || !description.trim()) return;

    setBusy(true);
    setError('');
    try {
      await api.uploadLibraryFile(
        chatbotId,
        title.trim(),
        description.trim(),
        file,
      );
      setTitle('');
      setDescription('');
      form.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(fileId: string, name: string) {
    if (!confirm(`Remove “${name}”?`)) return;
    try {
      await api.removeLibraryFile(chatbotId, fileId);
      if (previewFile?.id === fileId) setPreviewFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove file');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl border border-[var(--line)] bg-white/90 p-5 shadow-[0_1px_0_rgba(16,35,31,0.04)]">
        <h2 className="font-display text-2xl">Upload file</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Add a title and description so the chatbot can find it and share a
          download link in chat. Max 8MB.
        </p>

        <form onSubmit={onUpload} className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Jhomell employment contract)"
            required
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm outline-none ring-[var(--accent)] focus:ring-2"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description — what this file is, who it’s for, when to share it…"
            rows={4}
            required
            className="w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm outline-none ring-[var(--accent)] focus:ring-2"
          />
          <input
            name="file"
            type="file"
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

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white/90 p-5 shadow-[0_1px_0_rgba(16,35,31,0.04)]">
        <h2 className="font-display text-2xl">File library</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          {loading
            ? 'Loading…'
            : `${files.length} file${files.length === 1 ? '' : 's'}`}
        </p>
        <ul className="mt-4 space-y-3">
          {!loading && files.length === 0 && (
            <li className="rounded-xl border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              No files yet. Upload a file with a title and description.
            </li>
          )}
          {files.map((file) => (
            <li
              key={file.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--paper)]/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewFile(file)}
                  className="min-w-0 flex-1 rounded-lg text-left transition hover:opacity-90"
                >
                  <div className="flex gap-3">
                    <FileThumb file={file} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--ink)]">{file.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--ink-soft)]">
                        {file.description}
                      </p>
                      <p className="mt-2 text-xs text-[var(--ink-soft)]">
                        {file.originalName} · {formatBytes(file.size)}
                      </p>
                      <p className="mt-2 text-xs font-medium text-[var(--accent-deep)]">
                        Preview →
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(file.id, file.title)}
                  className="shrink-0 text-sm text-[var(--ink-soft)] transition hover:text-[var(--danger)]"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

function FileThumb({ file }: { file: LibraryFile }) {
  if (isImage(file.mimeType, file.originalName)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl(file)}
        alt=""
        className="h-14 w-14 shrink-0 rounded-lg border border-[var(--line)] object-cover bg-white"
      />
    );
  }

  const label = isPdf(file.mimeType, file.originalName)
    ? 'PDF'
    : isTextish(file.mimeType, file.originalName)
      ? 'TXT'
      : 'FILE';

  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-white text-[10px] font-semibold tracking-wide text-[var(--ink-soft)]">
      {label}
    </div>
  );
}

function FilePreviewModal({
  file,
  onClose,
}: {
  file: LibraryFile;
  onClose: () => void;
}) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState('');
  const [textLoading, setTextLoading] = useState(false);

  const url = previewUrl(file);
  const image = isImage(file.mimeType, file.originalName);
  const pdf = isPdf(file.mimeType, file.originalName);
  const text = isTextish(file.mimeType, file.originalName);

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

  useEffect(() => {
    if (!text) {
      setTextContent(null);
      setTextError('');
      setTextLoading(false);
      return;
    }

    let cancelled = false;
    async function loadText() {
      setTextLoading(true);
      setTextError('');
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load file');
        const body = await res.text();
        if (!cancelled) setTextContent(body.slice(0, 100_000));
      } catch (err) {
        if (!cancelled) {
          setTextError(err instanceof Error ? err.message : 'Failed to load');
        }
      } finally {
        if (!cancelled) setTextLoading(false);
      }
    }
    loadText();
    return () => {
      cancelled = true;
    };
  }, [text, url]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--ink)]/45 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-preview-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(860px,92dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
              File library
            </p>
            <h2
              id="file-preview-title"
              className="mt-1 truncate font-display text-xl text-[var(--ink)] sm:text-2xl"
            >
              {file.title}
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              {file.originalName} · {formatBytes(file.size)} ·{' '}
              {file.mimeType || 'unknown type'}
            </p>
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
          <p className="mb-4 text-sm text-[var(--ink-soft)]">{file.description}</p>

          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={file.title}
              className="mx-auto max-h-[min(560px,60dvh)] w-auto max-w-full rounded-xl border border-[var(--line)] object-contain bg-[var(--paper)]"
            />
          )}

          {pdf && (
            <iframe
              title={file.title}
              src={url}
              className="h-[min(560px,60dvh)] w-full rounded-xl border border-[var(--line)] bg-[var(--paper)]"
            />
          )}

          {text && (
            <div>
              {textLoading && (
                <p className="text-sm text-[var(--ink-soft)]">Loading content…</p>
              )}
              {textError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
                  {textError}
                </p>
              )}
              {!textLoading && !textError && textContent !== null && (
                <pre className="whitespace-pre-wrap break-words rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 font-mono text-[12px] leading-relaxed text-[var(--ink)]">
                  {textContent}
                </pre>
              )}
            </div>
          )}

          {!image && !pdf && !text && (
            <div className="rounded-xl border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-[var(--ink-soft)]">
              No inline preview for this file type. Download it to open locally.
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--line)] px-5 py-3 sm:px-6">
          <a
            href={file.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)]"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
