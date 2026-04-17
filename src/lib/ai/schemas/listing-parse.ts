import { z } from 'zod'

export type ParseConfidence = 'high' | 'medium' | 'low'
export type RequirementPriority = 'essential' | 'important' | 'secondary' | 'suppressible'
export type RequirementSurfaceDecision = 'show' | 'suppress'
export type RequirementDownstreamUse = 'resume' | 'cover_letter' | 'interview' | 'negotiation'

export interface ParsedListingJobContext {
  industry: string | null
  offering_type: string | null
  offering_detail: string | null
  department: string | null
  team: string | null
  title_role: string | null
  job_family: string | null
  buyer_or_user_context: string | null
  operating_motion: string | null
  context_confidence: ParseConfidence
}

export interface ParsedListingContentBuckets {
  role_summary: string[]
  responsibilities: string[]
  exact_requirements: string[]
  nice_to_haves: string[]
  compensation: string[]
  location_work_mode: string[]
  benefits: string[]
  company_context: string[]
  values_culture: string[]
  hiring_logistics: string[]
}

export interface ParsedListingOpportunityReview {
  compensation_summary: string | null
  sales_motion_summary: string[]
  top_requirements_ranked: Array<{ requirement_id: string; requirement_text: string; priority_weight: number }>
  top_resume_proof_needed: string[]
  top_cover_letter_angles: string[]
  top_risks_or_gaps: string[]
  suppressed_requirements: Array<{ requirement_id: string; requirement_text: string; suppression_reason: string | null }>
  who_this_role_is_really_for: string | null
  what_matters_most: string[]
  role_motion_operating_context: string[]
  provisional_alignment: {
    likely_strengths: string[]
    likely_missing_proof: string[]
    confidence_caveats: string[]
  }
  assistant_guidance: {
    gap_priorities: string[]
    resume_targets: string[]
    cover_letter_angles: string[]
    compensation_flags: string[]
  }
  recommended_resume_emphasis: string[]
  recommended_cover_letter_emphasis: string[]
}

export interface ParsedListingRequirement {
  id: string
  text: string
  kind: 'requirement' | 'nice_to_have'
  requirement_type: 'experience' | 'qualification' | 'responsibility' | 'seniority' | 'domain' | 'tool' | 'leadership' | 'culture' | 'language' | 'other'
  priority: RequirementPriority
  priority_weight: number
  evidence_needed: string | null
  user_facing_relevance: RequirementSurfaceDecision
  suppression_reason: string | null
  numeric_signal: string | null
  downstream_use: RequirementDownstreamUse[]
  confidence: ParseConfidence
  source: 'llm' | 'heuristic' | 'user'
}

export interface ParsedListingResponsibilities {
  id: string
  text: string
  confidence: ParseConfidence
}

export interface ParsedListingCompensationDetails {
  pay_type: 'annual' | 'hourly' | 'unknown'
  has_bonus: boolean
  has_equity: boolean
  has_variable_pay: boolean
  transparency_note: string | null
  location_qualifier: string | null
  ote: string | null
  exact_range_text: string | null
}

export interface ParsedListingResult {
  title: string | null
  company_name: string | null
  company_website_url: string | null
  company_linkedin_url: string | null
  location: string | null
  compensation: string | null
  employment_type: string | null
  experience_level: string | null
  work_mode: string | null
  summary: string | null
  requirements: ParsedListingRequirement[]
  responsibilities: ParsedListingResponsibilities[]
  uncertainties: string[]
  parse_quality: 'complete' | 'partial'
  parse_trace?: Record<string, unknown>
  evidence_map: ParsedListingEvidenceMapItem[]
  compensation_details?: ParsedListingCompensationDetails
  job_context?: ParsedListingJobContext
  content_buckets?: ParsedListingContentBuckets
  opportunity_review?: ParsedListingOpportunityReview
}

export interface CanonicalListingFromParse {
  title: string | null
  company_name: string | null
  location: string | null
  exact_requirements: ParsedListingRequirement[]
  nice_to_haves: ParsedListingRequirement[]
  responsibilities: ParsedListingResponsibilities[]
  summary: string | null
  work_mode: string | null
  level_seniority: string | null
  compensation: string | null
  confidence: {
    parse_quality: 'complete' | 'partial'
    uncertainty_notes: string[]
  }
  evidence_map: ParsedListingEvidenceMapItem[]
  compensation_details?: ParsedListingCompensationDetails
  job_context?: ParsedListingJobContext
  content_buckets?: ParsedListingContentBuckets
  opportunity_review?: ParsedListingOpportunityReview
}

export interface ParsedListingEvidenceMapItem {
  id: string
  requirement_id: string
  requirement_text: string
  kind: 'requirement' | 'nice_to_have'
  evidence: string | null
  placeholder: string
  confidence: ParseConfidence
}

const parseConfidenceSchema = z.enum(['high', 'medium', 'low'])
const requirementPrioritySchema = z.enum(['essential', 'important', 'secondary', 'suppressible'])
const requirementSurfaceDecisionSchema = z.enum(['show', 'suppress'])
const requirementDownstreamUseSchema = z.enum(['resume', 'cover_letter', 'interview', 'negotiation'])

const parsedRequirementSchema = z.object({
  id: z.string().trim().optional(),
  text: z.string().trim().min(1),
  kind: z.enum(['requirement', 'nice_to_have']).default('requirement'),
  requirement_type: z.enum(['experience', 'qualification', 'responsibility', 'seniority', 'domain', 'tool', 'leadership', 'culture', 'language', 'other']).default('other'),
  priority: requirementPrioritySchema.default('important'),
  priority_weight: z.number().min(0).max(1).default(0.7),
  evidence_needed: z.string().trim().min(1).nullable().optional(),
  user_facing_relevance: requirementSurfaceDecisionSchema.default('show'),
  suppression_reason: z.string().trim().min(1).nullable().optional(),
  numeric_signal: z.string().trim().min(1).nullable().optional(),
  downstream_use: z.array(requirementDownstreamUseSchema).default(['resume', 'interview']),
  confidence: parseConfidenceSchema.default('medium'),
  source: z.enum(['llm', 'heuristic', 'user']).default('llm'),
})

const parsedJobContextSchema = z.object({
  industry: z.string().trim().min(1).nullable().optional(),
  offering_type: z.string().trim().min(1).nullable().optional(),
  offering_detail: z.string().trim().min(1).nullable().optional(),
  department: z.string().trim().min(1).nullable().optional(),
  team: z.string().trim().min(1).nullable().optional(),
  title_role: z.string().trim().min(1).nullable().optional(),
  job_family: z.string().trim().min(1).nullable().optional(),
  buyer_or_user_context: z.string().trim().min(1).nullable().optional(),
  operating_motion: z.string().trim().min(1).nullable().optional(),
  context_confidence: parseConfidenceSchema.default('medium'),
})

const parsedContentBucketsSchema = z.object({
  role_summary: z.array(z.string().trim().min(1)).default([]),
  responsibilities: z.array(z.string().trim().min(1)).default([]),
  exact_requirements: z.array(z.string().trim().min(1)).default([]),
  nice_to_haves: z.array(z.string().trim().min(1)).default([]),
  compensation: z.array(z.string().trim().min(1)).default([]),
  location_work_mode: z.array(z.string().trim().min(1)).default([]),
  benefits: z.array(z.string().trim().min(1)).default([]),
  company_context: z.array(z.string().trim().min(1)).default([]),
  values_culture: z.array(z.string().trim().min(1)).default([]),
  hiring_logistics: z.array(z.string().trim().min(1)).default([]),
})

const parsedOpportunityReviewSchema = z.object({
  compensation_summary: z.string().trim().min(1).nullable().optional(),
  sales_motion_summary: z.array(z.string().trim().min(1)).default([]),
  top_requirements_ranked: z.array(
    z.object({
      requirement_id: z.string().trim().min(1),
      requirement_text: z.string().trim().min(1),
      priority_weight: z.number().min(0).max(1),
    })
  ).default([]),
  top_resume_proof_needed: z.array(z.string().trim().min(1)).default([]),
  top_cover_letter_angles: z.array(z.string().trim().min(1)).default([]),
  top_risks_or_gaps: z.array(z.string().trim().min(1)).default([]),
  suppressed_requirements: z.array(
    z.object({
      requirement_id: z.string().trim().min(1),
      requirement_text: z.string().trim().min(1),
      suppression_reason: z.string().trim().min(1).nullable().optional(),
    })
  ).default([]),
  who_this_role_is_really_for: z.string().trim().min(1).nullable().optional(),
  what_matters_most: z.array(z.string().trim().min(1)).default([]),
  role_motion_operating_context: z.array(z.string().trim().min(1)).default([]),
  provisional_alignment: z.object({
    likely_strengths: z.array(z.string().trim().min(1)).default([]),
    likely_missing_proof: z.array(z.string().trim().min(1)).default([]),
    confidence_caveats: z.array(z.string().trim().min(1)).default([]),
  }).default({ likely_strengths: [], likely_missing_proof: [], confidence_caveats: [] }),
  assistant_guidance: z.object({
    gap_priorities: z.array(z.string().trim().min(1)).default([]),
    resume_targets: z.array(z.string().trim().min(1)).default([]),
    cover_letter_angles: z.array(z.string().trim().min(1)).default([]),
    compensation_flags: z.array(z.string().trim().min(1)).default([]),
  }).default({ gap_priorities: [], resume_targets: [], cover_letter_angles: [], compensation_flags: [] }),
  recommended_resume_emphasis: z.array(z.string().trim().min(1)).default([]),
  recommended_cover_letter_emphasis: z.array(z.string().trim().min(1)).default([]),
})

const parsedResponsibilitySchema = z.object({
  id: z.string().trim().optional(),
  text: z.string().trim().min(1),
  confidence: parseConfidenceSchema.default('medium'),
})

const parsedEvidenceMapItemSchema = z.object({
  id: z.string().trim().optional(),
  requirement_id: z.string().trim().optional(),
  requirement_text: z.string().trim().min(1),
  kind: z.enum(['requirement', 'nice_to_have']).default('requirement'),
  evidence: z.string().trim().min(1).nullable().optional(),
  placeholder: z.string().trim().min(1).optional(),
  confidence: parseConfidenceSchema.default('medium'),
})

const parsedCompensationDetailsSchema = z.object({
  pay_type: z.enum(['annual', 'hourly', 'unknown']).default('unknown'),
  has_bonus: z.boolean().default(false),
  has_equity: z.boolean().default(false),
  has_variable_pay: z.boolean().default(false),
  transparency_note: z.string().trim().min(1).nullable().optional(),
  location_qualifier: z.string().trim().min(1).nullable().optional(),
  ote: z.string().trim().min(1).nullable().optional(),
  exact_range_text: z.string().trim().min(1).nullable().optional(),
})

export const parsedListingSchema = z.object({
  title: z.string().trim().nullable().optional(),
  company_name: z.string().trim().nullable().optional(),
  company_website_url: z.string().trim().nullable().optional(),
  company_linkedin_url: z.string().trim().nullable().optional(),
  location: z.string().trim().nullable().optional(),
  compensation: z.string().trim().nullable().optional(),
  employment_type: z.string().trim().nullable().optional(),
  experience_level: z.string().trim().nullable().optional(),
  work_mode: z.string().trim().nullable().optional(),
  summary: z.string().trim().nullable().optional(),
  requirements: z.array(parsedRequirementSchema).default([]),
  responsibilities: z.array(parsedResponsibilitySchema).default([]),
  uncertainties: z.array(z.string().trim().min(1)).default([]),
  parse_quality: z.enum(['complete', 'partial']).default('partial'),
  parse_trace: z.record(z.string(), z.unknown()).optional(),
  evidence_map: z.array(parsedEvidenceMapItemSchema).default([]),
  compensation_details: parsedCompensationDetailsSchema.optional(),
  job_context: parsedJobContextSchema.optional(),
  content_buckets: parsedContentBucketsSchema.optional(),
  opportunity_review: parsedOpportunityReviewSchema.optional(),
})

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function asConfidence(value: unknown): ParseConfidence {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'medium'
}

function cleanListingLine(value: string): string {
  return value
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/^\s*\(?\d{1,3}[.)]\s+/, '')
    .replace(/^\s*[a-zA-Z][.)]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitToLines(value: string): string[] {
  return value
    .split(/\n|•|\*|;/)
    .map((line) => cleanListingLine(line))
    .filter((line) => line.length > 0 && line.length <= 320)
}

function normalizeLegacyRequirementList(value: unknown): ParsedListingRequirement[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => {
        if (typeof entry === 'string') return splitToLines(entry)
        if (entry && typeof entry === 'object') {
          const record = entry as Record<string, unknown>
          const text = asString(record.text)
          if (text) return [cleanListingLine(text)]
        }
        return []
      })
      .map((text, index) => ({
        id: `req_${index + 1}`,
        text,
        kind: /\b(preferred|nice to have|bonus|plus)\b/i.test(text) ? 'nice_to_have' as const : 'requirement' as const,
        requirement_type: 'other' as const,
        priority: 'important' as const,
        priority_weight: 0.7,
        evidence_needed: null,
        user_facing_relevance: 'show' as const,
        suppression_reason: null,
        numeric_signal: null,
        downstream_use: ['resume', 'interview'],
        confidence: 'medium' as const,
        source: 'llm' as const,
      }))
  }

  if (typeof value === 'string') {
    return splitToLines(value).map((text, index) => ({
      id: `req_${index + 1}`,
      text,
      kind: /\b(preferred|nice to have|bonus|plus)\b/i.test(text) ? 'nice_to_have' as const : 'requirement' as const,
      requirement_type: 'other',
      priority: 'important',
      priority_weight: 0.7,
      evidence_needed: null,
      user_facing_relevance: 'show',
      suppression_reason: null,
      numeric_signal: null,
      downstream_use: ['resume', 'interview'],
      confidence: 'medium',
      source: 'llm',
    }))
  }

  return []
}

function normalizeLegacyResponsibilities(value: unknown): ParsedListingResponsibilities[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => (typeof entry === 'string' ? splitToLines(entry) : []))
      .map((text, index) => ({ id: `resp_${index + 1}`, text, confidence: 'medium' as const }))
  }
  if (typeof value === 'string') {
    return splitToLines(value).map((text, index) => ({ id: `resp_${index + 1}`, text, confidence: 'medium' as const }))
  }
  return []
}

function coerceEvidenceMap(
  value: unknown,
  fallbackRequirements: ParsedListingRequirement[]
): ParsedListingEvidenceMapItem[] {
  const parsed = Array.isArray(value) ? value : []
  const byText = new Map(
    fallbackRequirements.map((item) => [item.text.toLowerCase(), item])
  )

  const normalized = parsed
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null
      const record = entry as Record<string, unknown>
      const requirementText = asString(record.requirement_text)
      if (!requirementText) return null
      const matchedRequirement = byText.get(requirementText.toLowerCase())

      return {
        id: asString(record.id) ?? `ev_${index + 1}`,
        requirement_id: asString(record.requirement_id) ?? matchedRequirement?.id ?? `req_${index + 1}`,
        requirement_text: requirementText,
        kind: record.kind === 'nice_to_have' ? 'nice_to_have' as const : (matchedRequirement?.kind ?? 'requirement'),
        evidence: asString(record.evidence),
        placeholder: asString(record.placeholder) ?? 'Add concise evidence for this requirement',
        confidence: asConfidence(record.confidence),
      }
    })
    .filter((item): item is ParsedListingEvidenceMapItem => Boolean(item))

  const coveredRequirementIds = new Set(normalized.map((item) => item.requirement_id))
  const missingDefaults = fallbackRequirements
    .filter((item) => !coveredRequirementIds.has(item.id))
    .map((item) => ({
      id: `ev_${item.id}`,
      requirement_id: item.id,
      requirement_text: item.text,
      kind: item.kind,
      evidence: null,
      placeholder: 'Add concise evidence for this requirement',
      confidence: item.confidence,
    }))

  return [...normalized, ...missingDefaults]
}

export function normalizeParsedListing(input: unknown): ParsedListingResult {
  const record = (input && typeof input === 'object') ? input as Record<string, unknown> : {}

  const parsedRequirementsFromRecord = asArray<Record<string, unknown>>(record.requirements)
  const requirements: ParsedListingRequirement[] = (
    parsedRequirementsFromRecord.length > 0
      ? parsedRequirementsFromRecord.map((item, index) => {
        const requirementType: ParsedListingRequirement['requirement_type'] =
          item.requirement_type === 'experience'
          || item.requirement_type === 'qualification'
          || item.requirement_type === 'responsibility'
          || item.requirement_type === 'seniority'
          || item.requirement_type === 'domain'
          || item.requirement_type === 'tool'
          || item.requirement_type === 'leadership'
          || item.requirement_type === 'culture'
          || item.requirement_type === 'language'
            ? item.requirement_type
            : 'other'
        const priority: ParsedListingRequirement['priority'] =
          item.priority === 'essential'
          || item.priority === 'important'
          || item.priority === 'secondary'
          || item.priority === 'suppressible'
            ? item.priority
            : 'important'
        const userFacingRelevance: ParsedListingRequirement['user_facing_relevance'] =
          item.user_facing_relevance === 'suppress' ? 'suppress' : 'show'

        return {
          id: typeof item.id === 'string' ? item.id : `req_${index + 1}`,
          text: cleanListingLine(asString(item.text) ?? ''),
          kind: item.kind === 'nice_to_have' ? 'nice_to_have' as const : 'requirement' as const,
          requirement_type: requirementType,
          priority,
          priority_weight:
            typeof item.priority_weight === 'number'
            && Number.isFinite(item.priority_weight)
            && item.priority_weight >= 0
            && item.priority_weight <= 1
              ? item.priority_weight
              : 0.7,
          evidence_needed: asString(item.evidence_needed),
          user_facing_relevance: userFacingRelevance,
          suppression_reason: asString(item.suppression_reason),
          numeric_signal: asString(item.numeric_signal),
          downstream_use: (() => {
            const filtered: RequirementDownstreamUse[] = asArray<string>(item.downstream_use)
              .filter((value): value is RequirementDownstreamUse => value === 'resume' || value === 'cover_letter' || value === 'interview' || value === 'negotiation')
            const fallback: RequirementDownstreamUse[] = ['resume', 'interview']
            return filtered.length > 0 ? filtered : fallback
          })(),
          confidence: asConfidence(item.confidence),
          source: item.source === 'heuristic' ? 'heuristic' as const : item.source === 'user' ? 'user' as const : 'llm' as const,
        }
      })
      : normalizeLegacyRequirementList(record.requirements)
  ).filter((item) => item.text)

  const parsedResponsibilitiesFromRecord = asArray<Record<string, unknown>>(record.responsibilities)
  const responsibilities: ParsedListingResponsibilities[] = (
    parsedResponsibilitiesFromRecord.length > 0
      ? parsedResponsibilitiesFromRecord.map((item, index) => ({
        id: typeof item.id === 'string' ? item.id : `resp_${index + 1}`,
        text: cleanListingLine(asString(item.text) ?? ''),
        confidence: asConfidence(item.confidence),
      }))
      : normalizeLegacyResponsibilities(record.responsibilities)
  ).filter((item) => item.text)

  const evidenceMap = coerceEvidenceMap(record.evidence_map, requirements)

  const normalized: ParsedListingResult = {
    title: asString(record.title),
    company_name: asString(record.company_name),
    company_website_url: asString(record.company_website_url),
    company_linkedin_url: asString(record.company_linkedin_url),
    location: asString(record.location),
    compensation: asString(record.compensation),
    employment_type: asString(record.employment_type),
    experience_level: asString(record.experience_level),
    work_mode: asString(record.work_mode),
    summary: asString(record.summary),
    requirements,
    responsibilities,
    uncertainties: asArray<string>(record.uncertainties).filter(Boolean),
    parse_quality: record.parse_quality === 'complete' ? 'complete' : 'partial',
    parse_trace: typeof record.parse_trace === 'object' ? record.parse_trace as Record<string, unknown> : undefined,
    evidence_map: evidenceMap,
    compensation_details: (
      record.compensation_details && typeof record.compensation_details === 'object'
        ? {
          pay_type: (record.compensation_details as Record<string, unknown>).pay_type === 'annual'
            ? 'annual'
            : (record.compensation_details as Record<string, unknown>).pay_type === 'hourly'
              ? 'hourly'
              : 'unknown',
          has_bonus: Boolean((record.compensation_details as Record<string, unknown>).has_bonus),
          has_equity: Boolean((record.compensation_details as Record<string, unknown>).has_equity),
          has_variable_pay: Boolean((record.compensation_details as Record<string, unknown>).has_variable_pay),
          transparency_note: asString((record.compensation_details as Record<string, unknown>).transparency_note),
          location_qualifier: asString((record.compensation_details as Record<string, unknown>).location_qualifier),
          ote: asString((record.compensation_details as Record<string, unknown>).ote),
          exact_range_text: asString((record.compensation_details as Record<string, unknown>).exact_range_text),
        }
        : undefined
    ),
    job_context: (
      record.job_context && typeof record.job_context === 'object'
        ? {
          industry: asString((record.job_context as Record<string, unknown>).industry),
          offering_type: asString((record.job_context as Record<string, unknown>).offering_type),
          offering_detail: asString((record.job_context as Record<string, unknown>).offering_detail),
          department: asString((record.job_context as Record<string, unknown>).department),
          team: asString((record.job_context as Record<string, unknown>).team),
          title_role: asString((record.job_context as Record<string, unknown>).title_role),
          job_family: asString((record.job_context as Record<string, unknown>).job_family),
          buyer_or_user_context: asString((record.job_context as Record<string, unknown>).buyer_or_user_context),
          operating_motion: asString((record.job_context as Record<string, unknown>).operating_motion),
          context_confidence: asConfidence((record.job_context as Record<string, unknown>).context_confidence),
        }
        : undefined
    ),
    content_buckets: (
      record.content_buckets && typeof record.content_buckets === 'object'
        ? {
          role_summary: asArray<string>((record.content_buckets as Record<string, unknown>).role_summary).filter(Boolean),
          responsibilities: asArray<string>((record.content_buckets as Record<string, unknown>).responsibilities).filter(Boolean),
          exact_requirements: asArray<string>((record.content_buckets as Record<string, unknown>).exact_requirements).filter(Boolean),
          nice_to_haves: asArray<string>((record.content_buckets as Record<string, unknown>).nice_to_haves).filter(Boolean),
          compensation: asArray<string>((record.content_buckets as Record<string, unknown>).compensation).filter(Boolean),
          location_work_mode: asArray<string>((record.content_buckets as Record<string, unknown>).location_work_mode).filter(Boolean),
          benefits: asArray<string>((record.content_buckets as Record<string, unknown>).benefits).filter(Boolean),
          company_context: asArray<string>((record.content_buckets as Record<string, unknown>).company_context).filter(Boolean),
          values_culture: asArray<string>((record.content_buckets as Record<string, unknown>).values_culture).filter(Boolean),
          hiring_logistics: asArray<string>((record.content_buckets as Record<string, unknown>).hiring_logistics).filter(Boolean),
        }
        : undefined
    ),
    opportunity_review: (
      record.opportunity_review && typeof record.opportunity_review === 'object'
        ? {
          compensation_summary: asString((record.opportunity_review as Record<string, unknown>).compensation_summary),
          sales_motion_summary: asArray<string>((record.opportunity_review as Record<string, unknown>).sales_motion_summary).filter(Boolean),
          top_requirements_ranked: asArray<Record<string, unknown>>((record.opportunity_review as Record<string, unknown>).top_requirements_ranked)
            .map((item) => ({
              requirement_id: asString(item.requirement_id) ?? '',
              requirement_text: asString(item.requirement_text) ?? '',
              priority_weight: typeof item.priority_weight === 'number' && Number.isFinite(item.priority_weight) ? Math.max(0, Math.min(1, item.priority_weight)) : 0.7,
            }))
            .filter((item) => Boolean(item.requirement_id && item.requirement_text)),
          top_resume_proof_needed: asArray<string>((record.opportunity_review as Record<string, unknown>).top_resume_proof_needed).filter(Boolean),
          top_cover_letter_angles: asArray<string>((record.opportunity_review as Record<string, unknown>).top_cover_letter_angles).filter(Boolean),
          top_risks_or_gaps: asArray<string>((record.opportunity_review as Record<string, unknown>).top_risks_or_gaps).filter(Boolean),
          suppressed_requirements: asArray<Record<string, unknown>>((record.opportunity_review as Record<string, unknown>).suppressed_requirements)
            .map((item) => ({
              requirement_id: asString(item.requirement_id) ?? '',
              requirement_text: asString(item.requirement_text) ?? '',
              suppression_reason: asString(item.suppression_reason),
            }))
            .filter((item) => Boolean(item.requirement_id && item.requirement_text)),
          who_this_role_is_really_for: asString((record.opportunity_review as Record<string, unknown>).who_this_role_is_really_for),
          what_matters_most: asArray<string>((record.opportunity_review as Record<string, unknown>).what_matters_most).filter(Boolean),
          role_motion_operating_context: asArray<string>((record.opportunity_review as Record<string, unknown>).role_motion_operating_context).filter(Boolean),
          provisional_alignment: (() => {
            const provisional = (record.opportunity_review as Record<string, unknown>).provisional_alignment
            if (!provisional || typeof provisional !== 'object') return { likely_strengths: [], likely_missing_proof: [], confidence_caveats: [] }
            const input = provisional as Record<string, unknown>
            return {
              likely_strengths: asArray<string>(input.likely_strengths).filter(Boolean),
              likely_missing_proof: asArray<string>(input.likely_missing_proof).filter(Boolean),
              confidence_caveats: asArray<string>(input.confidence_caveats).filter(Boolean),
            }
          })(),
          assistant_guidance: (() => {
            const guidance = (record.opportunity_review as Record<string, unknown>).assistant_guidance
            if (!guidance || typeof guidance !== 'object') return { gap_priorities: [], resume_targets: [], cover_letter_angles: [], compensation_flags: [] }
            const input = guidance as Record<string, unknown>
            return {
              gap_priorities: asArray<string>(input.gap_priorities).filter(Boolean),
              resume_targets: asArray<string>(input.resume_targets).filter(Boolean),
              cover_letter_angles: asArray<string>(input.cover_letter_angles).filter(Boolean),
              compensation_flags: asArray<string>(input.compensation_flags).filter(Boolean),
            }
          })(),
          recommended_resume_emphasis: asArray<string>((record.opportunity_review as Record<string, unknown>).recommended_resume_emphasis).filter(Boolean),
          recommended_cover_letter_emphasis: asArray<string>((record.opportunity_review as Record<string, unknown>).recommended_cover_letter_emphasis).filter(Boolean),
        }
        : undefined
    ),
  }

  const schemaResult = parsedListingSchema.safeParse(normalized)
  if (!schemaResult.success) {
    return {
      ...normalized,
      parse_quality: 'partial',
    }
  }
  return normalized
}

export function toCanonicalListingFromParse(parsed: ParsedListingResult): CanonicalListingFromParse {
  return {
    title: parsed.title,
    company_name: parsed.company_name,
    location: parsed.location,
    exact_requirements: parsed.requirements.filter((item) => item.kind === 'requirement'),
    nice_to_haves: parsed.requirements.filter((item) => item.kind === 'nice_to_have'),
    responsibilities: parsed.responsibilities,
    summary: parsed.summary,
    work_mode: parsed.work_mode,
    level_seniority: parsed.experience_level,
    compensation: parsed.compensation,
    confidence: {
      parse_quality: parsed.parse_quality,
      uncertainty_notes: parsed.uncertainties,
    },
    evidence_map: parsed.evidence_map ?? [],
    compensation_details: parsed.compensation_details,
    job_context: parsed.job_context,
    content_buckets: parsed.content_buckets,
    opportunity_review: parsed.opportunity_review,
  }
}
