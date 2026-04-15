import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getProvider, type ProviderName } from '@/lib/ai/provider'
import { QA_SYSTEM_PROMPT, buildQAUserMessage } from '@/lib/ai/prompts/qa-guidance'
import { getAdminClient } from '@/lib/supabase/admin'

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

  // Get workflow with listing
  const { data: workflow } = await supabaseAdmin
    .from('workflows')
    .select('*, listing:job_listings(*), status_events(*)')
    .eq('id', workflow_id)
    .eq('account_id', accountId)
    .single()

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  // Get or create chat thread
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

  // Get existing messages
  const { data: existingMessages } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true })

  // If user sent a message, save it
  if (message) {
    await supabaseAdmin.from('chat_messages').insert({
      thread_id: thread.id,
      role: 'user',
      content: message,
    })
  }

  // Get previous QA answers for context
  const { data: qaAnswers } = await supabaseAdmin
    .from('qa_answers')
    .select('question_text, answer_text')
    .eq('workflow_id', workflow_id)
    .order('sequence_order', { ascending: true })

  // Build messages for AI
  const eventTypes = (workflow.status_events ?? []).map((event) => event.event_type)
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

  const aiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: buildQAUserMessage(workflow.listing, qaAnswers ?? []),
    },
  ]

  // Add previous chat messages
  for (const msg of existingMessages ?? []) {
    aiMessages.push({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    })
  }

  // Add current user message
  if (message) {
    aiMessages.push({ role: 'user' as const, content: message })
  }

  try {
    const response = await provider.generate({
      messages: aiMessages,
      maxTokens: 300,
      temperature: 0.7,
    })

    // Save assistant response
    await supabaseAdmin.from('chat_messages').insert({
      thread_id: thread.id,
      role: 'assistant',
      content: response,
    })

    // Check if QA is complete
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
