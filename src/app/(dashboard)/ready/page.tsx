'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime } from '@/lib/utils'
import type { WorkflowWithRelations } from '@/types/database'

export default function ReadyPage() {
  const [workflows, setWorkflows] = useState<WorkflowWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/workflows')
      .then(r => r.json())
      .then(data => {
        const ready = (Array.isArray(data) ? data : []).filter(
          (w: WorkflowWithRelations) => ['ready', 'ready_to_send'].includes(w.state)
        )
        setWorkflows(ready)
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
      <PageHeader title="Ready" description="Applications ready to send" />

      {workflows.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="No applications ready yet"
          description="Complete a Q&A workflow and review your outputs to get applications ready to send."
        />
      ) : (
        <div className="space-y-3">
          {workflows.map(w => (
            <Link key={w.id} href={`/ready/${w.id}`}>
              <Card className="transition-all duration-fast hover:border-accent/30 cursor-pointer">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{w.title}</p>
                      <Badge variant={w.state === 'ready_to_send' ? 'success' : 'warning'}>
                        {w.state === 'ready_to_send' ? 'Ready to Send' : 'Review'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-foreground-muted">
                      Resume: {w.resume_state} · Cover letter: {w.cover_letter_state} · Updated {formatRelativeTime(w.updated_at)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-foreground-subtle" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
