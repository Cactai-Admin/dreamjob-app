import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getConfiguredProvider } from '@/lib/ai/provider'
import { QA_SYSTEM_PROMPT, buildQAUserMessage } from '@/lib/ai/prompts/qa-guidance'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

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

  const { workflow_id, message, surface = 'qa' } = await request.json()

  if (!workflow_id) {
    return NextResponse.json({ error: 'workflow_id is required' }, { status: 400 })
  }

  const provider = getConfiguredProvider()
  if (!provider.isConfigured()) {
    return NextResponse.json(
      { error: 'No AI provider configured. See docs/ai-providers-setup.md' },
      { status: 503 }
    )
  }

  // Get workflow with listing
  const { data: workflow } = await supabaseAdmin
    .from('workflows')
    .select('*, listing:job_listings(*)')
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
  const aiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: QA_SYSTEM_PROMPT },
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
      maxTokens: 1024,
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
