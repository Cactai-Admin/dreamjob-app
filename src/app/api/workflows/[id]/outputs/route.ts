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
    .from('outputs')
    .select('*')
    .eq('workflow_id', id)
    .eq('account_id', accountId)
    .eq('is_current', true)
    .order('type')

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

  // Mark previous versions as non-current
  if (body.type) {
    await supabaseAdmin
      .from('outputs')
      .update({ is_current: false })
      .eq('workflow_id', id)
      .eq('type', body.type)
      .eq('is_current', true)
  }

  // Get next version number
  const { data: versions } = await supabaseAdmin
    .from('outputs')
    .select('version')
    .eq('workflow_id', id)
    .eq('type', body.type)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = (versions?.[0]?.version ?? 0) + 1

  const { data, error } = await supabaseAdmin
    .from('outputs')
    .insert({
      ...body,
      workflow_id: id,
      account_id: accountId,
      version: nextVersion,
      is_current: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
