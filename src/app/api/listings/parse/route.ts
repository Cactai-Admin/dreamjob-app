import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getProvider, type ProviderName } from '@/lib/ai/provider'
import { LISTING_PARSE_SYSTEM, LISTING_URL_ANALYSIS } from '@/lib/ai/prompts/listing-parse'

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
        return NextResponse.json({ error: 'Could not fetch or analyze the listing URL' }, { status: 422 })
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
