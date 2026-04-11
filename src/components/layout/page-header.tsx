"use client";

// ── PageHeader — Inline page header for sub-pages ─────────
// Used within job detail, cover letter, resume, etc.
// Provides back navigation, title, subtitle, and action slot.

import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, backHref, actions, className }: Props) {
  const router = useRouter();

  return (
    <header className={cn("mb-6", className)}>
      <div className="flex items-start gap-3">
        {backHref && (
          // 44px touch target
          <button
            onClick={() => router.push(backHref)}
            className="flex-shrink-0 w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          {/* Title row — wraps on mobile so actions never overlap heading */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight break-words">
                {title}
              </h1>
              {subtitle && (
                <p className="text-slate-500 text-sm mt-1 break-words">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
