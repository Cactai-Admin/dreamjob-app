// ── workflow-adapter.ts ──────────────────────────────────────
// Maps real API Workflow objects to the Bolt Job UI type.

import type { Workflow, Output, StatusEvent, Job, ApplicationStatus, DocumentStatus } from './types'

export function deriveApplicationStatus(
  state: string,
  events: StatusEvent[] = []
): ApplicationStatus {
  const types = events.map((e) => e.event_type)
  if (types.includes('hired'))       return 'hired'
  if (types.includes('declined'))    return 'declined'
  if (types.includes('rejected'))    return 'rejected'
  if (types.includes('ghosted'))     return 'ghosted'
  if (types.includes('negotiation')) return 'negotiating'
  if (types.includes('offer'))       return 'offer'
  if (types.includes('interview'))   return 'interviewing'
  if (types.includes('received'))    return 'received'
  if (types.includes('sent') || state === 'sent' || state === 'completed') return 'applied'
  return 'ready'
}

export function deriveAllStatuses(
  state: string,
  events: StatusEvent[] = []
): ApplicationStatus[] {
  const types = events.map((e) => e.event_type)
  const statuses: ApplicationStatus[] = []
  if (types.includes('ready')) statuses.push('ready')
  if (types.includes('sent') || state === 'sent' || state === 'completed') statuses.push('applied')
  if (types.includes('received'))    statuses.push('received')
  if (types.includes('interview'))   statuses.push('interviewing')
  if (types.includes('offer'))       statuses.push('offer')
  if (types.includes('negotiation')) statuses.push('negotiating')
  if (types.includes('hired'))       statuses.push('hired')
  if (types.includes('declined'))    statuses.push('declined')
  if (types.includes('ghosted'))     statuses.push('ghosted')
  if (types.includes('rejected'))    statuses.push('rejected')
  return statuses
}

export function deriveDocumentStatus(outputs: Output[] = [], type: string): DocumentStatus {
  const out = outputs.find((o) => o.type === type && o.is_current)
  if (!out) return 'not_started'
  if (out.status === 'approved') return 'approved'
  return 'draft'
}

function toArray(val: unknown): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val as string[]
  if (typeof val === 'string') {
    const trimmed = val.trim()
    // JSON array string: ["req1","req2"]
    if (trimmed.startsWith('[')) {
      try { return JSON.parse(trimmed) } catch { /* fall through */ }
    }
    // Postgres array string: {req1,req2}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean)
    }
    // Newline-separated
    if (trimmed.includes('\n')) {
      return trimmed.split('\n').map(s => s.trim()).filter(Boolean)
    }
    return trimmed ? [trimmed] : []
  }
  return []
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
    requirements: toArray(w.listing?.requirements),
    benefits: [],
    url: w.listing?.source_url ?? undefined,
    status: deriveApplicationStatus(w.state, w.status_events),
    resumeStatus: deriveDocumentStatus(w.outputs, 'resume'),
    coverLetterStatus: deriveDocumentStatus(w.outputs, 'cover_letter'),
    interviewGuideStatus: deriveDocumentStatus(w.outputs, 'interview_guide'),
    negotiationGuideStatus: deriveDocumentStatus(w.outputs, 'negotiation_guide'),
    connections: [],
    tags: [],
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  }
}
