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
    { label: 'Active Jobs', value: jobsCount, icon: Briefcase, href: '/dashboard/jobs' },
    { label: 'Ready to Send', value: readyCount, icon: CheckCircle, href: '/dashboard/ready' },
    { label: 'Sent', value: sentCount, icon: Send, href: '/dashboard/sent' },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    )
  }

  const hasData = workflows.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back${user?.account.display_name ? `, ${user.account.display_name.split(' ')[0]}` : ''}`}
        description="Your journey to a DreamJob starts here."
        actions={
          <Link href="/dashboard/jobs">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Button>
          </Link>
        }
      />

      {!hasData ? (
        <EmptyState
          icon={TrendingUp}
          title="It's a Ghost Town Around Here..."
          description="Start your first job application to see your dashboard come to life."
          actionLabel="Add a Job Listing"
          onAction={() => window.location.href = '/dashboard/jobs'}
        />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map(stat => (
              <Link key={stat.label} href={stat.href}>
                <Card className="transition-all duration-fast hover:border-accent/30 cursor-pointer">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="rounded-full bg-accent/10 p-3">
                      <stat.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-sm text-foreground-muted">{stat.label}</p>
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
                    <p className="text-sm text-foreground-muted">
                      {activeWorkflow.state.replace(/_/g, ' ')} · Updated {formatRelativeTime(activeWorkflow.updated_at)}
                    </p>
                  </div>
                  <Link href={`/dashboard/jobs/${activeWorkflow.id}`}>
                    <Button variant="ghost" size="sm">
                      Continue <ArrowRight className="ml-1 h-4 w-4" />
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
              <div className="space-y-3">
                {workflows.slice(0, 5).map(w => (
                  <Link
                    key={w.id}
                    href={`/dashboard/jobs/${w.id}`}
                    className="flex items-center justify-between rounded-[8px] px-3 py-2 transition-colors hover:bg-utility"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{w.title}</p>
                      <p className="text-xs text-foreground-subtle">
                        {w.state.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <span className="text-xs text-foreground-subtle">
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
