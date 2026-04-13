
# Repository Review (2026-04-13)

Scope: static repository audit based on source tree inspection, `eslint`, and `depcheck`.

## 1) Unnecessary / unused items (identified)

### 1.1 Unused code symbols (eslint `no-unused-vars`)
These symbols are currently dead and can usually be removed without behavior changes:

- `UserStatus` in `src/app/(dashboard)/admin/page.tsx`
- `output` in:
  - `src/app/(dashboard)/jobs/[id]/cover-letter/page.tsx`
  - `src/app/(dashboard)/jobs/[id]/interview-guide/page.tsx`
  - `src/app/(dashboard)/jobs/[id]/negotiation-guide/page.tsx`
- `deriveApplicationStatus` in `src/app/(dashboard)/jobs/[id]/page.tsx`
- `Workflow` in:
  - `src/app/(dashboard)/jobs/page.tsx`
  - `src/app/(dashboard)/profile/page.tsx`
- `MapPin`, `DollarSign`, `ChevronDown`, `reqsText` in `src/app/(dashboard)/listings/[id]/page.tsx`
- `LogOut`, `handleSignOut` in `src/app/(dashboard)/settings/page.tsx`
- `closeLinkedInBrowser` in `src/app/api/linkedin/session/route.ts`
- `useRef`, `ChevronDown`, `STATUS_OPTIONS`, `statusColor`, `mobileActiveDoc` in `src/components/layout/top-nav.tsx`
- `companyLinkedInUrl`, `_companyName` in `src/lib/linkedin/browser.ts`
- `Stethoscope`, `Star` in `src/lib/profile-icons.tsx`

### 1.2 Potentially unused npm packages (`depcheck`)
`depcheck` reports these dependencies as unused:

- dependencies: `@hookform/resolvers`, `@radix-ui/react-collapsible`, `bcryptjs`, `react-hook-form`, `stripe`
- devDependencies: `@tailwindcss/postcss`, `@types/bcryptjs`

It also reports a missing dependency likely required by local imports:

- `@radix-ui/react-slot` (referenced by `src/components/ui/button.tsx`)

> Note: `depcheck` can have false positives with dynamic imports, framework conventions, and type-only usage. Validate each package before removal.

### 1.3 Legacy/stale route candidate
- `src/app/(dashboard)/jobs/new/page.tsx` is already tagged in project docs as likely removable/supersedable because flow moved to `/`.

## 2) Required items that should be treated as breakage-critical (do not casually modify)

### 2.1 App/runtime configuration
- `package.json` scripts and core runtime deps (`next`, `react`, `react-dom`, `@supabase/*`) are foundational.
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `vercel.json`, `netlify.toml` are deployment/build/linting contracts.

### 2.2 Authentication and data access boundaries
- `src/proxy.ts` (route protection boundary)
- `src/lib/supabase/admin.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`
- `src/lib/auth/session.ts`, `src/lib/auth/roles.ts`

### 2.3 Workflow and AI control plane
- Workflow APIs:
  - `src/app/api/workflows/route.ts`
  - `src/app/api/workflows/[id]/route.ts`
  - `src/app/api/workflows/[id]/outputs/route.ts`
  - `src/app/api/workflows/[id]/status/route.ts`
- AI APIs:
  - `src/app/api/ai/generate/route.ts`
  - `src/app/api/ai/chat/route.ts`
- Listing parse API:
  - `src/app/api/listings/parse/route.ts`

### 2.4 Prompt/provider files (high behavioral impact)
- `src/lib/ai/provider.ts`
- `src/lib/ai/openai.ts`
- `src/lib/ai/anthropic.ts`
- `src/lib/ai/prompts/listing-parse.ts`
- `src/lib/ai/prompts/resume-generation.ts`
- `src/lib/ai/prompts/qa-guidance.ts`

### 2.5 Schema and migration chain
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_add_company_website_to_listings.sql`
- `supabase/migrations/003_fix_enum_values.sql`
- `supabase/migrations/004_add_notes_to_workflows.sql`
- `supabase/migrations/005_add_skills_keywords_to_profiles.sql`
- `supabase/migrations/006_add_tools_certs_clearances.sql`
- `supabase/migrations/007_add_ready_event_type.sql`
- `supabase/migrations/008_add_profile_icon.sql`

### 2.6 Environment contract
Must remain available for app boot and backend auth:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

At least one AI key is required for generation/chat features:
- `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY`

## 3) Items that can be prepared for revision with low consequence

### 3.1 Safe prep work (mechanical/non-behavioral)
- Remove confirmed-unused imports/variables from files listed in §1.1.
- Replace `<img>` with `next/image` where lint warns, as a perf/quality cleanup.
- Fix lint-only structural issues that are localized (e.g., move inline `ProfileButton` component declaration outside render in `top-nav.tsx`).
- Add type improvements replacing `any` in `src/lib/linkedin/browser.ts`.

### 3.2 Medium-confidence cleanup candidates
- Consolidate duplicated doc-page orchestration logic in:
  - `resume`, `cover-letter`, `interview-guide`, `negotiation-guide` pages.
- Consolidate duplicated match/parsing helpers across listing/job detail surfaces.
- Keep behavior parity with existing routes while extracting shared utilities.

### 3.3 Potential feature-stub cleanup (after product confirmation)
- `jobs/new` redirect route removal.
- Stripe-related code/deps/env vars if payments are intentionally out-of-scope.
- Invite/analytics/education-certification stubs if not on roadmap.

## 4) Commands used for this audit

- `rg --files -g 'AGENTS.md'`
- `cat AGENTS.md`
- `rg --files`
- `cat package.json`
- `npm run lint`
- `npx --yes depcheck`
- `npx eslint . -f json > /tmp/eslint.json`
- `node -e '...no-unused-vars extraction...'

