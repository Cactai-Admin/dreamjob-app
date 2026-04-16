"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, FileText, Loader2, Mail, Sparkles } from "lucide-react";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import type { Workflow } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default function OverviewPage({ params }: Props) {
  const { id } = use(params);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/workflows/${id}`)
      .then((res) => res.json())
      .then((wf) => {
        if (wf?.id) setWorkflow(wf as Workflow);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const resumeSaved = Boolean(workflow?.outputs?.find((o) => o.type === "resume" && o.is_current));
  const coverSaved = Boolean(workflow?.outputs?.find((o) => o.type === "cover_letter" && o.is_current));
  const supportUnlocked = resumeSaved && coverSaved;

  const leftContext = useMemo(() => {
    return [
      `Role: ${workflow?.listing?.title ?? "Unknown"}`,
      `Company: ${workflow?.listing?.company_name ?? "Unknown"}`,
      "Submission and support hub",
    ];
  }, [workflow?.listing]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!workflow) {
    return <div className="page-wrapper text-sm text-slate-500">Run not found.</div>;
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-slate-100">
      <aside className="hidden lg:block w-[260px] border-r border-slate-200 bg-white p-4 overflow-y-auto">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reference context</p>
        <div className="mt-3 space-y-2">
          {leftContext.map((item) => (
            <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{item}</div>
          ))}
        </div>
      </aside>

      <main className={cn("flex-1 overflow-y-auto p-4 sm:p-6", chatOpen && "hidden md:block")}>
        <div className="max-w-4xl mx-auto space-y-5">
          <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
          <p className="text-sm text-slate-600">Concluding hub after core material creation.</p>

          <div className="grid md:grid-cols-2 gap-4">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-900">Submission Materials</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><FileText className="w-4 h-4" />Resume</span>{resumeSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-300" />}</div>
                <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><Mail className="w-4 h-4" />Cover Letter</span>{coverSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-300" />}</div>
              </div>
              <div className="mt-3 space-y-2">
                <Link href={`/jobs/${id}/export`} className={cn("inline-flex px-3 py-2 rounded-lg text-sm", resumeSaved ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 pointer-events-none")}>Export Resume</Link>
                <div>
                  <button disabled={!coverSaved} className={cn("px-3 py-2 rounded-lg text-sm", coverSaved ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400")}>Export Cover Letter</button>
                </div>
                <div>
                  <button disabled={!(resumeSaved && coverSaved)} className={cn("px-3 py-2 rounded-lg text-sm", resumeSaved && coverSaved ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400")}>Combined Export</button>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-900">Application Support</h2>
              <p className="mt-1 text-xs text-slate-500">Support unlocks after core materials are both saved.</p>
              <div className="mt-3 space-y-2">
                <Link href={`/jobs/${id}/interview-guide`} className={cn("block px-3 py-2 rounded-lg text-sm", supportUnlocked ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 pointer-events-none")}>Interview support</Link>
                <button disabled={!supportUnlocked} className={cn("w-full text-left px-3 py-2 rounded-lg text-sm", supportUnlocked ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400")}>Follow-up support</button>
                <Link href={`/jobs/${id}/negotiation-guide`} className={cn("block px-3 py-2 rounded-lg text-sm", supportUnlocked ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 pointer-events-none")}>Negotiation support</Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      <div className="hidden lg:flex lg:w-[360px] lg:min-w-0 lg:border-l lg:border-slate-200">
        <AiChatPanel workflowId={id} surface="application_overview_support" className="flex-1 h-full" />
      </div>

      <button onClick={() => setChatOpen(!chatOpen)} className="md:hidden fixed z-30 btn-ocean w-10 h-10 rounded-full text-white shadow-lg flex items-center justify-center" style={{ top: "calc(var(--mobile-nav-height, 88px) + 6px)", right: "1rem" }}>
        <Sparkles className="w-4 h-4" />
      </button>
      {chatOpen && <div className="md:hidden fixed inset-0 z-50"><AiChatPanel workflowId={id} surface="application_overview_support" onClose={() => setChatOpen(false)} className="h-full" /></div>}
    </div>
  );
}
