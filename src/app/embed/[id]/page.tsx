'use client';

import { useParams } from 'next/navigation';
import { EmbedChat } from '@/components/EmbedChat';

export default function EmbedPage() {
  const params = useParams<{ id: string }>();

  return <EmbedChat chatbotId={params.id} />;
}
