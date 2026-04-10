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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('sent_snapshots')
    .select('*')
    .eq('workflow_id', id)
    .eq('account_id', accountId)
    .order('sent_at', { ascending: false })

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
  const { method } = body

  // Get current outputs for this workflow
  const { data: outputs, error: outputsError } = await supabaseAdmin
    .from('outputs')
    .select('*')
    .eq('workflow_id', id)
    .eq('account_id', accountId)
    .eq('is_current', true)

  if (outputsError || !outputs || outputs.length === 0) {
    return NextResponse.json({ error: 'No outputs found to snapshot' }, { status: 404 })
  }

  // Create a snapshot for each current output
  const snapshots = outputs.map(output => ({
    workflow_id: id,
    account_id: accountId,
    output_id: output.id,
    type: output.type,
    content: output.content,
    html_content: output.html_content,
    method: method || 'manual',
  }))

  const { data, error } = await supabaseAdmin
    .from('sent_snapshots')
    .insert(snapshots)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
