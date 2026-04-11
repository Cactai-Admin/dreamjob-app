import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('workflows')
    .select(`
      *,
      listing:job_listings(*),
      company:companies(*),
      outputs(*),
      status_events(*),
      qa_answers(*)
    `)
    .eq('id', id)
    .eq('account_id', accountId)
    .single()

  if (error) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  // If listing or company data is provided, update those records separately
  if (body.listing || body.company) {
    const { data: workflow } = await supabaseAdmin
      .from('workflows')
      .select('listing_id, company_id')
      .eq('id', id)
      .eq('account_id', accountId)
      .single()

    if (body.listing && workflow?.listing_id) {
      await supabaseAdmin
        .from('job_listings')
        .update(body.listing)
        .eq('id', workflow.listing_id)
    }

    if (body.company && workflow?.company_id) {
      await supabaseAdmin
        .from('companies')
        .update(body.company)
        .eq('id', workflow.company_id)
    }

    delete body.listing
    delete body.company
  }

  // Update workflow fields if any remain
  if (Object.keys(body).length > 0) {
    const { error } = await supabaseAdmin
      .from('workflows')
      .update(body)
      .eq('id', id)
      .eq('account_id', accountId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Return updated workflow with joins
  const { data, error } = await supabaseAdmin
    .from('workflows')
    .select('*, listing:job_listings(*), company:companies(*), outputs(*), status_events(*), qa_answers(*)')
    .eq('id', id)
    .eq('account_id', accountId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Soft delete — move to deleted_items with 30-day recovery
  const { data: workflow } = await supabaseAdmin
    .from('workflows')
    .select('*')
    .eq('id', id)
    .eq('account_id', accountId)
    .single()

  if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  await supabaseAdmin.from('deleted_items').insert({
    account_id: accountId,
    item_type: 'workflow',
    item_id: id,
    item_data: workflow,
    expires_at: expiresAt.toISOString(),
  })

  await supabaseAdmin.from('workflows').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
