import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client that bypasses RLS using the service role key.
 * Use only for admin operations (user management, seeding, etc.).
 * Never expose this client to the browser.
 *
 * Build-safe: if env vars are absent at build time the module loads fine;
 * any actual DB call will return a Supabase error rather than crashing the
 * process. At runtime the real values must be present.
 */
let _client: SupabaseClient | null = null

export function getAdminClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY

    if (!url || !key) {
      // Return a stub during build/test so the module can be evaluated
      // without env vars. Real requests will fail gracefully from Supabase.
      _client = createClient(
        url ?? 'https://placeholder.supabase.co',
        key ?? 'placeholder-service-key-not-real',
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    } else {
      _client = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    }
  }
  return _client
}

/** @deprecated Use getAdminClient() */
export const createAdminClient = getAdminClient
