"use client";

// ── MarkdownDoc — Renders markdown content with document-appropriate typography ──

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
  className?: string;
}

export function MarkdownDoc({ content, className }: Props) {
  return (
    <div className={cn("prose-doc", className)}>
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1 mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold text-slate-800 uppercase tracking-widest mt-6 mb-2 border-b border-slate-100 pb-1">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-slate-800 mt-4 mb-1">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm text-slate-700 leading-relaxed mb-3">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-outside ml-4 mb-3 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside ml-4 mb-3 space-y-1">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-sm text-slate-700 leading-relaxed">{children}</li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-900">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-slate-600">{children}</em>
        ),
        hr: () => <hr className="border-slate-200 my-4" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-slate-300 pl-4 text-slate-600 italic my-3">{children}</blockquote>
        ),
        code: ({ children }) => (
          <code className="text-xs bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono">{children}</code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}
