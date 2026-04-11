import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client that bypasses RLS using the service role key.
 * Use only for admin operations (user management, seeding, etc.).
 * Never expose this client to the browser.
 *
 * Lazy singleton — initialized on first call so module evaluation at
 * Next.js build time does not require env vars to be present.
 */
let _client: SupabaseClient | null = null

export function getAdminClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )
  }
  return _client
}

/** @deprecated Use getAdminClient() */
export const createAdminClient = getAdminClient
