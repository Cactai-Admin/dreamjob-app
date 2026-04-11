"use client";

// ── StatusBadge — Pill displaying application status ──────

import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

interface Props {
  status: ApplicationStatus;
  size?: "sm" | "md";
}

const statusConfig: Record<ApplicationStatus, { label: string; className: string; dot: string }> = {
  ready:        { label: "Ready",        className: "bg-blue-50 text-blue-600 border-blue-200",       dot: "bg-blue-500" },
  applied:      { label: "Applied",      className: "bg-sky-50 text-sky-700 border-sky-200",           dot: "bg-sky-500" },
  received:     { label: "Received",     className: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  interviewing: { label: "Interviewing", className: "bg-amber-50 text-amber-700 border-amber-200",    dot: "bg-amber-500" },
  offer:        { label: "Offer",        className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  negotiating:  { label: "Negotiating",  className: "bg-teal-50 text-teal-700 border-teal-200",       dot: "bg-teal-500" },
  hired:        { label: "Hired",        className: "bg-green-50 text-green-700 border-green-200",    dot: "bg-green-600" },
  declined:     { label: "Declined",     className: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  ghosted:      { label: "Ghosted",      className: "bg-slate-100 text-slate-500 border-slate-200",   dot: "bg-slate-400" },
  rejected:     { label: "Rejected",     className: "bg-red-50 text-red-600 border-red-200",          dot: "bg-red-500" },
};

export function StatusBadge({ status, size = "md" }: Props) {
  const config = statusConfig[status] ?? statusConfig.ready;
  return (
    <span className={cn(
      "inline-flex items-center font-medium border rounded-full",
      size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
      config.className
    )}>
      <span className={cn(
        "rounded-full mr-1.5 flex-shrink-0",
        size === "sm" ? "w-1 h-1" : "w-1.5 h-1.5",
        config.dot,
      )} />
      {config.label}
    </span>
  );
}
