import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getProvider, type ProviderName } from '@/lib/ai/provider'
import { LISTING_EVIDENCE_MAP_SYSTEM, LISTING_PARSE_SYSTEM, LISTING_URL_ANALYSIS } from '@/lib/ai/prompts/listing-parse'
import {
  normalizeParsedListing,
  parsedListingSchema,
  toCanonicalListingFromParse,
  type ParsedListingEvidenceMapItem,
  type ParsedListingRequirement,
} from '@/lib/ai/schemas/listing-parse'

const EMPLOYMENT_TYPE_PATTERNS: Array<{ type: string; pattern: RegExp }> = [
  { type: 'internship', pattern: /\b(intern(ship)?|co-?op)\b/i },
  { type: 'contract', pattern: /\b(contract(or)?|1099|freelance|consultant)\b/i },
  { type: 'temporary', pattern: /\b(temp(orary)?|seasonal|fixed[- ]term)\b/i },
  { type: 'part-time', pattern: /\b(part[- ]?time|pt\b)\b/i },
  { type: 'full-time', pattern: /\b(full[- ]?time|permanent|fte)\b/i },
]

const EXPERIENCE_LEVEL_PATTERNS: Array<{ level: string; pattern: RegExp }> = [
  { level: 'director', pattern: /\b(director|head of|vp|vice president|chief)\b/i },
  { level: 'manager', pattern: /\b(manager|management)\b/i },
  { level: 'lead', pattern: /\b(lead|principal)\b/i },
  { level: 'staff', pattern: /\bstaff\b/i },
  { level: 'senior', pattern: /\b(senior|sr\.?)\b/i },
  { level: 'mid', pattern: /\b(mid[- ]?level|intermediate|ii\b|iii\b)\b/i },
  { level: 'entry', pattern: /\b(entry[- ]?level|junior|jr\.?|new grad(uate)?|associate)\b/i },
]

const WORK_MODE_PATTERNS: Array<{ mode: string; pattern: RegExp }> = [
  { mode: 'hybrid', pattern: /\bhybrid\b/i },
  { mode: 'remote', pattern: /\b(remote|work from home|distributed)\b/i },
  { mode: 'onsite', pattern: /\b(on[- ]?site|in[- ]?office)\b/i },
]

const YEARS_EXPERIENCE_PATTERN = /\b(\d{1,2})(?:\s*-\s*(\d{1,2}))?\+?\s*(?:years?|yrs?)\b/i

function normalizeEmploymentType(existing: unknown, sourceText: string): string | null {
  const existingValue = typeof existing === 'string' ? existing.trim() : ''
  if (existingValue) {
    const normalized = existingValue.toLowerCase()
    if (/intern(ship)?|co-?op/.test(normalized)) return 'internship'
    if (/contract|1099|freelance|consult/.test(normalized)) return 'contract'
    if (/temp|seasonal|fixed/.test(normalized)) return 'temporary'
    if (/part/.test(normalized)) return 'part-time'
    if (/full|permanent|fte/.test(normalized)) return 'full-time'
    return existingValue
  }

  for (const matcher of EMPLOYMENT_TYPE_PATTERNS) {
    if (matcher.pattern.test(sourceText)) return matcher.type
  }
  return null
}

function normalizeExperienceLevel(existing: unknown, sourceText: string): string | null {
  const existingValue = typeof existing === 'string' ? existing.trim() : ''
  if (existingValue) {
    const normalized = existingValue.toLowerCase()
    if (/director|head|vp|chief/.test(normalized)) return 'director'
    if (/manager/.test(normalized)) return 'manager'
    if (/lead|principal/.test(normalized)) return 'lead'
    if (/staff/.test(normalized)) return 'staff'
    if (/senior|sr/.test(normalized)) return 'senior'
    if (/mid|intermediate|ii|iii/.test(normalized)) return 'mid'
    if (/entry|junior|jr|new grad|associate/.test(normalized)) return 'entry'
    return existingValue
  }

  for (const matcher of EXPERIENCE_LEVEL_PATTERNS) {
    if (matcher.pattern.test(sourceText)) return matcher.level
  }

  const yearsMatch = sourceText.match(/\b(\d{1,2})\+?\s*(?:years?|yrs?)\b/i)
  if (yearsMatch) {
    const years = Number.parseInt(yearsMatch[1], 10)
    if (Number.isFinite(years)) {
      if (years >= 10) return 'director'
      if (years >= 7) return 'senior'
      if (years >= 4) return 'mid'
      if (years >= 0) return 'entry'
    }
  }
  return null
}

function detectWorkMode(sourceText: string): string | null {
  for (const matcher of WORK_MODE_PATTERNS) {
    if (matcher.pattern.test(sourceText)) return matcher.mode
  }
  return null
}

function detectYearsExperience(sourceText: string): string | null {
  const yearsMatch = sourceText.match(YEARS_EXPERIENCE_PATTERN)
  if (!yearsMatch) return null
  if (yearsMatch[2]) return `${yearsMatch[1]}-${yearsMatch[2]} years`
  return `${yearsMatch[1]}+ years`
}

function parseLanguageRequirements(sourceText: string): string[] {
  const matches = sourceText.match(/\b(english|spanish|french|german|mandarin|cantonese|japanese|korean|portuguese|arabic|hindi|bilingual)\b/gi)
  if (!matches) return []
  return [...new Set(matches.map((language) => language.toLowerCase()))]
}

function parseToolsPlatforms(sourceText: string): string[] {
  const TOOL_PATTERNS = [
    'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'terraform', 'snowflake', 'databricks', 'tableau',
    'power bi', 'excel', 'jira', 'salesforce', 'figma', 'react', 'next.js', 'typescript', 'python',
    'java', 'sql', 'postgres', 'mysql', 'mongodb', 'git',
  ]
  const normalizedText = sourceText.toLowerCase()
  return TOOL_PATTERNS.filter((tool) => normalizedText.includes(tool))
}

function sanitizeLinkedInCompanyUrl(url: string): string {
  const clean = url.match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9_%-]+/i)
  if (!clean) return url
  return clean[0]
}

function trimLine(value: string): string {
  return value
    .replace(/^[-*•\d.)\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitLines(value: string): string[] {
  return value
    .split(/\n|•|\*|;/)
    .map((line) => trimLine(line))
    .filter((line) => line.length > 0 && line.length <= 320)
}

function buildDeterministicEvidenceMap(
  requirements: ParsedListingRequirement[],
  signalText: string
): ParsedListingEvidenceMapItem[] {
  const candidateLines = splitLines(signalText)
  const uniqueLines = [...new Set(candidateLines)]

  return requirements.map((requirement) => {
    const reqTerms = requirement.text.toLowerCase().split(/[^a-z0-9+#.]+/).filter((term) => term.length > 2)
    const bestLine = uniqueLines
      .map((line) => {
        const lowered = line.toLowerCase()
        const score = reqTerms.reduce((sum, term) => sum + (lowered.includes(term) ? 1 : 0), 0)
        return { line, score }
      })
      .sort((a, b) => b.score - a.score)[0]
    const evidence = bestLine && bestLine.score > 0 ? bestLine.line.slice(0, 220) : null
    return {
      id: `ev_${requirement.id}`,
      requirement_id: requirement.id,
      requirement_text: requirement.text,
      kind: requirement.kind,
      evidence,
      placeholder: 'Add concise evidence for this requirement',
      confidence: evidence ? 'medium' : requirement.confidence,
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    // Manual entry — return data as-is
    if (body.manual) {
      return NextResponse.json(body.manual)
    }

    // URL-based parsing
    if (!body.url) {
      return NextResponse.json({ error: 'URL or manual data required' }, { status: 400 })
    }

    const providerName = body.provider as ProviderName | undefined
    const provider = getProvider(providerName)
    if (!provider.isConfigured()) {
      return NextResponse.json(
        { error: 'No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.' },
        { status: 503 }
      )
    }

    // Known job board domains — listing URL on these is NOT the company website
    const JOB_BOARDS = [
      'linkedin.com', 'indeed.com', 'glassdoor.com', 'greenhouse.io', 'lever.co',
      'workday.com', 'myworkdayjobs.com', 'icims.com', 'jobvite.com', 'smartrecruiters.com',
      'recruitingbypaycor.com', 'jazz.co', 'breezy.hr', 'workable.com', 'rippling.com',
      'ashbyhq.com', 'wellfound.com', 'ziprecruiter.com', 'monster.com', 'careerbuilder.com',
    ]

    // Derive company website from listing URL if it's on the company's own domain
    let listingDomainUrl: string | null = null
    let listingHost: string | null = null
    let listingIsJobBoard = false
    try {
      listingHost = new URL(body.url).hostname.replace(/^www\./, '')
      listingIsJobBoard = JOB_BOARDS.some((b) => listingHost === b || listingHost?.endsWith('.' + b))
      if (!listingIsJobBoard) {
        listingDomainUrl = `https://${new URL(body.url).hostname}`
      }
    } catch { /* ignore */ }

    // Fetch the listing page content
    let pageContent: string
    let scrapedLinkedIn: string | null = null
    try {
      const res = await fetch(body.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DreamJob/1.0)' },
      })
      pageContent = await res.text()

      // Extract LinkedIn company URL from full HTML before truncating (footer is often cut off)
      // Match both /company/ and encoded variants, strip query params
      const liMatch = pageContent.match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9_%-]+(?:\/[a-zA-Z0-9_/-]*)?/i)
      if (liMatch) {
        scrapedLinkedIn = sanitizeLinkedInCompanyUrl(liMatch[0])
      }

      // Truncate for AI — job details are almost always in the first portion
      if (pageContent.length > 15000) {
        pageContent = pageContent.substring(0, 15000)
      }
    } catch {
      // If fetch fails, try to analyze from URL alone
      const urlResult = await provider.generate({
        messages: [
          { role: 'system', content: LISTING_URL_ANALYSIS },
          { role: 'user', content: `Analyze this job listing URL: ${body.url}` },
        ],
        temperature: 0.1,
      })

      try {
        const parsedFromUrl = JSON.parse(urlResult)
        const companyLinkedInFromUrl =
          typeof parsedFromUrl.company_linkedin_url === 'string'
            ? sanitizeLinkedInCompanyUrl(parsedFromUrl.company_linkedin_url)
            : null
        return NextResponse.json({
          ...parsedFromUrl,
          company_website_url: parsedFromUrl.company_website_url ?? listingDomainUrl,
          company_linkedin_url: companyLinkedInFromUrl ?? scrapedLinkedIn,
          parse_quality: 'partial',
          parsed_data: {
            parse_trace: {
              entrypoint: 'home_url_submission',
              pipeline: 'url_only_fallback',
              source_inputs: {
                listing_url: body.url,
                fetch_html: false,
                llm_extraction: false,
                heuristics: true,
              },
            },
          },
        })
      } catch {
        const fallbackHost = (() => {
          try {
            return new URL(body.url).hostname.replace(/^www\./, '')
          } catch {
            return 'unknown'
          }
        })()
        return NextResponse.json({
          title: 'Review and complete listing details',
          company_name: fallbackHost === 'unknown' ? 'Unknown Company' : fallbackHost,
          description: 'Listing parse was partial. Please review and edit this listing before generating documents.',
          requirements: [],
          location: null,
          salary_range: null,
          employment_type: null,
          experience_level: null,
          responsibilities: null,
          company_website_url: listingDomainUrl,
          parse_quality: 'partial',
        })
      }
    }

    // Pass 1: listing normalization with strict schema validation (+ retries)
    let parsed: Record<string, unknown> | null = null
    let parseAttempt = 0
    while (!parsed && parseAttempt < 3) {
      parseAttempt += 1
      const result = await provider.generate({
        messages: [
          { role: 'system', content: LISTING_PARSE_SYSTEM },
          {
            role: 'user',
            content:
              parseAttempt === 1
                ? `Parse this job listing content:\n\n${pageContent}`
                : `Return valid JSON only and follow the required schema exactly. Re-parse this listing:\n\n${pageContent}`,
          },
        ],
        temperature: 0.1,
      })

      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) continue
      try {
        const candidate = JSON.parse(jsonMatch[0]) as Record<string, unknown>
        const normalizedCandidate = normalizeParsedListing({
          title: candidate.title,
          company_name: candidate.company_name,
          company_website_url: candidate.company_website_url,
          company_linkedin_url: candidate.company_linkedin_url,
          location: candidate.location,
          compensation: candidate.salary_range ?? candidate.compensation,
          employment_type: candidate.employment_type,
          experience_level: candidate.experience_level,
          work_mode: candidate.work_mode,
          summary: candidate.description ?? candidate.summary,
          requirements: candidate.requirements,
          responsibilities: candidate.responsibilities,
          uncertainties: candidate.uncertainties,
          parse_quality: candidate.parse_quality,
          parse_trace: candidate.parse_trace,
          evidence_map: candidate.evidence_map,
        })

        const validation = parsedListingSchema.safeParse(normalizedCandidate)
        parsed = validation.success ? candidate : null
      } catch {
        parsed = null
      }
    }

    if (!parsed) {
      return NextResponse.json({ error: 'Failed to parse listing data' }, { status: 422 })
    }
    const signalText = [
      typeof parsed.title === 'string' ? parsed.title : '',
      typeof parsed.description === 'string' ? parsed.description : '',
      Array.isArray(parsed.requirements)
        ? parsed.requirements
          .map((item) => {
            if (typeof item === 'string') return item
            if (item && typeof item === 'object' && typeof (item as Record<string, unknown>).text === 'string') {
              return (item as Record<string, unknown>).text as string
            }
            return ''
          })
          .filter(Boolean)
          .join('\n')
        : typeof parsed.requirements === 'string'
          ? parsed.requirements
          : '',
      Array.isArray(parsed.responsibilities)
        ? parsed.responsibilities
          .map((item) => {
            if (typeof item === 'string') return item
            if (item && typeof item === 'object' && typeof (item as Record<string, unknown>).text === 'string') {
              return (item as Record<string, unknown>).text as string
            }
            return ''
          })
          .filter(Boolean)
          .join('\n')
        : typeof parsed.responsibilities === 'string'
          ? parsed.responsibilities
          : '',
      pageContent,
    ]
      .filter(Boolean)
      .join('\n')

    parsed.employment_type = normalizeEmploymentType(parsed.employment_type, signalText)
    parsed.experience_level = normalizeExperienceLevel(parsed.experience_level, signalText)
    const workMode = detectWorkMode(signalText)
    const yearsExperience = detectYearsExperience(signalText)
    const toolsPlatforms = parseToolsPlatforms(signalText)
    const languageRequirements = parseLanguageRequirements(signalText)

    // Fill gaps from HTML/URL extraction when AI missed them
    if (!parsed.company_linkedin_url && scrapedLinkedIn) {
      parsed.company_linkedin_url = scrapedLinkedIn
    } else if (typeof parsed.company_linkedin_url === 'string') {
      parsed.company_linkedin_url = sanitizeLinkedInCompanyUrl(parsed.company_linkedin_url)
    }
    if (!parsed.company_website_url && listingDomainUrl) {
      parsed.company_website_url = listingDomainUrl
    }
    const normalizedPassOne = normalizeParsedListing({
      title: parsed.title,
      company_name: parsed.company_name,
      company_website_url: parsed.company_website_url,
      company_linkedin_url: parsed.company_linkedin_url,
      location: parsed.location,
      compensation: parsed.salary_range ?? parsed.compensation,
      employment_type: parsed.employment_type,
      experience_level: parsed.experience_level,
      work_mode: workMode,
      summary: parsed.description ?? parsed.summary,
      requirements: parsed.requirements,
      responsibilities: parsed.responsibilities,
      uncertainties: parsed.uncertainties,
      parse_quality: parsed.parse_quality,
      parse_trace: parsed.parse_trace,
      evidence_map: parsed.evidence_map,
    })

    const parsedRequirementsCount = normalizedPassOne.requirements.length
    const parseQuality: 'complete' | 'partial' =
      Boolean(normalizedPassOne.title) && Boolean(normalizedPassOne.company_name) && (Boolean(normalizedPassOne.summary) || parsedRequirementsCount > 0)
        ? 'complete'
        : 'partial'

    // Pass 2: map requirements to listing-grounded evidence strings (fallback: deterministic cleanup)
    let evidenceMap = buildDeterministicEvidenceMap(normalizedPassOne.requirements, signalText)
    let evidenceAttemptCount = 0
    if (normalizedPassOne.requirements.length > 0) {
      for (let evidenceAttempt = 1; evidenceAttempt <= 2; evidenceAttempt += 1) {
        evidenceAttemptCount = evidenceAttempt
        const evidenceRaw = await provider.generate({
          messages: [
            { role: 'system', content: LISTING_EVIDENCE_MAP_SYSTEM },
            {
              role: 'user',
              content: JSON.stringify({
                listing_excerpt: pageContent.slice(0, 12000),
                requirements: normalizedPassOne.requirements.map((item) => ({
                  id: item.id,
                  text: item.text,
                  kind: item.kind,
                })),
              }),
            },
          ],
          temperature: 0.1,
        })
        const evidenceJson = evidenceRaw.match(/\{[\s\S]*\}/)
        if (!evidenceJson) continue
        try {
          const parsedEvidence = JSON.parse(evidenceJson[0]) as { evidence_map?: unknown[] }
          const merged = normalizeParsedListing({
            ...normalizedPassOne,
            parse_quality: parseQuality,
            evidence_map: parsedEvidence.evidence_map,
          })
          if (merged.evidence_map.length > 0) {
            evidenceMap = merged.evidence_map
            break
          }
        } catch {
          // continue retry loop
        }
      }
    }

    const normalizedParse = normalizeParsedListing({
      title: normalizedPassOne.title,
      company_name: normalizedPassOne.company_name,
      company_website_url: parsed.company_website_url,
      company_linkedin_url: parsed.company_linkedin_url,
      location: normalizedPassOne.location,
      compensation: normalizedPassOne.compensation,
      employment_type: normalizedPassOne.employment_type,
      experience_level: normalizedPassOne.experience_level,
      work_mode: workMode,
      summary: normalizedPassOne.summary,
      requirements: normalizedPassOne.requirements,
      responsibilities: normalizedPassOne.responsibilities,
      uncertainties: [],
      parse_quality: parseQuality,
      evidence_map: evidenceMap,
    })

    parsed.requirements = normalizedParse.requirements.map((item) => item.text)
    parsed.responsibilities = normalizedParse.responsibilities.map((item) => item.text).join('\n')
    parsed.description = normalizedParse.summary
    parsed.salary_range = normalizedParse.compensation
    parsed.parse_quality = parseQuality

    parsed.parsed_data = {
      ...((typeof parsed.parsed_data === 'object' && parsed.parsed_data !== null) ? parsed.parsed_data : {}),
      work_mode: workMode,
      years_experience: yearsExperience,
      tools_platforms: toolsPlatforms,
      language_requirements: languageRequirements,
      canonical_listing: toCanonicalListingFromParse(normalizedParse),
      parse_trace: {
        entrypoint: 'home_url_submission',
        pipeline: 'fetch_html_then_llm_with_heuristic_fallbacks',
        source_inputs: {
          listing_url: body.url,
          listing_host: listingHost,
          fetched_html: true,
          scraped_html_linkedin: Boolean(scrapedLinkedIn),
          listing_domain_heuristic: Boolean(listingDomainUrl),
          llm_extraction: true,
          heuristics: true,
          metadata_hybrid: true,
          listing_is_job_board: listingIsJobBoard,
        },
        field_derivation: {
          title: 'llm_extraction',
          company_name: 'llm_extraction',
          location: 'llm_extraction',
          salary_range: 'llm_extraction',
          requirements: 'llm_extraction',
          responsibilities: 'llm_extraction',
          benefits: 'llm_extraction',
          employment_type: parsed.employment_type ? 'llm_or_heuristic_normalization' : 'missing',
          experience_level: parsed.experience_level ? 'llm_or_heuristic_estimation' : 'missing',
          company_website_url: parsed.company_website_url ? 'listing_domain_or_llm' : 'missing',
          company_linkedin_url: parsed.company_linkedin_url ? 'html_or_llm' : 'missing',
          work_mode: workMode ? 'heuristic' : 'missing',
          years_experience: yearsExperience ? 'heuristic' : 'missing',
          tools_platforms: toolsPlatforms.length > 0 ? 'heuristic' : 'missing',
          language_requirements: languageRequirements.length > 0 ? 'heuristic' : 'missing',
        },
        fallback_logic: [
          'If HTML fetch fails, fallback to URL-only company resolution via LISTING_URL_ANALYSIS.',
          'If AI misses employment_type/experience_level, infer from listing text patterns.',
          'If AI misses company_linkedin_url, scrape company link from full HTML.',
          'If AI misses company_website_url and listing is not a job board, use listing host root URL.',
        ],
      },
      observability: {
        provider: provider.name,
        structured_output_retry_count: parseAttempt - 1,
        context_assembly: {
          html_fetched: true,
          html_chars_used: pageContent.length,
          heuristics_applied: ['employment_type', 'experience_level', 'work_mode', 'years_experience', 'tools_platforms', 'language_requirements'],
        },
        evidence_mapping_retry_count: Math.max(0, evidenceAttemptCount - 1),
      },
    }

    parsed.canonical_listing = toCanonicalListingFromParse(normalizedParse)

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
