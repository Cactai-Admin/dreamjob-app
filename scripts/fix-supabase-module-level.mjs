/**
 * Transforms all API route files that instantiate supabaseAdmin at module level.
 * Moves the instantiation inside handler functions using createAdminClient().
 */
import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const files = execSync(
  `grep -rln "^const supabaseAdmin = createClient" src/app/api/ --include="*.ts" --include="*.tsx"`,
  { cwd: process.cwd(), encoding: 'utf8' }
).trim().split('\n').filter(Boolean)

console.log(`Fixing ${files.length} files...`)

for (const file of files) {
  let src = readFileSync(file, 'utf8')

  // 1. Remove the bare `import { createClient } from '@supabase/supabase-js'` line
  //    (only if it's solely used for the admin client — if it also imports other things, skip)
  src = src.replace(/^import \{ createClient \} from '@supabase\/supabase-js'\n/m, '')

  // 2. Remove the module-level instantiation block (handles both 3-line and 4-line variants)
  src = src.replace(
    /^const supabaseAdmin = createClient\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*process\.env\.SUPABASE_SERVICE_KEY!\s*\)\n\n?/m,
    ''
  )

  // 3. Add import for createAdminClient if not already present
  if (!src.includes("from '@/lib/supabase/admin'") && !src.includes('from "../../../lib/supabase/admin"')) {
    // Insert after the last import line
    src = src.replace(
      /((?:^import .+\n)+)/m,
      (match) => match + `import { createAdminClient } from '@/lib/supabase/admin'\n`
    )
  }

  // 4. Add `const supabaseAdmin = createAdminClient()` as first line inside each async handler
  //    Matches: export async function GET/POST/PUT/PATCH/DELETE(
  src = src.replace(
    /(export async function (?:GET|POST|PUT|PATCH|DELETE|HEAD)\([^)]*\)[^{]*\{)\n(\s*)(?!const supabaseAdmin)/g,
    (match, fnHeader, indent) => {
      return `${fnHeader}\n${indent}const supabaseAdmin = createAdminClient()\n${indent}`
    }
  )

  writeFileSync(file, src, 'utf8')
  console.log(`  ✓ ${file}`)
}

console.log('\nDone.')
