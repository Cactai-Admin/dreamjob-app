# Spec Traceability

Maps spec requirements to their implementation locations in the codebase.

## Authentication & Authorization

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Google OAuth for external users | Done | `src/app/(auth)/login/page.tsx` (User tab), Supabase Auth |
| Username/password for internal users | Done | `src/app/(auth)/login/page.tsx` (Internal tab), `src/app/api/auth/login/route.ts` |
| Super Admin account (test1234) | Done | `scripts/seed.ts` |
| Role hierarchy (super_admin → demo) | Done | `src/lib/auth/roles.ts` |
| Session management | Done | `src/middleware.ts`, `src/app/api/auth/session/route.ts` |
| Route protection | Done | `src/middleware.ts` |
| OAuth callback / account creation | Done | `src/app/(auth)/callback/page.tsx`, `src/app/api/auth/callback/route.ts` |

## User Profile

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Personal information form | Done | `src/app/(dashboard)/profile/page.tsx` |
| Employment history CRUD | Done | `src/app/(dashboard)/profile/page.tsx`, `src/app/api/profile/employment/route.ts` |
| Evidence library | Done (API) | `src/app/api/profile/evidence/route.ts` |
| Profile memory | Done (API) | `src/app/api/profile/memory/route.ts` |
| Education management | Schema only | `education` table in schema |
| Certifications management | Schema only | `certifications` table in schema |

## Job Application Workflow

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| URL-based listing input | Done | `src/app/(dashboard)/page.tsx` (Analyze page) |
| Manual listing entry | Done | `src/app/(dashboard)/page.tsx` (Enter manually mode) |
| AI listing parsing | Done | `src/app/api/listings/parse/route.ts` |
| Company website auto-discovery | Done | `src/app/api/listings/discover-company/route.ts` |
| Company LinkedIn URL scraping | Done | `src/app/api/listings/scrape-company-linkedin/route.ts` |
| Listing review & edit | Done | `src/app/(dashboard)/listings/[id]/page.tsx` |
| Match score vs. profile skills | Done | `src/app/(dashboard)/listings/[id]/page.tsx` (computeMatch) |
| LinkedIn connection discovery | Done | `src/app/(dashboard)/listings/[id]/page.tsx` (connections modal) |
| One-active-workflow rule | Done | `src/app/api/workflows/route.ts` (POST guard) |
| Workflow state machine | Done | `src/app/api/workflows/[id]/route.ts` |
| Document generation (resume) | Done | `src/app/api/ai/generate/route.ts`, `src/lib/ai/prompts/resume-generation.ts` |
| Document generation (cover letter) | Done | `src/app/api/ai/generate/route.ts` |
| Interview guide generation | Done | `src/app/api/ai/generate/route.ts` |
| Negotiation guide generation | Done | `src/app/api/ai/generate/route.ts` |
| Resume editor | Done | `src/app/(dashboard)/jobs/[id]/resume/page.tsx` |
| Cover letter editor | Done | `src/app/(dashboard)/jobs/[id]/cover-letter/page.tsx` |
| Interview guide editor | Done | `src/app/(dashboard)/jobs/[id]/interview-guide/page.tsx` |
| Negotiation guide editor | Done | `src/app/(dashboard)/jobs/[id]/negotiation-guide/page.tsx` |
| AI chat panel (per document) | Done | `src/components/documents/ai-chat-panel.tsx` |
| Document approve / unapprove | Done | All four editor pages (approve toggle) |
| Auto-save on edit | Done | All four editor pages (2s debounce → `/outputs` PATCH) |
| Output versioning | Done | `src/app/api/workflows/[id]/outputs/route.ts` |
| Export / download documents | Done | `src/app/(dashboard)/jobs/[id]/export/page.tsx` |
| Delete listing | Done | `src/app/(dashboard)/listings/[id]/page.tsx` (delete card) |
| Delete application | Done | All four editor pages + application detail (inline confirm) |

## Status Tracking

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Status events (sent → hired) | Done | `src/app/api/workflows/[id]/status/route.ts` |
| Status timeline UI | Done | `src/app/(dashboard)/jobs/[id]/page.tsx` |

## AI Integration

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Anthropic Claude provider | Done | `src/lib/ai/anthropic.ts` |
| OpenAI GPT provider | Done | `src/lib/ai/openai.ts` |
| Provider abstraction | Done | `src/lib/ai/provider.ts` |
| Listing parse prompts | Done | `src/lib/ai/prompts/listing-parse.ts` |
| Resume generation prompts | Done | `src/lib/ai/prompts/resume-generation.ts` |
| Per-document AI chat | Done | `src/app/api/ai/chat/route.ts`, `src/components/documents/ai-chat-panel.tsx` |

## LinkedIn Integration

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Browser automation (Playwright) | Done | `src/lib/linkedin/browser.ts` |
| Manual sign-in flow | Done | `launchLinkedInBrowser()` |
| Session verification | Done | `verifyLinkedInSession()` |
| Company data gathering | Done | `gatherCompanyData()` |
| Connection discovery (1st/2nd/3rd degree) | Done | Included in `gatherCompanyData()` |
| LinkedIn API routes | Done | `src/app/api/linkedin/session/route.ts`, `src/app/api/linkedin/company/route.ts` |

## Admin

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Admin panel | Done | `src/app/(dashboard)/admin/page.tsx` |
| User list with roles | Done | `src/app/api/admin/users/route.ts` |
| Admin access control | Done | Role check in admin page and API routes |
| System config | Schema only | `system_config` table |
| Invite management | Schema only | `invites` table |

## Data Management

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| 30-day soft delete | Done | `src/app/api/deleted-items/route.ts`, `src/app/api/deleted-items/[id]/route.ts` |
| Deleted items UI | Done | `src/app/(dashboard)/trash/page.tsx` |
| Restore deleted items | Done | `POST /api/deleted-items/[id]` |
| Permanent deletion | Done | `DELETE /api/deleted-items/[id]` |

## UI/UX

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Responsive top navigation | Done | `src/components/layout/top-nav.tsx` |
| Mobile bottom tab bar | Done | `src/components/layout/top-nav.tsx` (fixed bottom, 3 tabs) |
| App shell layout | Done | `src/components/layout/app-shell.tsx` |
| Settings page | Done | `src/app/(dashboard)/settings/page.tsx` |
| Stats dashboard | Done | `src/app/(dashboard)/stats/page.tsx` |

## Database

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Full schema (30+ tables) | Done | `supabase/migrations/001_initial_schema.sql` |
| company_website_url on listings | Done | `supabase/migrations/002_add_company_website_to_listings.sql` |
| Seed script | Done | `scripts/seed.ts` |
| Reset script | Done | `scripts/reset-db.ts` |
| RLS policies | Not started | See known gaps |

## Payments

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Stripe integration | Not started | Package installed, see `docs/stripe-setup.md` |
