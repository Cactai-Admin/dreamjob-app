import { parseRequirements } from '@/lib/listing-match'
import type { JobListing } from '@/types/database'

export type ListingConfidence = 'high' | 'medium' | 'low'

export interface CanonicalRequirement {
  id: string
  text: string
  confidence: ListingConfidence
  source: 'llm' | 'heuristic' | 'user' | 'imported'
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
  confidence: {
    parse_quality: 'complete' | 'partial'
    uncertainty_notes: string[]
  }
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

function splitPlainRequirements(requirements: string[]): {
  exact: CanonicalRequirement[]
  niceToHaves: CanonicalRequirement[]
} {
  const exact: CanonicalRequirement[] = []
  const niceToHaves: CanonicalRequirement[] = []

  requirements.forEach((text, index) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const target = /\b(preferred|nice to have|bonus|plus)\b/i.test(trimmed) ? niceToHaves : exact
    target.push({
      id: `req_${index + 1}`,
      text: trimmed,
      confidence: 'medium',
      source: 'imported',
    })
  })

  return { exact, niceToHaves }
}

export function normalizeCanonicalListing(listing: Partial<JobListing> | null | undefined): CanonicalListingContract {
  const parsedData = listing?.parsed_data && typeof listing.parsed_data === 'object'
    ? listing.parsed_data as Record<string, unknown>
    : {}
  const parsedCanonical = parsedData.canonical_listing && typeof parsedData.canonical_listing === 'object'
    ? parsedData.canonical_listing as Record<string, unknown>
    : null

  const baseRequirements = parseRequirements(listing?.requirements ?? null)
  const split = splitPlainRequirements(baseRequirements)

  const exactRequirements = normalizeRequirementList(parsedCanonical?.exact_requirements, 'req').length > 0
    ? normalizeRequirementList(parsedCanonical?.exact_requirements, 'req')
    : split.exact
  const niceToHaves = normalizeRequirementList(parsedCanonical?.nice_to_haves, 'nice').length > 0
    ? normalizeRequirementList(parsedCanonical?.nice_to_haves, 'nice')
    : split.niceToHaves
  const responsibilitiesFromCanonical = normalizeRequirementList(parsedCanonical?.responsibilities, 'resp')
  const responsibilitiesFromListing = parseRequirements(listing?.responsibilities ?? null).map((text, index) => ({
    id: `resp_${index + 1}`,
    text,
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

  return {
    title: asString(parsedCanonical?.title) ?? asString(listing?.title) ?? null,
    company_name: asString(parsedCanonical?.company_name) ?? asString(listing?.company_name) ?? null,
    location: asString(parsedCanonical?.location) ?? asString(listing?.location) ?? null,
    exact_requirements: exactRequirements,
    nice_to_haves: niceToHaves,
    responsibilities: responsibilitiesFromCanonical.length > 0 ? responsibilitiesFromCanonical : responsibilitiesFromListing,
    summary: asString(parsedCanonical?.summary) ?? asString(listing?.description) ?? null,
    work_mode: asString(parsedCanonical?.work_mode) ?? asString(parsedData.work_mode) ?? null,
    level_seniority: asString(parsedCanonical?.level_seniority) ?? asString(listing?.experience_level) ?? null,
    compensation: asString(parsedCanonical?.compensation) ?? asString(listing?.salary_range) ?? null,
    confidence: {
      parse_quality: parseQuality,
      uncertainty_notes: uncertaintyNotes,
    },
  }
}
