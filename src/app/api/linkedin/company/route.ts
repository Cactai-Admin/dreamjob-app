import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { gatherCompanyData, isSessionActive } from '@/lib/linkedin/browser'
import { createAdminClient } from '@/lib/supabase/admin'

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
    .from('accounts').select('id').eq('supabase_auth_id', user.id).single()
  return account?.id ?? null
}

export async function GET(request: NextRequest) {
  const supabaseAdmin = createAdminClient()
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const listingId = searchParams.get('listing_id')
  if (!listingId) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('linkedin_connections')
    .select('name, profile_url, degree')
    .eq('listing_id', listingId)
    .eq('account_id', accountId)
    .order('degree', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ connections: null })

  const first  = data.filter(c => c.degree === 1).map(c => ({ name: c.name, profileUrl: c.profile_url }))
  const second = data.filter(c => c.degree === 2).map(c => ({ name: c.name, profileUrl: c.profile_url }))
  const third  = data.filter(c => c.degree === 3).map(c => ({ name: c.name, profileUrl: c.profile_url }))

  return NextResponse.json({
    connections: {
      first,
      second,
      third,
      counts: {
        first: first.length,
        second: second.length,
        third: third.length,
        total: data.length,
      },
    },
  })
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminClient()
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // isSessionActive checks both in-memory and saved cookies
  if (!isSessionActive(accountId)) {
    return NextResponse.json(
      { error: 'LinkedIn session not active. Connect LinkedIn in Settings first.' },
      { status: 401 }
    )
  }

  const { company_linkedin_url, company_name, listing_id, company_id } = await request.json()

  if (!company_linkedin_url) {
    return NextResponse.json({ error: 'company_linkedin_url is required' }, { status: 400 })
  }

  const { data, error } = await gatherCompanyData(accountId, company_linkedin_url, company_name)

  if (!data) {
    return NextResponse.json(
      { error: error ?? 'Failed to gather company data' },
      { status: error?.includes('session') ? 401 : 500 }
    )
  }

  // Update company record if we have one
  if (company_id) {
    await supabaseAdmin
      .from('companies')
      .update({
        description: data.description,
        industry: data.industry,
        size: data.size,
        headquarters: data.headquarters,
        website_url: data.website,
        linkedin_url: company_linkedin_url,
      })
      .eq('id', company_id)
  }

  const allConnections = [
    ...data.connections.first.map(c => ({ ...c, degree: 1 })),
    ...data.connections.second.map(c => ({ ...c, degree: 2 })),
    ...data.connections.third.map(c => ({ ...c, degree: 3 })),
  ]

  // Store connections in DB
  if (allConnections.length > 0 && listing_id) {
    // Clear old connections for this listing first
    await supabaseAdmin
      .from('linkedin_connections')
      .delete()
      .eq('listing_id', listing_id)
      .eq('account_id', accountId)

    await supabaseAdmin.from('linkedin_connections').insert(
      allConnections.map(conn => ({
        account_id: accountId,
        company_id: company_id || null,
        listing_id,
        profile_url: conn.profileUrl,
        name: conn.name,
        title: '',
        degree: conn.degree,
      }))
    )
  }

  // Surface any partial error (e.g. session expired mid-scrape)
  return NextResponse.json({
    company: {
      name: data.name,
      description: data.description,
      industry: data.industry,
      size: data.size,
      headquarters: data.headquarters,
    },
    connections: {
      first: data.connections.first,
      second: data.connections.second,
      third: data.connections.third,
      counts: {
        first: data.connections.first.length,
        second: data.connections.second.length,
        third: data.connections.third.length,
        total: allConnections.length,
      },
    },
    warning: error ?? undefined,
  })
}
