export interface SharedAIContext {
  workflow: Record<string, unknown> | null
  listing: Record<string, unknown> | null
  profile: Record<string, unknown> | null
  employmentHistory: Record<string, unknown>[]
  runFacts: Record<string, unknown>[]
  reusableFacts: Record<string, unknown>[]
  outputs: Record<string, unknown>[]
  statusEvents: Record<string, unknown>[]
  evidenceAlignment: Record<string, unknown>[]
  conflicts: string[]
}

export function buildSharedAIContext(params: SharedAIContext): string {
  const sections = [
    ['WORKFLOW', params.workflow],
    ['LISTING', params.listing],
    ['PROFILE', params.profile],
    ['EMPLOYMENT_HISTORY', params.employmentHistory],
    ['RUN_FACTS', params.runFacts],
    ['REUSABLE_FACTS', params.reusableFacts],
    ['OUTPUTS', params.outputs],
    ['STATUS_EVENTS', params.statusEvents],
    ['EVIDENCE_ALIGNMENT', params.evidenceAlignment],
    ['CONFLICTS', params.conflicts],
  ] as const

  return sections
    .map(([label, value]) => `## ${label}\n${JSON.stringify(value ?? null, null, 2)}`)
    .join('\n\n')
}

export function detectSimpleConflicts(values: Array<{ field: string; values: string[] }>): string[] {
  return values
    .filter((item) => new Set(item.values.filter(Boolean)).size > 1)
    .map((item) => `Conflicting values detected for ${item.field}: ${item.values.join(' | ')}`)
}
