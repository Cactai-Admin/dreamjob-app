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

    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('supabase_auth_id', user.id)
      .single()

    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check one-active-workflow rule
    const { data: existing } = await supabaseAdmin
      .from('workflows')
      .select('id, title, state')
      .eq('account_id', account.id)
      .eq('is_active', true)
      .not('state', 'in', '("sent","completed","archived")')

    if (existing && existing.length > 0) {
      return NextResponse.json({
        available: false,
        reason: 'You already have an active workflow. Complete or archive it before starting a new one.',
        active_workflow: existing[0],
      })
    }

    return NextResponse.json({ available: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
