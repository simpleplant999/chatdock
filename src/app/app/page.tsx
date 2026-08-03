'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell, notifyChatbotsChanged } from '@/components/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { api, Chatbot } from '@/lib/api';

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent() {
  const [bots, setBots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setBots(await api.listChatbots());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chatbots');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError('');
    try {
      await api.createChatbot({
        name: name.trim(),
        description: description.trim(),
      });
      setName('');
      setDescription('');
      await load();
      notifyChatbotsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chatbot');
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(id: string, botName: string) {
    if (!confirm(`Delete “${botName}”? This removes its sources and chats.`)) {
      return;
    }
    try {
      await api.deleteChatbot(id);
      await load();
      notifyChatbotsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chatbot');
    }
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle="Manage knowledge bots, sources, files, and playground chats."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total bots" value={loading ? '—' : String(bots.length)} />
        <StatCard
          label="Sources"
          value={
            loading
              ? '—'
              : String(bots.reduce((sum, bot) => sum + bot.sourceCount, 0))
          }
        />
        <StatCard
          label="Indexed chunks"
          value={
            loading
              ? '—'
              : String(bots.reduce((sum, bot) => sum + bot.chunkCount, 0))
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div>
              <h2 className="font-medium text-[var(--ink)]">All chatbots</h2>
              <p className="text-xs text-[var(--ink-soft)]">
                Open a bot to chat or manage sources
              </p>
            </div>
          </div>

          <div className="p-2 sm:p-3">
            {loading && (
              <p className="px-3 py-6 text-sm text-[var(--ink-soft)]">
                Loading chatbots…
              </p>
            )}
            {error && (
              <p className="m-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </p>
            )}
            {!loading && bots.length === 0 && !error && (
              <p className="m-2 rounded-xl border border-dashed border-[var(--line)] px-5 py-8 text-sm text-[var(--ink-soft)]">
                No chatbots yet. Create one in the panel on the right.
              </p>
            )}
            <ul className="divide-y divide-[var(--line)]">
              {bots.map((bot) => (
                <li
                  key={bot.id}
                  className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/chatbots/${bot.id}?section=playground`}
                      className="font-display text-lg text-[var(--ink)] transition hover:text-[var(--accent)]"
                    >
                      {bot.name}
                    </Link>
                    <p className="mt-0.5 truncate text-sm text-[var(--ink-soft)]">
                      {bot.description || 'No description'}
                    </p>
                    <p className="mt-2 text-xs text-[var(--ink-soft)]">
                      {bot.sourceCount} source{bot.sourceCount === 1 ? '' : 's'} ·{' '}
                      {bot.chunkCount} chunk{bot.chunkCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/chatbots/${bot.id}?section=playground`}
                      className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--accent-deep)]"
                    >
                      Manage
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(bot.id, bot.name)}
                      className="rounded-lg px-3 py-1.5 text-sm text-[var(--ink-soft)] transition hover:bg-red-50 hover:text-[var(--danger)]"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="h-fit rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-2xl">Create chatbot</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Add a bot, then upload knowledge under Sources.
          </p>
          <form onSubmit={onCreate} className="mt-5 space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Product FAQ bot"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 outline-none ring-[var(--accent)] transition focus:ring-2"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should this bot help with?"
                rows={3}
                className="w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 outline-none ring-[var(--accent)] transition focus:ring-2"
              />
            </label>
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create chatbot'}
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl text-[var(--ink)]">{value}</p>
    </div>
  );
}
