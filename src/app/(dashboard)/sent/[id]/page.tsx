'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/shared/page-header'
import { Loading } from '@/components/shared/loading'
import { formatDate } from '@/lib/utils'
import type { WorkflowWithRelations, StatusEvent } from '@/types/database'

const statusIcons: Record<string, typeof CheckCircle> = {
  sent: Clock,
  received: CheckCircle,
  interview: CheckCircle,
  offer: CheckCircle,
  negotiation: CheckCircle,
  hired: CheckCircle,
  rejected: XCircle,
  ghosted: XCircle,
  declined: XCircle,
}

export default function SentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [workflow, setWorkflow] = useState<WorkflowWithRelations | null>(null)
  const [statusEvents, setStatusEvents] = useState<StatusEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/workflows/${id}`).then(r => r.json()),
      fetch(`/api/workflows/${id}/status`).then(r => r.json()),
    ]).then(([wf, events]) => {
      setWorkflow(wf)
      setStatusEvents(Array.isArray(events) ? events : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const addStatus = async (eventType: string) => {
    const res = await fetch(`/api/workflows/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType }),
    })
    if (res.ok) {
      const events = await fetch(`/api/workflows/${id}/status`).then(r => r.json())
      setStatusEvents(Array.isArray(events) ? events : [])
    }
  }

  if (loading) return <Loading />
  if (!workflow) return <div className="text-center py-12 text-foreground-muted">Not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-[8px] p-2 hover:bg-utility transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <PageHeader title={workflow.title} />
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status History</CardTitle>
        </CardHeader>
        <CardContent>
          {statusEvents.length > 0 ? (
            <div className="space-y-4">
              {statusEvents.map(event => {
                const Icon = statusIcons[event.event_type] || Clock
                return (
                  <div key={event.id} className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${
                      ['rejected', 'ghosted', 'declined'].includes(event.event_type)
                        ? 'text-destructive'
                        : event.event_type === 'hired'
                        ? 'text-success'
                        : 'text-accent'
                    }`} />
                    <div>
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
            <p className="text-xs font-medium text-foreground-muted mb-3">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {['interview', 'offer', 'negotiation', 'hired', 'rejected', 'ghosted', 'declined'].map(status => (
                <Button key={status} size="sm" variant="outline" onClick={() => addStatus(status)}>
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
