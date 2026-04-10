"use client";

// ── Cover Letter Builder — AI-assisted cover letter with chat panel ──

import { useState, useEffect, use } from "react";
import { notFound } from "next/navigation";
import { Sparkles, Save, CircleCheck as CheckCircle2, Eye, CreditCard as Edit3 } from "lucide-react";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { cn } from "@/lib/utils";
import type { Workflow, Output } from "@/lib/types";

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
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [coverOutput, setCoverOutput] = useState<Output | undefined>(undefined);
  const [content, setContent] = useState(BLANK_LETTER);
  const [chatOpen, setChatOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [status, setStatus] = useState<"draft" | "approved">("draft");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/workflows/${id}`)
      .then(r => r.json())
      .then((wf: Workflow) => {
        if (!wf?.id) { setLoading(false); return; }
        setWorkflow(wf);
        const out = wf.outputs?.find(o => o.type === "cover_letter" && o.is_current);
        if (out) {
          setCoverOutput(out);
          setContent(out.content);
          setStatus(out.status === "approved" ? "approved" : "draft");
        } else {
          // Prefill with company name if available
          const company = wf.listing?.company_name ?? "";
          const title = wf.listing?.title ?? "this position";
          setContent(BLANK_LETTER.replace("this position", title).replace("Hiring Team", company ? `${company} Hiring Team` : "Hiring Team"));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    const res = await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "cover_letter", content }),
    });
    if (res.ok) {
      const out = await res.json();
      setCoverOutput(out);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleApprove = async () => {
    const res = await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "cover_letter", content, status: "approved" }),
    });
    if (res.ok) setStatus("approved");
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
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      {/* Header bar */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <a href={`/jobs/${id}`} className="text-sm text-slate-500 hover:text-slate-700 flex-shrink-0">← Back</a>
            <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-slate-900 text-sm">{workflow.listing?.company_name}</span>
              <span className="text-slate-400 text-sm"> · Cover Letter</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
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
              {saved ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Save className="w-3 h-3" />}
              <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
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
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Approved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <div className={cn("flex-1 overflow-y-auto p-4 sm:p-8", chatOpen && "hidden lg:block")}>
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
                  <div className="text-slate-800 text-sm leading-loose whitespace-pre-line font-serif">{content}</div>
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
