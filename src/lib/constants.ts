import type {
  WorkflowState,
  OutputType,
  StatusEventType,
  AccountState,
} from '@/types/database'

export const APP_NAME = 'DreamJob'

export const WORKFLOW_STATES: Record<
  WorkflowState,
  { label: string; description: string }
> = {
  listing_review: {
    label: 'Listing Review',
    description: 'Review and confirm the job listing details.',
  },
  qa_intake: {
    label: 'Q&A Intake',
    description: 'Answer targeted questions to personalize your materials.',
  },
  generating: {
    label: 'Generating',
    description: 'AI is creating your customized application materials.',
  },
  review: {
    label: 'Review',
    description: 'Review and edit your generated documents.',
  },
  ready: {
    label: 'Ready',
    description: 'Materials are finalized and ready to send.',
  },
  active: {
    label: 'Active',
    description: 'Workflow is actively being worked on.',
  },
  ready_to_send: {
    label: 'Ready to Send',
    description: 'All outputs approved and ready for submission.',
  },
  sent: {
    label: 'Sent',
    description: 'Application has been submitted.',
  },
  completed: {
    label: 'Completed',
    description: 'Workflow has reached a final outcome.',
  },
  archived: {
    label: 'Archived',
    description: 'Workflow has been archived.',
  },
  draft: {
    label: 'Draft',
    description: 'Application has started and is currently in progress.',
  },
}

export const OUTPUT_TYPES: Record<OutputType, { label: string }> = {
  resume: { label: 'Resume' },
  cover_letter: { label: 'Cover Letter' },
  interview_guide: { label: 'Interview Guide' },
  negotiation_guide: { label: 'Negotiation Guide' },
}

export const STATUS_EVENTS: Record<
  StatusEventType,
  { label: string; dependencies: StatusEventType[] }
> = {
  sent: { label: 'Sent', dependencies: [] },
  received: { label: 'Received', dependencies: ['sent'] },
  interview: { label: 'Interview', dependencies: ['sent'] },
  offer: { label: 'Offer', dependencies: ['interview'] },
  negotiation: { label: 'Negotiation', dependencies: ['offer'] },
  hired: { label: 'Hired', dependencies: ['offer'] },
  rejected: { label: 'Rejected', dependencies: ['sent'] },
  ghosted: { label: 'Ghosted', dependencies: ['sent'] },
  declined: { label: 'Declined', dependencies: ['offer'] },
  ready: { label: 'Ready', dependencies: [] },
  submitted: { label: 'Submitted', dependencies: ['sent'] },
  interview_scheduled: { label: 'Interview Scheduled', dependencies: ['sent'] },
  offer_received: { label: 'Offer Received', dependencies: ['interview'] },
  withdrawn: { label: 'Withdrawn', dependencies: ['sent'] },
}

export const ACCOUNT_STATES: Record<AccountState, { label: string }> = {
  invited: { label: 'Invited' },
  active: { label: 'Active' },
  deactivated: { label: 'Deactivated' },
  support_restricted: { label: 'Support Restricted' },
  suspended: { label: 'Suspended' },
  pending_deletion: { label: 'Pending Deletion' },
  deleted: { label: 'Deleted' },
}

export const INVITE_EXPIRY_HOURS = 48

export const DELETION_RECOVERY_DAYS = 30

export const HOME_SECTIONS = [
  'journey',
  'active_workflow',
  'recent_activity',
  'current_employment',
] as const

export type HomeSection = (typeof HOME_SECTIONS)[number]

export interface NavItem {
  label: string
  href: string
  icon: string
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: 'Home' },
  { label: 'Jobs', href: '/jobs', icon: 'Briefcase' },
  { label: 'Ready', href: '/ready', icon: 'CheckCircle' },
  { label: 'Sent', href: '/sent', icon: 'Send' },
  { label: 'Profile', href: '/profile', icon: 'User' },
]
