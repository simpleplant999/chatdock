'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ChatPanel } from '@/components/ChatPanel';
import { EmbedPanel } from '@/components/EmbedPanel';
import { RequireAuth } from '@/components/RequireAuth';
import { SourcesPanel } from '@/components/SourcesPanel';
import { api, Chatbot } from '@/lib/api';

export default function ChatbotPage() {
  return (
    <RequireAuth>
      <ChatbotContent />
    </RequireAuth>
  );
}

function ChatbotContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [bot, setBot] = useState<Chatbot | null>(null);
  const [tab, setTab] = useState<'chat' | 'sources' | 'embed'>('chat');
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
          Back to chatbots
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
      fullHeight={tab === 'chat'}
      title={bot.name}
      subtitle={
        bot.description ||
        'Upload context, then ask questions grounded in your knowledge base.'
      }
      sideNavItems={[
        {
          label: 'Playground',
          active: tab === 'chat',
          onClick: () => setTab('chat'),
        },
        {
          label: 'Sources',
          active: tab === 'sources',
          onClick: () => setTab('sources'),
          badge: bot.sourceCount,
        },
        {
          label: 'Embed',
          active: tab === 'embed',
          onClick: () => setTab('embed'),
          badge: bot.published ? 'On' : 'Off',
        },
      ]}
    >
      {tab === 'chat' ? (
        <ChatPanel chatbotId={bot.id} />
      ) : tab === 'sources' ? (
        <div className="h-full min-h-0 overflow-y-auto overscroll-contain pb-2">
          <SourcesPanel chatbotId={bot.id} />
        </div>
      ) : (
        <div className="h-full min-h-0 overflow-y-auto overscroll-contain pb-2">
          <EmbedPanel bot={bot} onUpdated={setBot} />
        </div>
      )}
    </AppShell>
  );
}
