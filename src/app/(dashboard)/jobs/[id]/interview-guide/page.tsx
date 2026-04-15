"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { Sparkles, MessageSquare, Trash2 } from "lucide-react";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { MarkdownDoc } from "@/components/documents/markdown-doc";
import { ContextPhasePanel } from "@/components/workflow/context-phase-panel";
import { STATUS_OPTIONS } from "@/components/documents/doc-subheader";
import { useDocControls } from "@/components/layout/doc-controls-slot";
import { cn } from "@/lib/utils";
import type { Workflow, Output } from "@/lib/types";
import { deriveApplicationStatus } from "@/lib/workflow-adapter";

interface Props {
  params: Promise<{ id: string }>;
}

export default function InterviewGuidePage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [output, setOutput] = useState<Output | undefined>(undefined);
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appStatus, setAppStatus] = useState("draft");
  const [confirmDel, setConfirmDel] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialContent = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setDocControls, clearDocControls } = useDocControls();

  const saveContent = useCallback(async (text: string) => {
    const res = await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "interview_guide", content: text }),
    });
    if (res.ok) { const out = await res.json(); setOutput(out); }
    setIsDirty(false);
  }, [id]);

  const fetchWorkflow = async () => {
    try {
      const wf: Workflow = await fetch(`/api/workflows/${id}`).then(r => r.json());
      if (!wf?.id) { setLoading(false); return; }
      if (wf.state === "listing_review") {
        await fetch(`/api/workflows/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: "draft", is_active: true }),
        });
      }
      setWorkflow(wf);
      setAppStatus(deriveApplicationStatus(wf.state, wf.status_events));
      const out = wf.outputs?.find(o => o.type === "interview_guide" && o.is_current);
      if (out) {
        setOutput(out);
        setContent(out.content);
        setGenerating(false);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      } else if (!generating) {
        setGenerating(true);
        let provider: string | undefined;
        try { const s = JSON.parse(localStorage.getItem("dreamjob_settings") ?? "{}"); if (s.aiProvider) provider = s.aiProvider; } catch { /* ignore */ }
        fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workflow_id: id, output_type: "interview_guide", provider }),
        });
      }
      setLoading(false);
    } catch { setLoading(false); }
  };

  useEffect(() => {
    fetchWorkflow();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [id]);

  useEffect(() => {
    if (!generating || pollRef.current) return;
    pollRef.current = setInterval(fetchWorkflow, 3000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [generating]);

  useEffect(() => {
    if (initialContent.current) { initialContent.current = false; return; }
    if (generating || !content) return;
    setIsDirty(true);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveContent(content), 2000);
  }, [content, saveContent]);

  const handleSave = useCallback(async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    await saveContent(content);
  }, [content, saveContent]);

  const handleBlur = useCallback(async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    await saveContent(content);
    setEditing(false);
  }, [content, saveContent]);

  const handleStatusChange = useCallback(async (val: string) => {
    if (val === "draft") {
      await fetch(`/api/workflows/${id}/status`, { method: "DELETE" });
      setAppStatus("draft");
      return;
    }
    const opt = STATUS_OPTIONS.find(o => o.value === val);
    if (!opt?.event) { setAppStatus(val); return; }
    await fetch(`/api/workflows/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: opt.event }),
    });
    setAppStatus(val);
  }, [id]);

  const handleDelete = useCallback(async () => {
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    router.push("/jobs");
  }, [id, router]);

  useEffect(() => {
    if (!workflow) return;
    setDocControls({
      workflowId: id,
      activeDoc: "interview-guide",
      companyName: workflow.listing?.company_name ?? "",
      appStatus,
      isDirty,
      onSave: handleSave,
      onStatusChange: handleStatusChange,
      onDelete: () => setConfirmDel(true),
    });
    return () => clearDocControls();
  }, [workflow, appStatus, isDirty, handleSave, handleStatusChange]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!workflow) return notFound();


  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-100">
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setConfirmDel(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-900 text-base mb-1">Delete application?</h3>
            <p className="text-sm text-slate-500 mb-5">This will move the application to Trash. You can restore it within 30 days.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold"><Trash2 className="w-4 h-4" /> Delete</button>
              <button onClick={() => setConfirmDel(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className={cn("flex-1 overflow-y-auto p-4 sm:p-8 doc-scroll", chatOpen && "hidden lg:block")}>
          {generating ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="w-16 h-16 rounded-2xl bg-violet-900 flex items-center justify-center mb-6">
                <MessageSquare className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2 text-center">Building your interview guide…</h2>
              <p className="text-slate-500 text-sm text-center max-w-xs">
                Preparing questions for <span className="font-medium">{workflow.listing?.title}</span> at <span className="font-medium">{workflow.listing?.company_name}</span>
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="mb-3 flex items-center justify-between px-1 gap-2">
                <p className="text-xs text-slate-500">Keep this guide editable and use assistant prompts to expand stories, examples, and question prep.</p>
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap">
                  Interview workspace
                </span>
              </div>
              <div className="document-paper overflow-hidden">
                <div className="p-8 sm:p-12">
                  <div className="mb-6 pb-4 border-b border-slate-100">
                    <h1 className="text-xl font-bold text-slate-900">Interview Guide</h1>
                    <p className="text-slate-500 text-sm mt-1">{workflow.listing?.title} · {workflow.listing?.company_name}</p>
                  </div>
                  {editing ? (
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onBlur={handleBlur}
                      className="w-full text-slate-800 text-sm leading-loose bg-sky-50/40 border border-sky-200 outline-none resize-none rounded-lg p-2 transition-colors"
                      rows={Math.max(20, content.split("\n").length + 2)}
                    />
                  ) : (
                    <div className="cursor-text rounded-md border border-dashed border-slate-200/80 px-2 py-2 -mx-2 hover:border-sky-300 hover:bg-sky-50/50 transition-colors" onClick={() => setEditing(true)} title="Click to edit">
                      <MarkdownDoc content={content} />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <ContextPhasePanel
                  phase={6}
                  title="Interview Metadata"
                  subtitle="Reference details below the artifact."
                  items={[
                    { label: "Role", value: workflow.listing?.title ?? "Untitled role" },
                    { label: "Company", value: workflow.listing?.company_name ?? "Unknown" },
                    { label: "Word count", value: `${content.split(/\s+/).filter(Boolean).length}` },
                    { label: "Edit state", value: editing ? "Editing now" : "Click guide to edit" },
                  ]}
                />
              </div>
              <div className="text-right mt-2 text-xs text-slate-400">{content.split(/\s+/).filter(Boolean).length} words</div>
            </div>
          )}
        </div>

        <div className="hidden lg:flex lg:flex-col lg:w-[340px] lg:border-l lg:border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Interview focus</p>
            <p className="mt-1 text-xs text-slate-600">Use the assistant for story framing, mock questions, and role-specific examples.</p>
          </div>
          <div className="border-b border-slate-200 bg-white px-4 py-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Suggested next prompts</p>
            {[
              "Help me build 3 STAR stories from this resume.",
              "Create likely interviewer questions for this role.",
              "Pressure-test weak parts of this draft guide.",
            ].map((prompt) => (
              <div key={prompt} className="rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-2 text-xs text-violet-800">
                {prompt}
              </div>
            ))}
          </div>
          <AiChatPanel workflowId={id} surface="interview_guide" className="flex-1 h-full min-h-0" />
        </div>
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
          <AiChatPanel workflowId={id} surface="interview_guide" onClose={() => setChatOpen(false)} className="h-full" />
        </div>
      )}
    </div>
  );
}
