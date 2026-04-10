"use client";

// ── DocumentEditor — Editable document with section management ──

import { useState } from "react";
import { CircleCheck as CheckCircle2, CreditCard as Edit3, Eye, Save } from "lucide-react";
import type { DocumentSection, DocumentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  sections: DocumentSection[];
  status: DocumentStatus;
  onApprove?: () => void;
  onSave?: (sections: DocumentSection[]) => void;
  title?: string;
}

export function DocumentEditor({ sections: initialSections, status, onApprove, onSave, title = "Document" }: Props) {
  const [sections, setSections] = useState(initialSections);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [docStatus, setDocStatus] = useState(status);
  const [saved, setSaved] = useState(false);

  const updateSection = (id: string, content: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, content } : s))
    );
  };

  const handleSave = () => {
    setEditingId(null);
    setSaved(true);
    onSave?.(sections);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleApprove = () => {
    setDocStatus("approved");
    onApprove?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">{title}</span>
          {saved && (
            <span className="text-xs text-emerald-600 flex items-center gap-1 animate-fade-in">
              <CheckCircle2 className="w-3 h-3" /> Saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Preview toggle */}
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all",
              previewMode
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}
          >
            {previewMode ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {previewMode ? "Edit" : "Preview"}
          </button>

          {/* Approve button */}
          {docStatus !== "approved" ? (
            <button
              onClick={handleApprove}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" />
              Approve
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3 h-3" />
              Approved
            </span>
          )}
        </div>
      </div>

      {/* Document content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
        <div className="max-w-2xl mx-auto document-paper overflow-hidden">
          {sections.map((section, idx) => (
            <div
              key={section.id}
              className={cn(
                "group",
                idx < sections.length - 1 && "border-b border-slate-100"
              )}
            >
              {/* Section header */}
              {section.id !== "sec-header" && (
                <div className="px-6 sm:px-8 pt-5 pb-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      {section.title}
                    </h3>
                    {!previewMode && (
                      <button
                        onClick={() => setEditingId(editingId === section.id ? null : section.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-sky-600 flex items-center gap-1 hover:underline"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Section content */}
              <div className={cn(
                "px-6 sm:px-8",
                section.id === "sec-header" ? "pt-8 pb-4" : "pb-5"
              )}>
                {section.id === "sec-header" ? (
                  /* Header section — name/contact styled specially */
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
                    <EditableArea section={section} onUpdate={updateSection} onSave={handleSave} />
                  )
                ) : previewMode || editingId !== section.id ? (
                  <div
                    className="text-slate-700 text-sm leading-relaxed whitespace-pre-line cursor-text"
                    onClick={() => !previewMode && setEditingId(section.id)}
                  >
                    {section.content}
                  </div>
                ) : (
                  <EditableArea section={section} onUpdate={updateSection} onSave={handleSave} />
                )}
              </div>
            </div>
          ))}

          {/* Page padding */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}

/* ── EditableArea subcomponent ─────────────────────────── */
function EditableArea({
  section,
  onUpdate,
  onSave,
}: {
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
          <Save className="w-3 h-3" />
          Save changes
        </button>
      </div>
    </div>
  );
}
