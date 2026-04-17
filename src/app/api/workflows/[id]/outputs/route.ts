import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getAdminClient } from '@/lib/supabase/admin'
import { parseNativeDocument, type ArtifactType } from '@/lib/documents/native-document'
import { syncDocumentToGoogleDocs, type GoogleSyncSnapshot } from '@/lib/documents/google-docs-sync'

const supabaseAdmin = getAdminClient()

type AuthContext = {
  accountId: string
  providerToken: string | null
}

async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: { session } } = await supabase.auth.getSession()
  const providerToken = (session as unknown as { provider_token?: string | null } | null)?.provider_token ?? null

  const { data: account } = await supabaseAdmin
    .from('accounts').select('id').eq('supabase_auth_id', user.id).single()

  if (!account?.id) return null

  return {
    accountId: account.id,
    providerToken,
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('outputs')
    .select('*')
    .eq('workflow_id', id)
    .eq('account_id', auth.accountId)
    .eq('is_current', true)
    .order('type')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  // Mark previous versions as non-current
  if (body.type) {
    await supabaseAdmin
      .from('outputs')
      .update({ is_current: false })
      .eq('workflow_id', id)
      .eq('type', body.type)
      .eq('is_current', true)
  }

  // Get next version number
  const { data: versions } = await supabaseAdmin
    .from('outputs')
    .select('version')
    .eq('workflow_id', id)
    .eq('type', body.type)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = (versions?.[0]?.version ?? 0) + 1

  const { data, error } = await supabaseAdmin
    .from('outputs')
    .insert({
      ...body,
      workflow_id: id,
      account_id: auth.accountId,
      version: nextVersion,
      is_current: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const artifactType = body.type as ArtifactType
  const supportedArtifact = ['resume', 'cover_letter', 'interview_guide', 'negotiation_guide'].includes(artifactType)

  if (!supportedArtifact) {
    return NextResponse.json({ ...data, google_sync: { status: 'pending', message: 'Google Docs sync is not configured for this artifact type.' } }, { status: 201 })
  }

  const [{ data: workflow }, { data: profile }, { data: prefs }] = await Promise.all([
    supabaseAdmin
      .from('workflows')
      .select('id, listing:job_listings(company_name, title), autosave_data')
      .eq('id', id)
      .eq('account_id', auth.accountId)
      .single(),
    supabaseAdmin
      .from('profiles')
      .select('location')
      .eq('account_id', auth.accountId)
      .single(),
    supabaseAdmin
      .from('user_preferences')
      .select('google_drive_root_folder_id, google_drive_root_folder_url')
      .eq('account_id', auth.accountId)
      .single(),
  ])

  const nativeDocument = parseNativeDocument(artifactType, data)
  const listing = workflow?.listing as { company_name?: string | null; title?: string | null } | null
  const listingName = `${listing?.company_name ?? 'DreamJob Listing'} - ${listing?.title ?? 'Application'}`

  const existingSync = (workflow?.autosave_data as { google_docs_sync?: Record<string, unknown> } | null)?.google_docs_sync

  const sync = await syncDocumentToGoogleDocs({
    accessToken: auth.providerToken,
    artifactType,
    listingName,
    profileLocation: profile?.location,
    rootFolderId: prefs?.google_drive_root_folder_id,
    existingSync: (existingSync ?? null) as GoogleSyncSnapshot | null,
    document: nativeDocument,
  })

  await supabaseAdmin
    .from('workflows')
    .update({
      autosave_data: {
        ...(workflow?.autosave_data && typeof workflow.autosave_data === 'object' ? workflow.autosave_data : {}),
        google_docs_sync: sync.snapshot,
      },
      last_autosave_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('account_id', auth.accountId)

  return NextResponse.json({ ...data, google_sync: sync.result }, { status: 201 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const type = request.nextUrl.searchParams.get('type')
  if (!type) return NextResponse.json({ error: 'Output type is required' }, { status: 400 })

  const { data: outputs, error: outputsError } = await supabaseAdmin
    .from('outputs')
    .select('*')
    .eq('workflow_id', id)
    .eq('account_id', auth.accountId)
    .eq('type', type)

  if (outputsError) return NextResponse.json({ error: outputsError.message }, { status: 500 })
  if (!outputs || outputs.length === 0) {
    return NextResponse.json({ error: 'Output not found' }, { status: 404 })
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const softDeleted = outputs.map((output) => ({
    account_id: auth.accountId,
    item_type: 'output',
    item_id: output.id,
    item_data: output,
    expires_at: expiresAt.toISOString(),
  }))

  const { error: insertError } = await supabaseAdmin
    .from('deleted_items')
    .insert(softDeleted)

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  const { error: deleteError } = await supabaseAdmin
    .from('outputs')
    .delete()
    .eq('workflow_id', id)
    .eq('account_id', auth.accountId)
    .eq('type', type)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ success: true, deleted_count: outputs.length })
}
