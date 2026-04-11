'use client'

/**
 * DocSubheader — shared header bar for all document review pages.
 *
 * Left:   ← Back · CompanyName · [doc tabs] · [trash — far right]
 * Right:  [Save] [Edit/Lock] [AI]
 *
 * Status dropdown lives here on desktop only.
 * On mobile it is injected into the top nav via MobileNavSlot (caller's responsibility).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, Mail, MessageSquare, TrendingUp,
  Save, Check, Sparkles, Trash2,
  PenLine, Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

function statusColor(s: string) {
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

type DocType = 'resume' | 'cover-letter' | 'interview-guide' | 'negotiation-guide'

const DOC_TABS: { type: DocType; label: string; icon: React.ElementType }[] = [
  { type: 'resume',            label: 'Resume',      icon: FileText },
  { type: 'cover-letter',      label: 'Cover',       icon: Mail },
  { type: 'interview-guide',   label: 'Interview',   icon: MessageSquare },
  { type: 'negotiation-guide', label: 'Negotiation', icon: TrendingUp },
]

interface Props {
  workflowId: string
  companyName: string
  activeDoc: DocType
  // Save state
  isDirty: boolean
  onSave: () => void
  // Edit / Lock (doc approval)
  docLocked: boolean         // true = locked/approved, false = editing/draft
  onToggleLock: () => void
  // Application status (desktop only — mobile renders via MobileNavSlot)
  appStatus: string
  onStatusChange: (val: string) => void
  // AI chat panel toggle
  chatOpen: boolean
  onChatToggle: () => void
  // Delete (modal handled here)
  onDelete: () => void
}

export function DocSubheader({
  workflowId,
  companyName,
  activeDoc,
  isDirty,
  onSave,
  docLocked,
  onToggleLock,
  appStatus,
  onStatusChange,
  chatOpen,
  onChatToggle,
  onDelete,
}: Props) {
  const router = useRouter()
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <>
      {/* Delete confirmation modal */}
      {confirmDel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setConfirmDel(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold text-slate-900 text-base mb-1">Delete application?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This will move the application to Trash. You can restore it within 30 days.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onDelete}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subheader bar */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">

          {/* ── Left: back · company · doc tabs ── */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={() => router.push(`/jobs/${workflowId}`)}
              className="text-sm text-slate-500 flex-shrink-0 leading-none"
              aria-label="Back"
            >
              ←
            </button>
            <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
            <span className="font-semibold text-slate-900 text-sm truncate hidden sm:block">
              {companyName}
            </span>

            {/* Doc type tabs */}
            <div className="flex items-center gap-0.5 p-1 bg-slate-100 rounded-lg flex-shrink-0">
              {DOC_TABS.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => type !== activeDoc && router.push(`/jobs/${workflowId}/${type}`)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                    type === activeDoc
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-500'
                  )}
                >
                  <Icon className="w-3 h-3 flex-shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Right: status (desktop) · save · lock · AI · trash ── */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">

            {/* Status dropdown — desktop only, mobile uses MobileNavSlot */}
            <div className="relative hidden sm:block">
              <select
                value={appStatus}
                onChange={e => onStatusChange(e.target.value)}
                className={cn(
                  'text-xs font-medium pl-3 pr-6 py-2 rounded-xl border bg-white appearance-none cursor-pointer',
                  statusColor(appStatus)
                )}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▾</span>
            </div>

            {/* Save */}
            <button
              onClick={onSave}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600"
              title="Save"
            >
              {isDirty
                ? <Save className="w-3.5 h-3.5" />
                : <span className="text-emerald-600 font-semibold">Saved</span>
              }
            </button>

            {/* Edit / Lock toggle */}
            <button
              onClick={onToggleLock}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border',
                docLocked
                  ? 'border-slate-300 bg-slate-50 text-slate-700'
                  : 'border-sky-300 bg-sky-50 text-sky-700'
              )}
              title={docLocked ? 'Locked — click to unlock' : 'Editing — click to lock'}
            >
              {docLocked
                ? <><Lock    className="w-3.5 h-3.5" /><span className="hidden sm:inline">Locked</span></>
                : <><PenLine className="w-3.5 h-3.5" /><span className="hidden sm:inline">Editing</span></>
              }
            </button>

            {/* AI */}
            <button
              onClick={onChatToggle}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border',
                chatOpen
                  ? 'bg-sky-50 text-sky-700 border-sky-300'
                  : 'bg-white text-slate-600 border-slate-200'
              )}
              title="AI assistant"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI</span>
            </button>

            {/* Trash — far right */}
            <button
              onClick={() => setConfirmDel(true)}
              className="flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete application"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

