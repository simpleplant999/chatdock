'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

/** Minimal host page used for admin live preview of the bubble widget. */
export default function WidgetDemoPage() {
  const params = useParams<{ id: string }>();

  useEffect(() => {
    const existing = document.querySelector(
      'script[src*="embed-widget.js"][data-bot-id]',
    );
    if (existing) existing.remove();
    document.getElementById('cc-widget-root')?.remove();
    document
      .querySelectorAll('style')
      .forEach((el) => {
        if (el.textContent?.includes('#cc-widget-root')) el.remove();
      });

    const script = document.createElement('script');
    script.src = `/embed-widget.js?t=${Date.now()}`;
    script.async = true;
    script.setAttribute('data-bot-id', params.id);
    script.setAttribute('data-title', 'Chat with us');
    document.body.appendChild(script);

    return () => {
      script.remove();
      document.getElementById('cc-widget-root')?.remove();
    };
  }, [params.id]);

  return (
    <div className="min-h-dvh bg-[#f3f6f5] text-[var(--ink)]">
      <header className="border-b border-black/5 bg-white px-6 py-4">
        <p className="text-sm font-semibold tracking-tight">Your website</p>
        <p className="text-xs text-[var(--ink-soft)]">
          Sample page — click the bubble at the bottom right
        </p>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-display text-3xl tracking-tight">Welcome</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
          This is a stand-in for any site that hosts your chatbot. Open the
          bubble to chat. Refresh this page to start a brand-new session.
        </p>
        <div className="mt-8 space-y-3 text-sm text-[var(--ink-soft)]">
          <p>Product overview · Pricing · Docs · Contact</p>
          <p className="h-24 rounded-xl bg-white/70 ring-1 ring-black/5" />
          <p className="h-16 rounded-xl bg-white/70 ring-1 ring-black/5" />
        </div>
      </main>
    </div>
  );
}
