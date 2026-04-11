"use client";

// ── Cover Letter Builder — AI-assisted cover letter with chat panel ──

import { useState, useEffect, useRef, use } from "react";
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { Sparkles, Save, CircleCheck as CheckCircle2, Eye, CreditCard as Edit3, FileText, Mail, MessageSquare, TrendingUp, Download, Trash2, ChevronDown } from "lucide-react";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { MarkdownDoc } from "@/components/documents/markdown-doc";
import { cn } from "@/lib/utils";
import type { Workflow, Output } from "@/lib/types";
import { deriveApplicationStatus } from "@/lib/workflow-adapter";

const STATUS_OPTIONS = [
  { value: "ready",        label: "Ready",        event: null },
  { value: "applied",      label: "Applied",      event: "sent" },
  { value: "received",     label: "Received",     event: "received" },
  { value: "interviewing", label: "Interviewing", event: "interview" },
  { value: "offer",        label: "Offer",        event: "offer" },
  { value: "negotiating",  label: "Negotiating",  event: "negotiation" },
  { value: "hired",        label: "Hired",        event: "hired" },
  { value: "declined",     label: "Declined",     event: "declined" },
  { value: "ghosted",      label: "Ghosted",      event: "ghosted" },
  { value: "rejected",     label: "Rejected",     event: "rejected" },
] as const;

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
  const [coverOutput, setCoverOutput] = useState<Output | undefined>(undefined);
  const [content, setContent] = useState(BLANK_LETTER);
  const [generating, setGenerating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [status, setStatus] = useState<"draft" | "approved">("draft");
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(false);
  const [appStatus, setAppStatus] = useState("draft");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialContent = useRef(true);

  const fetchWorkflow = async () => {
    try {
      const wf: Workflow = await fetch(`/api/workflows/${id}`).then(r => r.json());
      if (!wf?.id) { setLoading(false); return; }
      // Ensure state is transitioned to draft if still in listing_review
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
        setCoverOutput(out);
        setContent(out.content);
        setStatus(out.status === "approved" ? "approved" : "draft");
        setGenerating(false);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      } else if (!generating) {
        // No cached output — fire AI generation once
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

  // Poll while generating
  useEffect(() => {
    if (!generating || pollRef.current) return;
    pollRef.current = setInterval(fetchWorkflow, 3000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [generating]);

  // Auto-save 2s after any content edit
  useEffect(() => {
    if (initialContent.current) { initialContent.current = false; return; }
    if (generating || !content) return;
    setIsDirty(true);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await fetch(`/api/workflows/${id}/outputs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "cover_letter", content }),
      });
      setIsDirty(false);
    }, 2000);
  }, [content]);

  const handleSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const res = await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "cover_letter", content }),
    });
    if (res.ok) {
      const out = await res.json();
      setCoverOutput(out);
      setIsDirty(false);
    }
  };

  const handleApprove = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const res = await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "cover_letter", content, status: "approved" }),
    });
    if (res.ok) setStatus("approved");
  };

  const handleUnapprove = async () => {
    await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "cover_letter", content, status: "draft" }),
    });
    setStatus("draft");
  };

  const handleDelete = async () => {
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    router.push("/jobs");
  };

  const downloadMarkdown = () => {
    const co = workflow?.listing?.company_name ?? "Company";
    const ro = workflow?.listing?.title ?? "Role";
    const md = `# Cover Letter\n${ro} · ${co}\n\n${content}`;
    const slug = `${co.replace(/\s+/g, "_")}_Cover_Letter`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${slug}.md`; a.click();
    URL.revokeObjectURL(url);
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
      {/* Header bar */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <a href={`/jobs/${id}`} className="text-sm text-slate-500 hover:text-slate-700 flex-shrink-0">← Back</a>
            <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
            <span className="font-semibold text-slate-900 text-sm truncate">{workflow.listing?.company_name}</span>
            {/* Doc type toggle — all 4 docs */}
            <div className="flex items-center gap-0.5 p-1 bg-slate-100 rounded-lg ml-1 flex-shrink-0">
              <button onClick={() => router.push(`/jobs/${id}/resume`)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
                <FileText className="w-3 h-3" /><span className="hidden sm:inline">Resume</span>
              </button>
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white text-slate-900 shadow-sm">
                <Mail className="w-3 h-3" /><span className="hidden sm:inline">Cover Letter</span>
              </button>
              <button onClick={() => router.push(`/jobs/${id}/interview-guide`)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
                <MessageSquare className="w-3 h-3" /><span className="hidden sm:inline">Interview</span>
              </button>
              <button onClick={() => router.push(`/jobs/${id}/negotiation-guide`)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
                <TrendingUp className="w-3 h-3" /><span className="hidden sm:inline">Negotiation</span>
              </button>
            </div>
            {/* Trash — after tabs */}
            {confirmDel ? (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs text-red-600 font-medium">Delete?</span>
                <button onClick={handleDelete} className="text-xs font-semibold px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">Yes</button>
                <button onClick={() => setConfirmDel(false)} className="text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(true)} className="flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors" title="Delete application">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status dropdown */}
            <div className="relative flex-shrink-0">
              <select
                value={appStatus}
                onChange={e => handleStatusChange(e.target.value)}
                className={cn(
                  "text-xs font-medium pl-3 pr-6 py-2 rounded-xl border bg-white appearance-none cursor-pointer transition-all",
                  appStatus === "hired"        ? "border-emerald-300 text-emerald-700" :
                  appStatus === "hired"        ? "border-green-300 text-green-700" :
                  appStatus === "declined"     ? "border-orange-300 text-orange-700" :
                  appStatus === "rejected"     ? "border-red-300 text-red-600" :
                  appStatus === "ghosted"      ? "border-slate-300 text-slate-500" :
                  appStatus === "negotiating"  ? "border-teal-300 text-teal-700" :
                  appStatus === "offer"        ? "border-emerald-300 text-emerald-700" :
                  appStatus === "interviewing" ? "border-amber-300 text-amber-700" :
                  appStatus === "received"     ? "border-violet-300 text-violet-700" :
                  appStatus === "applied"      ? "border-sky-300 text-sky-700" :
                                                 "border-slate-200 text-slate-600"
                )}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-slate-400" />
            </div>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-slate-300 transition-all"
            >
              {previewMode ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span className="hidden sm:inline">{previewMode ? "Edit" : "Preview"}</span>
            </button>

            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-all",
                chatOpen ? "bg-sky-50 text-sky-700 border-sky-300" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI</span>
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-slate-300 transition-all"
            >
              {!isDirty ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Save className="w-3 h-3" />}
              <span className="hidden sm:inline">{!isDirty ? "Saved" : "Save"}</span>
            </button>

            {status !== "approved" ? (
              <button
                onClick={handleApprove}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span className="hidden sm:inline">Approve</span>
              </button>
            ) : (
              <button
                onClick={handleUnapprove}
                title="Click to unapprove and re-enable editing"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
              >
                <CheckCircle2 className="w-3 h-3" />
                Approved
              </button>
            )}
            <button
              onClick={downloadMarkdown}
              disabled={!content}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-slate-300 disabled:opacity-40 transition-all"
              title="Download as Markdown"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">.md</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <div className={cn("flex-1 overflow-y-auto p-4 sm:p-8", chatOpen && "hidden lg:block")}>
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

                {previewMode ? (
                  <MarkdownDoc content={content} />
                ) : (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full text-slate-800 text-sm leading-loose font-serif bg-transparent outline-none resize-none focus:bg-sky-50/30 rounded transition-colors"
                    rows={Math.max(16, content.split("\n").length + 2)}
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
            <AiChatPanel workflowId={id} surface="cover_letter" onClose={() => setChatOpen(false)} className="h-full" />
          </div>
        )}

        {!chatOpen && (
          <div className="hidden lg:flex lg:flex-col lg:w-[340px] lg:border-l lg:border-slate-200">
            <AiChatPanel workflowId={id} surface="cover_letter" className="flex-1 h-full" />
          </div>
        )}
      </div>
    </div>
  );
}
