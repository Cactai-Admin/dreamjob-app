"use client";

// ── Resume Builder — AI-assisted resume editing with always-visible chat ──

import { useState, useEffect, useRef, use } from "react";
import { notFound } from "next/navigation";
import { Sparkles, FileText, Mail, Eye, CreditCard as Edit3, Save, CircleCheck as CheckCircle2, MessageSquare, TrendingUp, Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { cn } from "@/lib/utils";
import type { Workflow, Output, DocumentSection, ChatMessage } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

function parseSections(output: Output | undefined): DocumentSection[] {
  if (!output) return [];
  try {
    const parsed = JSON.parse(output.content);
    if (Array.isArray(parsed)) return parsed as DocumentSection[];
    return [{ id: "main", title: "Resume", content: output.content }];
  } catch {
    return [{ id: "main", title: "Resume", content: output.content }];
  }
}

function GeneratingState({ title, company }: { title: string; company: string }) {
  const steps = [
    "Analyzing job requirements",
    "Matching your experience",
    "Drafting tailored sections",
    "Polishing language",
  ];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-8">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mb-6">
        <Sparkles className="w-8 h-8 text-white animate-pulse" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-1 text-center">Building your resume…</h2>
      <p className="text-slate-500 text-sm mb-8 text-center max-w-xs">
        Tailoring it for <span className="font-medium">{title}</span> at <span className="font-medium">{company}</span>
      </p>
      <div className="space-y-3 w-full max-w-xs">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3 text-sm">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              i < step ? "bg-emerald-500" : i === step ? "bg-sky-500 animate-pulse" : "bg-slate-200"
            }`}>
              {i < step && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span className={i <= step ? "text-slate-700" : "text-slate-300"}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResumeBuilderPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [resumeOutput, setResumeOutput] = useState<Output | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [docStatus, setDocStatus] = useState<"draft" | "approved">("draft");
  const [saved, setSaved] = useState(false);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSections = useRef(true);

  const fetchWorkflow = async () => {
    try {
      const wf: Workflow = await fetch(`/api/workflows/${id}`).then(r => r.json());
      if (!wf?.id) { setLoading(false); return; }
      // Ensure state is transitioned to draft if still in listing_review
      if (wf.state === "listing_review") {
        fetch(`/api/workflows/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: "draft", is_active: true }),
        });
      }
      setWorkflow(wf);
      const out = wf.outputs?.find(o => o.type === "resume" && o.is_current);
      if (out) {
        setResumeOutput(out);
        setSections(parseSections(out));
        setDocStatus(out.status === "approved" ? "approved" : "draft");
        setGenerating(false);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      } else {
        // Fire generation if not already in progress
        if (!generating) {
          setGenerating(true);
          let provider: string | undefined;
          try { const s = JSON.parse(localStorage.getItem("dreamjob_settings") ?? "{}"); if (s.aiProvider) provider = s.aiProvider; } catch { /* ignore */ }
          fetch("/api/ai/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workflow_id: id, output_type: "resume", provider }),
          });
        }
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

  // Auto-save 2s after any section edit
  useEffect(() => {
    if (initialSections.current) { initialSections.current = false; return; }
    if (sections.length === 0) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await fetch(`/api/workflows/${id}/outputs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "resume", content: JSON.stringify(sections) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 2000);
  }, [sections]);

  const updateSection = (secId: string, content: string) => {
    setSections(prev => prev.map(s => s.id === secId ? { ...s, content } : s));
  };

  const handleManualSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setEditingId(null);
    await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "resume", content: JSON.stringify(sections) }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleApprove = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "resume", content: JSON.stringify(sections), status: "approved" }),
    });
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "draft", is_active: true }),
    });
    setDocStatus("approved");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async () => {
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    router.push("/jobs");
  };

  const handleUnapprove = async () => {
    await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "resume", content: JSON.stringify(sections), status: "draft" }),
    });
    setDocStatus("draft");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!workflow) return notFound();

  const jobTitle = workflow.listing?.title ?? "this role";
  const company = workflow.listing?.company_name ?? "the company";

  const initialMessages: ChatMessage[] = [
    {
      id: "greeting",
      role: "assistant",
      content: generating
        ? `Hi! I'm building your resume for the **${jobTitle}** role at **${company}** right now. While you wait, tell me — what's the project or accomplishment you're most proud of that relates to this job? I'll weave it into the draft.`
        : `Hi! I've generated your resume draft for **${jobTitle}** at **${company}**. It's pre-filled with your profile information and tailored to the job requirements. What would you like to refine first?`,
      timestamp: new Date().toISOString(),
      suggestions: generating
        ? ["I'll wait for the draft", "Let me describe my top project"]
        : ["Strengthen the summary", "Improve experience bullets", "Adjust skills section", "Change the tone"],
    },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-100">
      {/* Header — matches cover letter layout */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left: back + company + doc toggle */}
          <div className="flex items-center gap-3 min-w-0">
            <a href={`/jobs/${id}`} className="text-sm text-slate-500 hover:text-slate-700 flex-shrink-0">← Back</a>
            <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
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
            <span className="font-semibold text-slate-900 text-sm truncate">{company}</span>
            {generating && (
              <span className="flex-shrink-0 flex items-center gap-1 text-xs text-sky-600 font-medium">
                <Sparkles className="w-3 h-3 animate-pulse" /> Generating…
              </span>
            )}
            {/* Doc type toggle — all 4 docs */}
            <div className="flex items-center gap-0.5 p-1 bg-slate-100 rounded-lg ml-1 flex-shrink-0">
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white text-slate-900 shadow-sm">
                <FileText className="w-3 h-3" /><span className="hidden sm:inline">Resume</span>
              </button>
              <button onClick={() => router.push(`/jobs/${id}/cover-letter`)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
                <Mail className="w-3 h-3" /><span className="hidden sm:inline">Cover Letter</span>
              </button>
              <button onClick={() => router.push(`/jobs/${id}/interview-guide`)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
                <MessageSquare className="w-3 h-3" /><span className="hidden sm:inline">Interview</span>
              </button>
              <button onClick={() => router.push(`/jobs/${id}/negotiation-guide`)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
                <TrendingUp className="w-3 h-3" /><span className="hidden sm:inline">Negotiation</span>
              </button>
            </div>
          </div>

          {/* Right: actions — identical pattern to cover letter */}
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
              onClick={handleManualSave}
              disabled={generating}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-slate-300 transition-all disabled:opacity-40"
            >
              {saved ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Save className="w-3 h-3" />}
              <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
            </button>

            {docStatus !== "approved" ? (
              <button
                onClick={handleApprove}
                disabled={generating}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40"
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
              onClick={() => router.push(`/jobs/${id}/export`)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <div className={cn("flex-1 overflow-y-auto p-4 sm:p-8", chatOpen && "hidden lg:block")}>
          {generating ? (
            <GeneratingState title={jobTitle} company={company} />
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="document-paper overflow-hidden">
                {sections.map((section, idx) => (
                  <div
                    key={section.id}
                    className={cn("group", idx < sections.length - 1 && "border-b border-slate-100")}
                  >
                    {section.id !== "sec-header" && (
                      <div className="px-6 sm:px-8 pt-5 pb-1 flex items-center justify-between">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                          {section.title}
                        </h3>
                        {!previewMode && (
                          <button
                            onClick={() => setEditingId(editingId === section.id ? null : section.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-sky-600 flex items-center gap-1 hover:underline"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                        )}
                      </div>
                    )}
                    <div className={cn("px-6 sm:px-8", section.id === "sec-header" ? "pt-8 pb-4" : "pb-5")}>
                      {section.id === "sec-header" ? (
                        previewMode || editingId !== section.id ? (
                          <div>
                            <div className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
                              {section.content.split("\n")[0]}
                            </div>
                            <div className="text-slate-500 text-sm">
                              {section.content.split("\n").slice(1).join(" · ")}
                            </div>
                          </div>
                        ) : (
                          <SectionEditor section={section} onUpdate={updateSection} onSave={handleManualSave} />
                        )
                      ) : previewMode || editingId !== section.id ? (
                        <div
                          className="text-slate-700 text-sm leading-relaxed whitespace-pre-line cursor-text"
                          onClick={() => !previewMode && setEditingId(section.id)}
                        >
                          {section.content}
                        </div>
                      ) : (
                        <SectionEditor section={section} onUpdate={updateSection} onSave={handleManualSave} />
                      )}
                    </div>
                  </div>
                ))}
                <div className="h-8" />
              </div>
            </div>
          )}
        </div>

        {chatOpen && (
          <div className="lg:w-[380px] lg:flex-shrink-0 fixed inset-0 z-50 lg:relative lg:inset-auto">
            <AiChatPanel workflowId={id} surface="resume" initialMessages={initialMessages} onClose={() => setChatOpen(false)} className="h-full" />
          </div>
        )}

        {!chatOpen && (
          <div className="hidden lg:flex lg:flex-col lg:w-[340px] lg:border-l lg:border-slate-200">
            <AiChatPanel workflowId={id} surface="resume" initialMessages={initialMessages} className="flex-1 h-full" />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionEditor({ section, onUpdate, onSave }: {
  section: DocumentSection;
  onUpdate: (id: string, content: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="relative">
      <textarea
        autoFocus
        value={section.content}
        onChange={(e) => onUpdate(section.id, e.target.value)}
        className="w-full text-slate-800 text-sm leading-relaxed bg-sky-50 border border-sky-300 rounded-lg p-3 outline-none resize-none focus:ring-2 focus:ring-sky-200 transition-all"
        rows={Math.max(4, section.content.split("\n").length + 1)}
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 text-xs bg-sky-600 text-white px-3 py-1.5 rounded-lg hover:bg-sky-700 transition-colors"
        >
          <Save className="w-3 h-3" /> Save changes
        </button>
      </div>
    </div>
  );
}
