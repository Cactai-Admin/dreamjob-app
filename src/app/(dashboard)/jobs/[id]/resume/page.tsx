"use client";

// ── Resume Builder — AI-assisted resume editing with chat panel ──

import { useState, useEffect, use } from "react";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { DocumentEditor } from "@/components/documents/document-editor";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { cn } from "@/lib/utils";
import type { Workflow, Output, DocumentSection } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

function parseSections(output: Output | undefined): DocumentSection[] {
  if (!output) return [];
  try {
    const parsed = JSON.parse(output.content);
    if (Array.isArray(parsed)) return parsed;
    // If it's a plain string, wrap it in one section
    return [{ id: "main", title: "Resume", content: output.content }];
  } catch {
    return [{ id: "main", title: "Resume", content: output.content }];
  }
}

export default function ResumeBuilderPage({ params }: Props) {
  const { id } = use(params);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [resumeOutput, setResumeOutput] = useState<Output | undefined>(undefined);
  const [chatOpen, setChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/workflows/${id}`)
      .then(r => r.json())
      .then((wf: Workflow) => {
        if (!wf?.id) { setLoading(false); return; }
        setWorkflow(wf);
        const out = wf.outputs?.find(o => o.type === "resume" && o.is_current);
        setResumeOutput(out);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSave = async (sections: DocumentSection[]) => {
    await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "resume", content: JSON.stringify(sections) }),
    });
  };

  const handleApprove = async () => {
    if (!resumeOutput) return;
    await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "resume", content: resumeOutput.content, status: "approved" }),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!workflow) return notFound();

  const sections = parseSections(resumeOutput);
  const docStatus = resumeOutput?.status === "approved" ? "approved" : resumeOutput ? "draft" : "not_started";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      {/* Header bar */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href={`/jobs/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
              ← Back
            </a>
            <div className="w-px h-4 bg-slate-200" />
            <div>
              <span className="font-semibold text-slate-900 text-sm">{workflow.listing?.company_name}</span>
              <span className="text-slate-400 text-sm"> · Resume</span>
            </div>
          </div>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={cn(
              "flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl border transition-all",
              chatOpen ? "bg-sky-50 text-sky-700 border-sky-300" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Assistant</span>
            <span className="sm:hidden">AI</span>
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <div className={cn("flex flex-col transition-all duration-300", chatOpen ? "hidden lg:flex lg:flex-1" : "flex-1")}>
          <DocumentEditor
            sections={sections}
            status={docStatus as any}
            title={`Resume — ${workflow.listing?.title} at ${workflow.listing?.company_name}`}
            onSave={handleSave}
            onApprove={handleApprove}
          />
        </div>

        {chatOpen && (
          <div className={cn("flex flex-col", "lg:w-[380px] lg:border-l lg:border-slate-200", "fixed inset-0 z-50 lg:relative lg:inset-auto")}>
            <AiChatPanel workflowId={id} surface="resume" onClose={() => setChatOpen(false)} className="flex-1 h-full" />
          </div>
        )}

        {!chatOpen && (
          <div className="hidden lg:flex lg:flex-col lg:w-[340px] lg:border-l lg:border-slate-200">
            <AiChatPanel workflowId={id} surface="resume" className="flex-1 h-full" />
          </div>
        )}
      </div>
    </div>
  );
}
