"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Light markdown rendering for assistant replies, styled inside the app's
 * tokens (Inter body text, quiet rules) — no typography plugin, no giant
 * headings. Links open in a new tab.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: (props) => <p className="mt-3 leading-relaxed" {...props} />,
        a: (props) => (
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-primary underline underline-offset-2 hover:text-text-secondary"
            {...props}
          />
        ),
        ul: (props) => (
          <ul className="mt-3 list-disc space-y-1 pl-5" {...props} />
        ),
        ol: (props) => (
          <ol className="mt-3 list-decimal space-y-1 pl-5" {...props} />
        ),
        li: (props) => <li className="leading-relaxed" {...props} />,
        strong: (props) => (
          <strong className="font-semibold text-text-primary" {...props} />
        ),
        em: (props) => <em className="italic" {...props} />,
        h1: (props) => (
          <h3 className="mt-4 text-base font-semibold text-text-primary" {...props} />
        ),
        h2: (props) => (
          <h3 className="mt-4 text-base font-semibold text-text-primary" {...props} />
        ),
        h3: (props) => (
          <h4 className="mt-3 text-[15px] font-semibold text-text-primary" {...props} />
        ),
        h4: (props) => (
          <h4 className="mt-3 text-[15px] font-semibold text-text-primary" {...props} />
        ),
        blockquote: (props) => (
          <blockquote
            className="mt-3 border-l-2 border-app-border pl-3 text-text-tertiary"
            {...props}
          />
        ),
        code: (props) => (
          <code
            className="rounded-md bg-surface-soft px-1.5 py-0.5 text-[13px] text-text-primary"
            {...props}
          />
        ),
        pre: (props) => (
          <pre
            className="mt-3 overflow-x-auto rounded-xl bg-surface-soft p-3 text-[13px] leading-relaxed [&>code]:bg-transparent [&>code]:p-0"
            {...props}
          />
        ),
        hr: () => <hr className="my-4 border-app-border" />,
        table: (props) => (
          <div className="mt-3 overflow-x-auto">
            <table
              className="w-full border-collapse text-sm [&_td]:border [&_td]:border-app-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-app-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left"
              {...props}
            />
          </div>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
