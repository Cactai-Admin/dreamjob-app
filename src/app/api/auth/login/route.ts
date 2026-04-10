import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { identifier, password } = await request.json()

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Username/email and password are required' }, { status: 400 })
    }

    // Look up the email for this identifier (could be username or email)
    let email = identifier

    if (!identifier.includes('@')) {
      // Treat as username — look up email from accounts table
      const { data: account } = await supabaseAdmin
        .from('accounts')
        .select('email')
        .or(`username.eq.${identifier},display_name.eq.${identifier}`)
        .eq('provider', 'internal')
        .single()

      if (!account) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }
      email = account.email
    }

    // Collect cookies to set after sign-in
    const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookies) {
            cookiesToSet.push(...cookies)
          },
        },
      }
    )

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Build response and apply all auth cookies
    const response = NextResponse.json({ success: true })
    for (const { name, value, options } of cookiesToSet) {
      response.cookies.set(name, value, options)
    }

    return response
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Sign out
export async function DELETE(request: NextRequest) {
  try {
    const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookies) {
            cookiesToSet.push(...cookies)
          },
        },
      }
    )

    await supabase.auth.signOut()

    const response = NextResponse.json({ success: true })
    for (const { name, value, options } of cookiesToSet) {
      response.cookies.set(name, value, options)
    }

    return response
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
