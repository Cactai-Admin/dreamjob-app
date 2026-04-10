'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Moon, Sun, Monitor } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/shared/page-header'
import { useTheme } from '@/app/providers'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user } = useSession()

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-[8px] p-2 hover:bg-utility transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <PageHeader title="Settings" />
      </div>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {themes.map(t => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-[12px] border-2 px-6 py-4 transition-all',
                  theme === t.value ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/30'
                )}
              >
                <t.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Personal information broader use</Label>
              <p className="text-xs text-foreground-subtle">Allow use of your personal data for service improvement</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Product accuracy improvement</Label>
              <p className="text-xs text-foreground-subtle">Help improve AI output quality</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-foreground-muted">Email</p>
            <p className="text-sm font-medium">{user?.account.email}</p>
          </div>
          <div>
            <p className="text-sm text-foreground-muted">Role</p>
            <p className="text-sm font-medium capitalize">{user?.activeRole.replace(/_/g, ' ')}</p>
          </div>
          <Separator />
          <Button variant="destructive" size="sm">Delete Account</Button>
          <p className="text-xs text-foreground-subtle">
            Your account will enter a 30-day pending deletion period. You can cancel during this time.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
