"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, FileText, Loader2, Mail, Sparkles } from "lucide-react";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { ReferenceSidebar } from "@/components/workflow/reference-sidebar";
import type { Workflow } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function readInterviewMeta(notes: string | null | undefined): { date?: string; time?: string } {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes) as { date?: string; time?: string };
    return parsed ?? {};
  } catch {
    return {};
  }
}

function readOfferMeta(notes: string | null | undefined): { amount?: string; details?: string } {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes) as { amount?: string; details?: string };
    return parsed ?? {};
  } catch {
    return {};
  }
}

export default function ApplicationHubPage({ params }: Props) {
  const { id } = use(params);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [offerDetails, setOfferDetails] = useState("");
  const [savingInterview, setSavingInterview] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  const loadWorkflow = useCallback(async () => {
    setLoading(true);
    const wf = await fetch(`/api/workflows/${id}`).then((res) => res.json());
    if (wf?.id) setWorkflow(wf as Workflow);
    setLoading(false);
    return wf as Workflow | null;
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadWorkflow().catch(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [loadWorkflow]);

  const resumeSaved = Boolean(workflow?.outputs?.find((o) => o.type === "resume" && o.is_current));
  const coverSaved = Boolean(workflow?.outputs?.find((o) => o.type === "cover_letter" && o.is_current));
  const supportUnlocked = resumeSaved && coverSaved;

  const interviewEvent = useMemo(() => (workflow?.status_events ?? []).find((event) => event.event_type === "interview_scheduled"), [workflow?.status_events]);
  const offerEvent = useMemo(() => (workflow?.status_events ?? []).find((event) => event.event_type === "offer_received"), [workflow?.status_events]);

  const interviewMeta = useMemo(() => readInterviewMeta(interviewEvent?.notes), [interviewEvent?.notes]);
  const offerMeta = useMemo(() => readOfferMeta(offerEvent?.notes), [offerEvent?.notes]);

  const interviewUnlocked = supportUnlocked && Boolean(interviewMeta.date && interviewMeta.time);
  const negotiationUnlocked = supportUnlocked && Boolean(offerMeta.amount && offerMeta.details);

  const activateInterview = async () => {
    if (!interviewDate || !interviewTime) {
      setActivationError("Add interview date and time, then confirm interview activation.");
      return;
    }
    setActivationError(null);
    setSavingInterview(true);
    await fetch(`/api/workflows/${id}/status?event_type=interview_scheduled`, { method: "DELETE" });
    await fetch(`/api/workflows/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "interview_scheduled",
        notes: JSON.stringify({ date: interviewDate, time: interviewTime, activated_from: "application_hub" }),
      }),
    });
    await loadWorkflow();
    setSavingInterview(false);
  };

  const activateNegotiation = async () => {
    if (!offerAmount.trim() || !offerDetails.trim()) {
      setActivationError("Add offer amount and details, then unlock negotiation support.");
      return;
    }
    setActivationError(null);
    setSavingOffer(true);
    await fetch(`/api/workflows/${id}/status?event_type=offer_received`, { method: "DELETE" });
    await fetch(`/api/workflows/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "offer_received",
        notes: JSON.stringify({ amount: offerAmount, details: offerDetails, activated_from: "application_hub" }),
      }),
    });
    await loadWorkflow();
    setSavingOffer(false);
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!workflow) {
    return <div className="page-wrapper text-sm text-slate-500">Run not found.</div>;
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-slate-100">
      <ReferenceSidebar
        widthClassName="w-[280px]"
        title="Application hub references"
        tabs={[
          {
            value: "listing",
            label: "Listing",
            content: (
              <div className="space-y-2 text-xs text-slate-700">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2">{workflow.listing?.title ?? "Untitled role"}</div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2">{workflow.listing?.company_name ?? "Unknown company"}</div>
              </div>
            ),
          },
          {
            value: "materials",
            label: "Materials",
            content: (
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="rounded-md border border-slate-200 bg-slate-50 p-2">Resume: {resumeSaved ? "Saved" : "Pending"}</li>
                <li className="rounded-md border border-slate-200 bg-slate-50 p-2">Cover letter: {coverSaved ? "Saved" : "Pending"}</li>
              </ul>
            ),
          },
          {
            value: "support",
            label: "Support",
            content: (
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="rounded-md border border-slate-200 bg-slate-50 p-2">Follow Up: {supportUnlocked ? "Ready" : "Locked"}</li>
                <li className="rounded-md border border-slate-200 bg-slate-50 p-2">Interview: {interviewUnlocked ? "Ready" : "Needs date/time + confirmation"}</li>
                <li className="rounded-md border border-slate-200 bg-slate-50 p-2">Negotiation: {negotiationUnlocked ? "Ready" : "Needs offer amount/details"}</li>
              </ul>
            ),
          },
          {
            value: "context",
            label: "Context",
            content: <p className="text-xs text-slate-600 rounded-md border border-slate-200 bg-slate-50 p-3">This run inherits listing analysis, Work History evidence alignment, resume edits, and cover letter edits.</p>,
          },
        ]}
      />

      <main className={cn("flex-1 overflow-y-auto p-4 sm:p-6", chatOpen && "hidden md:block")}>
        <div className="max-w-4xl mx-auto space-y-5">
          <h1 className="text-2xl font-bold text-slate-900">Application Hub</h1>
          <p className="text-sm text-slate-600">Core packet is complete here, then support workflows continue the same run context.</p>

          {activationError ? <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{activationError}</p> : null}

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

            <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h2 className="font-semibold text-slate-900">Application Support</h2>
              <p className="text-xs text-slate-500">Support opens in order: Follow Up → Interview → Negotiation.</p>
              <div className="space-y-2">
                <Link href={`/jobs/${id}/follow-up`} className={cn("block px-3 py-2 rounded-lg text-sm", supportUnlocked ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 pointer-events-none")}>Follow Up support</Link>
                <Link href={`/jobs/${id}/interview-guide`} className={cn("block px-3 py-2 rounded-lg text-sm", interviewUnlocked ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 pointer-events-none")}>Interview support</Link>
                <Link href={`/jobs/${id}/negotiation-guide`} className={cn("block px-3 py-2 rounded-lg text-sm", negotiationUnlocked ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 pointer-events-none")}>Negotiation support</Link>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <p className="text-xs font-semibold text-slate-700">Interview activation</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs" />
                  <input type="time" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs" />
                </div>
                <button onClick={activateInterview} disabled={!supportUnlocked || savingInterview} className={cn("px-3 py-2 rounded-lg text-xs", supportUnlocked ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400")}>I got an interview</button>
                {interviewUnlocked ? <p className="text-[11px] text-emerald-700">Interview unlocked for {interviewMeta.date} at {interviewMeta.time}.</p> : null}
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <p className="text-xs font-semibold text-slate-700">Negotiation activation</p>
                <input value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="Offer amount" className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs" />
                <textarea value={offerDetails} onChange={(e) => setOfferDetails(e.target.value)} placeholder="Offer details" className="w-full min-h-[68px] rounded-md border border-slate-200 px-2 py-1.5 text-xs" />
                <button onClick={activateNegotiation} disabled={!supportUnlocked || savingOffer} className={cn("px-3 py-2 rounded-lg text-xs", supportUnlocked ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-400")}>Unlock negotiation</button>
                {negotiationUnlocked ? <p className="text-[11px] text-emerald-700">Negotiation unlocked with captured offer details.</p> : null}
              </div>
            </section>
          </div>
        </div>
      </main>

      <div className="hidden lg:flex lg:w-[360px] lg:min-w-0 lg:border-l lg:border-slate-200">
        <AiChatPanel workflowId={id} surface="application_hub_support" className="flex-1 h-full" />
      </div>

      <button onClick={() => setChatOpen(!chatOpen)} className="md:hidden fixed z-30 btn-ocean w-10 h-10 rounded-full text-white shadow-lg flex items-center justify-center" style={{ top: "calc(var(--mobile-nav-height, 88px) + 6px)", right: "1rem" }}>
        <Sparkles className="w-4 h-4" />
      </button>
      {chatOpen && <div className="md:hidden fixed inset-0 z-50"><AiChatPanel workflowId={id} surface="application_hub_support" onClose={() => setChatOpen(false)} className="h-full" /></div>}
    </div>
  );
}
