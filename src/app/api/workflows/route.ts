import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getProvider } from '@/lib/ai/provider'
import { getAdminClient } from '@/lib/supabase/admin'

const supabaseAdmin = getAdminClient()

async function getAccountId() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: account } = await supabaseAdmin
    .from('accounts')
    .select('id')
    .eq('supabase_auth_id', user.id)
    .single()

  return account?.id ?? null
}

export async function GET(request: NextRequest) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const stateFilter = searchParams.get('state')

  let query = supabaseAdmin
    .from('workflows')
    .select(`
      *,
      listing:job_listings(*),
      company:companies(*),
      outputs(*),
      status_events(*)
    `)
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (stateFilter) {
    // e.g. ?state=listing_review  or  ?state=!listing_review  (exclude)
    if (stateFilter.startsWith('!')) {
      query = query.neq('state', stateFilter.slice(1))
    } else {
      query = query.eq('state', stateFilter)
    }
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    listing_url,
    company_name,
    title,
    description,
    requirements: rawRequirements,
    location,
    salary_range,
    employment_type,
    experience_level,
    responsibilities,
    benefits,
    company_website_url,
    company_linkedin_url,
    parsed_data,
  } = body

  // Normalize requirements: accept string or array
  let requirements: string[] | null = null
  if (Array.isArray(rawRequirements)) {
    requirements = rawRequirements.filter(Boolean)
  } else if (typeof rawRequirements === 'string' && rawRequirements.trim()) {
    requirements = rawRequirements.split(/\n|;/).map((s: string) => s.trim()).filter(Boolean)
  }

  function normalizeCompanyKey(value: string | null | undefined): string {
    return (value ?? '')
      .toLowerCase()
      .replace(/\b(inc|llc|ltd|corp|corporation|co|company)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim()
  }

  function normalizeUrlHost(url: string | null | undefined): string | null {
    if (!url) return null
    try {
      return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
    } catch {
      return null
    }
  }

  // If no company website URL was parsed, try to discover it via AI
  let resolvedWebsiteUrl: string | null = company_website_url || null
  if (!resolvedWebsiteUrl && company_name) {
    try {
      const provider = getProvider()
      if (provider.isConfigured()) {
        const aiResponse = await provider.generate({
          messages: [
            { role: 'system', content: 'You are a research assistant. Return only the exact URL requested — no explanation, no markdown, no punctuation.' },
            { role: 'user', content: `What is the official company website URL for "${company_name}"?${description ? `\n\nContext: ${description.slice(0, 300)}` : ''}\n\nReturn only the URL (e.g. https://example.com). If you are not confident, return your best guess anyway.` },
          ],
          maxTokens: 100,
          temperature: 0,
        })
        const match = aiResponse.trim().match(/https?:\/\/[^\s"'<>]+/)
        if (match) resolvedWebsiteUrl = match[0].replace(/[.,)]+$/, '')
      }
    } catch { /* non-critical — proceed without website URL */ }
  }

  // Create or find company
  let companyId: string | null = null
  if (company_name) {
    const normalizedCompanyName = normalizeCompanyKey(company_name)
    const linkedinHost = normalizeUrlHost(company_linkedin_url)
    const websiteHost = normalizeUrlHost(resolvedWebsiteUrl)

    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id, name, website_url, linkedin_url')
      .limit(500)

    const existingCompany = (companies ?? []).find((company) => {
      const candidateName = normalizeCompanyKey(company.name)
      const candidateWebsiteHost = normalizeUrlHost(company.website_url)
      const candidateLinkedInHost = normalizeUrlHost(company.linkedin_url)
      if (candidateName && normalizedCompanyName && candidateName === normalizedCompanyName) return true
      if (websiteHost && candidateWebsiteHost && websiteHost === candidateWebsiteHost) return true
      if (linkedinHost && candidateLinkedInHost && linkedinHost === candidateLinkedInHost) return true
      return false
    })

    if (existingCompany?.id) {
      companyId = existingCompany.id
      // Update website/linkedin if we have new info
      if (resolvedWebsiteUrl || company_linkedin_url) {
        await supabaseAdmin.from('companies').update({
          ...(resolvedWebsiteUrl ? { website_url: resolvedWebsiteUrl } : {}),
          ...(company_linkedin_url ? { linkedin_url: company_linkedin_url } : {}),
        }).eq('id', companyId)
      }
    } else {
      const { data: newCompany } = await supabaseAdmin
        .from('companies')
        .insert({
          name: company_name,
          created_by: accountId,
          ...(resolvedWebsiteUrl ? { website_url: resolvedWebsiteUrl } : {}),
          ...(company_linkedin_url ? { linkedin_url: company_linkedin_url } : {}),
        })
        .select()
        .single()
      companyId = newCompany?.id ?? null
    }
  }

  // Create listing
  const { data: listing, error: listingError } = await supabaseAdmin
    .from('job_listings')
    .insert({
      source_url: listing_url || null,
      title: title || 'Untitled Position',
      company_name: company_name || 'Unknown Company',
      company_id: companyId,
      description: description || null,
      requirements: requirements && requirements.length > 0 ? JSON.stringify(requirements) : null,
      location: location || null,
      salary_range: salary_range || null,
      employment_type: employment_type || null,
      experience_level: experience_level || null,
      responsibilities: responsibilities || null,
      benefits: benefits || null,
      company_website_url: resolvedWebsiteUrl || null,
      parsed_data: parsed_data && typeof parsed_data === 'object' ? parsed_data : null,
      created_by: accountId,
    })
    .select()
    .single()

  if (listingError || !listing) {
    console.error('[POST /api/workflows] listing insert error:', listingError)
    return NextResponse.json({ error: listingError?.message ?? 'Failed to create listing' }, { status: 500 })
  }

  // Create workflow
  const { data: workflow, error: workflowError } = await supabaseAdmin
    .from('workflows')
    .insert({
      account_id: accountId,
      listing_id: listing.id,
      company_id: companyId,
      title: `${company_name || 'Unknown'} - ${title || 'Untitled'}`,
      state: 'listing_review',
    })
    .select(`
      *,
      listing:job_listings(*),
      company:companies(*)
    `)
    .single()

  if (workflowError || !workflow) {
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
  }

  // Log analytics event
  await supabaseAdmin.from('analytics_events').insert({
    account_id: accountId,
    event_type: 'workflow_created',
    event_data: { workflow_id: workflow.id },
  })

  return NextResponse.json(workflow, { status: 201 })
}
