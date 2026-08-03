'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { LandingDemo } from '@/components/LandingDemo';

const FEATURES = [
  {
    title: 'Upload your knowledge',
    body: 'Add PDFs, docs, links, and plain text. ChatDock indexes them into a private knowledge base for each bot.',
  },
  {
    title: 'Answers from your sources only',
    body: 'Groq-powered replies stay grounded in what you uploaded. If it isn’t in the docs, the bot says it doesn’t know.',
  },
  {
    title: 'Embed on any website',
    body: 'Drop a bubble widget on your site. Every page load starts a fresh chat session for visitors.',
  },
  {
    title: 'Built-in guardrails',
    body: 'Jailbreak attempts, unsafe prompts, and off-policy asks are blocked before they reach your audience.',
  },
];

export function LandingPage() {
  const { user, loading } = useAuth();
  const primaryHref = !loading && user ? '/app' : '/register';
  const primaryLabel = !loading && user ? 'Open dashboard' : 'Get started free';

  return (
    <div className="landing min-h-dvh overflow-x-hidden bg-[var(--paper)] text-[var(--ink)]">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent)] text-sm font-semibold text-white">
              CC
            </span>
            <span className="font-display text-xl tracking-tight text-white">
              ChatDock
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <a
              href="#features"
              className="hidden rounded-lg px-3 py-2 text-sm text-white/70 transition hover:text-white sm:inline"
            >
              Features
            </a>
            <a
              href="#demo"
              className="hidden rounded-lg px-3 py-2 text-sm text-white/70 transition hover:text-white sm:inline"
            >
              Demo
            </a>
            {!loading && user ? (
              <Link
                href="/app"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-white/90"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-sm text-white/80 transition hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-white/90"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero — brand first, one composition, full-bleed atmosphere */}
      <section className="relative isolate min-h-dvh overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(120% 80% at 70% 20%, #1a4d45 0%, #0c1a17 45%, #081210 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
        <div className="pointer-events-none absolute -right-24 top-24 -z-10 h-[28rem] w-[28rem] rounded-full bg-[var(--accent)]/25 blur-3xl landing-orb" />
        <div className="pointer-events-none absolute -left-20 bottom-10 -z-10 h-72 w-72 rounded-full bg-teal-200/10 blur-3xl landing-orb-delayed" />

        <div className="mx-auto flex min-h-dvh max-w-6xl flex-col justify-center px-5 pb-16 pt-28 sm:px-8 sm:pb-24 sm:pt-32">
          <div className="max-w-2xl landing-rise">
            <p className="font-display text-5xl tracking-tight text-white sm:text-6xl md:text-7xl">
              ChatDock
            </p>
            <h1 className="mt-5 max-w-xl text-balance text-xl font-medium leading-snug text-white/90 sm:text-2xl">
              Chatbots that answer only from your docs.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/60 sm:text-lg">
              Upload knowledge, embed a bubble on your site, and let visitors
              get grounded answers — not invented ones.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={primaryHref}
                className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)]"
              >
                {primaryLabel}
              </Link>
              <a
                href="#demo"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/5"
              >
                Try the demo
              </a>
            </div>
          </div>

          {/* Product visual anchor — chat bubble scene, edge of hero */}
          <div className="pointer-events-none absolute bottom-8 right-6 hidden w-[min(340px,38vw)] landing-float lg:block xl:right-16">
            <div className="rounded-2xl border border-white/15 bg-[#10231f]/90 p-4 shadow-2xl backdrop-blur">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-white/55">Visitor chat</span>
              </div>
              <div className="space-y-2.5">
                <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-[var(--accent)] px-3 py-2 text-[12px] text-white">
                  What’s included in Pro?
                </div>
                <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-white/10 px-3 py-2 text-[12px] leading-relaxed text-white/85">
                  Pro is $12 per member / month and includes unlimited
                  workspaces…
                </div>
              </div>
            </div>
            <div className="mt-3 ml-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--accent)] text-white shadow-lg">
              <svg
                viewBox="0 0 24 24"
                width="26"
                height="26"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v7.4a2.8 2.8 0 0 1-2.8 2.8H9.2L5 20v-3h-.2A2.8 2.8 0 0 1 2 14.2V6.8A2.8 2.8 0 0 1 4 6.8Z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features — one job */}
      <section id="features" className="scroll-mt-20 border-t border-[var(--line)] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <p className="font-display text-4xl tracking-tight sm:text-5xl">
            What you get
          </p>
          <p className="mt-3 max-w-xl text-base text-[var(--ink-soft)] sm:text-lg">
            Everything you need to turn docs into a site-ready support bot.
          </p>

          <ol className="mt-14 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {FEATURES.map((feature, i) => (
              <li
                key={feature.title}
                className="grid gap-3 py-8 sm:grid-cols-[7rem_1fr] sm:gap-10 sm:py-10"
              >
                <span className="font-display text-3xl text-[var(--accent)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {feature.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-soft)] sm:text-base">
                    {feature.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Demo */}
      <section
        id="demo"
        className="scroll-mt-20 border-t border-[var(--line)] bg-[var(--ink)]"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
          <div>
            <p className="font-display text-4xl tracking-tight text-white sm:text-5xl">
              Try it live
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/60 sm:text-lg">
              Ask the sample Acme bot a question. It only replies from a tiny
              demo knowledge base — same idea as your production bots.
            </p>
            <Link
              href={primaryHref}
              className="mt-8 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-white/90"
            >
              {primaryLabel}
            </Link>
          </div>
          <LandingDemo />
        </div>
      </section>

      <footer className="border-t border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent)] text-xs font-semibold text-white">
              CC
            </span>
            <span className="font-display text-lg">ChatDock</span>
          </div>
          <p className="text-sm text-[var(--ink-soft)]">
            Knowledge bots for your docs and website.
          </p>
        </div>
      </footer>
    </div>
  );
}
