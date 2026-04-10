import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

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
    .from('accounts')
    .select('id')
    .eq('supabase_auth_id', user.id)
    .single()

  return account?.id ?? null
}

export async function GET() {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('workflows')
    .select(`
      *,
      listing:job_listings(*),
      company:companies(*)
    `)
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check one-active-workflow rule
  const { data: existing } = await supabaseAdmin
    .from('workflows')
    .select('id')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .not('state', 'in', '("sent","completed","archived")')

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: 'You already have an active workflow. Complete or archive it before starting a new one.' },
      { status: 409 }
    )
  }

  const body = await request.json()
  const { listing_url, company_name, title, description, requirements } = body

  // Create or find company
  let companyId: string | null = null
  if (company_name) {
    const { data: existingCompany } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('name', company_name)
      .single()

    if (existingCompany) {
      companyId = existingCompany.id
    } else {
      const { data: newCompany } = await supabaseAdmin
        .from('companies')
        .insert({ name: company_name, created_by: accountId })
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
      requirements: requirements || null,
      created_by: accountId,
    })
    .select()
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
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
