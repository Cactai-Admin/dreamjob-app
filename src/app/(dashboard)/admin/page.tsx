'use client'

import { useEffect, useState } from 'react'
import { Shield, Users, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/hooks/use-session'
import type { Account } from '@/types/database'

export default function AdminPage() {
  const { user } = useSession()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(data => { setAccounts(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (!user || !['super_admin', 'admin'].includes(user.activeRole)) {
    return <div className="py-12 text-center text-foreground-muted">Access denied</div>
  }

  if (loading) {
    return <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 'var(--section-gap)' }}><Skeleton className="h-8 w-32" /><Skeleton className="h-64" /></div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 'var(--section-gap)' }}>
      <PageHeader
        title="Admin"
        description="Platform administration"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold">{accounts.length}</p>
              <p className="text-sm text-foreground-muted">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Shield className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold">{accounts.filter(a => a.state === 'active').length}</p>
              <p className="text-sm text-foreground-muted">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Settings className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold">{accounts.filter(a => a.provider === 'internal').length}</p>
              <p className="text-sm text-foreground-muted">Internal</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {accounts.map(account => (
              <div key={account.id} className="flex items-center justify-between rounded-[8px] p-3 hover:bg-utility transition-colors">
                <div>
                  <p className="text-sm font-medium">{account.display_name}</p>
                  <p className="text-xs text-foreground-subtle">{account.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{account.provider}</Badge>
                  <Badge variant={account.state === 'active' ? 'success' : 'secondary'}>
                    {account.state}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
