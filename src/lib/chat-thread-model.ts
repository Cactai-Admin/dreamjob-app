import type { ChatMessage } from '@/lib/types'

export type ChatThreadRole = 'system' | 'assistant' | 'user'

export type ThreadActionKind =
  | 'assistant_narrative'
  | 'user_reply'
  | 'review_bundle_card'
  | 'collection_prompt'
  | 'validation_card'
  | 'positioning_result_card'
  | 'action_card'
  | 'progress_message'

export interface ThreadAction {
  id: string
  kind: ThreadActionKind
  label: string
  payload?: Record<string, unknown>
}

export interface ChatThreadTurn {
  id: string
  role: ChatThreadRole
  content: string
  createdAt: string
  actions?: ThreadAction[]
  suggestions?: string[]
  metadata?: Record<string, unknown>
}

export interface SharedChatStageConfig {
  stage: 'onboarding' | 'stage1' | 'stage2' | 'stage3' | 'support'
  placeholder: string
  emptyStateText: string
  allowsInput: boolean
}

export const DEFAULT_SHARED_CHAT_STAGE_CONFIG: Record<SharedChatStageConfig['stage'], SharedChatStageConfig> = {
  onboarding: {
    stage: 'onboarding',
    placeholder: 'Share your onboarding details…',
    emptyStateText: 'Welcome — let’s capture your onboarding context.',
    allowsInput: true,
  },
  stage1: {
    stage: 'stage1',
    placeholder: 'Share listing context or questions…',
    emptyStateText: 'Start Stage 1 intake to build trusted opportunity context.',
    allowsInput: true,
  },
  stage2: {
    stage: 'stage2',
    placeholder: 'Ask for resume or cover letter refinements…',
    emptyStateText: 'Ask for refinements and tailoring support.',
    allowsInput: true,
  },
  stage3: {
    stage: 'stage3',
    placeholder: 'Ask for interview/negotiation guidance…',
    emptyStateText: 'Use the thread for interview and negotiation support.',
    allowsInput: true,
  },
  support: {
    stage: 'support',
    placeholder: 'Ask for support…',
    emptyStateText: 'Support thread ready.',
    allowsInput: true,
  },
}

export function toThreadTurn(message: ChatMessage): ChatThreadTurn {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.timestamp,
    suggestions: message.suggestions,
  }
}
