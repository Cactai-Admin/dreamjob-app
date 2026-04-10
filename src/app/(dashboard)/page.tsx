'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Briefcase, CheckCircle, Send, TrendingUp, Plus, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/hooks/use-session'
import { formatRelativeTime } from '@/lib/utils'
import type { Workflow } from '@/types/database'

export default function DashboardHome() {
  const { user } = useSession()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/workflows')
      .then(r => r.json())
      .then(data => {
        setWorkflows(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const activeWorkflow = workflows.find(
    w => !['sent', 'completed', 'archived'].includes(w.state)
  )
  const jobsCount = workflows.filter(
    w => !['sent', 'completed', 'archived'].includes(w.state)
  ).length
  const readyCount = workflows.filter(w => w.state === 'ready_to_send').length
  const sentCount = workflows.filter(w => w.state === 'sent' || w.state === 'completed').length

  const stats = [
    { label: 'Active Jobs', value: jobsCount, icon: Briefcase, href: '/jobs' },
    { label: 'Ready to Send', value: readyCount, icon: CheckCircle, href: '/ready' },
    { label: 'Sent', value: sentCount, icon: Send, href: '/sent' },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-gap)' }}>
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 'var(--stats-card-gap)' }}>
          {[1, 2, 3].map(i => <Skeleton key={i} style={{ height: 'var(--stats-card-height)' }} />)}
        </div>
        <Skeleton className="h-36" />
      </div>
    )
  }

  const hasData = workflows.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-gap)' }}>
      <PageHeader
        title={`Welcome back${user?.account.display_name ? `, ${user.account.display_name.split(' ')[0]}` : ''}`}
        description="Your journey to a DreamJob starts here."
        actions={
          <Link href="/jobs">
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Application
            </Button>
          </Link>
        }
      />

      {!hasData ? (
        <EmptyState
          icon={TrendingUp}
          title="It's a Ghost Town Around Here..."
          description="Paste a job listing URL to start your first application."
          actionLabel="Add a Job Listing"
          onAction={() => window.location.href = '/jobs'}
        />
      ) : (
        <>
          {/* Stats — compact per spec: 58px height, 6px gap */}
          <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 'var(--stats-card-gap)' }}>
            {stats.map(stat => (
              <Link key={stat.label} href={stat.href}>
                <Card className="cursor-pointer hover:border-accent/30 transition-colors duration-[var(--duration-fast)]">
                  <CardContent className="flex items-center gap-4" style={{ height: 'var(--stats-card-height)', padding: 'var(--panel-padding)' }}>
                    <div className="rounded-full bg-accent/10 p-2.5">
                      <stat.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground leading-none">{stat.value}</p>
                      <p className="text-sm text-foreground-muted mt-1">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Active Workflow */}
          {activeWorkflow && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{activeWorkflow.title}</p>
                    <p className="text-sm text-foreground-muted mt-1">
                      {activeWorkflow.state.replace(/_/g, ' ')} · Updated {formatRelativeTime(activeWorkflow.updated_at)}
                    </p>
                  </div>
                  <Link href={`/jobs/${activeWorkflow.id}`}>
                    <Button variant="ghost" size="sm">
                      Continue <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                {workflows.slice(0, 5).map(w => (
                  <Link
                    key={w.id}
                    href={`/jobs/${w.id}`}
                    className="flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 transition-colors hover:bg-utility"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{w.title}</p>
                      <span className="text-xs text-foreground-subtle shrink-0">
                        {w.state.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-foreground-subtle shrink-0 ml-2">
                      {formatRelativeTime(w.updated_at)}
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
