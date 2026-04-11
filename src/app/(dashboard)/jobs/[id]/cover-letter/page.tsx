"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";
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

const BLANK_LETTER = `Dear Hiring Team,

I am excited to apply for this position. With my background and experience, I believe I am a strong candidate for this opportunity.

Throughout my career, I have developed expertise in the areas most critical to this role. My experience has prepared me well to contribute meaningfully from day one.

I would welcome the opportunity to discuss how my background aligns with your needs.

Thank you for your consideration.`;

export default function CoverLetterBuilderPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [output, setOutput] = useState<Output | undefined>(undefined);
  const [content, setContent] = useState(BLANK_LETTER);
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
      body: JSON.stringify({ type: "cover_letter", content: text }),
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
      const out = wf.outputs?.find(o => o.type === "cover_letter" && o.is_current);
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
          body: JSON.stringify({ workflow_id: id, output_type: "cover_letter", provider }),
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

  // Debounced auto-save while typing
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

  // Blur: save immediately and exit edit mode
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
      activeDoc: "cover-letter",
      companyName: workflow.listing?.company_name ?? "",
      appStatus,
      isDirty,
      onSave: handleSave,
      onStatusChange: handleStatusChange,
      onDelete: () => setConfirmDel(true),
    });
    return () => clearDocControls();
  }, [workflow, appStatus, isDirty, handleSave, handleStatusChange]);

  // Focus textarea when entering edit mode
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
              <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2 text-center">Writing your cover letter…</h2>
              <p className="text-slate-500 text-sm text-center max-w-xs">
                Tailoring it for <span className="font-medium">{workflow.listing?.title}</span> at <span className="font-medium">{workflow.listing?.company_name}</span>
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="document-paper overflow-hidden">
                <div className="p-8 sm:p-12">
                  <div className="mb-8 pb-6 border-b border-slate-100">
                    <div className="text-sm text-slate-500 font-medium">
                      {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </div>
                    <div className="mt-3">
                      <div className="font-semibold text-slate-900">Hiring Team</div>
                      <div className="text-slate-600 text-sm">{workflow.listing?.company_name}</div>
                    </div>
                  </div>

                  {editing ? (
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onBlur={handleBlur}
                      className="w-full text-slate-800 text-sm leading-loose font-serif bg-sky-50/40 border border-sky-200 outline-none resize-none rounded-lg p-2 transition-colors"
                      rows={Math.max(16, content.split("\n").length + 2)}
                    />
                  ) : (
                    <div
                      className="cursor-text"
                      onClick={() => setEditing(true)}
                      title="Click to edit"
                    >
                      <MarkdownDoc content={content} />
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right mt-2 text-xs text-slate-400">
                {content.split(/\s+/).filter(Boolean).length} words
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:flex lg:flex-col lg:w-[340px] lg:border-l lg:border-slate-200">
          <AiChatPanel workflowId={id} surface="cover_letter" className="flex-1 h-full" />
        </div>
      </div>

      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="md:hidden fixed z-30 w-10 h-10 rounded-full bg-slate-900 text-white shadow-lg flex items-center justify-center"
        style={{ top: "72px", right: "1rem" }}
      >
        <Sparkles className="w-4 h-4" />
      </button>
      {chatOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <AiChatPanel workflowId={id} surface="cover_letter" onClose={() => setChatOpen(false)} className="h-full" />
        </div>
      )}
    </div>
  );
}
