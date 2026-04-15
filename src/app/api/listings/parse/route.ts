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

function normalizeEmploymentType(existing: unknown, sourceText: string): string | null {
  const existingValue = typeof existing === 'string' ? existing.trim() : ''
  if (existingValue) return existingValue

  for (const matcher of EMPLOYMENT_TYPE_PATTERNS) {
    if (matcher.pattern.test(sourceText)) return matcher.type
  }
  return null
}

function normalizeExperienceLevel(existing: unknown, sourceText: string): string | null {
  const existingValue = typeof existing === 'string' ? existing.trim() : ''
  if (existingValue) return existingValue

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
    try {
      const listingHost = new URL(body.url).hostname.replace(/^www\./, '')
      const isJobBoard = JOB_BOARDS.some(b => listingHost === b || listingHost.endsWith('.' + b))
      if (!isJobBoard) {
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
        // Keep only up to the company slug, strip trailing paths like /jobs/ /about/ etc
        const clean = liMatch[0].match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9_%-]+/)
        if (clean) scrapedLinkedIn = clean[0]
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
        return NextResponse.json(JSON.parse(urlResult))
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

    // Fill gaps from HTML/URL extraction when AI missed them
    if (!parsed.company_linkedin_url && scrapedLinkedIn) {
      parsed.company_linkedin_url = scrapedLinkedIn
    }
    if (!parsed.company_website_url && listingDomainUrl) {
      parsed.company_website_url = listingDomainUrl
    }
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
