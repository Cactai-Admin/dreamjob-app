'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Send, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime, formatDate } from '@/lib/utils'
import type { WorkflowWithRelations } from '@/types/database'

export default function SentPage() {
  const [workflows, setWorkflows] = useState<WorkflowWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/workflows')
      .then(r => r.json())
      .then(data => {
        const sent = (Array.isArray(data) ? data : []).filter(
          (w: WorkflowWithRelations) => ['sent', 'completed'].includes(w.state)
        )
        setWorkflows(sent)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 'var(--section-gap)' }}>
        <Skeleton className="h-8 w-32" />
        {[1, 2].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 'var(--section-gap)' }}>
      <PageHeader title="Sent" description="Track your submitted applications" />

      {workflows.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No sent applications yet"
          description="Mark an application as sent after you've submitted it."
        />
      ) : (
        <div className="space-y-3">
          {workflows.map(w => {
            const latestStatus = w.status_events?.find(e => e.is_current)

            return (
              <Link key={w.id} href={`/sent/${w.id}`}>
                <Card className="transition-all duration-fast hover:border-accent/30 cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{w.title}</p>
                        {latestStatus && (
                          <Badge>{latestStatus.event_type.replace(/_/g, ' ')}</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-foreground-muted">
                        Sent {w.sent_at ? formatDate(w.sent_at) : 'N/A'} · Last update {formatRelativeTime(w.updated_at)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-foreground-subtle" />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
