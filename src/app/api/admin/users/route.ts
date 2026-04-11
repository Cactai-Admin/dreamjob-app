import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getAdminClient } from '@/lib/supabase/admin'

const supabaseAdmin = getAdminClient()

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Look up account and verify admin role
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('supabase_auth_id', user.id)
      .single()

    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: roles } = await supabaseAdmin
      .from('account_roles')
      .select('role')
      .eq('account_id', account.id)
      .eq('is_active', true)

    const isAdmin = (roles ?? []).some(r => ['super_admin', 'admin'].includes(r.role))
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Fetch all accounts with their roles
    const { data: accounts, error } = await supabaseAdmin
      .from('accounts')
      .select('*, account_roles!account_roles_account_id_fkey(*)')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(accounts)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
