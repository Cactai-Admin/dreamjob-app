"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Trash2 } from "lucide-react";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { ReferenceSidebar } from "@/components/workflow/reference-sidebar";
import { EvidenceAlignmentReferenceView, ListingReferenceView, ResumeReferenceView, type EvidenceReferenceItem } from "@/components/workflow/reference-views";
import type { Workflow } from "@/lib/types";
import { getSaveButtonLabel, isCoverLetterComplete } from "@/lib/workflow/completion";
import { getPrimarySectionText, parseNativeDocument, serializeNativeDocument, setPrimarySectionText, type NativeDocument } from "@/lib/documents/native-document";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default function CoverLetterWorkspacePage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [coverDoc, setCoverDoc] = useState<NativeDocument | null>(null);
  const [googleSyncState, setGoogleSyncState] = useState<{ status: string; message: string; url?: string } | null>(null);
  const [coverDirty, setCoverDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmDeleteApplication, setConfirmDeleteApplication] = useState(false);
  const [confirmDeleteCoverLetter, setConfirmDeleteCoverLetter] = useState(false);
  const [deletingApplication, setDeletingApplication] = useState(false);
  const [deletingCoverLetter, setDeletingCoverLetter] = useState(false);

  const loadWorkflow = async () => {
    const wf: Workflow = await fetch(`/api/workflows/${id}`).then((r) => r.json());
    if (!wf?.id) {
      setLoading(false);
      return;
    }
    setWorkflow(wf);
    const coverOut = wf.outputs?.find((o) => o.type === "cover_letter" && o.is_current);
    setCoverDoc(parseNativeDocument("cover_letter", coverOut));
    const syncDoc = (wf.autosave_data as { google_docs_sync?: { docs?: { cover_letter?: { documentUrl?: string; syncState?: string; error?: string } } } } | null)?.google_docs_sync?.docs?.cover_letter;
    if (syncDoc) setGoogleSyncState({ status: syncDoc.syncState ?? "pending", message: syncDoc.error ?? "Google Docs linked.", url: syncDoc.documentUrl });
    setLoading(false);
    return wf;
  };

  useEffect(() => {
    void loadWorkflow().catch(() => setLoading(false));
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [id]);

  const coverSaved = Boolean(workflow?.outputs?.find((o) => o.type === "cover_letter" && o.is_current));
  const resumeReference = workflow?.outputs?.find((o) => o.type === "resume" && o.is_current);
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
      body: JSON.stringify({ workflow_id: id, output_type: "cover_letter", provider }),
    });
    if (!generateResponse.ok) {
      const payload = await generateResponse.json().catch(() => null);
      setGenerationError(payload?.error ?? "Unable to generate cover letter right now.");
      setGenerating(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 24;
    pollingRef.current = setInterval(async () => {
      attempts += 1;
      const wf: Workflow = await fetch(`/api/workflows/${id}`).then((r) => r.json());
      const output = wf.outputs?.find((o) => o.type === "cover_letter" && o.is_current);
      if (output) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setWorkflow(wf);
        setCoverDoc(parseNativeDocument("cover_letter", output));
        setGenerating(false);
        return;
      }
      if (attempts >= maxAttempts) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setGenerating(false);
        setGenerationError("Cover letter generation timed out. Please try again.");
      }
    }, 2500);
  };

  const saveCoverLetter = async () => {
    setSaveState("saving");
    const saveResult = await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "cover_letter", content: serializeNativeDocument(coverDoc ?? parseNativeDocument("cover_letter")) }),
    });
    const payload = await saveResult.json().catch(() => null);
    if (payload?.google_sync) {
      setGoogleSyncState({ status: payload.google_sync.status, message: payload.google_sync.message, url: payload.google_sync.documentUrl });
    }
    setCoverDirty(false);
    setSaveState("saved");
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        autosave_data: {
          ...(workflow?.autosave_data && typeof workflow.autosave_data === "object" ? workflow.autosave_data : {}),
          completion: {
            ...((workflow?.autosave_data as { completion?: Record<string, unknown> } | null)?.completion ?? {}),
            cover_letter_completed_at: new Date().toISOString(),
          },
        },
      }),
    }).catch(() => null);
    await loadWorkflow();
  };

  const persistCoverLetter = () => {
    const hasMeaningfulContent = getPrimarySectionText(coverDoc ?? parseNativeDocument("cover_letter")).trim().length > 0;
    const shouldPersist = isCoverLetterComplete({
      hasGeneratedContent: hasMeaningfulContent,
      hasManualSave: coverSaved,
      hasAutosave: false,
      isNavigatingAway: true,
    }) && (coverDirty || !coverSaved);

    if (!shouldPersist) return;

    void fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "cover_letter", content: serializeNativeDocument(coverDoc ?? parseNativeDocument("cover_letter")) }),
      keepalive: true,
    });
  };

  useEffect(() => {
    if (!loading && !coverSaved && !getPrimarySectionText(coverDoc ?? parseNativeDocument("cover_letter"))) {
      void ensureGeneration();
    }
  }, [loading, coverDoc, coverSaved]);

  const continueToHub = async () => {
    const hasMeaningfulContent = getPrimarySectionText(coverDoc ?? parseNativeDocument("cover_letter")).trim().length > 0;
    if (isCoverLetterComplete({
      hasGeneratedContent: hasMeaningfulContent,
      hasManualSave: coverSaved,
      hasAutosave: false,
      isNavigatingAway: true,
    }) && (coverDirty || !coverSaved)) {
      await saveCoverLetter();
    }
    router.push(`/jobs/${id}/overview`);
  };

  const leaveToHub = async () => {
    const hasMeaningfulContent = getPrimarySectionText(coverDoc ?? parseNativeDocument("cover_letter")).trim().length > 0;
    if (isCoverLetterComplete({
      hasGeneratedContent: hasMeaningfulContent,
      hasManualSave: coverSaved,
      hasAutosave: false,
      isNavigatingAway: true,
    }) && (coverDirty || !coverSaved)) {
      await saveCoverLetter();
    }
    router.push(`/jobs/${id}/overview`);
  };

  const moveApplicationToTrash = async () => {
    setDeletingApplication(true);
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    router.push("/jobs");
  };

  const deleteCoverLetterDraft = async () => {
    setDeletingCoverLetter(true);
    await fetch(`/api/workflows/${id}/outputs?type=cover_letter`, { method: "DELETE" });
    setCoverDoc(parseNativeDocument("cover_letter"));
    setCoverDirty(false);
    setSaveState("idle");
    await loadWorkflow();
    setDeletingCoverLetter(false);
    setConfirmDeleteCoverLetter(false);
  };

  useEffect(() => {
    return () => {
      persistCoverLetter();
    };
  }, [coverDoc, coverDirty, coverSaved]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-slate-100">
      <ReferenceSidebar
        widthClassName="w-[280px]"
        title="Cover letter references"
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
          {
            value: "resume",
            label: "Resume",
            content: <ResumeReferenceView content={resumeReference?.content ?? ""} />,
          },
        ]}
      />

      <main className={cn("flex-1 overflow-y-auto p-4 sm:p-6", chatOpen && "hidden md:block")}>
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">Cover Letter Workspace</h1>
            <button onClick={saveCoverLetter} disabled={generating || saveState === "saving" || !coverDirty} className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white disabled:opacity-50">{saveState === "saved" && !coverDirty ? "Saved" : getSaveButtonLabel(saveState)}</button>
          </div>
          <p className="text-sm text-slate-600 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
            This cover letter is built from listing priorities, Work History alignment, and your resume draft emphasis.
          </p>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-2">
            <p>Delete actions are explicit: Trash keeps recoverable items for 30 days. Permanent purge only happens from Trash.</p>
            <div className="flex flex-wrap gap-2">
              {confirmDeleteCoverLetter ? (
                <>
                  <button onClick={deleteCoverLetterDraft} disabled={deletingCoverLetter} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50">
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingCoverLetter ? "Moving…" : "Yes, move cover letter draft to Trash"}
                  </button>
                  <button onClick={() => setConfirmDeleteCoverLetter(false)} className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-900">Cancel</button>
                </>
              ) : (
                <button onClick={() => setConfirmDeleteCoverLetter(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete cover letter draft
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
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              <p className="text-sm text-slate-600 mt-2">Generating cover letter…</p>
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

          {getPrimarySectionText(coverDoc ?? parseNativeDocument("cover_letter")) && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <textarea
                value={getPrimarySectionText(coverDoc ?? parseNativeDocument("cover_letter"))}
                onChange={(e) => {
                  setCoverDoc((prev) => setPrimarySectionText(prev ?? parseNativeDocument("cover_letter"), e.target.value));
                  setCoverDirty(true);
                  setSaveState("idle");
                }}
                className="w-full min-h-[360px] rounded-lg border border-slate-200 p-3 text-sm"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button onClick={leaveToHub} className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm">Skip for now</button>
            <button onClick={continueToHub} className="btn-ocean px-4 py-2 rounded-lg text-white inline-flex items-center gap-2" disabled={!getPrimarySectionText(coverDoc ?? parseNativeDocument("cover_letter")) || generating}>
              Continue to Final Hub <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      <div className="hidden lg:flex lg:w-[360px] lg:min-w-0 lg:border-l lg:border-slate-200">
        <AiChatPanel workflowId={id} surface="cover_letter_workspace" className="flex-1 h-full" />
      </div>

      <button onClick={() => setChatOpen(!chatOpen)} className="md:hidden fixed z-30 btn-ocean w-10 h-10 rounded-full text-white shadow-lg flex items-center justify-center" style={{ top: "calc(var(--mobile-nav-height, 88px) + 6px)", right: "1rem" }}>
        AI
      </button>
      {chatOpen && <div className="md:hidden fixed inset-0 z-50"><AiChatPanel workflowId={id} surface="cover_letter_workspace" onClose={() => setChatOpen(false)} className="h-full" /></div>}
    </div>
  );
}
