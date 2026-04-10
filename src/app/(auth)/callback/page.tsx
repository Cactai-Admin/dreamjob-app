'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Loading } from '@/components/shared/loading'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase.auth.getSession()

      if (error) {
        router.push(`/login?error=${encodeURIComponent(error.message)}`)
        return
      }

      // Ensure account record exists
      await fetch('/api/auth/callback', { method: 'POST' })

      router.push(redirect)
      router.refresh()
    }

    handleCallback()
  }, [router, redirect])

  return <Loading fullPage />
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<Loading fullPage />}>
      <CallbackHandler />
    </Suspense>
  )
}
