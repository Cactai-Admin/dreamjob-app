'use client'

import { useEffect, useState } from 'react'
import { User, Briefcase, FileText, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import type { Profile } from '@/types/database'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', location: '',
    headline: '', summary: '', linkedin_url: '', website_url: '',
    desired_title: '', desired_location: '', remote_preference: '',
  })

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        setProfile(data)
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          location: data.location || '',
          headline: data.headline || '',
          summary: data.summary || '',
          linkedin_url: data.linkedin_url || '',
          website_url: data.website_url || '',
          desired_title: data.desired_title || '',
          desired_location: data.desired_location || '',
          remote_preference: data.remote_preference || '',
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your personal and career information" />

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/profile/employment">
          <Button variant="outline" size="sm">
            <Briefcase className="mr-2 h-4 w-4" /> Employment History
          </Button>
        </Link>
        <Link href="/dashboard/profile/deleted-files">
          <Button variant="outline" size="sm">
            <Trash2 className="mr-2 h-4 w-4" /> Deleted Files
          </Button>
        </Link>
        <Link href="/dashboard/profile/settings">
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" /> Settings
          </Button>
        </Link>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>First Name</Label>
              <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Headline</Label>
              <Input value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} placeholder="e.g., Senior Product Manager" />
            </div>
            <div className="sm:col-span-2">
              <Label>Summary</Label>
              <textarea
                value={form.summary}
                onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                className="w-full rounded-[12px] border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                rows={4}
              />
            </div>
            <div>
              <Label>LinkedIn URL</Label>
              <Input value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} />
            </div>
            <div>
              <Label>Website URL</Label>
              <Input value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} />
            </div>
            <div>
              <Label>Desired Title</Label>
              <Input value={form.desired_title} onChange={e => setForm(f => ({ ...f, desired_title: e.target.value }))} />
            </div>
            <div>
              <Label>Desired Location</Label>
              <Input value={form.desired_location} onChange={e => setForm(f => ({ ...f, desired_location: e.target.value }))} />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
