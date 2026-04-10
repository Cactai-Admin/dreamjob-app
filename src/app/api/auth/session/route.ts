import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET() {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // Read-only in GET
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Get account record
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('supabase_auth_id', user.id)
      .single()

    if (!account) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Get roles
    const { data: roles } = await supabaseAdmin
      .from('account_roles')
      .select('*')
      .eq('account_id', account.id)
      .eq('is_active', true)

    // Determine active role (highest privilege)
    const roleHierarchy: Record<string, number> = {
      super_admin: 100, admin: 80, support: 60, user: 10, agent: 5, demo: 0
    }

    const sortedRoles = (roles ?? []).sort(
      (a, b) => (roleHierarchy[b.role] ?? 0) - (roleHierarchy[a.role] ?? 0)
    )

    const activeRole = sortedRoles[0]?.role ?? 'user'

    return NextResponse.json({
      user: {
        account,
        roles: roles ?? [],
        activeRole,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
