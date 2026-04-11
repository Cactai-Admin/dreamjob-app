import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAdminClient } from '@/lib/supabase/admin'

const supabaseAdmin = getAdminClient()

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if account already exists
    const { data: existing } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('supabase_auth_id', user.id)
      .single()

    if (existing) {
      return response
    }

    // Create account for OAuth user
    const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
    const avatarUrl = user.user_metadata?.avatar_url || null

    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .insert({
        supabase_auth_id: user.id,
        email: user.email!,
        display_name: displayName,
        avatar_url: avatarUrl,
        provider: 'google',
        state: 'active',
        activated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }

    // Assign default user role
    await supabaseAdmin.from('account_roles').insert({
      account_id: account.id,
      role: 'user',
      is_active: true,
    })

    // Create profile
    await supabaseAdmin.from('profiles').insert({
      account_id: account.id,
      first_name: user.user_metadata?.given_name || null,
      last_name: user.user_metadata?.family_name || null,
    })

    // Create default preferences
    await supabaseAdmin.from('user_preferences').insert({
      account_id: account.id,
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
