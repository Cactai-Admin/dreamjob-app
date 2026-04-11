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

  const { workflow_id, output_type, provider: providerName } = await request.json() as {
    workflow_id: string
    output_type: string
    provider?: ProviderName
  }

  if (!workflow_id || !output_type) {
    return NextResponse.json({ error: 'workflow_id and output_type are required' }, { status: 400 })
  }

  const provider = getProvider(providerName)
  if (!provider.isConfigured()) {
    return NextResponse.json(
      { error: 'No AI provider configured. See docs/ai-providers-setup.md' },
      { status: 503 }
    )
  }

  // Return cached output if it already exists — never regenerate
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

  // Get workflow with listing and QA answers
  const { data: workflow } = await supabaseAdmin
    .from('workflows')
    .select(`*, listing:job_listings(*), qa_answers(*)`)
    .eq('id', workflow_id)
    .eq('account_id', accountId)
    .single()

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  // Get user profile and employment history
  const [{ data: profile }, { data: employment }] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').eq('account_id', accountId).single(),
    supabaseAdmin.from('employment_history').select('*').eq('account_id', accountId).order('start_date', { ascending: false }),
  ])

  // Select system prompt based on output type
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

  // Build user context
  const listing = workflow.listing
  let userContext = `JOB LISTING:\nTitle: ${listing.title}\nCompany: ${listing.company_name}`
  if (listing.description) userContext += `\nDescription: ${listing.description}`
  if (listing.requirements) userContext += `\nRequirements: ${listing.requirements}`

  if (profile) {
    userContext += `\n\nUSER PROFILE:`
    if (profile.first_name) userContext += `\nName: ${profile.first_name} ${profile.last_name || ''}`
    if (profile.email) userContext += `\nEmail: ${profile.email}`
    if (profile.phone) userContext += `\nPhone: ${profile.phone}`
    if (profile.location) userContext += `\nLocation: ${profile.location}`
    if (profile.linkedin_url) userContext += `\nLinkedIn: ${profile.linkedin_url}`
    if (profile.portfolio_url) userContext += `\nPortfolio: ${profile.portfolio_url}`
    if (profile.headline) userContext += `\nHeadline: ${profile.headline}`
    if (profile.summary) userContext += `\nSummary: ${profile.summary}`
  }

  if (employment && employment.length > 0) {
    userContext += `\n\nEMPLOYMENT HISTORY:`
    for (const job of employment) {
      userContext += `\n- ${job.title} at ${job.company_name} (${job.start_date}–${job.end_date || 'present'})`
      if (job.description) userContext += `\n  ${job.description}`
      if (job.achievements?.length) userContext += `\n  Achievements: ${job.achievements.join('; ')}`
    }
  }

  if (workflow.qa_answers?.length > 0) {
    userContext += `\n\nQ&A ANSWERS:`
    for (const qa of workflow.qa_answers) {
      userContext += `\nQ: ${qa.question_text}\nA: ${qa.answer_text}`
    }
  }

  userContext += `\n\nGenerate the ${output_type.replace('_', ' ')} now.`

  try {
    const content = await provider.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContext },
      ],
      maxTokens: 4096,
      temperature: 0.7,
    })

    // Save as output
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
      })
      .select()
      .single()

    // Log analytics
    await supabaseAdmin.from('analytics_events').insert({
      account_id: accountId,
      event_type: `${output_type}_generated`,
      event_data: { workflow_id, output_id: output?.id },
    })

    return NextResponse.json(output)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
