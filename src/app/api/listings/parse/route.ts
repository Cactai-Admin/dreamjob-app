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
const JOB_BOARD_DOMAINS = [
  'linkedin.com', 'indeed.com', 'glassdoor.com', 'greenhouse.io', 'lever.co',
  'workday.com', 'myworkdayjobs.com', 'icims.com', 'jobvite.com', 'smartrecruiters.com',
  'recruitingbypaycor.com', 'jazz.co', 'breezy.hr', 'workable.com', 'rippling.com',
  'ashbyhq.com', 'wellfound.com', 'ziprecruiter.com', 'monster.com', 'careerbuilder.com',
]
const OUT_OF_DOMAIN_HOST_SIGNALS = ['porn', 'sex', 'xxx', 'xvideos', 'xhamster', 'onlyfans', 'redtube', 'youporn']
const DREAMJOB_INTERNAL_HOST_SIGNALS = ['dreamjob', 'localhost', '127.0.0.1', '0.0.0.0']
const DREAMJOB_WORKFLOW_PATH_SIGNALS = [
  /^\/(?:app\/)?dashboard(?:\/|$)/i,
  /^\/(?:app\/)?workflows?(?:\/|$)/i,
  /^\/(?:app\/)?jobs\/new(?:\/|$)/i,
  /^\/(?:app\/)?jobs\/[^/]+\/(?:review|analysis|start|apply)(?:\/|$)/i,
  /^\/(?:app\/)?(?:resume|cover-letter|interview|negotiation)(?:\/|$)/i,
]
const JOB_LISTING_QUERY_KEYS = ['gh_jid', 'gh_src', 'job', 'jobid', 'job_id', 'jobreq', 'requisition', 'opening', 'position']
const CLEARLY_NON_HIRING_PATH_SIGNALS = [
  /^\/(?:about|about-us|blog|docs|documentation|privacy|terms|help|support|news|press|contact|pricing|features|product|products)(?:\/|$)/i,
  /^\/(?:legal|cookie|cookies|sitemap|status)(?:\/|$)/i,
]

type IntakeClassification = 'job_listing' | 'dreamjob_action' | 'ambiguous' | 'out_of_domain'

function classifyIntakeInput(rawInput: string): {
  intake_classification: IntakeClassification
  reason: string
  cheeky_message?: string
} {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawInput)
  } catch {
    return {
      intake_classification: 'out_of_domain',
      reason: 'not_a_valid_url',
      cheeky_message: 'That doesn’t look like a job opportunity. Bring me a real listing and I’ll help you chase it.',
    }
  }

  const host = parsedUrl.hostname.replace(/^www\./, '').toLowerCase()
  const path = parsedUrl.pathname.toLowerCase()
  const full = `${host}${path}`
  const query = parsedUrl.search.toLowerCase()
  const hash = parsedUrl.hash.toLowerCase()
  const isLikelyJobBoard = JOB_BOARD_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))
  const hasJobPathSignal = /(\/jobs?\/|\/job\/|\/career|\/careers|\/openings|\/positions|\/vacanc)/i.test(path)
  const hasOutOfDomainSignal = OUT_OF_DOMAIN_HOST_SIGNALS.some((signal) => full.includes(signal))
  const hasListingQuerySignal = JOB_LISTING_QUERY_KEYS.some((key) => parsedUrl.searchParams.has(key))
  const isClearlyDreamJobInternalHost = DREAMJOB_INTERNAL_HOST_SIGNALS.some((signal) => host.includes(signal))
  const hasDreamJobWorkflowPathSignal = DREAMJOB_WORKFLOW_PATH_SIGNALS.some((pattern) => pattern.test(path))
  const hasDreamJobBrandSignal = /\bdreamjob\b/i.test(`${host}${path}${query}${hash}`)
  const hasWorkflowIntentSignal = /(workflow|qa_intake|resume|cover-letter|interview|negotiation|start-application|listing-review)/i.test(
    `${path}${query}${hash}`
  )
  const hasClearlyNonHiringPathSignal = CLEARLY_NON_HIRING_PATH_SIGNALS.some((pattern) => pattern.test(path))

  if (hasOutOfDomainSignal) {
    return {
      intake_classification: 'out_of_domain',
      reason: 'host_or_path_matches_out_of_domain_signal',
      cheeky_message: 'Naughty naughty… nice try, but let’s stay focused on getting you hired.',
    }
  }

  if (isClearlyDreamJobInternalHost || (hasDreamJobBrandSignal && (hasDreamJobWorkflowPathSignal || hasWorkflowIntentSignal))) {
    return {
      intake_classification: 'dreamjob_action',
      reason: isClearlyDreamJobInternalHost ? 'internal_dreamjob_host' : 'dreamjob_branded_workflow_url',
    }
  }

  if (isLikelyJobBoard || hasJobPathSignal || hasListingQuerySignal) {
    return {
      intake_classification: 'job_listing',
      reason: isLikelyJobBoard ? 'known_job_board_domain' : hasJobPathSignal ? 'job_path_signal' : 'job_listing_query_signal',
    }
  }

  if (hasClearlyNonHiringPathSignal) {
    return {
      intake_classification: 'out_of_domain',
      reason: 'clearly_non_hiring_page_path',
      cheeky_message: 'That URL doesn’t look like a hiring listing. Paste the actual job post and I’ll break it down.',
    }
  }

  return {
    intake_classification: 'ambiguous',
    reason: 'unknown_domain_or_path',
  }
}

function detectNumericSignal(text: string): string | null {
  const match = text.match(/\b(\d{1,3}(?:\+|-\d{1,3})?\s*(?:years?|yrs?|%|percent|people|person|team|direct reports?|accounts?|customers?|acv|quota|travel)|\$\s?\d[\d,.]*(?:\s?[kKmM])?(?:\s*(?:-|to|–)\s*\$\s?\d[\d,.]*(?:\s?[kKmM])?)?)\b/i)
  return match ? match[0].replace(/\s+/g, ' ').trim() : null
}

function inferRequirementType(text: string): ParsedListingRequirement['requirement_type'] {
  const normalized = text.toLowerCase()
  if (/\b(english|spanish|french|german|mandarin|bilingual|fluency)\b/.test(normalized)) return 'language'
  if (/\b(aws|azure|gcp|python|typescript|react|next\.js|salesforce|sql|tableau|snowflake|excel)\b/.test(normalized)) return 'tool'
  if (/\b(lead|manage|mentor|team|direct reports?|cross-functional|stakeholder)\b/.test(normalized)) return 'leadership'
  if (/\b(years?|experience|quota|acv|pipeline|close|track record)\b/.test(normalized)) return 'experience'
  if (/\b(senior|staff|principal|director|manager|vp|head of)\b/.test(normalized)) return 'seniority'
  if (/\b(fintech|healthcare|saas|enterprise|b2b|b2c|public sector)\b/.test(normalized)) return 'domain'
  if (/\b(responsible|build|own|deliver|collaborate|execute)\b/.test(normalized)) return 'responsibility'
  if (/\b(culture|attitude|self-starter|fast-paced|communication)\b/.test(normalized)) return 'culture'
  if (/\b(degree|certification|license|clearance)\b/.test(normalized)) return 'qualification'
  return 'other'
}

function classifyPriority(text: string, kind: ParsedListingRequirement['kind']): {
  priority: ParsedListingRequirement['priority']
  priority_weight: number
} {
  const normalized = text.toLowerCase()
  if (/\b(must|required|minimum|non-negotiable)\b/.test(normalized) || /\b\d+\+?\s*(years?|yrs?)\b/.test(normalized)) {
    return { priority: 'essential', priority_weight: 0.95 }
  }
  if (kind === 'nice_to_have' || /\b(preferred|bonus|nice to have|plus)\b/.test(normalized)) {
    return { priority: 'secondary', priority_weight: 0.45 }
  }
  if (/\b(strong|proven|demonstrated|track record|ownership|quota|acv)\b/.test(normalized)) {
    return { priority: 'important', priority_weight: 0.8 }
  }
  if (/\b(team player|fast-paced|communication skills|detail-oriented|positive attitude)\b/.test(normalized)) {
    return { priority: 'suppressible', priority_weight: 0.2 }
  }
  return { priority: 'important', priority_weight: 0.7 }
}

function inferSuppression(text: string): {
  user_facing_relevance: ParsedListingRequirement['user_facing_relevance']
  suppression_reason: string | null
  force_user_suppression: boolean
} {
  const normalized = text.toLowerCase()
  if (/\b(english|english fluency|fluent in english|cefr|ilr)\b/.test(normalized)) {
    return {
      user_facing_relevance: 'suppress',
      suppression_reason: 'already_evident_english_fluency',
      force_user_suppression: true,
    }
  }
  if (/\b(team player|culture fit|fast-paced|strong communication skills|self-starter|positive attitude)\b/.test(normalized)) {
    return { user_facing_relevance: 'suppress', suppression_reason: 'low_signal_generic_phrase', force_user_suppression: false }
  }
  return { user_facing_relevance: 'show', suppression_reason: null, force_user_suppression: false }
}

function inferEvidenceNeeded(text: string, requirementType: ParsedListingRequirement['requirement_type']): string | null {
  if (requirementType === 'experience') return 'Quantified outcomes from prior roles with matching scope'
  if (requirementType === 'tool') return 'Specific tool/platform usage in shipped work'
  if (requirementType === 'leadership') return 'Examples of team leadership, cross-functional delivery, and measurable impact'
  if (requirementType === 'language') return 'Only surface if role context truly requires multilingual capability'
  if (requirementType === 'qualification') return 'Credential details and practical proof of application'
  if (/\b(quota|acv|pipeline|revenue|close)\b/i.test(text)) return 'Revenue metrics and attainment evidence'
  return 'Concrete, role-relevant evidence from resume or work history'
}

function applyRequirementIntelligence(requirements: ParsedListingRequirement[]): ParsedListingRequirement[] {
  return requirements.map((requirement) => {
    const requirementType = requirement.requirement_type ?? inferRequirementType(requirement.text)
    const priority = classifyPriority(requirement.text, requirement.kind)
    const suppression = inferSuppression(requirement.text)
    const numericSignal = requirement.numeric_signal ?? detectNumericSignal(requirement.text)
    const defaultShowDecision = priority.priority === 'suppressible' ? 'suppress' : 'show'

    return {
      ...requirement,
      requirement_type: requirementType,
      priority: requirement.priority ?? priority.priority,
      priority_weight:
        typeof requirement.priority_weight === 'number' && Number.isFinite(requirement.priority_weight)
          ? requirement.priority_weight
          : priority.priority_weight,
      evidence_needed: requirement.evidence_needed ?? inferEvidenceNeeded(requirement.text, requirementType),
      user_facing_relevance:
        suppression.force_user_suppression
          ? suppression.user_facing_relevance
          : requirement.user_facing_relevance ?? suppression.user_facing_relevance ?? defaultShowDecision,
      suppression_reason:
        suppression.force_user_suppression
          ? suppression.suppression_reason
          : requirement.suppression_reason ?? suppression.suppression_reason,
      numeric_signal: numericSignal,
    }
  })
}

const COMPENSATION_MONEY_PATTERN = /(?:\$|usd|cad|eur|gbp)\s?\d[\d,.]*(?:\s?[kKmM])?(?:\s*(?:-|to|–)\s*(?:\$|usd|cad|eur|gbp)?\s?\d[\d,.]*(?:\s?[kKmM])?)?/i
const COMPENSATION_RATE_PATTERN = /\b(?:per\s*(?:year|annum|hour|hr)|hourly|annual(?:ly)?|salary|base pay|pay range|compensation|ote|on-target earnings)\b/i
const COMPENSATION_CONTAMINATION_PATTERN = /\b(?:og:title|og:description|meta\s+name=|<meta|<title|<\/|<script|job description|about us|founded in|mission)\b/i

function sanitizeCompensationText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized || normalized.length > 220) return null
  if (COMPENSATION_CONTAMINATION_PATTERN.test(normalized)) return null
  const hasMoney = COMPENSATION_MONEY_PATTERN.test(normalized)
  const hasRateSignal = COMPENSATION_RATE_PATTERN.test(normalized)
  if (!hasMoney && !hasRateSignal) return null
  if (hasRateSignal && normalized.split(' ').length <= 3 && !hasMoney) return null
  return normalized
}

function extractCompensationDetails(sourceText: string): {
  compensation: string | null
  details: {
    pay_type: 'annual' | 'hourly' | 'unknown'
    has_bonus: boolean
    has_equity: boolean
    has_variable_pay: boolean
    transparency_note: string | null
    location_qualifier: string | null
  }
} {
  const snippets = sourceText.match(/([^\n]{0,90}(?:salary|compensation|pay range|base pay|hourly|ote|on-target earnings|commission|bonus|equity|total compensation)[^\n]{0,160})/gi) ?? []
  const normalizedSnippets = [...new Set(snippets.map((item) => sanitizeCompensationText(item)).filter((item): item is string => Boolean(item)))].slice(0, 3)
  const combined = sanitizeCompensationText(normalizedSnippets.join(' | ').slice(0, 320))
  const payType: 'annual' | 'hourly' | 'unknown' =
    /\b(hour|hourly|hr)\b/i.test(sourceText) ? 'hourly' : /\b(year|annual|annually|per year)\b/i.test(sourceText) ? 'annual' : 'unknown'
  const transparencyNote = /\b(pay transparency|salary may vary|depending on location|based on location|depending on experience)\b/i.test(sourceText)
    ? 'Listing includes pay-transparency or variability qualifiers.'
    : null
  const locationQualifierMatch = sourceText.match(/\b(?:for|in)\s+(?:new york|san francisco|los angeles|seattle|austin|remote|us|usa|california|nyc)[^.\n]{0,60}\b/gi)

  return {
    compensation: combined,
    details: {
      pay_type: payType,
      has_bonus: /\bbonus\b/i.test(sourceText),
      has_equity: /\bequity|stock|rsu|options?\b/i.test(sourceText),
      has_variable_pay: /\bcommission|variable compensation|ote|on-target earnings\b/i.test(sourceText),
      transparency_note: transparencyNote,
      location_qualifier: locationQualifierMatch?.[0]?.trim() ?? null,
    },
  }
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

function trimLine(value: string): string {
  return value
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/^\s*\(?\d{1,3}[.)]\s+/, '')
    .replace(/^\s*[a-zA-Z][.)]\s+/, '')
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

    const intake = classifyIntakeInput(String(body.url))
    if (intake.intake_classification === 'out_of_domain') {
      return NextResponse.json(
        {
          error: intake.cheeky_message ?? 'Wrong mission for this app. DreamJob is here to help you win the right opportunity.',
          intake_classification: intake.intake_classification,
          intake_reason: intake.reason,
        },
        { status: 422 }
      )
    }

    if (intake.intake_classification === 'dreamjob_action') {
      return NextResponse.json(
        {
          error: 'That link looks like a DreamJob workflow action, not a job listing. Paste the actual listing URL.',
          intake_classification: intake.intake_classification,
          intake_reason: intake.reason,
        },
        { status: 400 }
      )
    }

    const providerName = body.provider as ProviderName | undefined
    const provider = getProvider(providerName)
    if (!provider.isConfigured()) {
      return NextResponse.json(
        { error: 'No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.' },
        { status: 503 }
      )
    }

    // Derive company website from listing URL if it's on the company's own domain
    let listingDomainUrl: string | null = null
    let listingHost: string | null = null
    let listingIsJobBoard = false
    try {
      listingHost = new URL(body.url).hostname.replace(/^www\./, '')
      listingIsJobBoard = JOB_BOARD_DOMAINS.some((b) => listingHost === b || listingHost?.endsWith('.' + b))
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
      compensation: sanitizeCompensationText(parsed.salary_range ?? parsed.compensation),
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

    const compensationHeuristic = extractCompensationDetails(signalText)
    const enrichedRequirements = applyRequirementIntelligence(normalizedPassOne.requirements)
    const enrichedPassOne = normalizeParsedListing({
      ...normalizedPassOne,
      compensation: sanitizeCompensationText(normalizedPassOne.compensation) ?? compensationHeuristic.compensation,
      requirements: enrichedRequirements,
    })

    const parsedRequirementsCount = enrichedPassOne.requirements.length
    const parseQuality: 'complete' | 'partial' =
      Boolean(enrichedPassOne.title) && Boolean(enrichedPassOne.company_name) && (Boolean(enrichedPassOne.summary) || parsedRequirementsCount > 0)
        ? 'complete'
        : 'partial'

    // Pass 2: map requirements to listing-grounded evidence strings (fallback: deterministic cleanup)
    let evidenceMap = buildDeterministicEvidenceMap(enrichedPassOne.requirements, signalText)
    let evidenceAttemptCount = 0
    if (enrichedPassOne.requirements.length > 0) {
      for (let evidenceAttempt = 1; evidenceAttempt <= 2; evidenceAttempt += 1) {
        evidenceAttemptCount = evidenceAttempt
        const evidenceRaw = await provider.generate({
          messages: [
            { role: 'system', content: LISTING_EVIDENCE_MAP_SYSTEM },
            {
              role: 'user',
              content: JSON.stringify({
                listing_excerpt: pageContent.slice(0, 12000),
                requirements: enrichedPassOne.requirements.map((item) => ({
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
            ...enrichedPassOne,
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
      title: enrichedPassOne.title,
      company_name: enrichedPassOne.company_name,
      company_website_url: parsed.company_website_url,
      company_linkedin_url: parsed.company_linkedin_url,
      location: enrichedPassOne.location,
      compensation: enrichedPassOne.compensation,
      employment_type: enrichedPassOne.employment_type,
      experience_level: enrichedPassOne.experience_level,
      work_mode: workMode,
      summary: enrichedPassOne.summary,
      requirements: enrichedPassOne.requirements,
      responsibilities: enrichedPassOne.responsibilities,
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
          intake_classification: intake.intake_classification,
          intake_reason: intake.reason,
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
          compensation_details: compensationHeuristic.compensation ? 'heuristic_or_llm' : 'missing',
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
      intake_classification: intake.intake_classification,
      compensation_details: compensationHeuristic.details,
    }

    parsed.canonical_listing = toCanonicalListingFromParse(normalizedParse)

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
