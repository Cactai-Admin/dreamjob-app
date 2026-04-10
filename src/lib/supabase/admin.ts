import { createClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client that bypasses RLS using the service role key.
 * Use only for admin operations (user management, seeding, etc.).
 * Never expose this client to the browser.
 */
export function createAdminClient() {
  return createClient(
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
