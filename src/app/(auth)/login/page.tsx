'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'

function LoginForm() {
  const router      = useRouter()
  const params      = useSearchParams()
  const redirectTo  = params.get('redirect') || '/jobs'

  const [identifier, setIdentifier] = useState('')
  const [password,   setPassword]   = useState('')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ identifier, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid credentials'); return }
      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const ready = identifier.trim() && password && !loading

  return (
    <div className="login-root">
      {/* ── Animated background (populated via login-bg class) ── */}
      <div className="login-bg" aria-hidden="true" />

      {/* ── Centered column ─────────────────────────────────── */}
      <div className="login-column">

        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <Zap className="login-brand-zap" />
          </div>
          <span className="login-brand-name">DreamJob</span>
        </div>

        {/* Card */}
        <div className="login-card">
          <div className="login-card-header">
            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">Sign in to continue to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="login-field">
              <label htmlFor="identifier" className="login-label">Username</label>
              <input
                id="identifier"
                type="text"
                className="login-input"
                placeholder="Enter your username"
                value={identifier}
                onChange={e => { setIdentifier(e.target.value); setError('') }}
                autoComplete="username"
                autoFocus
                disabled={loading}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="password" className="login-label">Password</label>
              <input
                id="password"
                type="password"
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                autoComplete="current-password"
                disabled={loading}
                required
              />
            </div>

            {error && (
              <div className="login-error" role="alert">
                <AlertCircle className="login-error-icon" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!ready}
              className={`login-submit ${ready ? 'login-submit-ready' : 'login-submit-disabled'}`}
            >
              {loading ? (
                <>
                  <Loader2 className="login-submit-icon animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="login-submit-icon" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="login-footer">
          AI-assisted job applications · DreamJob
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="login-root">
        <div className="login-bg" aria-hidden="true" />
        <div className="login-column">
          <Loader2 className="animate-spin" style={{ color: 'var(--color-text-muted)', width: 20, height: 20 }} />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
