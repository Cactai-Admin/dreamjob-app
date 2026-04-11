"use client";

// ── Interview Guide — AI-generated interview prep with chat panel ──

import { useState, useEffect, useRef, useCallback, use } from "react";
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { Sparkles, MessageSquare, Save, Trash2 } from "lucide-react";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { MarkdownDoc } from "@/components/documents/markdown-doc";
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
  const [docLocked, setDocLocked] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appStatus, setAppStatus] = useState("draft");
  const [confirmDel, setConfirmDel] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialContent = useRef(true);
  const { setDocControls, clearDocControls } = useDocControls();

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
        setDocLocked(out.status === "approved");
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
    autoSaveTimer.current = setTimeout(async () => {
      await fetch(`/api/workflows/${id}/outputs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "interview_guide", content }),
      });
      setIsDirty(false);
    }, 2000);
  }, [content]);

  const handleSave = useCallback(async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const res = await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "interview_guide", content }),
    });
    if (res.ok) { const out = await res.json(); setOutput(out); setIsDirty(false); }
  }, [id, content]);

  const handleToggleLock = useCallback(async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const newLocked = !docLocked;
    await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "interview_guide", content, status: newLocked ? "approved" : "draft" }),
    });
    setDocLocked(newLocked);
    setIsDirty(false);
  }, [id, content, docLocked]);

  const handleStatusChange = useCallback(async (val: string) => {
    const opt = STATUS_OPTIONS.find(o => o.value === val);
    if (!opt || !opt.event) { setAppStatus(val); return; }
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
      docLocked,
      onSave: handleSave,
      onToggleLock: handleToggleLock,
      onStatusChange: handleStatusChange,
      onDelete: () => setConfirmDel(true),
    });
    return () => clearDocControls();
  }, [workflow, appStatus, isDirty, docLocked, handleSave, handleToggleLock, handleStatusChange]);

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
      {/* Delete confirmation modal */}
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

      {/* Mobile doc controls bar */}
      <div className="md:hidden flex-shrink-0 bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-2">
        <button onClick={handleSave} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600">
          {isDirty ? <Save className="w-3.5 h-3.5" /> : <span className="text-emerald-600 font-semibold">Saved</span>}
        </button>
        <button onClick={handleToggleLock} className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border", docLocked ? "border-slate-300 bg-slate-50 text-slate-700" : "border-sky-300 bg-sky-50 text-sky-700")}>
          {docLocked ? "Locked" : "Editing"}
        </button>
        <button onClick={() => setConfirmDel(true)} className="flex items-center justify-center w-8 h-8 rounded-xl text-slate-400" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <div className={cn("flex-1 overflow-y-auto p-4 sm:p-8", chatOpen && "hidden lg:block")}>
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
              <div className="document-paper overflow-hidden">
                <div className="p-8 sm:p-12">
                  <div className="mb-6 pb-4 border-b border-slate-100">
                    <h1 className="text-xl font-bold text-slate-900">Interview Guide</h1>
                    <p className="text-slate-500 text-sm mt-1">{workflow.listing?.title} · {workflow.listing?.company_name}</p>
                  </div>
                  {docLocked ? (
                    <MarkdownDoc content={content} />
                  ) : (
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full text-slate-800 text-sm leading-loose bg-transparent outline-none resize-none focus:bg-sky-50/30 rounded transition-colors"
                      rows={Math.max(20, content.split("\n").length + 2)}
                    />
                  )}
                </div>
              </div>
              <div className="text-right mt-2 text-xs text-slate-400">{content.split(/\s+/).filter(Boolean).length} words</div>
            </div>
          )}
        </div>

        <div className="hidden lg:flex lg:flex-col lg:w-[340px] lg:border-l lg:border-slate-200">
          <AiChatPanel workflowId={id} surface="interview_guide" className="flex-1 h-full" />
        </div>
      </div>

      <div className="md:hidden fixed z-30" style={{ bottom: "calc(64px + env(safe-area-inset-bottom))", right: "1rem" }}>
        <button onClick={() => setChatOpen(!chatOpen)} className="w-12 h-12 rounded-full bg-slate-900 text-white shadow-lg flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </button>
      </div>
      {chatOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <AiChatPanel workflowId={id} surface="interview_guide" onClose={() => setChatOpen(false)} className="h-full" />
        </div>
      )}
    </div>
  );
}
