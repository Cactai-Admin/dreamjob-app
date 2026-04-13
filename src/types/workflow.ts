import type { StatusEventType } from '@/types/database'

export interface WorkflowStep {
  key: string
  label: string
  description: string
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    key: 'listing_review',
    label: 'Review Listing',
    description: 'Review the job listing details and confirm the position.',
  },
  {
    key: 'qa_intake',
    label: 'Q&A Intake',
    description: 'Answer targeted questions to tailor your application materials.',
  },
  {
    key: 'generating',
    label: 'Generating',
    description: 'AI is generating your customized resume and cover letter.',
  },
  {
    key: 'review',
    label: 'Review & Edit',
    description: 'Review, edit, and approve your generated materials.',
  },
  {
    key: 'ready',
    label: 'Ready',
    description: 'Your materials are finalized and ready to send.',
  },
  {
    key: 'sent',
    label: 'Sent',
    description: 'Application has been sent. Track its progress here.',
  },
]

/**
 * Maps each status event to the prerequisite event(s) that must exist first.
 */
export type StatusDependency = Record<StatusEventType, StatusEventType[]>

export const STATUS_DEPENDENCIES: StatusDependency = {
  sent: [],
  received: ['sent'],
  interview: ['sent'],
  offer: ['interview'],
  negotiation: ['offer'],
  hired: ['offer'],
  rejected: ['sent'],
  ghosted: ['sent'],
  declined: ['offer'],
}

/**
 * Pairs of status events that cannot both be marked as "current" at the same
 * time (i.e., they are mutually exclusive outcomes).
 */
export const STATUS_CONFLICTS: [StatusEventType, StatusEventType][] = [
  ['hired', 'rejected'],
  ['hired', 'ghosted'],
  ['hired', 'declined'],
  ['rejected', 'declined'],
  ['rejected', 'ghosted'],
  ['declined', 'ghosted'],
]
