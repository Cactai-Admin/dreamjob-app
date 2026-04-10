# Spec Traceability

Maps spec requirements to their implementation locations in the codebase.

## Authentication & Authorization

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Google OAuth for external users | Done | `src/app/(auth)/login/page.tsx` (User tab), Supabase Auth |
| Username/password for internal users | Done | `src/app/(auth)/login/page.tsx` (Internal tab), `src/app/api/auth/login/route.ts` |
| Super Admin account (test1234) | Done | `scripts/seed.ts` |
| Role hierarchy (super_admin → demo) | Done | `src/lib/auth/roles.ts` |
| Session management | Done | `src/hooks/use-session.ts`, `src/app/api/auth/session/route.ts` |
| Route protection | Done | `src/proxy.ts` |
| OAuth callback / account creation | Done | `src/app/(auth)/callback/page.tsx`, `src/app/api/auth/callback/route.ts` |

## User Profile

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Personal information form | Done | `src/app/(dashboard)/profile/page.tsx` |
| Employment history CRUD | Done | `src/app/(dashboard)/profile/employment/page.tsx`, `src/app/api/profile/employment/route.ts` |
| Evidence library | Done (API) | `src/app/api/profile/evidence/route.ts` |
| Profile memory | Done (API) | `src/app/api/profile/memory/route.ts` |
| Education management | Schema only | `education` table in schema |
| Certifications management | Schema only | `certifications` table in schema |

## Job Application Workflow

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| URL-based listing input | Done | `src/app/(dashboard)/jobs/page.tsx` |
| Manual listing entry | Done | `src/app/(dashboard)/jobs/page.tsx` (ManualDialog) |
| AI listing parsing | Done | `src/app/api/listings/parse/route.ts` |
| One-active-workflow rule | Done | `src/app/api/workflows/route.ts`, `src/app/api/listings/availability/route.ts` |
| Workflow state machine | Done | `src/types/workflow.ts`, API routes |
| Q&A intake (AI-guided) | Done | `src/app/(dashboard)/jobs/[id]/page.tsx` (Q&A tab), `src/app/api/ai/chat/route.ts` |
| Document generation (resume) | Done | `src/app/api/ai/generate/route.ts`, `src/lib/ai/prompts/resume-generation.ts` |
| Document generation (cover letter) | Done | Same as above |
| Interview guide generation | Done | Same as above |
| Negotiation guide generation | Done | Same as above |
| Output versioning | Done | `src/app/api/workflows/[id]/outputs/route.ts` |
| Ready-to-send review | Done | `src/app/(dashboard)/ready/[id]/page.tsx` |
| Sent snapshots | Done | `src/app/api/workflows/[id]/snapshots/route.ts` |

## Status Tracking

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Status events (sent → hired) | Done | `src/app/api/workflows/[id]/status/route.ts` |
| Status dependencies | Done | `src/types/workflow.ts` (STATUS_DEPENDENCIES) |
| Status timeline UI | Done | `src/app/(dashboard)/sent/[id]/page.tsx` |

## AI Integration

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Anthropic Claude provider | Done | `src/lib/ai/anthropic.ts` |
| OpenAI GPT provider | Done | `src/lib/ai/openai.ts` |
| Provider abstraction | Done | `src/lib/ai/provider.ts` |
| Listing parse prompts | Done | `src/lib/ai/prompts/listing-parse.ts` |
| Q&A guidance prompts | Done | `src/lib/ai/prompts/qa-guidance.ts` |
| Resume generation prompts | Done | `src/lib/ai/prompts/resume-generation.ts` |

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
| Admin access control | Done | Role check in admin page and API |
| System config | Schema only | `system_config` table |
| Invite management | Schema only | `invites` table |

## Data Management

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| 30-day soft delete | Done | `src/app/api/deleted-items/route.ts`, `src/app/api/deleted-items/[id]/route.ts` |
| Deleted items UI | Done | `src/app/(dashboard)/profile/deleted-files/page.tsx` |
| Restore deleted items | Done | `POST /api/deleted-items/[id]` |
| Permanent deletion | Done | `DELETE /api/deleted-items/[id]` |

## UI/UX

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Responsive sidebar | Done | `src/components/layout/sidebar.tsx` |
| Mobile navigation | Done | `src/components/layout/mobile-nav.tsx` |
| Theme support (light/dark/system) | Done | `src/app/providers.tsx`, `src/app/globals.css` |
| Settings page | Done | `src/app/(dashboard)/profile/settings/page.tsx` |
| Empty states | Done | `src/components/shared/empty-state.tsx` |
| Loading skeletons | Done | `src/components/ui/skeleton.tsx` |
| Toast notifications | Done | `src/components/ui/toast.tsx`, `src/hooks/use-toast.ts` |

## Payments

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Stripe integration | Not started | Package installed, see `docs/stripe-setup.md` |

## Database

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Full schema (30+ tables) | Done | `supabase/migrations/001_initial_schema.sql` |
| TypeScript types | Done | `src/types/database.ts` |
| Seed script | Done | `scripts/seed.ts` |
| Reset script | Done | `scripts/reset-db.ts` |
| RLS policies | Not started | See known gaps |
