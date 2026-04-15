export type MemoryScopeKind =
  | 'transcript_history'
  | 'global_account_memory'
  | 'opportunity_history_memory'
  | 'run_application_memory'
  | 'trusted_promoted_memory'

export type MemorySurface =
  | 'onboarding'
  | 'stage1'
  | 'stage2'
  | 'stage3'
  | 'resume'
  | 'cover_letter'
  | 'interview'
  | 'negotiation'
  | 'support_chat'

export type TrustedMemorySource =
  | 'onboarding'
  | 'listing_review'
  | 'qa'
  | 'chat'
  | 'upload'
  | 'stage1'
  | 'stage2'
  | 'stage3'
  | 'manual'

export interface TranscriptHistoryEntry {
  id: string
  accountId: string
  workflowId: string | null
  threadId: string
  surface: MemorySurface
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
  metadata?: Record<string, unknown> | null
}

export interface GlobalAccountMemoryEntry {
  id: string
  accountId: string
  key: string
  value: string
  confidence: 'inferred' | 'user_provided' | 'user_approved'
  updatedAt: string
}

export type OpportunityDisposition =
  | 'seen'
  | 'analyzed'
  | 'applied'
  | 'discarded'
  | 'future_target'

export interface OpportunityHistoryEntry {
  id: string
  accountId: string
  workflowId: string | null
  listingId: string | null
  companyId: string | null
  fingerprint: string
  normalizedTitle: string
  normalizedCompany: string
  normalizedLocation: string
  disposition: OpportunityDisposition
  duplicateOfFingerprint: string | null
  comparisonMetadata: Record<string, unknown> | null
  lastSeenAt: string
}

export interface RunApplicationMemoryEntry {
  workflowId: string
  accountId: string
  stage1Bundle: Record<string, unknown> | null
  validationState: Record<string, unknown> | null
  positioningResult: Record<string, unknown> | null
  generatedArtifacts: Record<string, unknown> | null
  supportContinuity: Record<string, unknown> | null
  updatedAt: string
}

export interface TrustedPromotedMemoryEntry {
  id: string
  accountId: string
  key: string
  value: string
  source: TrustedMemorySource
  sourceWorkflowId: string | null
  approvedAt: string
  approvedBy: 'user' | 'system'
  promotionContext: Record<string, unknown> | null
}

export interface PromotionCandidate {
  key: string
  value: string
  source: TrustedMemorySource
  sourceWorkflowId?: string | null
  context?: Record<string, unknown> | null
}

export function promoteCandidateToTrustedMemory(
  candidate: PromotionCandidate,
  accountId: string,
  approvedBy: 'user' | 'system' = 'user',
  nowIso = new Date().toISOString()
): TrustedPromotedMemoryEntry {
  return {
    id: `${candidate.source}:${candidate.key}:${nowIso}`,
    accountId,
    key: candidate.key,
    value: candidate.value,
    source: candidate.source,
    sourceWorkflowId: candidate.sourceWorkflowId ?? null,
    approvedAt: nowIso,
    approvedBy,
    promotionContext: candidate.context ?? null,
  }
}

export function buildOpportunityFingerprint(input: {
  title: string | null | undefined
  company: string | null | undefined
  location?: string | null | undefined
}): string {
  const normalize = (value: string | null | undefined) =>
    (value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  return [normalize(input.title), normalize(input.company), normalize(input.location)]
    .filter(Boolean)
    .join('|')
}

export interface MemoryStoreContract {
  appendTranscriptHistory(entry: TranscriptHistoryEntry): Promise<void>
  upsertGlobalAccountMemory(entry: GlobalAccountMemoryEntry): Promise<void>
  upsertOpportunityHistory(entry: OpportunityHistoryEntry): Promise<void>
  upsertRunApplicationMemory(entry: RunApplicationMemoryEntry): Promise<void>
  promoteTrustedMemory(entry: TrustedPromotedMemoryEntry): Promise<void>
}
