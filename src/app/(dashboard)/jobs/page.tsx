'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, Plus, Link as LinkIcon, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  const [showManual, setShowManual] = useState(false)
  const [manualData, setManualData] = useState({ company_name: '', title: '', description: '', requirements: '' })

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
      // Try to parse the listing via AI
      const parseRes = await fetch('/api/listings/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: listingUrl }),
      })

      let listingData: Record<string, string> = {}
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

      router.push(`/dashboard/jobs/${data.id}`)
    } catch {
      setError('Failed to create workflow')
    } finally {
      setCreating(false)
    }
  }

  const handleCreateManual = async () => {
    if (!manualData.company_name || !manualData.title) {
      setError('Company name and job title are required')
      return
    }

    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualData),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        return
      }

      router.push(`/dashboard/jobs/${data.id}`)
    } catch {
      setError('Failed to create workflow')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Jobs" description="Track your job applications" />

      {/* URL Input */}
      <Card>
        <CardContent className="p-4">
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
            <Button onClick={handleCreateFromUrl} disabled={creating || !listingUrl}>
              {creating ? 'Creating...' : 'Go'}
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Manual</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Job Manually</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input
                    placeholder="Company name *"
                    value={manualData.company_name}
                    onChange={e => setManualData(d => ({ ...d, company_name: e.target.value }))}
                  />
                  <Input
                    placeholder="Job title *"
                    value={manualData.title}
                    onChange={e => setManualData(d => ({ ...d, title: e.target.value }))}
                  />
                  <Input
                    placeholder="Description"
                    value={manualData.description}
                    onChange={e => setManualData(d => ({ ...d, description: e.target.value }))}
                  />
                  <Input
                    placeholder="Requirements"
                    value={manualData.requirements}
                    onChange={e => setManualData(d => ({ ...d, requirements: e.target.value }))}
                  />
                  <Button onClick={handleCreateManual} disabled={creating} className="w-full">
                    {creating ? 'Creating...' : 'Create Application'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
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
        <div className="space-y-3">
          {workflows.map(w => (
            <Link key={w.id} href={`/dashboard/jobs/${w.id}`}>
              <Card className="transition-all duration-fast hover:border-accent/30 cursor-pointer">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{w.title}</p>
                      <Badge variant={STATE_COLORS[w.state] as 'default' | 'secondary' | 'success' | 'warning' || 'secondary'}>
                        {w.state.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-foreground-muted">
                      {w.listing?.location && `${w.listing.location} · `}
                      Updated {formatRelativeTime(w.updated_at)}
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
