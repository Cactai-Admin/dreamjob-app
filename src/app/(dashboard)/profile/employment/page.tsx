'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import type { EmploymentHistory } from '@/types/database'

export default function EmploymentPage() {
  const router = useRouter()
  const [employment, setEmployment] = useState<EmploymentHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    company_name: '', title: '', location: '', start_date: '',
    end_date: '', is_current: false, description: '',
  })

  const fetchEmployment = () => {
    fetch('/api/profile/employment')
      .then(r => r.json())
      .then(data => { setEmployment(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchEmployment() }, [])

  const handleAdd = async () => {
    await fetch('/api/profile/employment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        end_date: form.is_current ? null : form.end_date,
        responsibilities: [],
        achievements: [],
        technologies: [],
      }),
    })
    setShowAdd(false)
    setForm({ company_name: '', title: '', location: '', start_date: '', end_date: '', is_current: false, description: '' })
    fetchEmployment()
  }

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 'var(--section-gap)' }}><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 'var(--section-gap)' }}>
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-[var(--radius-sm)] p-2 hover:bg-utility transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <PageHeader
          title="Employment History"
          actions={
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Employment</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div><Label>Company *</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
                  <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                  <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Start Date *</Label><Input type="text" placeholder="2020" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                    <div><Label>End Date</Label><Input type="text" placeholder="2023 or present" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} disabled={form.is_current} /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={form.is_current} onCheckedChange={(v) => setForm(f => ({ ...f, is_current: !!v }))} />
                    <Label>Current position</Label>
                  </div>
                  <div><Label>Description</Label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" rows={3} /></div>
                  <Button onClick={handleAdd} className="w-full">Add Employment</Button>
                </div>
              </DialogContent>
            </Dialog>
          }
        />
      </div>

      {employment.length === 0 ? (
        <EmptyState icon={Building2} title="No employment history" description="Add your work experience to use in applications." />
      ) : (
        <div className="space-y-3">
          {employment.map(emp => (
            <Card key={emp.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{emp.title}</p>
                    <p className="text-sm text-foreground-muted">{emp.company_name}</p>
                    <p className="text-xs text-foreground-subtle">
                      {emp.start_date} – {emp.is_current ? 'Present' : emp.end_date}
                      {emp.location && ` · ${emp.location}`}
                    </p>
                    {emp.description && <p className="mt-2 text-sm text-foreground-muted">{emp.description}</p>}
                  </div>
                  {emp.is_current && <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Current</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
