'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, Chatbot } from '@/lib/api';

export type BotSection = 'playground' | 'sources' | 'files' | 'embed';

const BOT_SECTIONS: {
  id: BotSection;
  label: string;
}[] = [
  { id: 'playground', label: 'Playground' },
  { id: 'sources', label: 'Sources' },
  { id: 'files', label: 'Files' },
  { id: 'embed', label: 'Embed' },
];

export function AppShell({
  children,
  title,
  subtitle,
  actions,
  fullHeight = false,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  fullHeight?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function closeMobile() {
    setMobileOpen(false);
  }

  const sidebar = (
    <Suspense fallback={<SidebarChrome loading />}>
      <SidebarNav onNavigate={closeMobile} />
    </Suspense>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--paper)]">
      <div className="hidden shrink-0 md:block">{sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={closeMobile}
          />
          <div className="absolute inset-y-0 left-0 z-50 shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--line)] text-[var(--ink)] md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-4 bg-current" />
              <span className="block h-0.5 w-4 bg-current" />
              <span className="block h-0.5 w-4 bg-current" />
            </span>
          </button>

          <div className="min-w-0 flex-1">
            {title && (
              <h1 className="truncate font-display text-xl text-[var(--ink)] sm:text-2xl">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-0.5 line-clamp-1 text-sm text-[var(--ink-soft)]">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>

        <main
          className={
            fullHeight
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-5'
              : 'min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6'
          }
        >
          <div
            className={
              fullHeight
                ? 'flex min-h-0 min-w-0 flex-1 flex-col'
                : 'mx-auto w-full max-w-6xl pb-8'
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarChrome({
  loading,
  children,
}: {
  loading?: boolean;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { user, logout } = useAuth();

  function onLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <aside className="flex h-full w-[260px] flex-col border-r border-[var(--line)] bg-[var(--ink)] text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <Link href="/app" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent)] text-sm font-semibold">
            CC
          </span>
          <div>
            <p className="font-display text-lg leading-none">ChatDock</p>
            <p className="mt-1 text-[11px] text-white/55">Admin dashboard</p>
          </div>
        </Link>
      </div>

      {loading ? (
        <div className="flex-1 px-3 py-4 text-xs text-white/40">Loading…</div>
      ) : (
        children
      )}

      <div className="border-t border-white/10 px-4 py-4">
        {user && (
          <div className="mb-3 truncate px-1 text-xs text-white/55">
            {user.email}
          </div>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}

function SidebarNav({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [bots, setBots] = useState<Chatbot[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeBotId = pathname.startsWith('/chatbots/')
    ? pathname.split('/')[2] || null
    : null;
  const activeSection = (searchParams.get('section') as BotSection) || 'playground';
  const isDashboard = pathname === '/app';

  const loadBots = useCallback(async () => {
    if (!user) {
      setBots([]);
      return;
    }
    try {
      setBots(await api.listChatbots());
    } catch {
      // Keep previous list on transient errors
    }
  }, [user]);

  useEffect(() => {
    loadBots();
  }, [loadBots, pathname]);

  useEffect(() => {
    function onChanged() {
      loadBots();
    }
    window.addEventListener('chatdock:chatbots-changed', onChanged);
    return () => {
      window.removeEventListener('chatdock:chatbots-changed', onChanged);
    };
  }, [loadBots]);

  useEffect(() => {
    if (activeBotId) setExpandedId(activeBotId);
  }, [activeBotId]);

  function toggleBot(botId: string) {
    setExpandedId((prev) => (prev === botId ? null : botId));
  }

  return (
    <SidebarChrome>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
          Workspace
        </p>
        <SideLink
          href="/app"
          label="Dashboard"
          active={isDashboard}
          onNavigate={onNavigate}
        />

        <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
          Chatbots
        </p>

        {bots.length === 0 && (
          <p className="px-3 py-2 text-xs text-white/40">
            No chatbots yet. Create one from Dashboard.
          </p>
        )}

        <ul className="space-y-1">
          {bots.map((bot) => {
            const open = expandedId === bot.id;
            const isActiveBot = activeBotId === bot.id;

            return (
              <li key={bot.id}>
                <button
                  type="button"
                  onClick={() => toggleBot(bot.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    isActiveBot
                      ? 'bg-white/12 text-white'
                      : 'text-white/70 hover:bg-white/8 hover:text-white'
                  }`}
                  aria-expanded={open}
                >
                  <span
                    className={`grid h-4 w-4 shrink-0 place-items-center text-[10px] text-white/50 transition ${
                      open ? 'rotate-90' : ''
                    }`}
                    aria-hidden
                  >
                    ▸
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {bot.name}
                  </span>
                  {bot.published && (
                    <span className="shrink-0 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-200">
                      Live
                    </span>
                  )}
                </button>

                {open && (
                  <ul className="mb-1 ml-3 space-y-0.5 border-l border-white/10 pl-2 pt-0.5">
                    {BOT_SECTIONS.map((section) => {
                      const href = `/chatbots/${bot.id}?section=${section.id}`;
                      const active =
                        isActiveBot &&
                        (activeSection === section.id ||
                          (section.id === 'playground' &&
                            !searchParams.get('section')));
                      const badge =
                        section.id === 'sources'
                          ? bot.sourceCount
                          : section.id === 'embed'
                            ? bot.published
                              ? 'On'
                              : 'Off'
                            : undefined;

                      return (
                        <li key={section.id}>
                          <Link
                            href={href}
                            onClick={onNavigate}
                            className={`flex items-center justify-between rounded-md px-2.5 py-2 text-[13px] transition ${
                              active
                                ? 'bg-white/12 text-white'
                                : 'text-white/60 hover:bg-white/8 hover:text-white'
                            }`}
                          >
                            <span>{section.label}</span>
                            {badge !== undefined && (
                              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/65">
                                {badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </SidebarChrome>
  );
}

function SideLink({
  href,
  label,
  active,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  active?: boolean;
  badge?: string | number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
        active
          ? 'bg-white/12 text-white'
          : 'text-white/70 hover:bg-white/8 hover:text-white'
      }`}
    >
      <span>{label}</span>
      {badge !== undefined && (
        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] text-white/70">
          {badge}
        </span>
      )}
    </Link>
  );
}

/** Notify the sidebar to refresh its chatbot list. */
export function notifyChatbotsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('chatdock:chatbots-changed'));
  }
}
