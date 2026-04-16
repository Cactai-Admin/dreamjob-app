'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, AlertCircle, ArrowRight, Loader2, ChevronLeft } from 'lucide-react'
import { LoginBg } from '@/components/auth/login-bg'
import { createClient } from '@/lib/supabase/client'

type LoginMode = 'google' | 'internal'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = params.get('redirect') || '/'

  const [mode, setMode] = useState<LoginMode>('google')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  const inboundError = params.get('error')
  const errorMessage = useMemo(() => {
    if (error) return error
    if (!inboundError) return ''

    if (inboundError === 'oauth_account_not_allowed') {
      return 'Google sign-in is not enabled for this account. Use Internal Use Only login.'
    }

    return inboundError
  }, [error, inboundError])

  const handleInternalSubmit = async (e: React.FormEvent) => {
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
      if (!res.ok) {
        setError(data.error || 'Invalid credentials')
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setOauthLoading(true)

    try {
      const supabase = createClient()
      const callbackUrl = `${window.location.origin}/callback?redirect=${encodeURIComponent(redirectTo)}`

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      })

      if (oauthError) {
        setError(oauthError.message || 'Unable to start Google sign-in.')
        setOauthLoading(false)
      }
    } catch {
      setError('Unable to start Google sign-in. Please try again.')
      setOauthLoading(false)
    }
  }

  const internalReady = identifier.trim() && password && !loading

  return (
    <>
      <div className="login-brand">
        <div className="login-brand-icon">
          <Zap className="login-brand-zap" />
        </div>
        <span className="login-brand-name">DreamJob</span>
      </div>

      <div className="login-card">
        <div className="login-card-header">
          <h1 className="login-title">Begin Your Pursuit</h1>
          <p className="login-subtitle">Find Your Dream Job</p>
        </div>

        {mode === 'google' ? (
          <div className="login-google-group">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={oauthLoading}
              className={`login-submit ${oauthLoading ? 'login-submit-disabled' : 'login-submit-ready'}`}
            >
              {oauthLoading ? (
                <>
                  <Loader2 className="login-submit-icon animate-spin" />
                  Redirecting to Google…
                </>
              ) : (
                <>
                  Continue with Google
                  <ArrowRight className="login-submit-icon" />
                </>
              )}
            </button>

            <p className="login-help-text">
              New to DreamJob? Use Google to create your account and sign in.
            </p>

            <button
              type="button"
              onClick={() => {
                setMode('internal')
                setError('')
              }}
              className="login-link"
              disabled={oauthLoading}
            >
              Internal Use Only
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setMode('google')
                setIdentifier('')
                setPassword('')
                setError('')
              }}
              className="login-back-link"
              disabled={loading}
            >
              <ChevronLeft className="login-submit-icon" />
              Back to Google sign-in
            </button>

            <form onSubmit={handleInternalSubmit} className="login-form" noValidate>
              <div className="login-field">
                <label htmlFor="identifier" className="login-label">Username</label>
                <input
                  id="identifier"
                  type="text"
                  className="login-input"
                  placeholder="Enter your username"
                  value={identifier}
                  onChange={e => {
                    setIdentifier(e.target.value)
                    setError('')
                  }}
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
                  onChange={e => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!internalReady}
                className={`login-submit ${internalReady ? 'login-submit-ready' : 'login-submit-disabled'}`}
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
          </>
        )}

        {errorMessage && (
          <div className="login-error" role="alert">
            <AlertCircle className="login-error-icon" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      <p className="login-footer">
        AI-assisted Job Application Materials · DreamJob
      </p>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="login-root">
      <LoginBg />

      <div className="login-column">
        <Suspense fallback={
          <div className="login-brand">
            <Loader2 className="animate-spin" style={{ color: 'rgba(255,255,255,0.5)', width: 20, height: 20 }} />
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
