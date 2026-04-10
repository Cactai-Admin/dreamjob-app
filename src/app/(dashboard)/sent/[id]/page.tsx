'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, CheckCircle, Clock, XCircle, FileText,
  ExternalLink, Sparkles, Send,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/shared/page-header'
import { Loading } from '@/components/shared/loading'
import { cn, formatDate } from '@/lib/utils'
import type { WorkflowWithRelations, StatusEvent, Output } from '@/types/database'

const statusIcons: Record<string, typeof CheckCircle> = {
  sent: Send,
  received: CheckCircle,
  interview: CheckCircle,
  offer: CheckCircle,
  negotiation: CheckCircle,
  hired: CheckCircle,
  rejected: XCircle,
  ghosted: XCircle,
  declined: XCircle,
}

const statusColors: Record<string, string> = {
  rejected: 'text-destructive',
  ghosted: 'text-destructive',
  declined: 'text-destructive',
  hired: 'text-success',
  offer: 'text-success',
}

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (line.match(/^[-*]\s/)) {
      const content = line.replace(/^[-*]\s/, '')
      return <li key={i} className="ml-4 list-disc">{formatInline(content)}</li>
    }
    if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, '')
      return <li key={i} className="ml-4 list-decimal">{formatInline(content)}</li>
    }
    if (line.trim() === '') return <br key={i} />
    return <p key={i}>{formatInline(line)}</p>
  })
}

function formatInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function SentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [workflow, setWorkflow] = useState<WorkflowWithRelations | null>(null)
  const [outputs, setOutputs] = useState<Output[]>([])
  const [statusEvents, setStatusEvents] = useState<StatusEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/workflows/${id}`).then(r => r.json()),
      fetch(`/api/workflows/${id}/outputs`).then(r => r.json()),
      fetch(`/api/workflows/${id}/status`).then(r => r.json()),
    ]).then(([wf, outs, events]) => {
      setWorkflow(wf)
      setOutputs(Array.isArray(outs) ? outs : [])
      setStatusEvents(Array.isArray(events) ? events : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const refreshStatus = async () => {
    const events = await fetch(`/api/workflows/${id}/status`).then(r => r.json())
    setStatusEvents(Array.isArray(events) ? events : [])
  }

  const toggleStatus = async (eventType: string) => {
    const exists = statusEvents.some(e => e.event_type === eventType)
    if (exists) {
      const res = await fetch(`/api/workflows/${id}/status?event_type=${eventType}`, { method: 'DELETE' })
      if (res.ok) await refreshStatus()
    } else {
      const res = await fetch(`/api/workflows/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType }),
      })
      if (res.ok) await refreshStatus()
    }
  }

  if (loading) return <Loading />
  if (!workflow) return <div className="text-center py-12 text-foreground-muted">Not found</div>

  const listing = workflow.listing
  const latestStatus = statusEvents.find(e => e.is_current)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-[16px] p-2 hover:bg-utility transition-colors duration-[120ms]">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <PageHeader title={workflow.title} />
        </div>
        {latestStatus && (
          <Badge variant={
            ['rejected', 'ghosted', 'declined'].includes(latestStatus.event_type) ? 'destructive'
            : ['hired', 'offer'].includes(latestStatus.event_type) ? 'success'
            : 'default'
          }>
            {latestStatus.event_type.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="outputs">Outputs</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab — listing details + quick status */}
        <TabsContent value="overview">
          <div className="space-y-4">
            {/* Listing Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Job Listing
                  {listing?.source_url && (
                    <a href={listing.source_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-dark transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs font-medium text-foreground-muted">Company</p><p className="text-sm">{listing?.company_name || '—'}</p></div>
                  <div><p className="text-xs font-medium text-foreground-muted">Title</p><p className="text-sm">{listing?.title || '—'}</p></div>
                  <div><p className="text-xs font-medium text-foreground-muted">Location</p><p className="text-sm">{listing?.location || '—'}</p></div>
                  <div><p className="text-xs font-medium text-foreground-muted">Salary</p><p className="text-sm">{listing?.salary_range || '—'}</p></div>
                  <div><p className="text-xs font-medium text-foreground-muted">Type</p><p className="text-sm">{listing?.employment_type || '—'}</p></div>
                  <div><p className="text-xs font-medium text-foreground-muted">Level</p><p className="text-sm">{listing?.experience_level || '—'}</p></div>
                </div>
                {listing?.description && (
                  <div className="mt-3"><p className="text-xs font-medium text-foreground-muted mb-1">Description</p><p className="text-sm text-foreground-muted whitespace-pre-wrap">{listing.description}</p></div>
                )}
                {listing?.requirements && (
                  <div className="mt-3"><p className="text-xs font-medium text-foreground-muted mb-1">Requirements</p><p className="text-sm text-foreground-muted whitespace-pre-wrap">{listing.requirements}</p></div>
                )}
              </CardContent>
            </Card>

            {/* Sent info */}
            <Card>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-foreground-muted">Sent:</span>{' '}
                    <span className="font-medium">{workflow.sent_at ? formatDate(workflow.sent_at) : 'Not recorded'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-foreground-muted">State:</span>{' '}
                    <span className="font-medium capitalize">{workflow.state.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Status Update */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Update Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-foreground-subtle mb-3">Click to toggle. Active statuses are highlighted.</p>
                <div className="flex flex-wrap gap-2">
                  {['interview', 'offer', 'negotiation', 'hired', 'rejected', 'ghosted', 'declined'].map(status => {
                    const isActive = statusEvents.some(e => e.event_type === status)
                    return (
                      <Button key={status} size="sm" variant={isActive ? 'default' : 'outline'} onClick={() => toggleStatus(status)} className={cn('capitalize', isActive && 'ring-2 ring-accent/30')}>
                        {isActive && <CheckCircle className="mr-1 h-3 w-3" />}
                        {status}
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Outputs Tab — generated documents */}
        <TabsContent value="outputs">
          <div className="space-y-4">
            {outputs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-foreground-muted">No outputs were generated for this application.</p>
                </CardContent>
              </Card>
            ) : (
              outputs.map(output => {
                const label = output.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                return (
                  <Card key={output.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          {label}
                        </CardTitle>
                        <Badge variant={output.state === 'ready' ? 'success' : 'secondary'}>
                          {output.state} · v{output.version}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-foreground-muted leading-relaxed whitespace-pre-wrap">
                        {renderMarkdown(output.content)}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        {/* Timeline Tab — status history */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status History</CardTitle>
            </CardHeader>
            <CardContent>
              {statusEvents.length > 0 ? (
                <div className="relative">
                  {statusEvents.map((event, idx) => {
                    const Icon = statusIcons[event.event_type] || Clock
                    const color = statusColors[event.event_type] || 'text-accent'
                    const isLast = idx === statusEvents.length - 1
                    return (
                      <div key={event.id} className="flex gap-3 pb-4 last:pb-0">
                        <div className="flex flex-col items-center">
                          <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                          {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
                        </div>
                        <div className="pb-2">
                          <p className="text-sm font-medium capitalize">{event.event_type.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-foreground-subtle">{formatDate(event.occurred_at)}</p>
                          {event.notes && <p className="mt-1 text-sm text-foreground-muted">{event.notes}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-foreground-muted">No status updates yet.</p>
              )}

              <Separator className="my-4" />

              <div>
                <p className="text-xs font-medium text-foreground-muted mb-3">Toggle Status</p>
                <div className="flex flex-wrap gap-2">
                  {['interview', 'offer', 'negotiation', 'hired', 'rejected', 'ghosted', 'declined'].map(status => {
                    const isActive = statusEvents.some(e => e.event_type === status)
                    return (
                      <Button key={status} size="sm" variant={isActive ? 'default' : 'outline'} onClick={() => toggleStatus(status)} className={cn('capitalize', isActive && 'ring-2 ring-accent/30')}>
                        {isActive && <CheckCircle className="mr-1 h-3 w-3" />}
                        {status}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
