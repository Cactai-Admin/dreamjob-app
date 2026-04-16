"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { ReferenceSidebar } from "@/components/workflow/reference-sidebar";
import type { DocumentSection, Output, Workflow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { parseRequirements } from "@/lib/listing-match";

interface Props {
  params: Promise<{ id: string }>;
}

function parseSections(output?: Output): DocumentSection[] {
  if (!output) return [];
  try {
    const parsed = JSON.parse(output.content);
    if (Array.isArray(parsed)) return parsed as DocumentSection[];
  } catch {
    // fallback
  }
  return [{ id: "main", title: "Resume", content: output.content }];
}

export default function ResumeWorkspacePage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [resumeSections, setResumeSections] = useState<DocumentSection[]>([]);
  const [resumeDirty, setResumeDirty] = useState(false);

  const loadWorkflow = async () => {
    const wf: Workflow = await fetch(`/api/workflows/${id}`).then((r) => r.json());
    if (!wf?.id) {
      setLoading(false);
      return;
    }
    setWorkflow(wf);
    const resumeOut = wf.outputs?.find((o) => o.type === "resume" && o.is_current);
    setResumeSections(parseSections(resumeOut));
    setLoading(false);
    return wf;
  };

  useEffect(() => {
    void loadWorkflow().catch(() => setLoading(false));
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [id]);

  const resumeSaved = Boolean(workflow?.outputs?.find((o) => o.type === "resume" && o.is_current));
  const requirements = useMemo(() => parseRequirements(workflow?.listing?.requirements), [workflow?.listing?.requirements]);
  const responsibilities = useMemo(() => {
    if (!workflow?.listing?.responsibilities) return [];
    return workflow.listing.responsibilities.split(/\n|•|\*/).map((value) => value.trim()).filter(Boolean);
  }, [workflow?.listing?.responsibilities]);
  const alignedEvidence = useMemo(() => {
    const lines = workflow?.notes?.split("\n").map((line) => line.trim()).filter(Boolean) ?? [];
    return lines.length > 0 ? lines : ["Work history alignment captured in this run feeds the resume draft."];
  }, [workflow?.notes]);

  const ensureGeneration = async () => {
    setGenerating(true);
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
      body: JSON.stringify({ workflow_id: id, output_type: "resume", provider }),
    });

    pollingRef.current = setInterval(async () => {
      const wf: Workflow = await fetch(`/api/workflows/${id}`).then((r) => r.json());
      const resumeOut = wf.outputs?.find((o) => o.type === "resume" && o.is_current);
      if (resumeOut) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setWorkflow(wf);
        setResumeSections(parseSections(resumeOut));
        setGenerating(false);
      }
    }, 2500);
  };

  const saveResume = async () => {
    await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "resume", content: JSON.stringify(resumeSections) }),
    });
    setResumeDirty(false);
    await loadWorkflow();
  };

  const leftContext = useMemo(() => {
    const blocks = [
      `Role: ${workflow?.listing?.title ?? "Unknown"}`,
      `Company: ${workflow?.listing?.company_name ?? "Unknown"}`,
    ];
    if (workflow?.listing?.requirements) blocks.push("Parsed requirements available");
    if (workflow?.listing?.responsibilities) blocks.push("Parsed responsibilities available");
    return blocks;
  }, [workflow?.listing]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-slate-100">
      <ReferenceSidebar
        widthClassName="w-[280px]"
        title="Resume references"
        tabs={[
          {
            value: "listing",
            label: "Listing",
            content: (
              <div className="space-y-2 text-xs text-slate-700">
                {leftContext.map((item) => (
                  <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">{item}</div>
                ))}
              </div>
            ),
          },
          {
            value: "requirements",
            label: "Requirements",
            content: (
              <ul className="space-y-2 text-xs text-slate-700">
                {requirements.length === 0 ? <li className="text-slate-400">No requirements parsed yet.</li> : requirements.map((item, idx) => (
                  <li key={`${item}-${idx}`} className="rounded-md border border-slate-200 bg-slate-50 p-2">{item}</li>
                ))}
              </ul>
            ),
          },
          {
            value: "responsibilities",
            label: "Responsibilities",
            content: (
              <ul className="space-y-2 text-xs text-slate-700">
                {responsibilities.length === 0 ? <li className="text-slate-400">No responsibilities parsed yet.</li> : responsibilities.map((item, idx) => (
                  <li key={`${item}-${idx}`} className="rounded-md border border-slate-200 bg-slate-50 p-2">{item}</li>
                ))}
              </ul>
            ),
          },
          {
            value: "work-history",
            label: "Work History",
            content: (
              <ul className="space-y-2 text-xs text-slate-700">
                {alignedEvidence.map((line) => (
                  <li key={line} className="rounded-md border border-slate-200 bg-slate-50 p-2">{line}</li>
                ))}
              </ul>
            ),
          },
          {
            value: "matched-evidence",
            label: "Key Matches",
            content: (
              <p className="text-xs text-slate-600 rounded-md border border-sky-200 bg-sky-50 p-3">
                Resume drafting should prioritize the strongest matched evidence from Work History and listing requirements.
              </p>
            ),
          },
          {
            value: "alignment-notes",
            label: "Alignment Notes",
            content: (
              <p className="text-xs text-slate-600 rounded-md border border-slate-200 bg-slate-50 p-3">
                Keep role keywords, quantified outcomes, and ownership signals aligned with the listing before exporting.
              </p>
            ),
          },
        ]}
      />

      <main className={cn("flex-1 overflow-y-auto p-4 sm:p-6", chatOpen && "hidden md:block")}>
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">Resume Workspace</h1>
            <button onClick={saveResume} disabled={!resumeDirty || generating} className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white disabled:opacity-50">Save resume</button>
          </div>
          <p className="text-sm text-slate-600 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
            This draft inherits listing priorities plus your Work History evidence alignment from the previous milestone.
          </p>

          {!resumeSaved && resumeSections.length === 0 && !generating && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <p className="text-sm text-slate-600">Generate a role-tailored resume draft after completing Work History evidence mapping.</p>
              <button onClick={ensureGeneration} className="btn-ocean px-4 py-2 rounded-lg text-white inline-flex items-center gap-2">
                Generate Resume <Sparkles className="w-4 h-4" />
              </button>
            </div>
          )}

          {generating && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              <p className="text-sm text-slate-600 mt-2">Generating resume…</p>
            </div>
          )}

          {resumeSections.length > 0 && (
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
          )}

          <div className="flex justify-end">
            <button onClick={() => router.push(`/jobs/${id}/cover-letter`)} className="btn-ocean px-4 py-2 rounded-lg text-white inline-flex items-center gap-2" disabled={resumeSections.length === 0}>
              Continue to Cover Letter <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      <div className="hidden lg:flex lg:w-[360px] lg:min-w-0 lg:border-l lg:border-slate-200">
        <AiChatPanel workflowId={id} surface="resume_workspace" className="flex-1 h-full" />
      </div>

      <button onClick={() => setChatOpen(!chatOpen)} className="md:hidden fixed z-30 btn-ocean w-10 h-10 rounded-full text-white shadow-lg flex items-center justify-center" style={{ top: "calc(var(--mobile-nav-height, 88px) + 6px)", right: "1rem" }}>
        AI
      </button>
      {chatOpen && <div className="md:hidden fixed inset-0 z-50"><AiChatPanel workflowId={id} surface="resume_workspace" onClose={() => setChatOpen(false)} className="h-full" /></div>}
    </div>
  );
}
