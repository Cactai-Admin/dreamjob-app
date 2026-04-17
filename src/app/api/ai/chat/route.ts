import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getProvider, type ProviderName } from '@/lib/ai/provider'
import { buildQAUserMessage } from '@/lib/ai/prompts/qa-guidance'
import { getSurfaceSystemPrompt } from '@/lib/ai/prompts/surface-orchestration'
import { getAdminClient } from '@/lib/supabase/admin'
import type { StatusEvent } from '@/types/database'
import { computeRequirementMatch, parseRequirements } from '@/lib/listing-match'
import { normalizeCanonicalListing } from '@/lib/ai/context/canonical-listing'
import { buildReusableFacts, buildRunFacts, detectFactConflicts } from '@/lib/ai/context/facts'
import { buildSharedAIContextBundle } from '@/lib/ai/context/shared-context'
import { coerceStructuredChatOutput, isValidStructuredChatOutput } from '@/lib/ai/schemas/chat-output'
import type { StructuredChatOutput } from '@/lib/ai/schemas/chat-output'
import { resolveProviderPin, withProviderPinMetadata } from '@/lib/ai/provider-pinning'

const supabaseAdmin = getAdminClient()

const STRUCTURED_OUTPUT_INSTRUCTIONS = `Return strict JSON with keys: message, suggestions, actions, warnings, facts_to_confirm, completion_signal.
- message is required and must be a non-empty string.
- suggestions is optional array of short user-ready prompts.
- actions is optional array of objects with type + label (+ optional value).
- warnings is optional array of objects { code, message, severity }.
- facts_to_confirm is optional array of potential conflicts/gaps.
- completion_signal is optional string; use \"QA_COMPLETE\" only when the user can safely proceed.`

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
    'work_history',
    'final_hub',
    'follow_up',
    'interview',
    'negotiation',
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

async function generateStructuredResponseWithRetry(input: {
  provider: ReturnType<typeof getProvider>
  aiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[]
}): Promise<{ structured: StructuredChatOutput; raw: string; attempts: number }> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await input.provider.generate({
      messages: input.aiMessages,
      maxTokens: 500,
      temperature: 0.5,
    })

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    const candidate = jsonMatch ? jsonMatch[0] : response
    try {
      const parsed = JSON.parse(candidate)
      const structured = coerceStructuredChatOutput(parsed)
      if (isValidStructuredChatOutput(structured)) {
        return { structured, raw: response, attempts: attempt }
      }
    } catch {
      // handled by retry branch
    }

    if (attempt === 1) {
      input.aiMessages.push({
        role: 'user',
        content: 'Your previous answer was invalid. Return valid JSON only using the required keys.',
      })
    }
  }

  return {
    structured: {
      message: 'I could not produce a fully structured response this turn. Please retry your question.',
      warnings: [{ code: 'structured_output_invalid', message: 'Model output failed schema validation', severity: 'warning' }],
    },
    raw: '',
    attempts: 2,
  }
}

export async function POST(request: NextRequest) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workflow_id, message, surface = 'qa', provider: providerName, model: requestedModel } = await request.json() as {
    workflow_id: string
    message?: string
    surface?: string
    provider?: ProviderName
    model?: string
  }

  if (!workflow_id) {
    return NextResponse.json({ error: 'workflow_id is required' }, { status: 400 })
  }

  const preliminaryProvider = getProvider(providerName)
  if (!preliminaryProvider.isConfigured()) {
    return NextResponse.json(
      { error: 'No AI provider configured. See docs/ai-providers-setup.md' },
      { status: 503 }
    )
  }

  const { data: workflow } = await supabaseAdmin
    .from('workflows')
    .select('*, listing:job_listings(*), company:companies(*), status_events(*), outputs(*)')
    .eq('id', workflow_id)
    .eq('account_id', accountId)
    .single()

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  const providerPin = resolveProviderPin(workflow, providerName, preliminaryProvider.name as ProviderName, requestedModel)
  const provider = getProvider(providerPin.provider)

  await supabaseAdmin
    .from('workflows')
    .update({ autosave_data: withProviderPinMetadata(workflow.autosave_data, providerPin) })
    .eq('id', workflow_id)

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
      metadata: { surface, provider_pin: providerPin },
    })

    await captureRunFact({
      workflowId: workflow_id,
      accountId,
      surface,
      message,
      existingMessages: existingMessages ?? [],
    })
  }

  const [{ data: qaAnswers }, { data: reusableFacts }, { data: profile }, { data: employment }, { data: evidence }] = await Promise.all([
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
      .select('*')
      .eq('account_id', accountId),
    supabaseAdmin
      .from('profile_evidence')
      .select('id, evidence_type, title, details, trust_level, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const eventTypes = (workflow.status_events ?? []).map((event: StatusEvent) => event.event_type)
  const inApplicationSupport =
    eventTypes.includes('sent') ||
    eventTypes.includes('submitted') ||
    workflow.state === 'sent' ||
    workflow.state === 'completed'

  const systemPrompt = `${getSurfaceSystemPrompt(surface, inApplicationSupport)}\n\n${STRUCTURED_OUTPUT_INSTRUCTIONS}`

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

  const runFacts = buildRunFacts(qaAnswers ?? []).filter((fact) => fact.accepted)
  const reusableMemoryFacts = buildReusableFacts(reusableFacts ?? [])
  const conflicts = detectFactConflicts([...runFacts, ...reusableMemoryFacts])
  const sharedContext = buildSharedAIContextBundle({
    workflow: { id: workflow.id, state: workflow.state, phase: workflowPhase },
    listing: normalizeCanonicalListing(workflow.listing),
    profile: (profile ?? null) as Record<string, unknown> | null,
    employment_work_history: (employment ?? []) as Record<string, unknown>[],
    accepted_run_facts: runFacts,
    reusable_profile_memory: reusableMemoryFacts,
    evidence_alignment: (evidence ?? []) as Record<string, unknown>[],
    artifact_state: ((workflow.outputs ?? []) as Record<string, unknown>[]).map((output) => ({
      type: output.type,
      status: output.state,
      is_current: output.is_current,
    })),
    status_events: (workflow.status_events ?? []) as Record<string, unknown>[],
    conflicts,
  })

  const aiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `${buildQAUserMessage({
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
      })}\n\nSHARED_CONTEXT:\n${sharedContext.contextText}`,
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
    const aiResult = await generateStructuredResponseWithRetry({ provider, aiMessages })
    const completionSignal = aiResult.structured.completion_signal ?? null
    const isComplete = completionSignal === 'QA_COMPLETE'

    await supabaseAdmin.from('chat_messages').insert({
      thread_id: thread.id,
      role: 'assistant',
      content: aiResult.structured.message,
      metadata: {
        surface,
        workflow_state: workflow.state,
        provider_pin: providerPin,
        structured_output: aiResult.structured,
        context_visibility: {
          run_facts: runFacts.length,
          reusable_profile_memory: reusableMemoryFacts.length,
          conflicts: conflicts.length,
        },
      },
    })

    if (isComplete) {
      await supabaseAdmin
        .from('workflows')
        .update({ state: 'review', qa_completed_at: new Date().toISOString() })
        .eq('id', workflow_id)
    }

    await supabaseAdmin.from('analytics_events').insert({
      account_id: accountId,
      event_type: 'ai_chat_turn',
      event_data: {
        workflow_id,
        thread_id: thread.id,
        surface,
        provider_pin: providerPin,
        structured_attempts: aiResult.attempts,
        completion_signal: completionSignal,
        context_summary: {
          run_fact_count: runFacts.length,
          reusable_fact_count: reusableMemoryFacts.length,
          conflict_count: conflicts.length,
          parse_quality: normalizeCanonicalListing(workflow.listing).confidence.parse_quality,
        },
      },
    })

    return NextResponse.json({
      message: aiResult.structured.message,
      suggestions: aiResult.structured.suggestions ?? [],
      actions: aiResult.structured.actions ?? [],
      warnings: aiResult.structured.warnings ?? [],
      facts_to_confirm: aiResult.structured.facts_to_confirm ?? [],
      completion_signal: completionSignal,
      isComplete,
      threadId: thread.id,
      provider_pin: providerPin,
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
    .select('id, role, content, metadata, created_at')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    threadId: thread.id,
    messages: messages?.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      created_at: msg.created_at,
      suggestions: Array.isArray((msg.metadata as Record<string, unknown> | null)?.structured_output
        && typeof (msg.metadata as Record<string, unknown>).structured_output === 'object'
        ? ((msg.metadata as Record<string, unknown>).structured_output as Record<string, unknown>).suggestions
        : null)
        ? ((((msg.metadata as Record<string, unknown>).structured_output as Record<string, unknown>).suggestions) as unknown[])
          .filter((value): value is string => typeof value === 'string')
        : [],
    })) ?? [],
  })
}
