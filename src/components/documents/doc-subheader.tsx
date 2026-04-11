'use client'

/**
 * doc-subheader — shared constants and types for document review pages.
 * The DocSubheader component has been removed; controls are injected into
 * TopNav via DocControlsProvider (doc-controls-slot.tsx).
 */

import { FileText, Mail, MessageSquare, TrendingUp } from 'lucide-react'
import type { DocType } from '@/components/layout/doc-controls-slot'

export type { DocType }

export const STATUS_OPTIONS = [
  { value: 'draft',        label: 'Draft',        event: null },
  { value: 'ready',        label: 'Ready',        event: null },
  { value: 'applied',      label: 'Applied',      event: 'sent' },
  { value: 'received',     label: 'Received',     event: 'received' },
  { value: 'interviewing', label: 'Interviewing', event: 'interview' },
  { value: 'offer',        label: 'Offer',        event: 'offer' },
  { value: 'negotiating',  label: 'Negotiating',  event: 'negotiation' },
  { value: 'hired',        label: 'Hired',        event: 'hired' },
  { value: 'declined',     label: 'Declined',     event: 'declined' },
  { value: 'ghosted',      label: 'Ghosted',      event: 'ghosted' },
  { value: 'rejected',     label: 'Rejected',     event: 'rejected' },
] as const

export type AppStatusValue = (typeof STATUS_OPTIONS)[number]['value']

export function statusColor(s: string) {
  if (s === 'hired')        return 'border-green-300 text-green-700'
  if (s === 'offer')        return 'border-emerald-300 text-emerald-700'
  if (s === 'negotiating')  return 'border-teal-300 text-teal-700'
  if (s === 'interviewing') return 'border-amber-300 text-amber-700'
  if (s === 'received')     return 'border-violet-300 text-violet-700'
  if (s === 'applied')      return 'border-sky-300 text-sky-700'
  if (s === 'declined')     return 'border-orange-300 text-orange-700'
  if (s === 'rejected')     return 'border-red-300 text-red-600'
  if (s === 'ghosted')      return 'border-slate-300 text-slate-500'
  return 'border-slate-200 text-slate-600'
}

export const DOC_TABS: { type: DocType; label: string; icon: React.ElementType }[] = [
  { type: 'resume',            label: 'Resume',      icon: FileText },
  { type: 'cover-letter',      label: 'Cover Letter', icon: Mail },
  { type: 'interview-guide',   label: 'Interview',   icon: MessageSquare },
  { type: 'negotiation-guide', label: 'Negotiation', icon: TrendingUp },
]
