'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, Link as LinkIcon, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime, isValidUrl } from '@/lib/utils'
import type { WorkflowWithRelations } from '@/types/database'

const STATE_COLORS: Record<string, string> = {
  listing_review: 'secondary',
  qa_intake: 'default',
  generating: 'default',
  review: 'warning',
  ready: 'success',
  active: 'default',
  ready_to_send: 'success',
}

export default function JobsPage() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<WorkflowWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [listingUrl, setListingUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/workflows')
      .then(r => r.json())
      .then(data => {
        const active = (Array.isArray(data) ? data : []).filter(
          (w: WorkflowWithRelations) => !['sent', 'completed', 'archived'].includes(w.state)
        )
        setWorkflows(active)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleCreateFromUrl = async () => {
    if (!listingUrl) return
    if (!isValidUrl(listingUrl)) {
      setError('Please enter a valid URL')
      return
    }

    setCreating(true)
    setError('')

    try {
      let listingData: Record<string, string> = {}
      const parseRes = await fetch('/api/listings/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: listingUrl }),
      })
      if (parseRes.ok) {
        listingData = await parseRes.json()
      }

      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_url: listingUrl,
          company_name: listingData.company_name || 'Unknown Company',
          title: listingData.title || 'Untitled Position',
          description: listingData.description,
          requirements: listingData.requirements,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        return
      }

      router.push(`/jobs/${data.id}`)
    } catch {
      setError('Failed to create workflow')
    } finally {
      setCreating(false)
    }
  }

  const handleCreateManual = async () => {
    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: 'New Company',
          title: 'New Position',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        return
      }

      // Navigate to listing page — it opens in edit mode by default when fields are mostly empty
      router.push(`/jobs/${data.id}`)
    } catch {
      setError('Failed to create workflow')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-gap)' }}>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-gap)' }}>
      <PageHeader title="Jobs" />

      {/* URL Input — always visible per spec */}
      <Card>
        <CardContent className="!p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
              <Input
                placeholder="Paste a job listing URL..."
                value={listingUrl}
                onChange={e => { setListingUrl(e.target.value); setError('') }}
                className="pl-10"
                onKeyDown={e => e.key === 'Enter' && handleCreateFromUrl()}
              />
            </div>
            <Button onClick={handleCreateFromUrl} disabled={creating || !listingUrl} size="sm">
              {creating ? 'Creating...' : 'Go'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCreateManual} disabled={creating}>
              Manual
            </Button>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Job list */}
      {workflows.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="It's a Ghost Town Around Here..."
          description="Paste a job listing URL above to start your first application."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {workflows.map(w => (
            <Link key={w.id} href={`/jobs/${w.id}`}>
              <Card className="cursor-pointer hover:border-accent/30 transition-colors duration-[var(--duration-fast)]">
                <CardContent className="flex items-center justify-between !p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{w.title}</p>
                      <Badge variant={STATE_COLORS[w.state] as 'default' | 'secondary' | 'success' | 'warning' || 'secondary'}>
                        {w.state.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-foreground-muted">
                      {w.listing?.company_name && `${w.listing.company_name}`}
                      {w.listing?.location && ` · ${w.listing.location}`}
                      {` · Updated ${formatRelativeTime(w.updated_at)}`}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-foreground-subtle shrink-0 ml-2" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
