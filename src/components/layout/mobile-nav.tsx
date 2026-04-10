'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, CheckCircle, Send, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Jobs', href: '/jobs', icon: Briefcase },
  { label: 'Ready', href: '/ready', icon: CheckCircle },
  { label: 'Sent', href: '/sent', icon: Send },
  { label: 'Profile', href: '/profile', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-object md:hidden">
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 text-xs transition-colors',
                isActive ? 'text-accent' : 'text-foreground-muted'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
