import { z } from 'zod'

export type ParseConfidence = 'high' | 'medium' | 'low'
export type RequirementPriority = 'essential' | 'important' | 'secondary' | 'suppressible'
export type RequirementSurfaceDecision = 'show' | 'suppress'

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
  confidence: ParseConfidence
  source: 'llm' | 'heuristic' | 'user'
}

export interface ParsedListingResponsibilities {
  id: string
  text: string
  confidence: ParseConfidence
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
  confidence: parseConfidenceSchema.default('medium'),
  source: z.enum(['llm', 'heuristic', 'user']).default('llm'),
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
  }
}
