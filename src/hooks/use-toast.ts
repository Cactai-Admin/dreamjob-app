'use client'

import { useState, useCallback } from 'react'

export interface ToastData {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
}

const MAX_TOASTS = 3

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const toast = useCallback(({ title, description, variant = 'default' }: Omit<ToastData, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts(prev => {
      const next = [...prev, { id, title, description, variant }]
      return next.slice(-MAX_TOASTS)
    })

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)

    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}
