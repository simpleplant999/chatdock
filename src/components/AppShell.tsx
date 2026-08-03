'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export type SideNavItem = {
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  badge?: string | number;
};

export function AppShell({
  children,
  title,
  subtitle,
  actions,
  fullHeight = false,
  sideNavItems,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  fullHeight?: boolean;
  sideNavItems?: SideNavItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  function onLogout() {
    logout();
    router.replace('/login');
  }

  const isChatbots = pathname === '/app';
  const onChatbotDetail = pathname.startsWith('/chatbots/');

  function closeMobile() {
    setMobileOpen(false);
  }

  const sidebar = (
    <aside className="flex h-full w-[260px] flex-col border-r border-[var(--line)] bg-[var(--ink)] text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <Link
          href="/app"
          onClick={closeMobile}
          className="flex items-center gap-3"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent)] text-sm font-semibold">
            CC
          </span>
          <div>
            <p className="font-display text-lg leading-none">ChatDock</p>
            <p className="mt-1 text-[11px] text-white/55">Admin dashboard</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
          Workspace
        </p>
        <SideLink
          href="/app"
          label="Chatbots"
          active={isChatbots}
          onNavigate={closeMobile}
        />

        {onChatbotDetail && sideNavItems && sideNavItems.length > 0 && (
          <>
            <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Current bot
            </p>
            {sideNavItems.map((item) =>
              item.href ? (
                <SideLink
                  key={item.label}
                  href={item.href}
                  label={item.label}
                  active={item.active}
                  badge={item.badge}
                  onNavigate={closeMobile}
                />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    item.onClick?.();
                    closeMobile();
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    item.active
                      ? 'bg-white/12 text-white'
                      : 'text-white/70 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] text-white/70">
                      {item.badge}
                    </span>
                  )}
                </button>
              ),
            )}
            <Link
              href="/app"
              onClick={closeMobile}
              className="mt-1 flex w-full items-center rounded-lg px-3 py-2.5 text-sm text-white/55 transition hover:bg-white/8 hover:text-white"
            >
              ← All chatbots
            </Link>
          </>
        )}
      </nav>

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
              ? 'flex min-h-0 flex-1 flex-col p-4 sm:p-5'
              : 'min-h-0 flex-1 overflow-y-auto p-4 sm:p-6'
          }
        >
          <div className={fullHeight ? 'min-h-0 flex-1' : 'mx-auto w-full max-w-6xl'}>
            {children}
          </div>
        </main>
      </div>
    </div>
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
