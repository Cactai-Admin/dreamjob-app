"use client";

// ── Export Packet — Copy or download all approved documents ──

import { useState, useEffect, use } from "react";
import { notFound } from "next/navigation";
import { Copy, Download, CheckCircle2, FileText, Mail, MessageSquare, TrendingUp, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workflow, Output } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

type DocKey = "resume" | "cover_letter" | "interview_guide" | "negotiation_guide";

const DOC_CONFIG: Record<DocKey, { label: string; Icon: React.ComponentType<{ className?: string }>; color: string }> = {
  resume: { label: "Resume", Icon: FileText, color: "bg-sky-100 text-sky-600" },
  cover_letter: { label: "Cover Letter", Icon: Mail, color: "bg-emerald-100 text-emerald-600" },
  interview_guide: { label: "Interview Guide", Icon: MessageSquare, color: "bg-violet-100 text-violet-600" },
  negotiation_guide: { label: "Negotiation Guide", Icon: TrendingUp, color: "bg-amber-100 text-amber-600" },
};

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DocCard({ docKey, output, company }: { docKey: DocKey; output: Output | undefined; company: string }) {
  const [copied, setCopied] = useState(false);
  const config = DOC_CONFIG[docKey];
  const { Icon } = config;
  const filename = `${company.replace(/\s+/g, "_")}_${config.label.replace(/\s+/g, "_")}.txt`;

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("card-base p-5", !output && "opacity-60")}>
      <div className="flex items-start gap-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", config.color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="font-semibold text-slate-900">{config.label}</h3>
            {output?.status === "approved" && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Approved
              </span>
            )}
            {output && output.status !== "approved" && (
              <span className="text-xs text-slate-400 font-medium">Draft</span>
            )}
            {!output && (
              <span className="text-xs text-slate-400 font-medium">Not generated</span>
            )}
          </div>
          {output && (
            <p className="text-slate-500 text-xs mb-3 line-clamp-2">{output.content.slice(0, 140)}…</p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!output}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 disabled:opacity-40 transition-all"
            >
              {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy text"}
            </button>
            <button
              onClick={() => output && downloadText(filename, output.content)}
              disabled={!output}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 disabled:opacity-40 transition-all"
            >
              <Download className="w-3 h-3" />
              Download .txt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExportPage({ params }: Props) {
  const { id } = use(params);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    fetch(`/api/workflows/${id}`)
      .then(r => r.json())
      .then((wf: Workflow) => { if (wf?.id) setWorkflow(wf); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!workflow) return notFound();

  const outputs = workflow.outputs ?? [];
  const getOutput = (type: DocKey) => outputs.find(o => o.type === type && o.is_current);
  const company = workflow.listing?.company_name ?? "Company";
  const title = workflow.listing?.title ?? "Role";
  const hasAny = (Object.keys(DOC_CONFIG) as DocKey[]).some(k => getOutput(k));

  const handleCopyAll = async () => {
    const parts = (Object.keys(DOC_CONFIG) as DocKey[])
      .map(k => { const o = getOutput(k); return o ? `=== ${DOC_CONFIG[k].label.toUpperCase()} ===\n\n${o.content}` : null; })
      .filter(Boolean) as string[];
    if (!parts.length) return;
    await navigator.clipboard.writeText(parts.join("\n\n---\n\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadAll = () => {
    const parts = (Object.keys(DOC_CONFIG) as DocKey[])
      .map(k => { const o = getOutput(k); return o ? `=== ${DOC_CONFIG[k].label.toUpperCase()} ===\n\n${o.content}` : null; })
      .filter(Boolean) as string[];
    if (!parts.length) return;
    downloadText(`${company.replace(/\s+/g, "_")}_Application_Packet.txt`, parts.join("\n\n---\n\n"));
  };

  return (
    <div className="page-wrapper max-w-3xl">
      <div className="mb-6">
        <a href={`/jobs/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to application
        </a>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Export Packet</h1>
            <p className="text-slate-500 mt-1">{title} · {company}</p>
          </div>
          {hasAny && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 transition-all"
              >
                {copiedAll ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copiedAll ? "Copied all!" : "Copy All"}
              </button>
              <button
                onClick={handleDownloadAll}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download All
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {(Object.keys(DOC_CONFIG) as DocKey[]).map(key => (
          <DocCard key={key} docKey={key} output={getOutput(key)} company={company} />
        ))}
      </div>

      {!hasAny && (
        <div className="text-center py-16 text-slate-400">
          <Download className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No documents generated yet</p>
          <p className="text-sm mt-1">Generate your resume and other documents first</p>
          <a href={`/jobs/${id}/resume`} className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-sky-600 hover:underline">
            <FileText className="w-4 h-4" /> Start with Resume
          </a>
        </div>
      )}
    </div>
  );
}
