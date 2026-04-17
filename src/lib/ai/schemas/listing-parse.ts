export type ParseConfidence = 'high' | 'medium' | 'low'

export interface ParsedListingRequirement {
  id: string
  text: string
  kind: 'requirement' | 'nice_to_have'
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
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

export function normalizeParsedListing(input: unknown): ParsedListingResult {
  const record = (input && typeof input === 'object') ? input as Record<string, unknown> : {}

  const requirements = asArray<Record<string, unknown>>(record.requirements).map((item, index) => ({
    id: typeof item.id === 'string' ? item.id : `req_${index + 1}`,
    text: asString(item.text) ?? '',
    kind: item.kind === 'nice_to_have' ? 'nice_to_have' : 'requirement',
    confidence: item.confidence === 'high' || item.confidence === 'medium' || item.confidence === 'low' ? item.confidence : 'medium',
    source: item.source === 'heuristic' ? 'heuristic' : item.source === 'user' ? 'user' : 'llm',
  })).filter((item) => item.text)

  const responsibilities = asArray<Record<string, unknown>>(record.responsibilities).map((item, index) => ({
    id: typeof item.id === 'string' ? item.id : `resp_${index + 1}`,
    text: asString(item.text) ?? '',
    confidence: item.confidence === 'high' || item.confidence === 'medium' || item.confidence === 'low' ? item.confidence : 'medium',
  })).filter((item) => item.text)

  return {
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
  }
}

// NOTE:
// Replace the boolean-expression fallback above with your preferred runtime validator if the repo
// already uses zod/valibot/superstruct. This file is intentionally dependency-light.
