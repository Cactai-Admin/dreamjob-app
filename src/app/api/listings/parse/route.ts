import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getProvider, type ProviderName } from '@/lib/ai/provider'
import { LISTING_PARSE_SYSTEM, LISTING_URL_ANALYSIS } from '@/lib/ai/prompts/listing-parse'

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

function normalizeJsonArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

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

    // Parse with AI
    const result = await provider.generate({
      messages: [
        { role: 'system', content: LISTING_PARSE_SYSTEM },
        { role: 'user', content: `Parse this job listing content:\n\n${pageContent}` },
      ],
      temperature: 0.1,
    })

    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse listing data' }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    const signalText = [
      typeof parsed.title === 'string' ? parsed.title : '',
      typeof parsed.description === 'string' ? parsed.description : '',
      Array.isArray(parsed.requirements) ? parsed.requirements.join('\n') : typeof parsed.requirements === 'string' ? parsed.requirements : '',
      typeof parsed.responsibilities === 'string' ? parsed.responsibilities : '',
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
    if (!Array.isArray(parsed.requirements)) {
      parsed.requirements = normalizeJsonArray(parsed.requirements)
    }

    const parseQuality: 'complete' | 'partial' =
      parsed.title && parsed.company_name && (parsed.description || parsed.requirements?.length > 0)
        ? 'complete'
        : 'partial'

    parsed.parse_quality = parseQuality
    parsed.parsed_data = {
      ...((typeof parsed.parsed_data === 'object' && parsed.parsed_data !== null) ? parsed.parsed_data : {}),
      work_mode: workMode,
      years_experience: yearsExperience,
      tools_platforms: toolsPlatforms,
      language_requirements: languageRequirements,
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
    }

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
