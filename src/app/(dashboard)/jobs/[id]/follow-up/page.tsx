"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { cn } from "@/lib/utils";
import type { Workflow } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function FollowUpSupportPage({ params }: Props) {
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

  const checklist = useMemo(() => [
    "Send a concise thank-you or value reminder within 24 hours.",
    "Reference one concrete result from your resume aligned to role priorities.",
    "Set a follow-up cadence (3-5 business days, then a final check-in).",
  ], []);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!workflow) {
    return <div className="page-wrapper text-sm text-slate-500">Run not found.</div>;
  }

  if (!supportUnlocked) {
    return (
      <div className="page-wrapper">
        <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Follow-up support unlocks after resume and cover letter are both saved in the Application Hub.
          <div className="mt-4">
            <Link href={`/jobs/${id}/overview`} className="btn-ocean px-4 py-2 rounded-lg text-white">Back to Application Hub</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-slate-100">
      <main className={cn("flex-1 overflow-y-auto p-4 sm:p-6", chatOpen && "hidden md:block")}>
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">Follow Up Support</h1>
          <p className="text-sm text-slate-600">Continue the same run context with listing priorities and submission materials already in memory.</p>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Recommended cadence</p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-slate-600">
              {checklist.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Next support order: Follow Up → Interview → Negotiation.
          </div>
        </div>
      </main>

      <div className="hidden lg:flex lg:w-[360px] lg:min-w-0 lg:border-l lg:border-slate-200">
        <AiChatPanel workflowId={id} surface="follow_up_support" className="flex-1 h-full" />
      </div>

      <button onClick={() => setChatOpen(!chatOpen)} className="md:hidden fixed z-30 btn-ocean w-10 h-10 rounded-full text-white shadow-lg flex items-center justify-center" style={{ top: "calc(var(--mobile-nav-height, 88px) + 6px)", right: "1rem" }}>
        <Sparkles className="w-4 h-4" />
      </button>
      {chatOpen && <div className="md:hidden fixed inset-0 z-50"><AiChatPanel workflowId={id} surface="follow_up_support" onClose={() => setChatOpen(false)} className="h-full" /></div>}
    </div>
  );
}
