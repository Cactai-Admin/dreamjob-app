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
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
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
          confidence: 'medium' as const,
          source: 'llm' as const,
        }
      }

      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const text = asString(record.text)
      if (!text) return null

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
      confidence: 'medium',
      source: 'imported',
    })
  })

  return { exact, niceToHaves }
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

  return {
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
  }
}
