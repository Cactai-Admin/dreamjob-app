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
    .from('accounts').select('id').eq('supabase_auth_id', user.id).single()
  return account?.id ?? null
}

// POST - Restore item
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: item } = await supabaseAdmin
    .from('deleted_items')
    .select('*')
    .eq('id', id)
    .eq('account_id', accountId)
    .is('restored_at', null)
    .is('final_deleted_at', null)
    .single()

  if (!item) return NextResponse.json({ error: 'Item not found or already restored' }, { status: 404 })

  // Check if recovery window has expired
  if (new Date(item.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Recovery window has expired' }, { status: 410 })
  }

  // For workflow restore, check one-active-workflow rule
  if (item.item_type === 'workflow') {
    const { data: activeWorkflows } = await supabaseAdmin
      .from('workflows')
      .select('id')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .not('state', 'in', '("sent","completed","archived")')

    if (activeWorkflows && activeWorkflows.length > 0) {
      return NextResponse.json(
        { error: 'Cannot restore workflow while another active workflow exists' },
        { status: 409 }
      )
    }
  }

  // Restore the item to its original table
  const { error: insertError } = await supabaseAdmin
    .from(getTableName(item.item_type))
    .insert(item.item_data)

  if (insertError) {
    return NextResponse.json({ error: `Restore failed: ${insertError.message}` }, { status: 500 })
  }

  // Mark as restored
  await supabaseAdmin
    .from('deleted_items')
    .update({ restored_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ success: true })
}

// DELETE - Permanently delete
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await supabaseAdmin
    .from('deleted_items')
    .update({ final_deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('account_id', accountId)

  return NextResponse.json({ success: true })
}

function getTableName(itemType: string): string {
  const map: Record<string, string> = {
    workflow: 'workflows',
    output: 'outputs',
    evidence: 'evidence_library',
    employment: 'employment_history',
    artifact: 'artifacts',
    profile_memory: 'profile_memory',
  }
  return map[itemType] || itemType
}
