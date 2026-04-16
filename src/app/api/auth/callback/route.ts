import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/types/database'

const supabaseAdmin = getAdminClient()
const INTERNAL_ONLY_ROLES: UserRole[] = ['super_admin', 'admin', 'demo']

async function ensureAccountScaffolding(accountId: string) {
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('account_id', accountId)
    .single()

  if (!existingProfile) {
    await supabaseAdmin.from('profiles').insert({
      account_id: accountId,
    })
  }

  const { data: existingPreferences } = await supabaseAdmin
    .from('user_preferences')
    .select('id')
    .eq('account_id', accountId)
    .single()

  if (!existingPreferences) {
    await supabaseAdmin.from('user_preferences').insert({
      account_id: accountId,
    })
  }
}

async function getActiveRoles(accountId: string): Promise<UserRole[]> {
  const { data: roles } = await supabaseAdmin
    .from('account_roles')
    .select('role')
    .eq('account_id', accountId)
    .eq('is_active', true)

  return (roles ?? []).map((row) => row.role as UserRole)
}

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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id || !user.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: existingByAuthId } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('supabase_auth_id', user.id)
      .single()

    if (existingByAuthId) {
      await ensureAccountScaffolding(existingByAuthId.id)
      return response
    }

    const { data: existingByEmail } = await supabaseAdmin
      .from('accounts')
      .select('id, provider, supabase_auth_id')
      .eq('email', user.email)
      .single()

    if (existingByEmail) {
      const existingRoles = await getActiveRoles(existingByEmail.id)

      if (
        existingByEmail.provider === 'internal' ||
        existingRoles.some((role) => INTERNAL_ONLY_ROLES.includes(role))
      ) {
        return NextResponse.json({ error: 'oauth_account_not_allowed' }, { status: 403 })
      }

      if (!existingByEmail.supabase_auth_id) {
        const { error: updateError } = await supabaseAdmin
          .from('accounts')
          .update({
            supabase_auth_id: user.id,
            provider: 'google',
            state: 'active',
            activated_at: new Date().toISOString(),
          })
          .eq('id', existingByEmail.id)

        if (updateError) {
          return NextResponse.json({ error: 'Failed to link account' }, { status: 500 })
        }
      }

      await ensureAccountScaffolding(existingByEmail.id)
      return response
    }

    const displayName = user.user_metadata?.full_name || user.email.split('@')[0] || 'User'
    const avatarUrl = user.user_metadata?.avatar_url || null

    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .insert({
        supabase_auth_id: user.id,
        email: user.email,
        display_name: displayName,
        avatar_url: avatarUrl,
        provider: 'google',
        state: 'active',
        activated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }

    await supabaseAdmin.from('account_roles').insert({
      account_id: account.id,
      role: 'user',
      is_active: true,
    })

    await supabaseAdmin.from('profiles').insert({
      account_id: account.id,
      first_name: user.user_metadata?.given_name || null,
      last_name: user.user_metadata?.family_name || null,
    })

    await supabaseAdmin.from('user_preferences').insert({
      account_id: account.id,
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
