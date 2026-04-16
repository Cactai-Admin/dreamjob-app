import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getProvider, type ProviderName } from '@/lib/ai/provider'
import { QA_SYSTEM_PROMPT, buildQAUserMessage } from '@/lib/ai/prompts/qa-guidance'
import { getAdminClient } from '@/lib/supabase/admin'
import type { StatusEvent } from '@/types/database'
import { computeRequirementMatch, parseRequirements } from '@/lib/listing-match'

const supabaseAdmin = getAdminClient()
const APPLICATION_SUPPORT_SYSTEM_PROMPT = `You are DreamJob's post-submission application support assistant.

The user has already sent or marked an application as applied.

Focus your guidance on:
- practical follow-up timing and cadence
- concise follow-up message structure
- outreach/networking suggestions
- visibility-improvement actions
- status-tracking checklists and reminders

Rules:
- Keep responses practical, specific, and short (3-6 bullets or under 120 words when possible).
- Do not restart pre-apply intake questions unless the user explicitly asks.
- If the user mentions interview or offer progression, pivot to that stage while preserving application support continuity.
- If key details are missing, ask one focused follow-up question.`

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

async function captureRunFact(input: {
  workflowId: string
  accountId: string
  surface: string
  message: string
  existingMessages: { role: string; content: string }[]
}) {
  const surfacesForRunFacts = new Set([
    'qa',
    'listing_review',
    'resume_workspace',
    'cover_letter_workspace',
    'application_hub_support',
    'application_overview_support',
    'follow_up_support',
    'interview_guide',
    'negotiation_guide',
  ])

  if (!surfacesForRunFacts.has(input.surface)) return

  const lastAssistant = [...input.existingMessages].reverse().find((msg) => msg.role === 'assistant')
  const sourceQuestion = lastAssistant?.content?.trim() || `User-provided ${input.surface} context`

  const { data: existing } = await supabaseAdmin
    .from('qa_answers')
    .select('sequence_order')
    .eq('workflow_id', input.workflowId)
    .order('sequence_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sequence_order ?? -1) + 1

  await supabaseAdmin
    .from('qa_answers')
    .insert({
      workflow_id: input.workflowId,
      account_id: input.accountId,
      question_key: `chat_${input.surface}_${nextOrder}`,
      question_text: sourceQuestion.slice(0, 800),
      answer_text: input.message,
      guidance_text: `Captured from chat surface: ${input.surface}`,
      is_accepted: true,
      accepted_at: new Date().toISOString(),
      sequence_order: nextOrder,
    })
}

export async function POST(request: NextRequest) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workflow_id, message, surface = 'qa', provider: providerName } = await request.json() as {
    workflow_id: string
    message?: string
    surface?: string
    provider?: ProviderName
  }

  if (!workflow_id) {
    return NextResponse.json({ error: 'workflow_id is required' }, { status: 400 })
  }

  const provider = getProvider(providerName)
  if (!provider.isConfigured()) {
    return NextResponse.json(
      { error: 'No AI provider configured. See docs/ai-providers-setup.md' },
      { status: 503 }
    )
  }

  const { data: workflow } = await supabaseAdmin
    .from('workflows')
    .select('*, listing:job_listings(*), company:companies(*), status_events(*)')
    .eq('id', workflow_id)
    .eq('account_id', accountId)
    .single()

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  let { data: thread } = await supabaseAdmin
    .from('chat_threads')
    .select('*')
    .eq('workflow_id', workflow_id)
    .eq('surface', surface)
    .single()

  if (!thread) {
    const { data: newThread } = await supabaseAdmin
      .from('chat_threads')
      .insert({ workflow_id, surface })
      .select()
      .single()
    thread = newThread
  }

  if (!thread) {
    return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 })
  }

  const { data: existingMessages } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true })

  if (message) {
    await supabaseAdmin.from('chat_messages').insert({
      thread_id: thread.id,
      role: 'user',
      content: message,
      metadata: { surface },
    })

    await captureRunFact({
      workflowId: workflow_id,
      accountId,
      surface,
      message,
      existingMessages: existingMessages ?? [],
    })
  }

  const [{ data: qaAnswers }, { data: reusableFacts }, { data: profile }, { data: employment }] = await Promise.all([
    supabaseAdmin
      .from('qa_answers')
      .select('question_text, answer_text, is_accepted')
      .eq('workflow_id', workflow_id)
      .eq('account_id', accountId)
      .order('sequence_order', { ascending: true }),
    supabaseAdmin
      .from('profile_memory')
      .select('type, content, context')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(25),
    supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, headline, summary, location, skills, keywords, tools, certifications, clearances')
      .eq('account_id', accountId)
      .single(),
    supabaseAdmin
      .from('employment_history')
      .select('technologies')
      .eq('account_id', accountId),
  ])

  const eventTypes = (workflow.status_events ?? []).map((event: StatusEvent) => event.event_type)
  const inApplicationSupport =
    eventTypes.includes('sent') ||
    eventTypes.includes('submitted') ||
    workflow.state === 'sent' ||
    workflow.state === 'completed'
  const progressedToInterviewOrNegotiation =
    eventTypes.includes('interview') ||
    eventTypes.includes('interview_scheduled') ||
    eventTypes.includes('offer') ||
    eventTypes.includes('offer_received') ||
    eventTypes.includes('negotiation')
  const systemPrompt = inApplicationSupport && !progressedToInterviewOrNegotiation
    ? APPLICATION_SUPPORT_SYSTEM_PROMPT
    : QA_SYSTEM_PROMPT

  const requirements = parseRequirements(workflow.listing.requirements)
  const profileSkills = Array.isArray(profile?.skills) ? profile.skills : []
  const profileKeywords = Array.isArray(profile?.keywords) ? profile.keywords : []
  const profileTools = Array.isArray(profile?.tools) ? profile.tools : []
  const profileCertifications = Array.isArray(profile?.certifications) ? profile.certifications : []
  const profileClearances = Array.isArray(profile?.clearances) ? profile.clearances : []
  const technologies = Array.isArray(employment)
    ? employment.flatMap((entry) => (Array.isArray(entry?.technologies) ? entry.technologies : []))
    : []
  const matchSummary = computeRequirementMatch(
    {
      requirements,
      skills: profileSkills,
      keywords: profileKeywords,
      tools: profileTools,
      certifications: profileCertifications,
      clearances: profileClearances,
      technologies,
    },
    { includeAllMissingWhenNoProfileTerms: true }
  )

  const profileSummaryLines = [
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim(),
    profile?.headline ? `Headline: ${profile.headline}` : null,
    profile?.summary ? `Summary: ${profile.summary}` : null,
    profile?.location ? `Location: ${profile.location}` : null,
  ].filter(Boolean)

  const workflowStatusSummary = eventTypes.length > 0 ? eventTypes.join(', ') : 'none recorded'
  const workflowPhase = inApplicationSupport
    ? 'application_support'
    : surface === 'listing_review'
      ? 'listing_review'
      : 'active_workflow'

  const aiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: buildQAUserMessage({
        workflowId: workflow.id,
        workflowState: workflow.state,
        surface,
        workflowPhase,
        workflowStatusSummary,
        listing: {
          title: workflow.listing.title,
          company_name: workflow.listing.company_name,
          location: workflow.listing.location,
          salary_range: workflow.listing.salary_range,
          employment_type: workflow.listing.employment_type,
          experience_level: workflow.listing.experience_level,
          description: workflow.listing.description,
          requirements: workflow.listing.requirements,
          responsibilities: workflow.listing.responsibilities,
          benefits: workflow.listing.benefits,
          company_website_url: workflow.listing.company_website_url ?? workflow.company?.website_url ?? null,
          company_linkedin_url: workflow.company?.linkedin_url ?? null,
          work_mode:
            typeof workflow.listing.parsed_data?.work_mode === 'string'
              ? workflow.listing.parsed_data.work_mode
              : null,
          years_experience:
            typeof workflow.listing.parsed_data?.years_experience === 'string'
              ? workflow.listing.parsed_data.years_experience
              : null,
          language_requirements: Array.isArray(workflow.listing.parsed_data?.language_requirements)
            ? workflow.listing.parsed_data.language_requirements.filter((value: unknown): value is string => typeof value === 'string')
            : [],
          tools_platforms: Array.isArray(workflow.listing.parsed_data?.tools_platforms)
            ? workflow.listing.parsed_data.tools_platforms.filter((value: unknown): value is string => typeof value === 'string')
            : [],
          preferred_qualifications:
            typeof workflow.listing.parsed_data?.preferred_qualifications === 'string'
              ? workflow.listing.parsed_data.preferred_qualifications
              : null,
          parse_quality:
            typeof workflow.listing.parsed_data?.parse_quality === 'string'
              ? workflow.listing.parsed_data.parse_quality
              : null,
        },
        qaAnswers: qaAnswers ?? [],
        reusableFacts: reusableFacts ?? [],
        profileSummary: profileSummaryLines.join('\n') || null,
        matchSummary,
      }),
    },
  ]

  for (const msg of existingMessages ?? []) {
    aiMessages.push({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    })
  }

  if (message) {
    aiMessages.push({ role: 'user', content: message })
  }

  try {
    const response = await provider.generate({
      messages: aiMessages,
      maxTokens: 350,
      temperature: 0.6,
    })

    await supabaseAdmin.from('chat_messages').insert({
      thread_id: thread.id,
      role: 'assistant',
      content: response,
      metadata: {
        surface,
        workflow_state: workflow.state,
      },
    })

    const isComplete = response.includes('[QA_COMPLETE]')
    if (isComplete) {
      await supabaseAdmin
        .from('workflows')
        .update({ state: 'review', qa_completed_at: new Date().toISOString() })
        .eq('id', workflow_id)
    }

    return NextResponse.json({
      message: response.replace('[QA_COMPLETE]', '').trim(),
      isComplete,
      threadId: thread.id,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Chat failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const workflow_id = url.searchParams.get('workflow_id')
  const surface = url.searchParams.get('surface') ?? 'qa'

  if (!workflow_id) {
    return NextResponse.json({ error: 'workflow_id is required' }, { status: 400 })
  }

  const { data: workflow } = await supabaseAdmin
    .from('workflows')
    .select('id')
    .eq('id', workflow_id)
    .eq('account_id', accountId)
    .single()

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  let { data: thread } = await supabaseAdmin
    .from('chat_threads')
    .select('*')
    .eq('workflow_id', workflow_id)
    .eq('surface', surface)
    .single()

  if (!thread) {
    const { data: newThread } = await supabaseAdmin
      .from('chat_threads')
      .insert({ workflow_id, surface })
      .select()
      .single()
    thread = newThread
  }

  if (!thread) {
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 })
  }

  const { data: messages } = await supabaseAdmin
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    threadId: thread.id,
    messages: messages ?? [],
  })
}
