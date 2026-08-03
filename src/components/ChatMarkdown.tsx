'use client';

import ReactMarkdown from 'react-markdown';

/** Renders assistant replies with readable lists, steps, and emphasis. */
export function ChatMarkdown({
  content,
  tone = 'light',
}: {
  content: string;
  tone?: 'light' | 'dark';
}) {
  const muted = tone === 'dark' ? 'text-white/55' : 'text-[var(--ink-soft)]';
  const strong = tone === 'dark' ? 'text-white' : 'text-[var(--ink)]';
  const codeBg = tone === 'dark' ? 'bg-white/10' : 'bg-white/80';

  return (
    <div className={`chat-md text-[13px] leading-relaxed ${strong}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className={`font-semibold ${strong}`}>{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1.5 pl-4 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-2 pl-4 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-snug [&>p]:mb-0">{children}</li>
          ),
          h1: ({ children }) => (
            <p className={`mb-1.5 text-sm font-semibold ${strong}`}>{children}</p>
          ),
          h2: ({ children }) => (
            <p className={`mb-1.5 text-sm font-semibold ${strong}`}>{children}</p>
          ),
          h3: ({ children }) => (
            <p className={`mb-1 text-[13px] font-semibold ${strong}`}>
              {children}
            </p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const block = Boolean(className);
            if (block) {
              return (
                <code
                  className={`mb-2 block overflow-x-auto rounded-lg ${codeBg} px-2.5 py-2 font-mono text-[12px] last:mb-0`}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className={`rounded ${codeBg} px-1 py-0.5 font-mono text-[12px]`}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          blockquote: ({ children }) => (
            <blockquote
              className={`mb-2 border-l-2 border-current/20 pl-3 ${muted} last:mb-0`}
            >
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr
              className={`my-2 border-0 border-t ${
                tone === 'dark' ? 'border-white/15' : 'border-[var(--line)]'
              }`}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
