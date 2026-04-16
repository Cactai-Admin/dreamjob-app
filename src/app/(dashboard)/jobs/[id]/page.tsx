"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { ReferenceSidebar } from "@/components/workflow/reference-sidebar";
import { EvidenceAlignmentReferenceView, ListingReferenceView, type EvidenceReferenceItem } from "@/components/workflow/reference-views";
import type { Workflow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { parseRequirements } from "@/lib/listing-match";

interface Props {
  params: Promise<{ id: string }>;
}

interface EmploymentRecord {
  company?: string;
  title?: string;
  responsibilities?: string[];
  achievements?: string[];
  technologies?: string[];
  tools?: string[];
}

type EvidenceMatch = EvidenceReferenceItem & {
  extractedEvidence: string;
  customEvidenceText: string;
  evidenceValue: string;
  missing: boolean;
};

function parseStructuredItems(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0 && entry.length <= 220);
  }
  if (typeof raw !== "string") return [];
  return raw
    .split(/\n|•|\*|;/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry.length <= 220);
}

function splitTerms(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);
}

function hasSharedSignal(item: string, candidate: string): boolean {
  const itemTerms = splitTerms(item);
  if (itemTerms.length === 0) return false;
  const candidateLower = candidate.toLowerCase();
  return itemTerms.some((term) => candidateLower.includes(term));
}

function cleanEvidence(entry: string): string {
  const trimmed = entry.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 180) return trimmed;
  return `${trimmed.slice(0, 177).trimEnd()}…`;
}

function deriveNiceToHaves(parsedData: unknown): string[] {
  if (!parsedData || typeof parsedData !== "object") return [];
  const parsed = parsedData as Record<string, unknown>;
  const fromPreferred = parseStructuredItems(parsed.preferred_qualifications);
  const fromNiceToHave = parseStructuredItems(parsed.nice_to_haves);
  const fromNiceToHaves = parseStructuredItems(parsed.nice_to_have);
  return [...new Set([...fromPreferred, ...fromNiceToHave, ...fromNiceToHaves])];
}

export default function WorkHistoryPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [profileTerms, setProfileTerms] = useState<string[]>([]);
  const [employment, setEmployment] = useState<EmploymentRecord[]>([]);
  const [alignmentSaving, setAlignmentSaving] = useState(false);
  const [alignmentSaved, setAlignmentSaved] = useState(false);
  const [customEvidenceByItem, setCustomEvidenceByItem] = useState<Record<string, string>>({});
  const [editingEvidenceKey, setEditingEvidenceKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/workflows/${id}`).then((res) => res.json()),
      fetch("/api/profile").then((res) => res.json()),
      fetch("/api/profile/employment").then((res) => res.json()),
    ])
      .then(([wf, profile, employmentHistory]) => {
        if (!wf?.id) {
          setLoading(false);
          return;
        }

        if (wf.state === "listing_review") {
          router.replace(`/listings/${id}`);
          return;
        }

        setWorkflow(wf as Workflow);

        const terms = [
          ...(Array.isArray(profile?.skills) ? profile.skills : []),
          ...(Array.isArray(profile?.keywords) ? profile.keywords : []),
          ...(Array.isArray(profile?.tools) ? profile.tools : []),
          ...(Array.isArray(profile?.certifications) ? profile.certifications : []),
          ...(Array.isArray(profile?.clearances) ? profile.clearances : []),
        ].filter((term): term is string => typeof term === "string" && term.trim().length > 0);

        setProfileTerms(terms);
        setEmployment(Array.isArray(employmentHistory) ? employmentHistory : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, router]);

  const requirements = useMemo(
    () => parseRequirements(workflow?.listing?.requirements),
    [workflow?.listing?.requirements],
  );

  const niceToHaves = useMemo(
    () => deriveNiceToHaves(workflow?.listing?.parsed_data),
    [workflow?.listing?.parsed_data],
  );

  const employmentEvidence = useMemo(() => {
    return employment.flatMap((record) => {
      const buckets = [
        ...(Array.isArray(record.responsibilities) ? record.responsibilities : []),
        ...(Array.isArray(record.achievements) ? record.achievements : []),
        ...(Array.isArray(record.technologies) ? record.technologies : []),
        ...(Array.isArray(record.tools) ? record.tools : []),
      ];
      return buckets
        .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        .map((entry) => `${record.title ?? "Role"} @ ${record.company ?? "Company"}: ${entry}`);
    });
  }, [employment]);

  const evidenceMap = useMemo(() => {
    const listingItems = [
      ...requirements.map((item) => ({ source: "Requirement", item })),
      ...niceToHaves.map((item) => ({ source: "Nice to have", item })),
    ];

    const mapped: EvidenceMatch[] = listingItems.map(({ source, item }) => {
      const key = `${source}:${item}`;
      const matchedProfileData = profileTerms.filter((term) => hasSharedSignal(item, term)).slice(0, 4);
      const matchedWorkHistory = employmentEvidence.filter((entry) => hasSharedSignal(item, entry)).slice(0, 3);
      const customEvidenceText = (customEvidenceByItem[key] ?? "").trim();
      const extractedEvidence = cleanEvidence(
        matchedWorkHistory[0]
          ?? matchedProfileData[0]
          ?? ""
      );
      const evidenceValue = customEvidenceText || extractedEvidence;

      return {
        key,
        source,
        item,
        matchedProfileData,
        matchedWorkHistory,
        customEvidence: customEvidenceText ? [customEvidenceText] : [],
        extractedEvidence,
        customEvidenceText,
        evidenceValue,
        missing: evidenceValue.length === 0,
      };
    });

    return mapped;
  }, [requirements, niceToHaves, profileTerms, employmentEvidence, customEvidenceByItem]);

  useEffect(() => {
    if (!workflow?.notes) return;
    try {
      const parsed = JSON.parse(workflow.notes) as {
        evidence_alignment?: Array<{ key: string; customEvidence?: string[] | string }>;
      };
      const alignment = parsed?.evidence_alignment ?? [];
      if (alignment.length === 0) return;
      const evidenceDrafts: Record<string, string> = {};
      alignment.forEach((entry) => {
        if (Array.isArray(entry.customEvidence)) {
          evidenceDrafts[entry.key] = (entry.customEvidence[0] ?? "").trim();
        } else {
          evidenceDrafts[entry.key] = (entry.customEvidence ?? "").trim();
        }
      });
      setCustomEvidenceByItem(evidenceDrafts);
    } catch {
      // legacy notes format
    }
  }, [workflow?.notes]);

  const saveAlignment = async () => {
    if (!workflow) return;
    setAlignmentSaving(true);
    setAlignmentSaved(false);
    const evidenceAlignment = evidenceMap.map((entry) => ({
      key: entry.key,
      source: entry.source,
      item: entry.item,
      matchedProfileData: entry.matchedProfileData,
      matchedWorkHistory: entry.matchedWorkHistory,
      customEvidence: entry.customEvidence ?? [],
      missing: entry.missing,
    }));
    const nextNotes = JSON.stringify({ evidence_alignment: evidenceAlignment });
    const wf = await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: nextNotes }),
    }).then((res) => res.json());
    if (wf?.id) setWorkflow(wf as Workflow);
    setAlignmentSaving(false);
    setAlignmentSaved(true);
  };

  const continueToResume = async () => {
    await saveAlignment();
    router.push(`/jobs/${id}/resume`);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!workflow) {
    return <div className="page-wrapper text-sm text-slate-500">Run not found.</div>;
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-slate-100">
      <ReferenceSidebar
        title="Work history references"
        defaultTab="listing"
        tabs={[
          {
            value: "listing",
            label: "Listing",
            content: <ListingReferenceView workflow={workflow} />,
          },
          {
            value: "evidence-alignment",
            label: "Evidence Alignment",
            content: <EvidenceAlignmentReferenceView evidence={evidenceMap} emptyMessage="No evidence alignment items yet." />,
          },
        ]}
        footerNote="Reference-only context for listing and alignment."
      />

      <main className={cn("flex-1 overflow-y-auto p-4 sm:p-6", chatOpen && "hidden md:block")}>
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h1 className="text-xl font-bold text-slate-900">Work History Evidence Alignment</h1>
            <p className="mt-1 text-sm text-slate-600">
              Match listing requirements and nice-to-haves to concise evidence before generating resume and cover letter.
            </p>
          </div>

          {evidenceMap.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              No parsed requirements or nice-to-haves found yet. Update the listing review first, then return here.
            </div>
          ) : (
            <div className="space-y-3">
              {evidenceMap.map((entry, idx) => (
                <section key={`${entry.source}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">{entry.source}</span>
                    <p className="text-sm font-medium text-slate-900">{entry.item}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 items-start">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Evidence</p>
                      {!entry.missing ? (
                        <p className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                          {entry.evidenceValue}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingEvidenceKey(entry.key)}
                          className="mt-1 rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-left text-xs text-slate-500 hover:border-sky-300 hover:text-sky-700"
                        >
                          Click to add evidence for this item
                        </button>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Refine evidence</p>
                      {editingEvidenceKey === entry.key ? (
                        <input
                          value={customEvidenceByItem[entry.key] ?? ""}
                          onChange={(event) => {
                            setCustomEvidenceByItem((prev) => ({ ...prev, [entry.key]: event.target.value }));
                            setAlignmentSaved(false);
                          }}
                          onBlur={() => setEditingEvidenceKey(null)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              setEditingEvidenceKey(null);
                            }
                          }}
                          autoFocus
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                          placeholder="Add concise evidence for this listing item"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingEvidenceKey(entry.key)}
                          className="mt-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:border-sky-300 hover:text-sky-700"
                        >
                          {entry.customEvidenceText ? "Edit entered evidence" : "Enter evidence inline"}
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={saveAlignment}
              disabled={alignmentSaving}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white disabled:opacity-50"
            >
              {alignmentSaving ? "Saving..." : alignmentSaved ? "Saved" : "Save alignment"}
            </button>
            <button
              onClick={continueToResume}
              className="btn-ocean px-4 py-2 rounded-lg text-white inline-flex items-center gap-2"
              disabled={alignmentSaving}
            >
              Continue to Resume <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      <div className="hidden lg:flex lg:w-[360px] lg:min-w-0 lg:border-l lg:border-slate-200">
        <AiChatPanel workflowId={id} surface="work_history" className="flex-1 h-full" />
      </div>

      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="md:hidden fixed z-30 btn-ocean w-10 h-10 rounded-full text-white shadow-lg flex items-center justify-center"
        style={{ top: "calc(var(--mobile-nav-height, 88px) + 6px)", right: "1rem" }}
      >
        AI
      </button>
      {chatOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <AiChatPanel workflowId={id} surface="work_history" onClose={() => setChatOpen(false)} className="h-full" />
        </div>
      )}
    </div>
  );
}
