import { config } from 'dotenv'
config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ADMIN_EMAIL = 'admin@dreamjob.app'
const ADMIN_PASSWORD = 'test1234'

async function seed() {
  console.log('Seeding DreamJob database...\n')

  // 1. Create Supabase Auth user
  console.log('Creating Super Admin auth user...')
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
      console.log('  Auth user already exists, looking up existing user...')
      const { data: users } = await supabase.auth.admin.listUsers()
      const existing = users?.users?.find(u => u.email === ADMIN_EMAIL)
      if (!existing) {
        console.error('  Could not find existing auth user')
        process.exit(1)
      }
      await seedAccountData(existing.id)
      return
    }
    console.error('  Failed to create auth user:', authError.message)
    process.exit(1)
  }

  console.log('  Auth user created:', authData.user.id)
  await seedAccountData(authData.user.id)
}

async function seedAccountData(authUserId: string) {
  // 2. Check if account already exists
  const { data: existingAccount } = await supabase
    .from('accounts')
    .select('id')
    .eq('supabase_auth_id', authUserId)
    .single()

  if (existingAccount) {
    console.log('  Account record already exists, skipping...')
    console.log('\n✓ Seed complete! Super Admin is ready.')
    console.log(`  Email: ${ADMIN_EMAIL}`)
    console.log(`  Password: ${ADMIN_PASSWORD}`)
    return
  }

  // 3. Create account record
  console.log('Creating account record...')
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .insert({
      supabase_auth_id: authUserId,
      email: ADMIN_EMAIL,
      username: 'superadmin',
      display_name: 'Super Admin',
      provider: 'internal',
      state: 'active',
      activated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (accountError) {
    console.error('  Failed to create account:', accountError.message)
    process.exit(1)
  }
  console.log('  Account created:', account.id)

  // 4. Assign super_admin role
  console.log('Assigning super_admin role...')
  const { error: roleError } = await supabase
    .from('account_roles')
    .insert({
      account_id: account.id,
      role: 'super_admin',
      is_active: true,
    })

  if (roleError) {
    console.error('  Failed to assign role:', roleError.message)
    process.exit(1)
  }
  console.log('  Role assigned: super_admin')

  // 5. Create profile
  console.log('Creating profile...')
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      account_id: account.id,
      first_name: 'Super',
      last_name: 'Admin',
    })

  if (profileError) {
    console.error('  Failed to create profile:', profileError.message)
    process.exit(1)
  }
  console.log('  Profile created')

  // 6. Create user preferences
  console.log('Creating user preferences...')
  const { error: prefError } = await supabase
    .from('user_preferences')
    .insert({
      account_id: account.id,
    })

  if (prefError) {
    console.error('  Failed to create preferences:', prefError.message)
    process.exit(1)
  }
  console.log('  Preferences created')

  console.log('\n✓ Seed complete! Super Admin is ready.')
  console.log(`  Email: ${ADMIN_EMAIL}`)
  console.log(`  Password: ${ADMIN_PASSWORD}`)
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
