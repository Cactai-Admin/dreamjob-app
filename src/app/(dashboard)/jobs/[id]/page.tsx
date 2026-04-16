"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Plus, X } from "lucide-react";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { ReferenceSidebar } from "@/components/workflow/reference-sidebar";
import { EvidenceAlignmentReferenceView, ListingReferenceView } from "@/components/workflow/reference-views";
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

type EvidenceMatch = {
  key: string;
  source: string;
  item: string;
  matchedProfileData: string[];
  matchedWorkHistory: string[];
  customEvidence: string[];
  note: string;
  missing: boolean;
};

const PLACEHOLDER_GUIDANCE = [
  "Achievement example with clear business impact",
  "Tool or platform usage in a real project",
  "Quota/performance evidence or KPI movement",
  "Client/stakeholder scope and interaction level",
  "Ownership or leadership signal",
  "Measurable outcome (time, revenue, quality, risk)",
  "Cross-functional collaboration detail",
  "Domain/workflow exposure relevant to this role",
];

function parseResponsibilities(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\n|•|\*/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
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
  const [customEvidenceByItem, setCustomEvidenceByItem] = useState<Record<string, string[]>>({});
  const [notesByItem, setNotesByItem] = useState<Record<string, string>>({});

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

  const responsibilities = useMemo(
    () => parseResponsibilities(workflow?.listing?.responsibilities),
    [workflow?.listing?.responsibilities],
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
      ...responsibilities.map((item) => ({ source: "Responsibility", item })),
    ];

    const mapped: EvidenceMatch[] = listingItems.map(({ source, item }) => {
      const key = `${source}:${item}`;
      const matchedProfileData = profileTerms.filter((term) => hasSharedSignal(item, term)).slice(0, 4);
      const matchedWorkHistory = employmentEvidence.filter((entry) => hasSharedSignal(item, entry)).slice(0, 3);
      const customEvidence = (customEvidenceByItem[key] ?? []).map((entry) => entry.trim()).filter(Boolean);

      return {
        key,
        source,
        item,
        matchedProfileData,
        matchedWorkHistory,
        customEvidence,
        note: notesByItem[key] ?? "",
        missing: matchedProfileData.length === 0 && matchedWorkHistory.length === 0 && customEvidence.length === 0,
      };
    });

    return mapped;
  }, [requirements, responsibilities, profileTerms, employmentEvidence, customEvidenceByItem, notesByItem]);

  useEffect(() => {
    if (!workflow?.notes) return;
    try {
      const parsed = JSON.parse(workflow.notes) as {
        evidence_alignment?: Array<{ key: string; customEvidence?: string[]; note?: string }>;
      };
      const alignment = parsed?.evidence_alignment ?? [];
      if (alignment.length === 0) return;
      const evidenceDrafts: Record<string, string[]> = {};
      const notesDrafts: Record<string, string> = {};
      alignment.forEach((entry) => {
        evidenceDrafts[entry.key] = Array.isArray(entry.customEvidence) ? entry.customEvidence : [];
        notesDrafts[entry.key] = entry.note ?? "";
      });
      setCustomEvidenceByItem(evidenceDrafts);
      setNotesByItem(notesDrafts);
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
      customEvidence: entry.customEvidence,
      note: entry.note,
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
              Match listing requirements and responsibilities to stored profile and prior work evidence before generating resume and cover letter.
            </p>
          </div>

          {evidenceMap.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              No parsed requirements or responsibilities found yet. Update the listing review first, then return here.
            </div>
          ) : (
            <div className="space-y-3">
              {evidenceMap.map((entry, idx) => (
                <section key={`${entry.source}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">{entry.source}</span>
                    <p className="text-sm font-medium text-slate-900">{entry.item}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Matched profile data</p>
                      {entry.matchedProfileData.length === 0 ? (
                        <p className="text-xs text-slate-400 mt-1">No direct profile term match yet.</p>
                      ) : (
                        <ul className="mt-1 space-y-1 text-xs text-slate-600">
                          {entry.matchedProfileData.map((match) => (
                            <li key={match} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">{match}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-700">Matched work-history evidence</p>
                      {entry.matchedWorkHistory.length === 0 && entry.customEvidence.length === 0 ? (
                        <p className="text-xs text-slate-400 mt-1">No matching employment entry found yet.</p>
                      ) : (
                        <ul className="mt-1 space-y-1 text-xs text-slate-600">
                          {entry.matchedWorkHistory.map((match) => (
                            <li key={match} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">{match}</li>
                          ))}
                          {entry.customEvidence.map((match, customIdx) => (
                            <li key={`${entry.key}-custom-${customIdx}`} className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-sky-900">{match}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">Refine evidence alignment</p>
                    {(customEvidenceByItem[entry.key] ?? []).map((value, customIdx) => (
                      <div key={`${entry.key}-edit-${customIdx}`} className="flex items-center gap-2">
                        <input
                          value={value}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setCustomEvidenceByItem((prev) => ({
                              ...prev,
                              [entry.key]: (prev[entry.key] ?? []).map((item, idx) => (idx === customIdx ? nextValue : item)),
                            }));
                            setAlignmentSaved(false);
                          }}
                          className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                          placeholder="Add concrete evidence for this requirement"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCustomEvidenceByItem((prev) => ({
                              ...prev,
                              [entry.key]: (prev[entry.key] ?? []).filter((_, idx) => idx !== customIdx),
                            }));
                            setAlignmentSaved(false);
                          }}
                          className="rounded border border-slate-200 bg-white p-1 text-slate-500"
                          aria-label="Remove evidence entry"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomEvidenceByItem((prev) => ({
                          ...prev,
                          [entry.key]: [...(prev[entry.key] ?? []), ""],
                        }));
                        setAlignmentSaved(false);
                      }}
                      className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                    >
                      <Plus className="w-3 h-3" />
                      Add evidence item
                    </button>
                    <textarea
                      value={notesByItem[entry.key] ?? ""}
                      onChange={(event) => {
                        setNotesByItem((prev) => ({ ...prev, [entry.key]: event.target.value }));
                        setAlignmentSaved(false);
                      }}
                      className="w-full min-h-[68px] rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                      placeholder="Add alignment note: how this evidence supports the listing item."
                    />
                  </div>

                  {entry.missing && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-semibold text-amber-800">Evidence recovery guidance</p>
                      <ul className="mt-1 list-disc pl-4 space-y-1 text-xs text-amber-900">
                        {PLACEHOLDER_GUIDANCE.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
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
