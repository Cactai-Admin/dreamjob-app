import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// All tables in reverse dependency order for safe dropping
const TABLES = [
  'analytics_events',
  'system_config',
  'deleted_items',
  'notifications',
  'insight_preferences',
  'insights',
  'linkedin_connections',
  'linkedin_sessions',
  'chat_checkpoints',
  'chat_messages',
  'chat_threads',
  'status_events',
  'copy_download_logs',
  'sent_snapshots',
  'outputs',
  'structured_captures',
  'qa_answers',
  'workflows',
  'listing_availability_checks',
  'job_listings',
  'companies',
  'artifacts',
  'profile_memory',
  'evidence_library',
  'certifications',
  'education',
  'employment_history',
  'profiles',
  'user_preferences',
  'access_grants',
  'sessions',
  'invites',
  'account_roles',
  'accounts',
]

const ENUMS = [
  'deleted_item_type',
  'insight_type',
  'notification_severity',
  'preference_tag',
  'memory_type',
  'evidence_type',
  'status_event_type',
  'output_state',
  'output_type',
  'workflow_state',
  'auth_provider',
  'account_state',
  'user_role',
]

async function resetDatabase() {
  console.log('Resetting DreamJob database...\n')

  // Drop all tables
  console.log('Dropping tables...')
  for (const table of TABLES) {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `DROP TABLE IF EXISTS "${table}" CASCADE;`,
    })
    if (error) {
      // Try direct approach via REST if rpc not available
      console.log(`  Warning: Could not drop ${table} via rpc: ${error.message}`)
    } else {
      console.log(`  Dropped: ${table}`)
    }
  }

  // Drop enums
  console.log('\nDropping enums...')
  for (const enumName of ENUMS) {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `DROP TYPE IF EXISTS "${enumName}" CASCADE;`,
    })
    if (error) {
      console.log(`  Warning: Could not drop enum ${enumName}: ${error.message}`)
    } else {
      console.log(`  Dropped: ${enumName}`)
    }
  }

  // Drop trigger function
  await supabase.rpc('exec_sql', {
    sql: 'DROP FUNCTION IF EXISTS update_updated_at() CASCADE;',
  })

  // Run migration
  console.log('\nRunning migration...')
  const migrationPath = resolve(process.cwd(), 'supabase/migrations/001_initial_schema.sql')
  const migrationSql = readFileSync(migrationPath, 'utf-8')

  const { error: migrationError } = await supabase.rpc('exec_sql', {
    sql: migrationSql,
  })

  if (migrationError) {
    console.error('Migration failed:', migrationError.message)
    console.log('\nNote: If exec_sql is not available, run the migration directly:')
    console.log('  1. Go to Supabase Dashboard → SQL Editor')
    console.log('  2. Paste the contents of supabase/migrations/001_initial_schema.sql')
    console.log('  3. Click "Run"')
    console.log('\nOr use the Supabase CLI:')
    console.log('  npx supabase db reset')
    process.exit(1)
  }

  console.log('  Migration applied successfully')
  console.log('\n✓ Database reset complete!')
  console.log('  Run "npm run seed" to create the Super Admin account.')
}

resetDatabase().catch(err => {
  console.error('Reset failed:', err)
  process.exit(1)
})
