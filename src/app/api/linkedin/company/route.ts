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

  if (!isSessionActive(accountId)) {
    return NextResponse.json(
      { error: 'LinkedIn session not active. Please sign in to LinkedIn first.' },
      { status: 400 }
    )
  }

  const { company_linkedin_url, listing_id, company_id } = await request.json()

  if (!company_linkedin_url) {
    return NextResponse.json({ error: 'company_linkedin_url is required' }, { status: 400 })
  }

  const data = await gatherCompanyData(accountId, company_linkedin_url)

  if (!data) {
    return NextResponse.json({ error: 'Failed to gather company data' }, { status: 500 })
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

  // Store connections
  if (data.connections.length > 0 && listing_id) {
    const connectionInserts = data.connections.map(conn => ({
      account_id: accountId,
      company_id: company_id || null,
      listing_id,
      profile_url: conn.profileUrl,
      name: conn.name,
      title: conn.title,
      degree: conn.degree,
    }))

    await supabaseAdmin.from('linkedin_connections').insert(connectionInserts)
  }

  // Store insights
  if (listing_id) {
    const insightInserts = []

    if (data.recentPosts.length > 0) {
      insightInserts.push({
        workflow_id: listing_id, // Will need to be resolved to actual workflow_id
        listing_id,
        type: 'company_update',
        title: `${data.name} Recent Activity`,
        content: data.recentPosts.map(p => p.text).join('\n\n'),
        data: { posts: data.recentPosts },
      })
    }

    for (const conn of data.connections.filter(c => c.degree === 1)) {
      insightInserts.push({
        workflow_id: listing_id,
        listing_id,
        type: 'connection',
        title: `1st degree connection: ${conn.name}`,
        content: `${conn.name} - ${conn.title}`,
        source_url: conn.profileUrl,
        data: conn,
      })
    }
  }

  return NextResponse.json({
    company: {
      name: data.name,
      description: data.description,
      industry: data.industry,
      size: data.size,
      headquarters: data.headquarters,
    },
    connections: {
      first_degree: data.connections.filter(c => c.degree === 1).length,
      second_degree: data.connections.filter(c => c.degree === 2).length,
      third_degree: data.connections.filter(c => c.degree === 3).length,
      total: data.connections.length,
    },
    recent_posts: data.recentPosts.length,
  })
}
