"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { FileText, Mail, Sparkles, Loader2, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { MarkdownDoc } from "@/components/documents/markdown-doc";
import type { DocumentSection, Output, Workflow } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

type RunPhase =
  | "listing_analysis_loading"
  | "listing_analysis"
  | "resume_loading"
  | "resume_workspace"
  | "optional_cover_letter_decision"
  | "cover_letter_loading"
  | "cover_letter_workspace"
  | "application_overview";

function parseSections(output?: Output): DocumentSection[] {
  if (!output) return [];
  try {
    const parsed = JSON.parse(output.content);
    if (Array.isArray(parsed)) return parsed as DocumentSection[];
  } catch {
    // fallthrough
  }
  return [{ id: "main", title: "Resume", content: output.content }];
}

function LoadingState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-4">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-md">{detail}</p>
    </div>
  );
}

export default function RunWorkspacePage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [phase, setPhase] = useState<RunPhase>("listing_analysis_loading");
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [includeCoverLetter, setIncludeCoverLetter] = useState(true);
  const [resumeSections, setResumeSections] = useState<DocumentSection[]>([]);
  const [coverLetterContent, setCoverLetterContent] = useState("");
  const [resumeDirty, setResumeDirty] = useState(false);
  const [coverDirty, setCoverDirty] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadWorkflow = async () => {
    try {
      const wf: Workflow = await fetch(`/api/workflows/${id}`).then((r) => r.json());
      if (!wf?.id) {
        setLoading(false);
        return;
      }
      if (wf.state === "listing_review") {
        router.replace(`/listings/${id}`);
        return;
      }
      setWorkflow(wf);
      const resumeOut = wf.outputs?.find((o) => o.type === "resume" && o.is_current);
      const coverOut = wf.outputs?.find((o) => o.type === "cover_letter" && o.is_current);
      if (resumeOut) {
        setResumeSections(parseSections(resumeOut));
      }
      if (coverOut) {
        setCoverLetterContent(coverOut.content);
      }
      setLoading(false);
      if (!resumeOut) {
        setPhase("resume_loading");
      } else if (!coverOut) {
        setPhase("optional_cover_letter_decision");
      } else {
        setPhase("application_overview");
      }
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkflow();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (phase !== "listing_analysis_loading") return;
    const timer = setTimeout(() => setPhase("listing_analysis"), 1200);
    return () => clearTimeout(timer);
  }, [phase]);

  const ensureGeneration = async (outputType: "resume" | "cover_letter") => {
    let provider: string | undefined;
    try {
      const s = JSON.parse(localStorage.getItem("dreamjob_settings") ?? "{}");
      if (s.aiProvider) provider = s.aiProvider;
    } catch {
      // ignore
    }
    await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow_id: id, output_type: outputType, provider }),
    });
  };

  useEffect(() => {
    if (phase !== "resume_loading") return;
    void ensureGeneration("resume");
    pollingRef.current = setInterval(async () => {
      const wf: Workflow = await fetch(`/api/workflows/${id}`).then((r) => r.json());
      const resumeOut = wf.outputs?.find((o) => o.type === "resume" && o.is_current);
      if (resumeOut) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setResumeSections(parseSections(resumeOut));
        setWorkflow(wf);
        setPhase("resume_workspace");
      }
    }, 2500);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [phase, id]);

  useEffect(() => {
    if (phase !== "cover_letter_loading") return;
    void ensureGeneration("cover_letter");
    pollingRef.current = setInterval(async () => {
      const wf: Workflow = await fetch(`/api/workflows/${id}`).then((r) => r.json());
      const coverOut = wf.outputs?.find((o) => o.type === "cover_letter" && o.is_current);
      if (coverOut) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setCoverLetterContent(coverOut.content);
        setWorkflow(wf);
        setPhase("cover_letter_workspace");
      }
    }, 2500);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [phase, id]);

  const saveResume = async () => {
    await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "resume", content: JSON.stringify(resumeSections) }),
    });
    setResumeDirty(false);
    await loadWorkflow();
  };

  const saveCoverLetter = async () => {
    await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "cover_letter", content: coverLetterContent }),
    });
    setCoverDirty(false);
    await loadWorkflow();
  };

  const resumeSaved = Boolean(workflow?.outputs?.find((o) => o.type === "resume" && o.is_current));
  const coverSaved = Boolean(workflow?.outputs?.find((o) => o.type === "cover_letter" && o.is_current));
  const supportUnlocked = resumeSaved && (!includeCoverLetter || coverSaved);

  const sideContext = useMemo(() => {
    const context = ["Listing", "Fit & Evidence", "Employment History Evidence"];
    if (resumeSaved) context.push("Saved Resume");
    if (coverSaved) context.push("Saved Cover Letter");
    return context;
  }, [resumeSaved, coverSaved]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!workflow) return notFound();

  const surface =
    phase === "application_overview"
      ? "application_overview_support"
      : phase === "cover_letter_workspace" || phase === "cover_letter_loading"
        ? "cover_letter_workspace"
        : phase === "listing_analysis" || phase === "listing_analysis_loading"
          ? "listing_review"
          : "resume_workspace";

  return (
    <div className="flex flex-1 overflow-hidden bg-slate-100">
      <aside className="hidden lg:block w-[240px] border-r border-slate-200 bg-white p-4 overflow-y-auto">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Run context</p>
        <div className="mt-3 space-y-2">
          {sideContext.map((item) => (
            <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{item}</div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-4">Reference only — active work stays in the center panel.</p>
      </aside>

      <main className={cn("flex-1 overflow-y-auto p-4 sm:p-6", chatOpen && "hidden md:block")}>
        {phase === "listing_analysis_loading" && <LoadingState title="Preparing listing analysis" detail="Keeping your Run workspace loaded while analysis context initializes." />}

        {phase === "listing_analysis" && (
          <div className="max-w-3xl mx-auto space-y-4">
            <h1 className="text-xl font-bold text-slate-900">Listing Analysis</h1>
            <p className="text-sm text-slate-600">Role: {workflow.listing?.title} at {workflow.listing?.company_name}.</p>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Fit & Evidence summary</p>
              <p className="text-sm text-slate-700 mt-2">Review listing requirements, validate critical evidence, then continue into resume generation without leaving this workspace.</p>
            </div>
            <button onClick={() => setPhase("resume_loading")} className="btn-ocean px-4 py-2 rounded-lg text-white inline-flex items-center gap-2">
              Continue to Resume <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {phase === "resume_loading" && <LoadingState title="Building resume" detail="Generating a role-tailored resume draft in the center panel." />}

        {phase === "resume_workspace" && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-slate-900">Resume Workspace</h1>
              <button onClick={saveResume} disabled={!resumeDirty} className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white disabled:opacity-50">Save resume</button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
              {resumeSections.map((section) => (
                <div key={section.id}>
                  <p className="text-xs font-semibold uppercase text-slate-500 mb-1">{section.title}</p>
                  <textarea
                    value={section.content}
                    onChange={(e) => {
                      setResumeSections((prev) => prev.map((s) => s.id === section.id ? { ...s, content: e.target.value } : s));
                      setResumeDirty(true);
                    }}
                    className="w-full min-h-[120px] rounded-lg border border-slate-200 p-3 text-sm"
                  />
                </div>
              ))}
            </div>
            <button onClick={() => setPhase("optional_cover_letter_decision")} className="btn-ocean px-4 py-2 rounded-lg text-white">Continue</button>
          </div>
        )}

        {phase === "optional_cover_letter_decision" && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h1 className="text-xl font-bold text-slate-900">Cover Letter Decision</h1>
            <p className="text-sm text-slate-600">Choose whether to generate a cover letter before moving to Application Overview.</p>
            <div className="flex gap-3">
              <button onClick={() => { setIncludeCoverLetter(true); setPhase("cover_letter_loading"); }} className="px-4 py-2 rounded-lg bg-slate-900 text-white">Generate cover letter</button>
              <button onClick={() => { setIncludeCoverLetter(false); setPhase("application_overview"); }} className="px-4 py-2 rounded-lg border border-slate-200 bg-white">Skip for now</button>
            </div>
          </div>
        )}

        {phase === "cover_letter_loading" && <LoadingState title="Building cover letter" detail="Generating a tailored letter while keeping this Run active." />}

        {phase === "cover_letter_workspace" && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-slate-900">Cover Letter Workspace</h1>
              <button onClick={saveCoverLetter} disabled={!coverDirty} className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white disabled:opacity-50">Save cover letter</button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <textarea
                value={coverLetterContent}
                onChange={(e) => { setCoverLetterContent(e.target.value); setCoverDirty(true); }}
                className="w-full min-h-[360px] rounded-lg border border-slate-200 p-3 text-sm"
              />
            </div>
            <button onClick={() => setPhase("application_overview")} className="btn-ocean px-4 py-2 rounded-lg text-white">Continue to overview</button>
          </div>
        )}

        {phase === "application_overview" && (
          <div className="max-w-4xl mx-auto space-y-5">
            <h1 className="text-2xl font-bold text-slate-900">Application Overview</h1>
            <p className="text-sm text-slate-600">Post-creation hub for this Run.</p>

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
                <p className="mt-1 text-xs text-slate-500">Support unlocks after required core materials are complete.</p>
                <div className="mt-3 space-y-2">
                  <Link href={`/jobs/${id}/interview-guide`} className={cn("block px-3 py-2 rounded-lg text-sm", supportUnlocked ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 pointer-events-none")}>Interview support</Link>
                  <button disabled={!supportUnlocked} className={cn("w-full text-left px-3 py-2 rounded-lg text-sm", supportUnlocked ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400")}>Follow-up support</button>
                  <Link href={`/jobs/${id}/negotiation-guide`} className={cn("block px-3 py-2 rounded-lg text-sm", supportUnlocked ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 pointer-events-none")}>Negotiation support</Link>
                </div>
              </section>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Saved preview</p>
              <MarkdownDoc content={coverLetterContent || "No cover letter saved yet."} />
            </div>
          </div>
        )}
      </main>

      <div className="hidden lg:flex lg:w-[360px] lg:min-w-0 lg:border-l lg:border-slate-200">
        <AiChatPanel workflowId={id} surface={surface} className="flex-1 h-full" />
      </div>

      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="md:hidden fixed z-30 btn-ocean w-10 h-10 rounded-full text-white shadow-lg flex items-center justify-center"
        style={{ top: "calc(var(--mobile-nav-height, 88px) + 6px)", right: "1rem" }}
      >
        <Sparkles className="w-4 h-4" />
      </button>
      {chatOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <AiChatPanel workflowId={id} surface={surface} onClose={() => setChatOpen(false)} className="h-full" />
        </div>
      )}
    </div>
  );
}
