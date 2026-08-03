import { ReactNode } from 'react';

/** Landing-hero gradient + orbs behind auth forms. */
export function AuthAtmosphere({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
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
      {children}
    </div>
  );
}
