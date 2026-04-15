"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Workflow } from "@/lib/types";

export default function ArchivePage() {
  const [rows, setRows] = useState<Workflow[]>([]);

  useEffect(() => {
    fetch("/api/workflows?state=archived")
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []));
  }, []);

  return (
    <div className="page-wrapper max-w-1000px">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Archive</h1>
      <div className="card-base p-4 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No archived workflows yet.</p>
        ) : rows.map((workflow) => (
          <Link key={workflow.id} href={`/jobs/${workflow.id}`} className="block p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
            <div className="text-sm font-medium text-slate-900">{workflow.listing?.title ?? workflow.title}</div>
            <div className="text-xs text-slate-500">{workflow.listing?.company_name ?? "—"}</div>
          </Link>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-3">Archive items are retained but inactive. Trash is for discarded items.</p>
    </div>
  );
}
