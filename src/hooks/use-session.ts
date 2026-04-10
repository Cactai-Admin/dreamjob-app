'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SessionUser } from '@/types/auth'

interface UseSessionReturn {
  user: SessionUser | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useSession(): UseSessionReturn {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/auth/session')
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = await res.json()
      setUser(data.user)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch session')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  return { user, loading, error, refresh: fetchSession }
}
