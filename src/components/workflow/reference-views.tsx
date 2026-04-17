"use client";

import type { Workflow } from "@/lib/types";
import { normalizeCanonicalListing } from "@/lib/ai/context/canonical-listing";

export interface EvidenceReferenceItem {
  key: string;
  source: string;
  item: string;
  matchedProfileData: string[];
  matchedWorkHistory: string[];
  customEvidence?: string[];
  note?: string;
}

export function parseResponsibilities(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\n|•|\*/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function ListingReferenceView({ workflow }: { workflow: Workflow | null }) {
  const listing = workflow?.listing;
  const canonical = normalizeCanonicalListing(listing);
  const requirements = [
    ...canonical.exact_requirements.map((item) => item.text),
    ...canonical.nice_to_haves.map((item) => item.text),
  ];
  const responsibilities = parseResponsibilities(listing?.responsibilities);

  return (
    <div className="space-y-3 text-xs text-slate-700">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
        <p className="text-sm font-semibold text-slate-900">{listing?.title ?? "Untitled role"}</p>
        <p className="text-xs text-slate-500 mt-1">{listing?.company_name ?? "Unknown company"}</p>
        {(listing?.location || listing?.salary_range) ? (
          <p className="text-[11px] text-slate-500 mt-1">
            {[listing?.location, listing?.salary_range].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>

      {listing?.description ? (
        <div className="rounded-md border border-slate-200 bg-white p-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Description</p>
          <p className="text-xs text-slate-700 whitespace-pre-wrap">{listing.description}</p>
        </div>
      ) : null}

      <div className="rounded-md border border-slate-200 bg-white p-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Requirements</p>
        {requirements.length === 0 ? (
          <p className="text-slate-400">No requirements parsed yet.</p>
        ) : (
          <ul className="space-y-1">
            {requirements.map((item, idx) => <li key={`${item}-${idx}`}>• {item}</li>)}
          </ul>
        )}
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Responsibilities</p>
        {responsibilities.length === 0 ? (
          <p className="text-slate-400">No responsibilities parsed yet.</p>
        ) : (
          <ul className="space-y-1">
            {responsibilities.map((item, idx) => <li key={`${item}-${idx}`}>• {item}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

export function EvidenceAlignmentReferenceView({
  evidence,
  emptyMessage = "No alignment items yet.",
}: {
  evidence: EvidenceReferenceItem[];
  emptyMessage?: string;
}) {
  if (evidence.length === 0) {
    return <p className="text-xs text-slate-400">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2 text-xs">
      {evidence.map((entry) => (
        <div key={entry.key} className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <p className="text-[10px] uppercase tracking-wide text-sky-700 font-semibold">{entry.source}</p>
          <p className="font-medium text-slate-900 mt-0.5">{entry.item}</p>
          <p className="text-[11px] text-slate-500 mt-1">Evidence</p>
          <ul className="space-y-1 mt-1 text-slate-700">
            {[...entry.matchedProfileData, ...entry.matchedWorkHistory, ...(entry.customEvidence ?? [])]
              .filter(Boolean)
              .slice(0, 5)
              .map((item, idx) => (
                <li key={`${entry.key}-${idx}`} className="rounded border border-slate-200 bg-white px-2 py-1">{item}</li>
              ))}
          </ul>
          {entry.note ? <p className="mt-1 text-[11px] text-slate-600">{entry.note}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function ResumeReferenceView({ content }: { content: string }) {
  let rendered = content;
  try {
    const parsed = JSON.parse(content) as Array<{ title?: string; content?: string }>;
    if (Array.isArray(parsed)) {
      rendered = parsed
        .map((section) => `${section.title ?? "Section"}\n${section.content ?? ""}`)
        .join("\n\n");
    }
  } catch {
    // content is likely plain markdown/text
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      {rendered ? (
        <pre className="whitespace-pre-wrap text-xs text-slate-700 font-sans">{rendered}</pre>
      ) : (
        <p className="text-xs text-slate-400">No saved resume yet.</p>
      )}
    </div>
  );
}
