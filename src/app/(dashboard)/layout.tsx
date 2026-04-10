'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { cn } from '@/lib/utils'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Main content */}
      <main
        className={cn(
          'min-h-screen pb-16 md:pb-0',
          'transition-all duration-[var(--duration-standard)] ease-[var(--ease-standard)]',
        )}
        style={{
          paddingLeft: collapsed
            ? `calc(var(--sidebar-collapsed-width) + var(--app-shell-padding))`
            : `calc(var(--sidebar-width) + var(--app-shell-padding))`,
          paddingRight: 'var(--app-shell-padding)',
          paddingTop: 'var(--app-shell-padding)',
        }}
      >
        <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
