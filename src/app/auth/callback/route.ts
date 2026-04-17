import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { completeGoogleOAuthSignIn } from '@/lib/auth/complete-oauth-signin'

function sanitizeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/home'
  }

  return value
}

function buildRedirect(request: NextRequest, nextPath: string, error?: string) {
  const target = new URL(error ? '/login' : nextPath, request.url)
  if (error) {
    target.searchParams.set('error', error)
  }
  return target
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(buildRedirect(request, '/home', 'Missing authentication code'))
  }

  const response = NextResponse.redirect(buildRedirect(request, nextPath))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(
      buildRedirect(request, '/home', exchangeError.message || 'Unable to complete sign-in.')
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(buildRedirect(request, '/home', 'Not authenticated'))
  }

  const callbackError = await completeGoogleOAuthSignIn(user)
  if (callbackError) {
    return NextResponse.redirect(buildRedirect(request, '/home', callbackError))
  }

  return response
}
