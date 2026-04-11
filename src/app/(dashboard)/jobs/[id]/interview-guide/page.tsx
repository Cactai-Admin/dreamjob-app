"use client";

// ── Interview Guide — AI-generated interview prep with chat panel ──

import { useState, useEffect, useRef, use } from "react";
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { Sparkles, MessageSquare } from "lucide-react";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { MarkdownDoc } from "@/components/documents/markdown-doc";
import { DocSubheader, STATUS_OPTIONS } from "@/components/documents/doc-subheader";
import { useMobileNavSlot } from "@/components/layout/mobile-nav-slot";
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialContent = useRef(true);
  const { setSlot, clearSlot } = useMobileNavSlot();

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

  // Inject status dropdown into mobile top bar
  useEffect(() => {
    if (!workflow) return;
    setSlot(
      <select
        value={appStatus}
        onChange={e => handleStatusChange(e.target.value)}
        className="text-xs font-medium pl-2 pr-6 py-1.5 rounded-lg border border-slate-200 bg-white appearance-none cursor-pointer text-slate-600"
        style={{ backgroundImage: 'none' }}
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
    return () => clearSlot();
  }, [workflow, appStatus]);

  const handleSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const res = await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "interview_guide", content }),
    });
    if (res.ok) {
      const out = await res.json();
      setOutput(out);
      setIsDirty(false);
    }
  };

  const handleToggleLock = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const newLocked = !docLocked;
    await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "interview_guide", content, status: newLocked ? "approved" : "draft" }),
    });
    setDocLocked(newLocked);
    setIsDirty(false);
  };

  const handleDelete = async () => {
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    router.push("/jobs");
  };

  const handleStatusChange = async (val: string) => {
    const opt = STATUS_OPTIONS.find(o => o.value === val);
    if (!opt || !opt.event) { setAppStatus(val); return; }
    await fetch(`/api/workflows/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: opt.event }),
    });
    setAppStatus(val);
  };

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
      <DocSubheader
        workflowId={id}
        companyName={workflow.listing?.company_name ?? ""}
        activeDoc="interview-guide"
        isDirty={isDirty}
        onSave={handleSave}
        docLocked={docLocked}
        onToggleLock={handleToggleLock}
        appStatus={appStatus}
        onStatusChange={handleStatusChange}
        chatOpen={chatOpen}
        onChatToggle={() => setChatOpen(!chatOpen)}
        onDelete={handleDelete}
      />

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
                Preparing questions and talking points for <span className="font-medium">{workflow.listing?.title}</span> at <span className="font-medium">{workflow.listing?.company_name}</span>
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
              <div className="text-right mt-2 text-xs text-slate-400">
                {content.split(/\s+/).filter(Boolean).length} words
              </div>
            </div>
          )}
        </div>

        {chatOpen && (
          <div className="lg:w-[380px] lg:flex-shrink-0 fixed inset-0 z-50 lg:relative lg:inset-auto">
            <AiChatPanel workflowId={id} surface="interview_guide" onClose={() => setChatOpen(false)} className="h-full" />
          </div>
        )}

        {!chatOpen && (
          <div className="hidden lg:flex lg:flex-col lg:w-[340px] lg:border-l lg:border-slate-200">
            <AiChatPanel workflowId={id} surface="interview_guide" className="flex-1 h-full" />
          </div>
        )}
      </div>
    </div>
  );
}
