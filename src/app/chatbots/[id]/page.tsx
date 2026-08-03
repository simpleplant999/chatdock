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
          <AppShell title="Loading…">
            <p className="text-[var(--ink-soft)]">Loading chatbot…</p>
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
      <AppShell title="Loading…">
        <p className="text-[var(--ink-soft)]">Loading chatbot…</p>
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
