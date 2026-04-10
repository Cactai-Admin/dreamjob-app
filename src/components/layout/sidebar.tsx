'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Briefcase, CheckCircle, Send, User,
  ChevronLeft, ChevronRight, Moon, Sun, LogOut,
  Settings, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/app/providers'
import { useSession } from '@/hooks/use-session'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { getInitials } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Jobs', href: '/jobs', icon: Briefcase },
  { label: 'Ready', href: '/ready', icon: CheckCircle },
  { label: 'Sent', href: '/sent', icon: Send },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { resolvedTheme, toggleTheme } = useTheme()
  const { user } = useSession()

  const handleSignOut = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' })
    window.location.href = '/login'
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-object',
        'transition-all duration-[var(--duration-standard)] ease-[var(--ease-standard)]',
      )}
      style={{ width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}
    >
      {/* Logo */}
      <div className="flex h-12 items-center justify-between px-3">
        {!collapsed && (
          <Link href="/" className="text-base font-bold text-accent truncate">
            DreamJob
          </Link>
        )}
        <button
          onClick={onToggle}
          className="rounded-[var(--radius-sm)] p-1.5 text-foreground-muted hover:bg-utility hover:text-foreground transition-colors duration-[var(--duration-fast)]"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <Separator />

      {/* Main Nav */}
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)

          const link = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium',
                'transition-colors duration-[var(--duration-fast)]',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-foreground-muted hover:bg-utility hover:text-foreground'
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          }

          return link
        })}

        {/* Admin link for internal roles */}
        {user && ['super_admin', 'admin'].includes(user.activeRole) && (
          <>
            <Separator className="my-2" />
            {(() => {
              const isActive = pathname.startsWith('/admin')
              const link = (
                <Link
                  href="/admin"
                  className={cn(
                    'flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium',
                    'transition-colors duration-[var(--duration-fast)]',
                    isActive
                      ? 'bg-accent/10 text-accent'
                      : 'text-foreground-muted hover:bg-utility hover:text-foreground'
                  )}
                >
                  <Shield className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span>Admin</span>}
                </Link>
              )
              if (collapsed) {
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">Admin</TooltipContent>
                  </Tooltip>
                )
              }
              return link
            })()}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="space-y-1 p-2">
        {/* Profile Link */}
        {(() => {
          const isActive = pathname.startsWith('/profile')
          const link = (
            <Link
              href="/profile"
              className={cn(
                'flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium',
                'transition-colors duration-[var(--duration-fast)]',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-foreground-muted hover:bg-utility hover:text-foreground'
              )}
            >
              <User className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>Profile</span>}
            </Link>
          )
          if (collapsed) {
            return (
              <Tooltip>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">Profile</TooltipContent>
              </Tooltip>
            )
          }
          return link
        })()}

        <Separator className="my-2" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors hover:bg-utility">
              <Avatar size="sm">
                <AvatarImage src={user?.account.avatar_url ?? undefined} />
                <AvatarFallback>
                  {getInitials(user?.account.display_name ?? 'U')}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.account.display_name ?? 'User'}
                  </p>
                  <p className="text-xs text-foreground-subtle truncate">
                    {user?.activeRole.replace('_', ' ')}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuLabel>
              {user?.account.display_name}
              <span className="block text-xs font-normal text-foreground-muted">
                {user?.account.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleTheme}>
              {resolvedTheme === 'dark' ? <Sun className="mr-2 h-3.5 w-3.5" /> : <Moon className="mr-2 h-3.5 w-3.5" />}
              {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile/settings">
                <Settings className="mr-2 h-3.5 w-3.5" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
