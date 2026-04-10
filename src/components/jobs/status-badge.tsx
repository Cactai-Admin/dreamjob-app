"use client";

// ── StatusBadge — Pill displaying application status ──────

import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

interface Props {
  status: ApplicationStatus;
  size?: "sm" | "md";
}

const statusConfig: Record<ApplicationStatus, { label: string; className: string }> = {
  draft:        { label: "Draft",        className: "bg-slate-100 text-slate-500 border-slate-200" },
  saved:        { label: "Saved",        className: "bg-blue-50 text-blue-600 border-blue-200" },
  applied:      { label: "Applied",      className: "bg-sky-50 text-sky-700 border-sky-200" },
  interviewing: { label: "Interviewing", className: "bg-amber-50 text-amber-700 border-amber-200" },
  offer:        { label: "Offer",        className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  hired:        { label: "Hired",        className: "bg-green-50 text-green-700 border-green-200" },
  rejected:     { label: "Rejected",     className: "bg-red-50 text-red-600 border-red-200" },
  withdrawn:    { label: "Withdrawn",    className: "bg-slate-100 text-slate-400 border-slate-200" },
};

export function StatusBadge({ status, size = "md" }: Props) {
  const config = statusConfig[status];
  return (
    <span className={cn(
      "inline-flex items-center font-medium border rounded-full",
      size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
      config.className
    )}>
      <span className={cn(
        "rounded-full mr-1.5 flex-shrink-0",
        size === "sm" ? "w-1 h-1" : "w-1.5 h-1.5",
        status === "draft"        && "bg-slate-400",
        status === "saved"        && "bg-blue-500",
        status === "applied"      && "bg-sky-500",
        status === "interviewing" && "bg-amber-500",
        status === "offer"        && "bg-emerald-500",
        status === "hired"        && "bg-green-600",
        status === "rejected"     && "bg-red-500",
        status === "withdrawn"    && "bg-slate-400",
      )} />
      {config.label}
    </span>
  );
}
