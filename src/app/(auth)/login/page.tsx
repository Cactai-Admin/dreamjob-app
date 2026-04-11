'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, AlertCircle, Loader2 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/jobs'

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid credentials'); return }
      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-8">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--color-text)' }}
        >
          <Zap className="w-5 h-5" style={{ color: 'var(--color-bg)' }} />
        </div>
        <span
          className="text-xl font-bold tracking-tight"
          style={{ color: 'var(--color-text)' }}
        >
          DreamJob
        </span>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-raw)',
        }}
      >
        <h1
          className="text-lg font-semibold mb-1"
          style={{ color: 'var(--color-text)' }}
        >
          Sign in
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Enter your credentials to continue
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="Super Admin"
              value={identifier}
              onChange={e => { setIdentifier(e.target.value); setError('') }}
              autoComplete="username"
              autoFocus
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm"
              style={{
                background: 'rgba(224,46,42,0.08)',
                border: '1px solid rgba(224,46,42,0.2)',
                color: 'var(--color-error)',
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !identifier || !password}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all mt-2"
            style={{
              background: loading || !identifier || !password
                ? 'var(--color-surface-secondary)'
                : 'var(--color-text)',
              color: loading || !identifier || !password
                ? 'var(--color-text-muted)'
                : 'var(--color-bg)',
              cursor: loading || !identifier || !password ? 'not-allowed' : 'pointer',
            }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        DreamJob · AI-assisted job application support
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
