import type { StatusEvent } from '@/types/database'
import { normalizeCanonicalListing } from '@/lib/ai/context/canonical-listing'
import {
  buildReusableFacts,
  buildRunFacts,
  detectFactConflicts,
} from '@/lib/ai/context/facts'
import { buildSharedAIContextBundle } from '@/lib/ai/context/shared-context'

interface ListingContext {
  title: string | null
  company_name: string | null
  location?: string | null
  description?: string | null
  requirements?: string | null
  responsibilities?: string | null
  experience_level?: string | null
  employment_type?: string | null
}

interface WorkflowContext {
  id: string
  state: string
  listing: ListingContext
  status_events?: StatusEvent[]
}

interface ProfileContext {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  location?: string | null
  linkedin_url?: string | null
  website_url?: string | null
  headline?: string | null
  summary?: string | null
}

interface EmploymentContext {
  title: string
  company_name: string
  start_date: string
  end_date: string | null
  description?: string | null
  achievements?: string[] | null
}

interface ProfileMemoryContext {
  type: string
  content: string
  context?: string | null
}

interface QAAnswerContext {
  question_text: string
  answer_text: string
  is_accepted?: boolean
  accepted_at?: string | null
}

export interface GenerationContextInput {
  workflow: WorkflowContext
  profile: ProfileContext | null
  employment: EmploymentContext[]
  qaAnswers: QAAnswerContext[]
  profileMemory: ProfileMemoryContext[]
}

export interface GenerationContextBundle {
  context: string
  metadata: {
    workflow_id: string
    workflow_state: string
    listing_parse_quality: 'complete' | 'partial'
    accepted_run_fact_count: number
    reusable_profile_fact_count: number
    conflict_count: number
    warnings: string[]
    precedence: string
  }
}

const PRECEDENCE_POLICY = 'run-scoped approved facts override reusable profile facts for this workflow only; reusable profile facts remain unchanged unless explicitly promoted by the user'

function hasMeaningfulListingDetails(listing: ListingContext): boolean {
  return Boolean(
    listing.description?.trim() ||
      listing.requirements?.trim() ||
      listing.responsibilities?.trim()
  )
}

function formatListingContext(listing: ListingContext): string {
  const lines = [
    `Title: ${listing.title ?? 'Unknown title'}`,
    `Company: ${listing.company_name ?? 'Unknown company'}`,
    `Location: ${listing.location ?? 'Not provided'}`,
    `Employment type: ${listing.employment_type ?? 'Not provided'}`,
    `Experience level: ${listing.experience_level ?? 'Not provided'}`,
  ]

  if (listing.description?.trim()) lines.push(`Description: ${listing.description}`)
  if (listing.requirements?.trim()) lines.push(`Requirements: ${listing.requirements}`)
  if (listing.responsibilities?.trim()) lines.push(`Responsibilities: ${listing.responsibilities}`)

  return lines.join('\n')
}

function formatProfileContext(profile: ProfileContext | null): string {
  if (!profile) return 'No global profile found.'

  const lines = [
    `Name: ${(profile.first_name ?? '').trim()} ${(profile.last_name ?? '').trim()}`.trim(),
    `Email: ${profile.email ?? 'Not provided'}`,
    `Phone: ${profile.phone ?? 'Not provided'}`,
    `Location: ${profile.location ?? 'Not provided'}`,
    `LinkedIn: ${profile.linkedin_url ?? 'Not provided'}`,
    `Website: ${profile.website_url ?? 'Not provided'}`,
  ]

  if (profile.headline?.trim()) lines.push(`Headline: ${profile.headline}`)
  if (profile.summary?.trim()) lines.push(`Summary: ${profile.summary}`)

  return lines.join('\n')
}

function formatEmploymentContext(employment: EmploymentContext[]): string {
  if (!employment.length) return 'No employment history found.'
  return employment
    .map((job) => {
      let line = `- ${job.title} at ${job.company_name} (${job.start_date}–${job.end_date || 'present'})`
      if (job.description?.trim()) line += `\n  Description: ${job.description}`
      if (job.achievements?.length) line += `\n  Achievements: ${job.achievements.join('; ')}`
      return line
    })
    .join('\n')
}

function formatAcceptedRunFacts(qaAnswers: QAAnswerContext[]): string {
  const accepted = qaAnswers.filter((qa) => qa.is_accepted !== false)
  if (!accepted.length) return 'No approved run-scoped facts captured yet.'

  return accepted
    .map((qa, index) => {
      const label = qa.question_text?.trim() || `Run fact ${index + 1}`
      return `${index + 1}. ${label}\nAnswer: ${qa.answer_text}`
    })
    .join('\n\n')
}

function formatReusableFacts(profileMemory: ProfileMemoryContext[]): string {
  if (!profileMemory.length) return 'No approved reusable profile facts available.'

  return profileMemory
    .slice(0, 40)
    .map((fact, index) => `${index + 1}. [${fact.type}] ${fact.content}${fact.context ? ` (Context: ${fact.context})` : ''}`)
    .join('\n')
}

export function buildGenerationContextBundle(input: GenerationContextInput): GenerationContextBundle {
  const hasListingDetails = hasMeaningfulListingDetails(input.workflow.listing)
  const warnings: string[] = []

  if (!hasListingDetails) {
    warnings.push('Listing parse is partial. Use editable listing fields and ask for one clarification instead of fabricating details.')
  }

  const acceptedRunFacts = buildRunFacts(input.qaAnswers).filter((fact) => fact.accepted)
  const reusableFacts = buildReusableFacts(input.profileMemory)
  const conflicts = detectFactConflicts([...acceptedRunFacts, ...reusableFacts])
  if (conflicts.length > 0) {
    warnings.push(`Detected ${conflicts.length} fact conflict(s). Prioritize explicit user confirmation.`)
  }

  const canonicalListing = normalizeCanonicalListing(input.workflow.listing as unknown as { parsed_data?: Record<string, unknown> })
  const shared = buildSharedAIContextBundle({
    workflow: {
      id: input.workflow.id,
      state: input.workflow.state,
      status_events: input.workflow.status_events ?? [],
    },
    listing: canonicalListing,
    profile: input.profile as Record<string, unknown> | null,
    employment_work_history: input.employment as unknown as Record<string, unknown>[],
    accepted_run_facts: acceptedRunFacts,
    reusable_profile_memory: reusableFacts,
    evidence_alignment: [],
    artifact_state: [],
    status_events: (input.workflow.status_events ?? []) as unknown as Record<string, unknown>[],
    conflicts,
    listing_confidence: {
      parse_quality: canonicalListing.confidence.parse_quality,
      requirement_confidence_counts: canonicalListing.exact_requirements
        .concat(canonicalListing.nice_to_haves)
        .reduce<Record<string, number>>((acc, item) => {
          acc[item.confidence] = (acc[item.confidence] ?? 0) + 1
          return acc
        }, {}),
    },
  })

  const context = [
    'FACT PRECEDENCE RULES',
    `- ${PRECEDENCE_POLICY}`,
    '',
    shared.contextText,
    '',
    'LEGACY RENDERED BLOCKS',
    'LISTING CONTEXT',
    formatListingContext(input.workflow.listing),
    '',
    'GLOBAL PROFILE (REUSABLE)',
    formatProfileContext(input.profile),
    '',
    'REUSABLE APPROVED PROFILE FACTS',
    formatReusableFacts(input.profileMemory),
    '',
    'RUN-SCOPED APPROVED FACTS (CURRENT APPLICATION ONLY)',
    formatAcceptedRunFacts(input.qaAnswers),
    '',
    'EMPLOYMENT HISTORY',
    formatEmploymentContext(input.employment),
    '',
    warnings.length ? `WARNINGS\n- ${warnings.join('\n- ')}` : 'WARNINGS\n- none',
  ].join('\n')

  return {
    context,
    metadata: {
      workflow_id: input.workflow.id,
      workflow_state: input.workflow.state,
      listing_parse_quality: hasListingDetails ? 'complete' : 'partial',
      accepted_run_fact_count: acceptedRunFacts.length,
      reusable_profile_fact_count: reusableFacts.length,
      conflict_count: conflicts.length,
      warnings,
      precedence: PRECEDENCE_POLICY,
    },
  }
}
