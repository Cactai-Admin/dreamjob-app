'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, RotateCcw, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import type { DeletedItem } from '@/types/database'

function daysUntilExpiry(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function DeletedFilesPage() {
  const router = useRouter()
  const [items, setItems] = useState<DeletedItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = () => {
    fetch('/api/deleted-items')
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const restore = async (id: string) => {
    await fetch(`/api/deleted-items/${id}`, { method: 'POST' })
    fetchItems()
  }

  const permanentDelete = async (id: string) => {
    if (!confirm('This action is irreversible. Are you sure?')) return
    await fetch(`/api/deleted-items/${id}`, { method: 'DELETE' })
    fetchItems()
  }

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 'var(--section-gap)' }}><Skeleton className="h-8 w-48" /><Skeleton className="h-48" /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 'var(--section-gap)' }}>
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-[var(--radius-sm)] p-2 hover:bg-utility transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <PageHeader title="Deleted Files" description="Items pending deletion. You have 30 days to recover them." />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Trash2} title="No deleted items" description="Items you delete will appear here for 30 days before permanent removal." />
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const days = daysUntilExpiry(item.expires_at)
            return (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground capitalize">{item.item_type.replace(/_/g, ' ')}</p>
                      <Badge variant={days <= 5 ? 'destructive' : 'secondary'}>
                        <Clock className="mr-1 h-3 w-3" />
                        {days} days left
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground-muted">
                      Deleted {new Date(item.deleted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => restore(item.id)}>
                      <RotateCcw className="mr-1 h-3 w-3" /> Restore
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => permanentDelete(item.id)}>
                      Delete forever
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
