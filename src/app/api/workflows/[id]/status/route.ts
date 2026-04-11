import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getAdminClient } from '@/lib/supabase/admin'

const supabaseAdmin = getAdminClient()

// No enforced dependencies — UI handles progression order

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('status_events')
    .select('*')
    .eq('workflow_id', id)
    .eq('account_id', accountId)
    .order('occurred_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { event_type, notes } = body

  const { data, error } = await supabaseAdmin
    .from('status_events')
    .insert({
      workflow_id: id,
      account_id: accountId,
      event_type,
      notes,
      is_current: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Update workflow state if needed
  if (event_type === 'sent') {
    await supabaseAdmin
      .from('workflows')
      .update({ state: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id)
  } else if (event_type === 'hired') {
    await supabaseAdmin
      .from('workflows')
      .update({ state: 'completed' })
      .eq('id', id)
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const eventType = searchParams.get('event_type')

  // No event_type (or 'all') → clear all events, resetting to draft
  const query = supabaseAdmin
    .from('status_events')
    .delete()
    .eq('workflow_id', id)
    .eq('account_id', accountId)

  if (eventType && eventType !== 'all') query.eq('event_type', eventType)

  const { error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also reset workflow state to draft when clearing all events
  if (!eventType || eventType === 'all') {
    await supabaseAdmin
      .from('workflows')
      .update({ state: 'draft' })
      .eq('id', id)
  }

  return NextResponse.json({ ok: true })
}
