/**
 * Replaces per-handler `const supabaseAdmin = createAdminClient()` instances
 * with a single module-level `const supabaseAdmin = getAdminClient()` after
 * the last import line. The lazy singleton in admin.ts makes this build-safe.
 */
import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const files = execSync(
  `grep -rln "createAdminClient\\|getAdminClient\\|supabaseAdmin" src/app/api/ --include="*.ts"`,
  { cwd: process.cwd(), encoding: 'utf8' }
).trim().split('\n').filter(Boolean)

console.log(`Processing ${files.length} files...`)

for (const file of files) {
  let src = readFileSync(file, 'utf8')

  // Remove all per-handler instantiations added by the previous script
  src = src.replace(/^  const supabaseAdmin = createAdminClient\(\)\n/gm, '')

  // Replace createAdminClient import with getAdminClient
  src = src.replace(
    /import \{ createAdminClient \} from '@\/lib\/supabase\/admin'/g,
    `import { getAdminClient } from '@/lib/supabase/admin'`
  )

  // If file uses supabaseAdmin and doesn't already have a module-level declaration, add one
  if (src.includes('supabaseAdmin') && !src.includes('const supabaseAdmin =')) {
    // Insert after the last import block
    src = src.replace(
      /((?:^import .+\n)+)(\n)/m,
      `$1\nconst supabaseAdmin = getAdminClient()\n$2`
    )
  }

  writeFileSync(file, src, 'utf8')
  console.log(`  ✓ ${file}`)
}

console.log('\nDone.')
