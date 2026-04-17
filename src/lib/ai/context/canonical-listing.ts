import { parseRequirements } from '@/lib/listing-match'
export type ListingConfidence = 'high' | 'medium' | 'low'

export interface CanonicalRequirement {
  id: string
  text: string
  requirement_type: 'experience' | 'qualification' | 'responsibility' | 'seniority' | 'domain' | 'tool' | 'leadership' | 'culture' | 'language' | 'other'
  priority: 'essential' | 'important' | 'secondary' | 'suppressible'
  priority_weight: number
  evidence_needed: string | null
  user_facing_relevance: 'show' | 'suppress'
  suppression_reason: string | null
  numeric_signal: string | null
  downstream_use: Array<'resume' | 'cover_letter' | 'interview' | 'negotiation'>
  confidence: ListingConfidence
  source: 'llm' | 'heuristic' | 'user' | 'imported'
}

export interface CanonicalEvidenceMapItem {
  id: string
  requirement_id: string
  requirement_text: string
  kind: 'requirement' | 'nice_to_have'
  evidence: string | null
  placeholder: string
  confidence: ListingConfidence
}

export interface CanonicalJobContext {
  industry: string | null
  offering_type: string | null
  offering_detail: string | null
  department: string | null
  team: string | null
  title_role: string | null
  job_family: string | null
  buyer_or_user_context: string | null
  operating_motion: string | null
  context_confidence: ListingConfidence
}

export interface CanonicalContentBuckets {
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

export interface CanonicalOpportunityReview {
  compensation_summary: string | null
  top_requirements_ranked: Array<{ requirement_id: string; requirement_text: string; priority_weight: number }>
  top_resume_proof_needed: string[]
  top_cover_letter_angles: string[]
  top_risks_or_gaps: string[]
  suppressed_requirements: Array<{ requirement_id: string; requirement_text: string; suppression_reason: string | null }>
  who_this_role_is_really_for: string | null
  what_matters_most: string[]
  recommended_resume_emphasis: string[]
  recommended_cover_letter_emphasis: string[]
}

export interface CanonicalListingContract {
  title: string | null
  company_name: string | null
  location: string | null
  exact_requirements: CanonicalRequirement[]
  nice_to_haves: CanonicalRequirement[]
  responsibilities: CanonicalRequirement[]
  summary: string | null
  work_mode: string | null
  level_seniority: string | null
  compensation: string | null
  compensation_details?: {
    pay_type: 'annual' | 'hourly' | 'unknown'
    has_bonus: boolean
    has_equity: boolean
    has_variable_pay: boolean
    transparency_note: string | null
    location_qualifier: string | null
    ote: string | null
    exact_range_text: string | null
  }
  confidence: {
    parse_quality: 'complete' | 'partial'
    uncertainty_notes: string[]
  }
  evidence_map: CanonicalEvidenceMapItem[]
  job_context?: CanonicalJobContext
  content_buckets?: CanonicalContentBuckets
  opportunity_review?: CanonicalOpportunityReview
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0) : []
}

function asConfidence(value: unknown): ListingConfidence {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'medium'
}

function normalizeRequirementList(value: unknown, fallbackPrefix: string): CanonicalRequirement[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `${fallbackPrefix}_${index + 1}`,
          text: item.trim(),
          requirement_type: 'other',
          priority: 'important',
          priority_weight: 0.7,
          evidence_needed: null,
          user_facing_relevance: 'show',
          suppression_reason: null,
          numeric_signal: null,
          downstream_use: ['resume', 'interview'],
          confidence: 'medium' as const,
          source: 'llm' as const,
        }
      }

      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const text = asString(record.text)
      if (!text) return null

      const downstreamUse = Array.isArray(record.downstream_use)
        ? record.downstream_use.filter((entry): entry is 'resume' | 'cover_letter' | 'interview' | 'negotiation' => entry === 'resume' || entry === 'cover_letter' || entry === 'interview' || entry === 'negotiation')
        : []

      return {
        id: typeof record.id === 'string' && record.id.trim() ? record.id : `${fallbackPrefix}_${index + 1}`,
        text,
        requirement_type:
          record.requirement_type === 'experience'
          || record.requirement_type === 'qualification'
          || record.requirement_type === 'responsibility'
          || record.requirement_type === 'seniority'
          || record.requirement_type === 'domain'
          || record.requirement_type === 'tool'
          || record.requirement_type === 'leadership'
          || record.requirement_type === 'culture'
          || record.requirement_type === 'language'
            ? record.requirement_type
            : 'other',
        priority:
          record.priority === 'essential'
          || record.priority === 'important'
          || record.priority === 'secondary'
          || record.priority === 'suppressible'
            ? record.priority
            : 'important',
        priority_weight:
          typeof record.priority_weight === 'number'
          && Number.isFinite(record.priority_weight)
          && record.priority_weight >= 0
          && record.priority_weight <= 1
            ? record.priority_weight
            : 0.7,
        evidence_needed: asString(record.evidence_needed),
        user_facing_relevance: record.user_facing_relevance === 'suppress' ? 'suppress' : 'show',
        suppression_reason: asString(record.suppression_reason),
        numeric_signal: asString(record.numeric_signal),
        downstream_use: downstreamUse.length > 0 ? downstreamUse : ['resume', 'interview'],
        confidence: asConfidence(record.confidence),
        source:
          record.source === 'heuristic'
            ? 'heuristic'
            : record.source === 'user'
              ? 'user'
              : record.source === 'imported'
                ? 'imported'
                : 'llm',
      }
    })
    .filter((item): item is CanonicalRequirement => Boolean(item && item.text))
}

function normalizeEvidenceMapList(value: unknown): CanonicalEvidenceMapItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const requirementText = asString(record.requirement_text)
      if (!requirementText) return null
      return {
        id: asString(record.id) ?? `ev_${index + 1}`,
        requirement_id: asString(record.requirement_id) ?? `req_${index + 1}`,
        requirement_text: requirementText,
        kind: record.kind === 'nice_to_have' ? 'nice_to_have' : 'requirement',
        evidence: asString(record.evidence),
        placeholder: asString(record.placeholder) ?? 'Add concise evidence for this requirement',
        confidence: asConfidence(record.confidence),
      }
    })
    .filter((item): item is CanonicalEvidenceMapItem => Boolean(item))
}

function splitPlainRequirements(requirements: string[]): {
  exact: CanonicalRequirement[]
  niceToHaves: CanonicalRequirement[]
} {
  const exact: CanonicalRequirement[] = []
  const niceToHaves: CanonicalRequirement[] = []

  requirements.forEach((text, index) => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > 280) return
    if (/[.?!]\s+[A-Z]/.test(trimmed) && trimmed.length > 160) return
    const target = /\b(preferred|nice to have|bonus|plus)\b/i.test(trimmed) ? niceToHaves : exact
    target.push({
      id: `req_${index + 1}`,
      text: trimmed,
      requirement_type: 'other',
      priority: /\b(required|must|minimum)\b/i.test(trimmed) ? 'essential' : 'important',
      priority_weight: /\b(required|must|minimum)\b/i.test(trimmed) ? 0.95 : 0.7,
      evidence_needed: null,
      user_facing_relevance: 'show',
      suppression_reason: null,
      numeric_signal: null,
      downstream_use: ['resume', 'interview'],
      confidence: 'medium',
      source: 'imported',
    })
  })

  return { exact, niceToHaves }
}

function normalizeJobContext(value: unknown): CanonicalJobContext | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  return {
    industry: asString(record.industry),
    offering_type: asString(record.offering_type),
    offering_detail: asString(record.offering_detail),
    department: asString(record.department),
    team: asString(record.team),
    title_role: asString(record.title_role),
    job_family: asString(record.job_family),
    buyer_or_user_context: asString(record.buyer_or_user_context),
    operating_motion: asString(record.operating_motion),
    context_confidence: asConfidence(record.context_confidence),
  }
}

function normalizeContentBuckets(value: unknown): CanonicalContentBuckets | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  return {
    role_summary: asStringArray(record.role_summary),
    responsibilities: asStringArray(record.responsibilities),
    exact_requirements: asStringArray(record.exact_requirements),
    nice_to_haves: asStringArray(record.nice_to_haves),
    compensation: asStringArray(record.compensation),
    location_work_mode: asStringArray(record.location_work_mode),
    benefits: asStringArray(record.benefits),
    company_context: asStringArray(record.company_context),
    values_culture: asStringArray(record.values_culture),
    hiring_logistics: asStringArray(record.hiring_logistics),
  }
}

function normalizeOpportunityReview(value: unknown): CanonicalOpportunityReview | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  return {
    compensation_summary: asString(record.compensation_summary),
    top_requirements_ranked: Array.isArray(record.top_requirements_ranked)
      ? record.top_requirements_ranked
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const entry = item as Record<string, unknown>
          const requirementId = asString(entry.requirement_id)
          const requirementText = asString(entry.requirement_text)
          if (!requirementId || !requirementText) return null
          return {
            requirement_id: requirementId,
            requirement_text: requirementText,
            priority_weight: typeof entry.priority_weight === 'number' && Number.isFinite(entry.priority_weight) ? Math.max(0, Math.min(1, entry.priority_weight)) : 0.7,
          }
        })
        .filter((item): item is { requirement_id: string; requirement_text: string; priority_weight: number } => Boolean(item))
      : [],
    top_resume_proof_needed: asStringArray(record.top_resume_proof_needed),
    top_cover_letter_angles: asStringArray(record.top_cover_letter_angles),
    top_risks_or_gaps: asStringArray(record.top_risks_or_gaps),
    suppressed_requirements: Array.isArray(record.suppressed_requirements)
      ? record.suppressed_requirements
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const entry = item as Record<string, unknown>
          const requirementId = asString(entry.requirement_id)
          const requirementText = asString(entry.requirement_text)
          if (!requirementId || !requirementText) return null
          return {
            requirement_id: requirementId,
            requirement_text: requirementText,
            suppression_reason: asString(entry.suppression_reason),
          }
        })
        .filter((item): item is { requirement_id: string; requirement_text: string; suppression_reason: string | null } => Boolean(item))
      : [],
    who_this_role_is_really_for: asString(record.who_this_role_is_really_for),
    what_matters_most: asStringArray(record.what_matters_most),
    recommended_resume_emphasis: asStringArray(record.recommended_resume_emphasis),
    recommended_cover_letter_emphasis: asStringArray(record.recommended_cover_letter_emphasis),
  }
}

export function deriveOpportunityReview(listing: CanonicalListingContract): CanonicalOpportunityReview {
  const ranked = [...listing.exact_requirements, ...listing.nice_to_haves]
    .sort((a, b) => b.priority_weight - a.priority_weight)
    .slice(0, 8)
    .map((item) => ({
      requirement_id: item.id,
      requirement_text: item.text,
      priority_weight: item.priority_weight,
    }))

  const visible = [...listing.exact_requirements, ...listing.nice_to_haves].filter((item) => item.user_facing_relevance !== 'suppress')
  const suppressed = [...listing.exact_requirements, ...listing.nice_to_haves]
    .filter((item) => item.user_facing_relevance === 'suppress')
    .map((item) => ({ requirement_id: item.id, requirement_text: item.text, suppression_reason: item.suppression_reason }))

  const roleFor = [listing.job_context?.department, listing.job_context?.team, listing.job_context?.title_role ?? listing.title]
    .filter(Boolean)
    .join(' · ')

  return {
    compensation_summary: listing.compensation_details?.ote ?? listing.compensation_details?.exact_range_text ?? listing.compensation ?? null,
    top_requirements_ranked: ranked,
    top_resume_proof_needed: ranked
      .map((item) => visible.find((requirement) => requirement.id === item.requirement_id)?.evidence_needed)
      .filter((item): item is string => Boolean(item))
      .slice(0, 5),
    top_cover_letter_angles: visible.slice(0, 4).map((item) => `Connect impact to ${item.text}`),
    top_risks_or_gaps: visible.filter((item) => item.priority === 'essential' && !item.numeric_signal).slice(0, 3).map((item) => `Need measurable proof for: ${item.text}`),
    suppressed_requirements: suppressed,
    who_this_role_is_really_for: roleFor || null,
    what_matters_most: ranked.slice(0, 4).map((item) => item.requirement_text),
    recommended_resume_emphasis: visible.slice(0, 5).map((item) => item.evidence_needed ?? item.text),
    recommended_cover_letter_emphasis: visible.slice(0, 4).map((item) => `Show fit for ${item.requirement_type}: ${item.text}`),
  }
}

export function normalizeCanonicalListing(listing: unknown): CanonicalListingContract {
  const listingRecord = (listing && typeof listing === 'object') ? listing as Record<string, unknown> : {}
  const parsedData = listingRecord.parsed_data && typeof listingRecord.parsed_data === 'object'
    ? listingRecord.parsed_data as Record<string, unknown>
    : {}
  const parsedCanonical = parsedData.canonical_listing && typeof parsedData.canonical_listing === 'object'
    ? parsedData.canonical_listing as Record<string, unknown>
    : null

  const baseRequirements = parseRequirements(listingRecord.requirements ?? null)
  const split = splitPlainRequirements(baseRequirements)

  const exactRequirements = normalizeRequirementList(parsedCanonical?.exact_requirements, 'req').length > 0
    ? normalizeRequirementList(parsedCanonical?.exact_requirements, 'req')
    : split.exact
  const niceToHaves = normalizeRequirementList(parsedCanonical?.nice_to_haves, 'nice').length > 0
    ? normalizeRequirementList(parsedCanonical?.nice_to_haves, 'nice')
    : split.niceToHaves
  const responsibilitiesFromCanonical = normalizeRequirementList(parsedCanonical?.responsibilities, 'resp')
  const responsibilitiesFromListing = parseRequirements(listingRecord.responsibilities ?? null).map((text, index) => ({
    id: `resp_${index + 1}`,
    text,
    requirement_type: 'responsibility' as const,
    priority: 'important' as const,
    priority_weight: 0.7,
    evidence_needed: 'Examples showing delivery ownership and measurable outcomes',
    user_facing_relevance: 'show' as const,
    suppression_reason: null,
    numeric_signal: null,
    downstream_use: ['resume', 'interview'] as Array<'resume' | 'cover_letter' | 'interview' | 'negotiation'>,
    confidence: 'medium' as const,
    source: 'imported' as const,
  }))

  const uncertaintyNotes = Array.isArray(parsedCanonical?.confidence)
    ? []
    : Array.isArray(parsedData.uncertainties)
      ? parsedData.uncertainties.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : []

  const parseQuality = parsedCanonical?.confidence && typeof parsedCanonical.confidence === 'object'
    ? ((((parsedCanonical.confidence as Record<string, unknown>).parse_quality) === 'complete') ? 'complete' : 'partial')
    : (parsedData.parse_quality === 'complete' ? 'complete' : 'partial')
  const evidenceMap = normalizeEvidenceMapList(parsedCanonical?.evidence_map)
  const compensationDetailsRaw = (parsedCanonical?.compensation_details && typeof parsedCanonical.compensation_details === 'object')
    ? parsedCanonical.compensation_details as Record<string, unknown>
    : (parsedData.compensation_details && typeof parsedData.compensation_details === 'object')
      ? parsedData.compensation_details as Record<string, unknown>
      : null

  const contract: CanonicalListingContract = {
    title: asString(parsedCanonical?.title) ?? asString(listingRecord.title) ?? null,
    company_name: asString(parsedCanonical?.company_name) ?? asString(listingRecord.company_name) ?? null,
    location: asString(parsedCanonical?.location) ?? asString(listingRecord.location) ?? null,
    exact_requirements: exactRequirements,
    nice_to_haves: niceToHaves,
    responsibilities: responsibilitiesFromCanonical.length > 0 ? responsibilitiesFromCanonical : responsibilitiesFromListing,
    summary: asString(parsedCanonical?.summary) ?? asString(listingRecord.description) ?? null,
    work_mode: asString(parsedCanonical?.work_mode) ?? asString(parsedData.work_mode) ?? null,
    level_seniority: asString(parsedCanonical?.level_seniority) ?? asString(listingRecord.experience_level) ?? null,
    compensation: asString(parsedCanonical?.compensation) ?? asString(listingRecord.salary_range) ?? null,
    compensation_details: compensationDetailsRaw
      ? {
        pay_type: compensationDetailsRaw.pay_type === 'annual' ? 'annual' : compensationDetailsRaw.pay_type === 'hourly' ? 'hourly' : 'unknown',
        has_bonus: Boolean(compensationDetailsRaw.has_bonus),
        has_equity: Boolean(compensationDetailsRaw.has_equity),
        has_variable_pay: Boolean(compensationDetailsRaw.has_variable_pay),
        transparency_note: asString(compensationDetailsRaw.transparency_note),
        location_qualifier: asString(compensationDetailsRaw.location_qualifier),
        ote: asString(compensationDetailsRaw.ote),
        exact_range_text: asString(compensationDetailsRaw.exact_range_text),
      }
      : undefined,
    confidence: {
      parse_quality: parseQuality,
      uncertainty_notes: uncertaintyNotes,
    },
    evidence_map: evidenceMap,
    job_context: normalizeJobContext(parsedCanonical?.job_context ?? parsedData.job_context),
    content_buckets: normalizeContentBuckets(parsedCanonical?.content_buckets ?? parsedData.content_buckets),
    opportunity_review: normalizeOpportunityReview(parsedCanonical?.opportunity_review ?? parsedData.opportunity_review),
  }

  if (!contract.opportunity_review) {
    contract.opportunity_review = deriveOpportunityReview(contract)
  }

  return contract
}
