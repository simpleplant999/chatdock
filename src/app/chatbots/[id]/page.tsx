'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { AppShell, BotSection, notifyChatbotsChanged } from '@/components/AppShell';
import { ChatPanel } from '@/components/ChatPanel';
import { EmbedPanel } from '@/components/EmbedPanel';
import { FilesPanel } from '@/components/FilesPanel';
import { RequireAuth } from '@/components/RequireAuth';
import { SourcesPanel } from '@/components/SourcesPanel';
import { api, Chatbot } from '@/lib/api';

const SECTION_TITLES: Record<BotSection, string> = {
  playground: 'Playground',
  sources: 'Sources',
  files: 'Files',
  embed: 'Embed',
};

function parseSection(value: string | null): BotSection {
  if (
    value === 'sources' ||
    value === 'files' ||
    value === 'embed' ||
    value === 'playground'
  ) {
    return value;
  }
  return 'playground';
}

export default function ChatbotPage() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <AppShell>
            <BotPageSkeleton />
          </AppShell>
        }
      >
        <ChatbotContent />
      </Suspense>
    </RequireAuth>
  );
}

function ChatbotContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;
  const section = parseSection(searchParams.get('section'));
  const [bot, setBot] = useState<Chatbot | null>(null);
  const [error, setError] = useState('');

  async function loadBot() {
    try {
      const data = await api.getChatbot(id);
      setBot(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chatbot not found');
    }
  }

  useEffect(() => {
    loadBot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) {
    return (
      <AppShell title="Chatbot not found">
        <p className="text-[var(--danger)]">{error}</p>
        <Link href="/app" className="mt-4 inline-block text-[var(--accent)]">
          Back to Dashboard
        </Link>
      </AppShell>
    );
  }

  if (!bot) {
    return (
      <AppShell fullHeight={section === 'playground'}>
        <BotPageSkeleton playground={section === 'playground'} />
      </AppShell>
    );
  }

  return (
    <AppShell
      fullHeight={section === 'playground'}
      title={bot.name}
      subtitle={
        `${SECTION_TITLES[section]} · ` +
        (bot.description ||
          'Upload context, then ask questions grounded in your knowledge base.')
      }
    >
      {section === 'playground' ? (
        <ChatPanel chatbotId={bot.id} />
      ) : section === 'sources' ? (
        <SourcesPanel chatbotId={bot.id} />
      ) : section === 'files' ? (
        <FilesPanel chatbotId={bot.id} />
      ) : (
        <EmbedPanel
          bot={bot}
          onUpdated={(updated) => {
            setBot(updated);
            notifyChatbotsChanged();
          }}
        />
      )}
    </AppShell>
  );
}

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--paper-2)] ${className || ''}`}
    />
  );
}

function BotPageSkeleton({ playground = true }: { playground?: boolean }) {
  if (playground) {
    return (
      <div
        className="mx-auto flex h-full min-h-0 w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm"
        aria-busy="true"
        aria-label="Loading chatbot"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-3 py-2.5">
          <div className="space-y-1.5">
            <SkeletonBar className="h-4 w-24" />
            <SkeletonBar className="h-3 w-40" />
          </div>
          <SkeletonBar className="h-7 w-16 rounded-lg" />
        </div>
        <div className="min-h-0 flex-1 space-y-3 px-3 py-3">
          <div className="flex justify-start">
            <div className="w-[78%] space-y-2 rounded-2xl rounded-bl-md bg-[var(--paper-2)]/80 p-3">
              <SkeletonBar className="h-3 w-[92%]" />
              <SkeletonBar className="h-3 w-[70%]" />
              <SkeletonBar className="h-3 w-[84%]" />
            </div>
          </div>
          <div className="flex justify-end">
            <div className="w-[55%] space-y-2 rounded-2xl rounded-br-md bg-[var(--paper-2)] p-3">
              <SkeletonBar className="h-3 w-full" />
              <SkeletonBar className="h-3 w-[60%]" />
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-[var(--line)] bg-[var(--paper)]/60 p-2.5">
          <div className="mb-2 flex gap-2">
            <SkeletonBar className="h-7 w-24 rounded-full" />
            <SkeletonBar className="h-7 w-20 rounded-full" />
          </div>
          <div className="flex gap-2">
            <SkeletonBar className="h-9 min-w-0 flex-1 rounded-full" />
            <SkeletonBar className="h-9 w-14 shrink-0 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid gap-6 lg:grid-cols-[1fr_1fr]"
      aria-busy="true"
      aria-label="Loading chatbot"
    >
      <div className="rounded-2xl border border-[var(--line)] bg-white/90 p-5">
        <SkeletonBar className="h-7 w-40" />
        <SkeletonBar className="mt-2 h-4 w-64" />
        <SkeletonBar className="mt-6 h-10 w-full rounded-xl" />
        <SkeletonBar className="mt-3 h-24 w-full rounded-xl" />
        <SkeletonBar className="mt-3 h-10 w-full rounded-xl" />
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-white/90 p-5">
        <SkeletonBar className="h-7 w-36" />
        <SkeletonBar className="mt-2 h-4 w-28" />
        <div className="mt-4 space-y-3">
          <SkeletonBar className="h-20 w-full rounded-xl" />
          <SkeletonBar className="h-20 w-full rounded-xl" />
          <SkeletonBar className="h-20 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
