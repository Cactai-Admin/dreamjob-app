import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Account, AccountRole, UserRole } from '@/types/database'
import type { SessionUser } from '@/types/auth'

export type { SessionUser }

/**
 * Get the current Supabase auth session.
 * Returns the session or null if not authenticated.
 */
export async function getSession() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

/**
 * Get the account record for the currently authenticated user.
 * Looks up the account by supabase_auth_id from the session.
 */
export async function getAccount(): Promise<Account | null> {
  const session = await getSession()
  if (!session?.user) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('supabase_auth_id', session.user.id)
    .single()

  return data as Account | null
}

/**
 * Require that the user is authenticated.
 * Redirects to /auth/login if not. Returns the full SessionUser.
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession()
  if (!session?.user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()

  const { data: account } = await supabase
    .from('accounts')
    .select('*')
    .eq('supabase_auth_id', session.user.id)
    .single()

  if (!account) {
    redirect('/auth/login')
  }

  const { data: roles } = await supabase
    .from('account_roles')
    .select('*')
    .eq('account_id', account.id)
    .eq('is_active', true)

  const accountRoles = (roles ?? []) as AccountRole[]
  const activeRole: UserRole =
    accountRoles.length > 0 ? accountRoles[0].role : 'user'

  return {
    account: account as Account,
    roles: accountRoles,
    activeRole,
  }
}

/**
 * Require that the authenticated user has a specific role.
 * Redirects to /auth/login if not authenticated, or /dashboard if
 * the user lacks the required role.
 */
export async function requireRole(role: UserRole): Promise<SessionUser> {
  const sessionUser = await requireAuth()

  const hasRole = sessionUser.roles.some((r) => r.role === role)
  if (!hasRole) {
    redirect('/dashboard')
  }

  return { ...sessionUser, activeRole: role }
}
