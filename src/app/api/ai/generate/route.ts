import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getProvider, type ProviderName } from '@/lib/ai/provider'
import { getAdminClient } from '@/lib/supabase/admin'
import {
  RESUME_SYSTEM_PROMPT,
  COVER_LETTER_SYSTEM_PROMPT,
  INTERVIEW_GUIDE_SYSTEM_PROMPT,
  NEGOTIATION_GUIDE_SYSTEM_PROMPT,
} from '@/lib/ai/prompts/resume-generation'
import { buildGenerationContextBundle } from '@/lib/ai/workflow-context'
import { resolveProviderPin } from '@/lib/ai/provider-pinning'

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

export async function POST(request: NextRequest) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workflow_id, output_type, provider: providerName, model: requestedModel } = await request.json() as {
    workflow_id: string
    output_type: string
    provider?: ProviderName
    model?: string
  }

  if (!workflow_id || !output_type) {
    return NextResponse.json({ error: 'workflow_id and output_type are required' }, { status: 400 })
  }

  const initialProvider = getProvider(providerName)
  if (!initialProvider.isConfigured()) {
    return NextResponse.json(
      { error: 'No AI provider configured. See docs/ai-providers-setup.md' },
      { status: 503 }
    )
  }

  const { data: workflow } = await supabaseAdmin
    .from('workflows')
    .select(`*, listing:job_listings(*)`)
    .eq('id', workflow_id)
    .eq('account_id', accountId)
    .single()

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  const { data: userPreferences } = await supabaseAdmin
    .from('user_preferences')
    .select('preferred_ai_provider, preferred_ai_model')
    .eq('account_id', accountId)
    .single()

  const providerPin = resolveProviderPin(
    workflow,
    userPreferences ?? null,
    providerName,
    initialProvider.name as ProviderName,
    requestedModel
  )
  const provider = getProvider(providerPin.provider)
  if (!provider.isConfigured()) {
    return NextResponse.json(
      { error: 'No AI provider configured. See docs/ai-providers-setup.md' },
      { status: 503 }
    )
  }

  const { data: existing } = await supabaseAdmin
    .from('outputs')
    .select('*')
    .eq('workflow_id', workflow_id)
    .eq('type', output_type)
    .eq('is_current', true)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(existing)
  }

  const [{ data: profile }, { data: employment }, { data: qaAnswers }, { data: profileMemory }] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').eq('account_id', accountId).single(),
    supabaseAdmin.from('employment_history').select('*').eq('account_id', accountId).order('start_date', { ascending: false }),
    supabaseAdmin
      .from('qa_answers')
      .select('question_text, answer_text, is_accepted, accepted_at')
      .eq('workflow_id', workflow_id)
      .eq('account_id', accountId)
      .order('sequence_order', { ascending: true }),
    supabaseAdmin
      .from('profile_memory')
      .select('type, content, context')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(60),
  ])

  const systemPrompts: Record<string, string> = {
    resume: RESUME_SYSTEM_PROMPT,
    cover_letter: COVER_LETTER_SYSTEM_PROMPT,
    interview_guide: INTERVIEW_GUIDE_SYSTEM_PROMPT,
    negotiation_guide: NEGOTIATION_GUIDE_SYSTEM_PROMPT,
  }

  const systemPrompt = systemPrompts[output_type]
  if (!systemPrompt) {
    return NextResponse.json({ error: 'Invalid output type' }, { status: 400 })
  }

  if (!workflow.listing?.title?.trim() || !workflow.listing?.company_name?.trim()) {
    return NextResponse.json(
      { error: 'Listing context is incomplete. Finish listing review before generating documents.' },
      { status: 409 }
    )
  }

  const generationContext = buildGenerationContextBundle({
    workflow,
    profile,
    employment: employment ?? [],
    qaAnswers: qaAnswers ?? [],
    profileMemory: profileMemory ?? [],
  })

  if (
    (output_type === 'resume' || output_type === 'cover_letter') &&
    !profile?.summary?.trim() &&
    (employment?.length ?? 0) === 0 &&
    generationContext.metadata.accepted_run_fact_count === 0
  ) {
    return NextResponse.json(
      {
        error: 'Not enough approved profile or run-specific context yet. Add profile details or provide run facts in chat, then retry.',
        context_readiness: generationContext.metadata,
      },
      { status: 409 }
    )
  }

  const userContext = `${generationContext.context}\n\nGenerate the ${output_type.replace('_', ' ')} now.`

  try {
    const content = await provider.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContext },
      ],
      maxTokens: 4096,
      temperature: 0.7,
      model: providerPin.model ?? undefined,
    })

    await supabaseAdmin
      .from('outputs')
      .update({ is_current: false })
      .eq('workflow_id', workflow_id)
      .eq('type', output_type)
      .eq('is_current', true)

    const { data: versions } = await supabaseAdmin
      .from('outputs')
      .select('version')
      .eq('workflow_id', workflow_id)
      .eq('type', output_type)
      .order('version', { ascending: false })
      .limit(1)

    const { data: output } = await supabaseAdmin
      .from('outputs')
      .insert({
        workflow_id,
        account_id: accountId,
        type: output_type,
        content,
        state: 'draft',
        version: (versions?.[0]?.version ?? 0) + 1,
        is_current: true,
        generation_model: provider.name,
        generation_params: {
          ...generationContext.metadata,
          provider_pin: providerPin,
        },
      })
      .select()
      .single()

    await supabaseAdmin.from('analytics_events').insert({
      account_id: accountId,
      event_type: `${output_type}_generated`,
      event_data: {
        workflow_id,
        output_id: output?.id,
        context: generationContext.metadata,
        provider_pin: providerPin,
      },
    })

    return NextResponse.json(output)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
