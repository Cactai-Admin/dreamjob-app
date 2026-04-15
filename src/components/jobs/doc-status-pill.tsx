"use client";

// ── DocStatusPill — Resume / Cover Letter build status ────

import { cn } from "@/lib/utils";
import { CircleCheck as CheckCircle2, Clock, FileText, Loader as Loader2 } from "lucide-react";
import type { DocumentStatus } from "@/lib/types";

interface Props {
  status: DocumentStatus;
  label?: string;
}

const config: Record<DocumentStatus, { icon: React.ElementType; className: string; text: string }> = {
  not_started: { icon: FileText,     text: "Not started", className: "text-slate-500 bg-slate-100 border border-slate-200" },
  generating:  { icon: Loader2,      text: "In progress", className: "text-sky-700 bg-sky-50 border border-sky-200" },
  draft:       { icon: Clock,        text: "Draft ready", className: "text-amber-700 bg-amber-50 border border-amber-200" },
  approved:    { icon: CheckCircle2, text: "Completed",   className: "text-emerald-700 bg-emerald-50 border border-emerald-200" },
};

export function DocStatusPill({ status, label }: Props) {
  const c = config[status];
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
      c.className
    )}>
      <c.icon className={cn("w-3 h-3", status === "generating" && "animate-spin")} />
      <span>{label ? `${label}: ${c.text}` : c.text}</span>
    </div>
  );
}
