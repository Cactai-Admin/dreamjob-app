import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { gatherCompanyData, isSessionActive } from '@/lib/linkedin/browser'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

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

export async function POST(request: NextRequest) {
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
