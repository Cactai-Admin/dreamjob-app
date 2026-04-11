/**
 * One-time script: creates the Super Admin user in Supabase Auth
 * and inserts the matching account + role records.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_KEY=your-service-role-key \
 *   node scripts/seed-super-admin.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY env vars before running.')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EMAIL    = 'superadmin@dreamjob.internal'
const PASSWORD = 'test1234'
const USERNAME = 'Super Admin'

async function run() {
  console.log('Creating Super Admin auth user…')

  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })

  if (authError && !authError.message.includes('already been registered')) {
    console.error('Auth error:', authError.message)
    process.exit(1)
  }

  const authUserId = authData?.user?.id
  if (!authUserId) {
    // User already exists — look them up
    const { data: list } = await supabase.auth.admin.listUsers()
    const existing = list?.users?.find(u => u.email === EMAIL)
    if (!existing) { console.error('Could not find or create auth user'); process.exit(1) }
    console.log('Auth user already exists:', existing.id)

    await ensureAccount(existing.id)
    return
  }

  console.log('Auth user created:', authUserId)
  await ensureAccount(authUserId)
}

async function ensureAccount(authUserId) {
  // 2. Upsert account record
  const { data: account, error: accError } = await supabase
    .from('accounts')
    .upsert({
      supabase_auth_id: authUserId,
      email: EMAIL,
      username: USERNAME,
      display_name: USERNAME,
      provider: 'internal',
      status: 'active',
    }, { onConflict: 'supabase_auth_id' })
    .select()
    .single()

  if (accError) { console.error('Account error:', accError.message); process.exit(1) }
  console.log('Account upserted:', account.id)

  // 3. Upsert super_admin role
  const { error: roleError } = await supabase
    .from('account_roles')
    .upsert({
      account_id: account.id,
      role: 'super_admin',
      is_active: true,
    }, { onConflict: 'account_id,role' })

  if (roleError) { console.error('Role error:', roleError.message); process.exit(1) }
  console.log('super_admin role assigned.')

  console.log('\n✓ Done. Login credentials:')
  console.log('  Username : Super Admin')
  console.log('  Password : test1234')
  console.log('  (Use the Internal tab on the login page)')
}

run()
