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
    .from('profiles')
    .select('*')
    .eq('account_id', accountId)
    .single()

  if (error) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: account } = await supabaseAdmin
    .from('accounts')
    .select('email')
    .eq('id', accountId)
    .single()

  return NextResponse.json({
    ...data,
    email: account?.email ?? null,
    // Backward-compatible alias for legacy consumers.
    portfolio_url: data.website_url ?? null,
  })
}

export async function PATCH(request: NextRequest) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (body.portfolio_url !== undefined && body.website_url === undefined) {
    body.website_url = body.portfolio_url
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(body)
    .eq('account_id', accountId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: account } = await supabaseAdmin
    .from('accounts')
    .select('email')
    .eq('id', accountId)
    .single()

  return NextResponse.json({
    ...data,
    email: account?.email ?? null,
    portfolio_url: data.website_url ?? null,
  })
}
