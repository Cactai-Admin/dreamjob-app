'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export type ProviderName = 'openai' | 'anthropic'

const LABELS: Record<ProviderName, string> = {
  openai: 'OpenAI',
  anthropic: 'Claude',
}

const STORAGE_KEY = 'dj.defaultProvider'

/**
 * Returns the user's current default provider (from localStorage) with a safe
 * fallback. Use `useDefaultProvider` in components.
 */
export function getStoredDefaultProvider(): ProviderName {
  if (typeof window === 'undefined') return 'openai'
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === 'openai' || raw === 'anthropic') return raw
  return 'openai'
}

export function setStoredDefaultProvider(name: ProviderName) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, name)
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: name }))
}

export function useDefaultProvider(): [ProviderName, (p: ProviderName) => void] {
  const [value, setValue] = useState<ProviderName>('openai')
  useEffect(() => {
    setValue(getStoredDefaultProvider())
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'openai' || e.newValue === 'anthropic')) {
        setValue(e.newValue)
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])
  const update = (p: ProviderName) => {
    setStoredDefaultProvider(p)
    setValue(p)
  }
  return [value, update]
}

interface ProviderSelectProps {
  value: ProviderName
  onChange: (p: ProviderName) => void
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Per-task provider picker. The selection is local to the caller — it does NOT
 * update the stored default. Pass `useDefaultProvider()` to seed initial value.
 */
export function ProviderSelect({ value, onChange, size = 'sm', className }: ProviderSelectProps) {
  const sizeClass = size === 'sm' ? 'h-7 px-2 text-xs' : 'h-9 px-3 text-sm'
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-border bg-background p-0.5', className)}>
      {(['openai', 'anthropic'] as ProviderName[]).map(p => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            'rounded-[calc(var(--radius-sm)-2px)] font-medium transition-colors duration-[var(--duration-fast)]',
            sizeClass,
            value === p
              ? 'bg-accent text-background'
              : 'text-foreground-muted hover:text-foreground hover:bg-utility'
          )}
        >
          {LABELS[p]}
        </button>
      ))}
    </div>
  )
}
