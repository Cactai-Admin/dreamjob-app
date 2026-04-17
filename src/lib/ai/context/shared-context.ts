import type { CanonicalListingContract } from '@/lib/ai/context/canonical-listing'
import type { FactConflict, SharedFact } from '@/lib/ai/context/facts'

export interface SharedAIContextInput {
  workflow: Record<string, unknown> | null
  listing: CanonicalListingContract
  profile: Record<string, unknown> | null
  employment_work_history: Record<string, unknown>[]
  accepted_run_facts: SharedFact[]
  reusable_profile_memory: SharedFact[]
  evidence_alignment: Record<string, unknown>[]
  artifact_state: Record<string, unknown>[]
  status_events: Record<string, unknown>[]
  conflicts: FactConflict[]
  listing_confidence?: Record<string, unknown>
}

export interface SharedAIContextBundle {
  contextText: string
  contextObject: Record<string, unknown>
}

export function buildSharedAIContextBundle(input: SharedAIContextInput): SharedAIContextBundle {
  const conflictWarnings = input.conflicts.map((conflict) => conflict.warning)
  const contextObject = {
    workflow_state: input.workflow,
    listing: input.listing,
    profile: input.profile,
    employment_work_history: input.employment_work_history,
    accepted_run_facts: input.accepted_run_facts,
    reusable_profile_memory: input.reusable_profile_memory,
    evidence_alignment: input.evidence_alignment,
    artifact_state: input.artifact_state,
    status_events: input.status_events,
    conflict_warnings: conflictWarnings,
    listing_confidence: input.listing_confidence ?? null,
  }

  const contextText = [
    'SHARED_WORKFLOW_CONTEXT',
    JSON.stringify(contextObject, null, 2),
  ].join('\n')

  return { contextText, contextObject }
}
