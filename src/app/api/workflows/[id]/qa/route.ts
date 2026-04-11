import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseAdmin = createAdminClient()
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('qa_answers')
    .select('*')
    .eq('workflow_id', id)
    .eq('account_id', accountId)
    .order('sequence_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseAdmin = createAdminClient()
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  // Get current max sequence order
  const { data: existing } = await supabaseAdmin
    .from('qa_answers')
    .select('sequence_order')
    .eq('workflow_id', id)
    .order('sequence_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sequence_order ?? -1) + 1

  const { data, error } = await supabaseAdmin
    .from('qa_answers')
    .insert({
      ...body,
      workflow_id: id,
      account_id: accountId,
      sequence_order: nextOrder,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Update workflow state if first QA answer
  if (nextOrder === 0) {
    await supabaseAdmin
      .from('workflows')
      .update({ state: 'qa_intake', qa_started_at: new Date().toISOString() })
      .eq('id', id)
  }

  return NextResponse.json(data, { status: 201 })
}
