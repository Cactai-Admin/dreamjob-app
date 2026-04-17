import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getAdminClient } from '@/lib/supabase/admin'
import {
  launchLinkedInBrowser,
  verifyLinkedInSession,
  revokeLinkedInSession,
  isSessionActive,
  getLinkedInRuntimeCapability,
} from '@/lib/linkedin/browser'

const supabaseAdmin = getAdminClient()

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

// GET — Check session status
export async function GET() {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const capability = getLinkedInRuntimeCapability()
  const active = isSessionActive(accountId)

  const { data: session } = await supabaseAdmin
    .from('linkedin_sessions')
    .select('*')
    .eq('account_id', accountId)
    .single()

  return NextResponse.json({
    isAuthenticated: capability.canLaunchInteractiveSession ? active : false,
    session,
    runtime: capability,
    persistedAuth: Boolean(session?.is_authenticated),
  })
}

// POST — Launch browser or verify session
export async function POST(request: NextRequest) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await request.json()
  const capability = getLinkedInRuntimeCapability()

  if (action === 'launch') {
    if (!capability.canLaunchInteractiveSession) {
      return NextResponse.json(
        { success: false, message: capability.reason ?? 'LinkedIn launch is unavailable in this runtime.', runtime: capability },
        { status: 503 }
      )
    }

    const result = await launchLinkedInBrowser(accountId)

    if (result.success) {
      await supabaseAdmin
        .from('linkedin_sessions')
        .upsert({ account_id: accountId, is_authenticated: false }, { onConflict: 'account_id' })
    }

    return NextResponse.json(result)
  }

  if (action === 'verify') {
    if (!capability.canLaunchInteractiveSession) {
      return NextResponse.json(
        { verified: false, reason: capability.reason ?? 'LinkedIn verification is unavailable in this runtime.', runtime: capability },
        { status: 503 }
      )
    }

    const result = await verifyLinkedInSession(accountId)

    if (result.verified) {
      await supabaseAdmin
        .from('linkedin_sessions')
        .upsert(
          { account_id: accountId, is_authenticated: true, last_verified_at: new Date().toISOString() },
          { onConflict: 'account_id' }
        )
    }

    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

// DELETE — Close browser and revoke session (deletes cookies too)
export async function DELETE() {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await revokeLinkedInSession(accountId)

  await supabaseAdmin
    .from('linkedin_sessions')
    .update({ is_authenticated: false })
    .eq('account_id', accountId)

  return NextResponse.json({ success: true })
}
