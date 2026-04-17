import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getAdminClient } from '@/lib/supabase/admin'

const supabaseAdmin = getAdminClient()

async function getAuthContext() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )

  const [{ data: userResult }, { data: sessionResult }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ])

  const user = userResult.user
  if (!user) return null

  const providerToken = (sessionResult.session as unknown as { provider_token?: string | null } | null)?.provider_token ?? null

  const { data: account } = await supabaseAdmin
    .from('accounts')
    .select('id')
    .eq('supabase_auth_id', user.id)
    .single()

  if (!account?.id) return null

  return {
    accountId: account.id,
    hasGoogleToken: Boolean(providerToken),
  }
}

function parseFolderInput(value: string): { id: string | null; url: string | null } {
  const trimmed = value.trim()
  if (!trimmed) return { id: null, url: null }

  const idMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (idMatch?.[1]) {
    return {
      id: idMatch[1],
      url: `https://drive.google.com/drive/folders/${idMatch[1]}`,
    }
  }

  return {
    id: trimmed,
    url: `https://drive.google.com/drive/folders/${trimmed}`,
  }
}

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('user_preferences')
    .select('google_drive_root_folder_id, google_drive_root_folder_url')
    .eq('account_id', auth.accountId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    rootFolderId: data?.google_drive_root_folder_id ?? null,
    rootFolderUrl: data?.google_drive_root_folder_url ?? null,
    hasGoogleToken: auth.hasGoogleToken,
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = parseFolderInput(String(body.rootFolder ?? ''))

  const { error } = await supabaseAdmin
    .from('user_preferences')
    .update({
      google_drive_root_folder_id: parsed.id,
      google_drive_root_folder_url: parsed.url,
    })
    .eq('account_id', auth.accountId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({
    rootFolderId: parsed.id,
    rootFolderUrl: parsed.url,
    hasGoogleToken: auth.hasGoogleToken,
  })
}
