// ── workflow-adapter.ts ──────────────────────────────────────
// Maps real API Workflow objects to the Bolt Job UI type.

import type { Workflow, Output, StatusEvent, Job, ApplicationStatus, DocumentStatus } from './types'

export function deriveApplicationStatus(
  state: string,
  events: StatusEvent[] = []
): ApplicationStatus {
  const types = events.map((e) => e.event_type)
  if (types.includes('hired')) return 'hired'
  if (types.includes('rejected')) return 'rejected'
  if (types.includes('withdrawn')) return 'withdrawn'
  if (types.includes('offer_received')) return 'offer'
  if (types.some((t) => t.startsWith('interview'))) return 'interviewing'
  if (types.includes('submitted') || state === 'sent' || state === 'completed') return 'applied'
  return 'draft'
}

export function deriveDocumentStatus(outputs: Output[] = [], type: string): DocumentStatus {
  const out = outputs.find((o) => o.type === type && o.is_current)
  if (!out) return 'not_started'
  if (out.status === 'approved') return 'approved'
  return 'draft'
}

export function workflowToJob(w: Workflow): Job {
  return {
    id: w.id,
    title: w.listing?.title ?? w.title,
    company: w.listing?.company_name ?? w.company?.name ?? 'Unknown',
    companyLogo: w.company?.logo_url,
    location: w.listing?.location ?? '',
    locationType: 'onsite',
    type: 'full-time',
    salary: w.listing?.salary_range,
    description: w.listing?.description ?? '',
    requirements: w.listing?.requirements ?? [],
    benefits: [],
    url: w.listing?.source_url ?? undefined,
    status: deriveApplicationStatus(w.state, w.status_events),
    resumeStatus: deriveDocumentStatus(w.outputs, 'resume'),
    coverLetterStatus: deriveDocumentStatus(w.outputs, 'cover_letter'),
    connections: [],
    tags: [],
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  }
}
