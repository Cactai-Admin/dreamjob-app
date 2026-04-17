"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Trash2 } from "lucide-react";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { ReferenceSidebar } from "@/components/workflow/reference-sidebar";
import { EvidenceAlignmentReferenceView, ListingReferenceView, type EvidenceReferenceItem } from "@/components/workflow/reference-views";
import type { Workflow } from "@/lib/types";
import { getSaveButtonLabel } from "@/lib/workflow/completion";
import { getPrimarySectionText, parseNativeDocument, serializeNativeDocument, type NativeDocument, type NativeDocumentSection } from "@/lib/documents/native-document";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ResumeWorkspacePage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [resumeDoc, setResumeDoc] = useState<NativeDocument | null>(null);
  const [resumeDirty, setResumeDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [googleSyncState, setGoogleSyncState] = useState<{ status: string; message: string; url?: string } | null>(null);
  const [confirmDeleteApplication, setConfirmDeleteApplication] = useState(false);
  const [confirmDeleteResume, setConfirmDeleteResume] = useState(false);
  const [deletingApplication, setDeletingApplication] = useState(false);
  const [deletingResume, setDeletingResume] = useState(false);

  const loadWorkflow = async () => {
    const wf: Workflow = await fetch(`/api/workflows/${id}`).then((r) => r.json());
    if (!wf?.id) {
      setLoading(false);
      return;
    }
    setWorkflow(wf);
    const resumeOut = wf.outputs?.find((o) => o.type === "resume" && o.is_current);
    setResumeDoc(parseNativeDocument("resume", resumeOut));
    const syncDoc = (wf.autosave_data as { google_docs_sync?: { docs?: { resume?: { documentUrl?: string; syncState?: string; error?: string } } } } | null)
      ?.google_docs_sync?.docs?.resume;
    if (syncDoc) {
      setGoogleSyncState({ status: syncDoc.syncState ?? "pending", message: syncDoc.error ?? "Google Docs linked.", url: syncDoc.documentUrl });
    }
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
  const alignedEvidence = useMemo(() => {
    if (!workflow?.notes) return [];
    try {
      const parsed = JSON.parse(workflow.notes) as { evidence_alignment?: EvidenceReferenceItem[] };
      return Array.isArray(parsed.evidence_alignment) ? parsed.evidence_alignment : [];
    } catch {
      return [];
    }
  }, [workflow?.notes]);

  const ensureGeneration = async () => {
    if (generating) return;
    setGenerating(true);
    setGenerationError(null);
    let provider: string | undefined;
    try {
      const s = JSON.parse(localStorage.getItem("dreamjob_settings") ?? "{}");
      if (s.aiProvider) provider = s.aiProvider;
    } catch {
      // ignore
    }

    const generateResponse = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow_id: id, output_type: "resume", provider }),
    });
    if (!generateResponse.ok) {
      const payload = await generateResponse.json().catch(() => null);
      setGenerationError(payload?.error ?? "Unable to generate resume right now.");
      setGenerating(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 24;
    pollingRef.current = setInterval(async () => {
      attempts += 1;
      const wf: Workflow = await fetch(`/api/workflows/${id}`).then((r) => r.json());
      const resumeOut = wf.outputs?.find((o) => o.type === "resume" && o.is_current);
      if (resumeOut) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setWorkflow(wf);
        setResumeDoc(parseNativeDocument("resume", resumeOut));
        setGenerating(false);
        return;
      }
      if (attempts >= maxAttempts) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setGenerating(false);
        setGenerationError("Resume generation timed out. Please try generating again.");
      }
    }, 2500);
  };

  const saveResume = async () => {
    setSaveState("saving");
    const saveResult = await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "resume", content: serializeNativeDocument(resumeDoc ?? parseNativeDocument("resume")) }),
    }).then((r) => r.json()).catch(() => null);
    if (saveResult?.google_sync) {
      setGoogleSyncState({
        status: saveResult.google_sync.status,
        message: saveResult.google_sync.message,
        url: saveResult.google_sync.documentUrl,
      });
    }
    setResumeDirty(false);
    setSaveState("saved");
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        autosave_data: {
          ...(workflow?.autosave_data && typeof workflow.autosave_data === "object" ? workflow.autosave_data : {}),
          completion: {
            ...((workflow?.autosave_data as { completion?: Record<string, unknown> } | null)?.completion ?? {}),
            resume_completed_at: new Date().toISOString(),
          },
        },
      }),
    }).catch(() => null);
    await loadWorkflow();
  };

  const hasMeaningfulResumeContent = useMemo(
    () => Boolean(resumeDoc && getPrimarySectionText(resumeDoc).trim().length > 0),
    [resumeDoc]
  );

  useEffect(() => {
    if (!loading && !resumeSaved && !hasMeaningfulResumeContent) {
      void ensureGeneration();
    }
  }, [loading, resumeSaved, hasMeaningfulResumeContent]);

  const continueToCoverLetter = async () => {
    if (resumeDirty) {
      await saveResume();
    }
    router.push(`/jobs/${id}/cover-letter`);
  };

  const moveApplicationToTrash = async () => {
    setDeletingApplication(true);
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    router.push("/jobs");
  };

  const deleteResumeDraft = async () => {
    setDeletingResume(true);
    await fetch(`/api/workflows/${id}/outputs?type=resume`, { method: "DELETE" });
    setResumeDoc(parseNativeDocument("resume"));
    setResumeDirty(false);
    setSaveState("idle");
    await loadWorkflow();
    setDeletingResume(false);
    setConfirmDeleteResume(false);
  };

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
            content: <ListingReferenceView workflow={workflow} />,
          },
          {
            value: "evidence-alignment",
            label: "Evidence Alignment",
            content: <EvidenceAlignmentReferenceView evidence={alignedEvidence} emptyMessage="Save work-history alignment to see evidence context." />,
          },
        ]}
      />

      <main className={cn("flex-1 overflow-y-auto p-4 sm:p-6", chatOpen && "hidden md:block")}>
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">Resume Workspace</h1>
            <button onClick={saveResume} disabled={generating || saveState === "saving" || !resumeDirty} className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white disabled:opacity-50">{saveState === "saved" && !resumeDirty ? "Saved" : getSaveButtonLabel(saveState)}</button>
          </div>
          <p className="text-sm text-slate-600 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
            This draft inherits listing priorities plus your Work History evidence alignment from the previous milestone.
          </p>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-2">
            <p>Delete actions are explicit: “Move application to Trash” is recoverable for 30 days. “Delete resume draft” only removes this generated resume and is also recoverable from Trash.</p>
            <div className="flex flex-wrap gap-2">
              {confirmDeleteResume ? (
                <>
                  <button onClick={deleteResumeDraft} disabled={deletingResume} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50">
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingResume ? "Moving…" : "Yes, move resume draft to Trash"}
                  </button>
                  <button onClick={() => setConfirmDeleteResume(false)} className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-900">Cancel</button>
                </>
              ) : (
                <button onClick={() => setConfirmDeleteResume(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete resume draft
                </button>
              )}
              {confirmDeleteApplication ? (
                <>
                  <button onClick={moveApplicationToTrash} disabled={deletingApplication} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 text-white font-semibold disabled:opacity-50">
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingApplication ? "Moving…" : "Yes, move application to Trash"}
                  </button>
                  <button onClick={() => setConfirmDeleteApplication(false)} className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-900">Cancel</button>
                </>
              ) : (
                <button onClick={() => setConfirmDeleteApplication(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                  Move application to Trash
                </button>
              )}
            </div>
          </div>

          {generating && (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
              <div className="mx-auto h-12 w-12 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
              <p className="text-sm font-medium text-slate-700 mt-4">Generating resume draft…</p>
              <p className="text-xs text-slate-500 mt-1">We are building your first resume draft from listing + evidence alignment.</p>
            </div>
          )}
          {generationError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
              {generationError}
            </div>
          ) : null}

          {googleSyncState && (
            <div className={cn("rounded-lg border px-3 py-2 text-xs", googleSyncState.status === "synced" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : googleSyncState.status === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900")}>
              <p>{googleSyncState.message}</p>
              {googleSyncState.url && <a href={googleSyncState.url} target="_blank" rel="noreferrer" className="underline font-semibold">Open in Google Docs</a>}
            </div>
          )}

          {hasMeaningfulResumeContent && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
              {resumeDoc?.sections.map((section: NativeDocumentSection) => (
                <div key={section.id}>
                  <p className="text-xs font-semibold uppercase text-slate-500 mb-1">{section.title}</p>
                  <textarea
                    value={section.content}
                    onChange={(e) => {
                      setResumeDoc((prev) => {
                        const base = prev ?? parseNativeDocument("resume");
                        return {
                          ...base,
                          sections: base.sections.map((s) => s.id === section.id ? { ...s, content: e.target.value } : s),
                        };
                      });
                      setResumeDirty(true);
                      setSaveState("idle");
                    }}
                    className="w-full min-h-[120px] rounded-lg border border-slate-200 p-3 text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={continueToCoverLetter} className="btn-ocean px-4 py-2 rounded-lg text-white inline-flex items-center gap-2" disabled={(resumeDoc?.sections.length ?? 0) === 0 || generating}>
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
