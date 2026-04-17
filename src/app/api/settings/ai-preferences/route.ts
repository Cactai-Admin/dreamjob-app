import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getAdminClient } from '@/lib/supabase/admin'

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
    .from('accounts')
    .select('id')
    .eq('supabase_auth_id', user.id)
    .single()
  return account?.id ?? null
}

export async function GET() {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('user_preferences')
    .select('preferred_ai_provider, preferred_ai_model')
    .eq('account_id', accountId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    preferred_ai_provider: data?.preferred_ai_provider ?? null,
    preferred_ai_model: data?.preferred_ai_model ?? null,
  })
}

export async function PATCH(request: NextRequest) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { preferred_ai_provider?: string | null; preferred_ai_model?: string | null }
  const preferredProvider = body.preferred_ai_provider === 'anthropic' ? 'anthropic' : 'openai'
  const preferredModel = typeof body.preferred_ai_model === 'string' && body.preferred_ai_model.trim()
    ? body.preferred_ai_model.trim()
    : null

  const { error } = await supabaseAdmin
    .from('user_preferences')
    .update({
      preferred_ai_provider: preferredProvider,
      preferred_ai_model: preferredModel,
    })
    .eq('account_id', accountId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({
    preferred_ai_provider: preferredProvider,
    preferred_ai_model: preferredModel,
  })
}
