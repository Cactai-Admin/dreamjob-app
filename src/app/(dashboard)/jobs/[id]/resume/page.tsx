"use client";

// ── Resume Builder — AI-assisted resume editing with always-visible chat ──

import { useState, useEffect, useRef, useCallback, use } from "react";
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { Sparkles, CreditCard as Edit3, Save, Trash2 } from "lucide-react";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { MarkdownDoc } from "@/components/documents/markdown-doc";
import { STATUS_OPTIONS } from "@/components/documents/doc-subheader";
import { useDocControls } from "@/components/layout/doc-controls-slot";
import { cn } from "@/lib/utils";
import type { Workflow, Output, DocumentSection, ChatMessage } from "@/lib/types";
import { deriveApplicationStatus } from "@/lib/workflow-adapter";

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
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [docLocked, setDocLocked] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [appStatus, setAppStatus] = useState("draft");
  const [confirmDel, setConfirmDel] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSections = useRef(true);
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
      const out = wf.outputs?.find(o => o.type === "resume" && o.is_current);
      if (out) {
        setSections(parseSections(out));
        setDocLocked(out.status === "approved");
        setGenerating(false);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      } else {
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

  useEffect(() => {
    if (initialSections.current) { initialSections.current = false; return; }
    if (sections.length === 0) return;
    setIsDirty(true);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await fetch(`/api/workflows/${id}/outputs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "resume", content: JSON.stringify(sections) }),
      });
      setIsDirty(false);
    }, 2000);
  }, [sections]);

  const handleManualSave = useCallback(async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setEditingId(null);
    await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "resume", content: JSON.stringify(sections) }),
    });
    setIsDirty(false);
  }, [id, sections]);

  const handleToggleLock = useCallback(async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const newLocked = !docLocked;
    await fetch(`/api/workflows/${id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "resume",
        content: JSON.stringify(sections),
        status: newLocked ? "approved" : "draft",
      }),
    });
    if (newLocked) {
      await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "draft", is_active: true }),
      });
    }
    setDocLocked(newLocked);
    setIsDirty(false);
  }, [id, sections, docLocked]);

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

  // Register controls in TopNav
  useEffect(() => {
    if (!workflow) return;
    setDocControls({
      workflowId: id,
      activeDoc: "resume",
      companyName: workflow.listing?.company_name ?? "",
      appStatus,
      isDirty,
      docLocked,
      onSave: handleManualSave,
      onToggleLock: handleToggleLock,
      onStatusChange: handleStatusChange,
      onDelete: () => setConfirmDel(true),
    });
    return () => clearDocControls();
  }, [workflow, appStatus, isDirty, docLocked, handleManualSave, handleToggleLock, handleStatusChange]);

  const updateSection = (secId: string, content: string) => {
    setSections(prev => prev.map(s => s.id === secId ? { ...s, content } : s));
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
      {/* Delete confirmation modal */}
      {confirmDel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setConfirmDel(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold text-slate-900 text-base mb-1">Delete application?</h3>
            <p className="text-sm text-slate-500 mb-5">This will move the application to Trash. You can restore it within 30 days.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <button onClick={() => setConfirmDel(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <div className={cn("flex-1 overflow-y-auto p-4 sm:p-8 doc-scroll", chatOpen && "hidden lg:block")}>
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
                        {!docLocked && (
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
                        docLocked || editingId !== section.id ? (
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
                      ) : docLocked || editingId !== section.id ? (
                        <div
                          className={cn("cursor-text", docLocked && "cursor-default")}
                          onClick={() => !docLocked && setEditingId(section.id)}
                        >
                          <MarkdownDoc content={section.content} />
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

        {/* AI panel — mobile only (hidden on desktop per request) */}
        {chatOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <AiChatPanel workflowId={id} surface="resume" initialMessages={initialMessages} onClose={() => setChatOpen(false)} className="h-full" />
          </div>
        )}

        {/* AI panel — desktop always-visible sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-[340px] lg:border-l lg:border-slate-200">
          <AiChatPanel workflowId={id} surface="resume" initialMessages={initialMessages} className="flex-1 h-full" />
        </div>
      </div>

      {/* Mobile AI button — top-right, below header */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="md:hidden fixed z-30 w-10 h-10 rounded-full bg-slate-900 text-white shadow-lg flex items-center justify-center"
        style={{ top: "72px", right: "1rem" }}
        title="AI assistant"
      >
        <Sparkles className="w-4 h-4" />
      </button>
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
