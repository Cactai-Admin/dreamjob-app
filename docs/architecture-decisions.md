# Architecture Decisions

## AD-01: Supabase Auth for Both Auth Methods

**Decision**: Use Supabase Auth for both Google OAuth and internal username/password authentication.

**Context**: The spec requires two auth methods — Google OAuth for external users and username/password for internal users.

**Rationale**:
- Single auth system simplifies session management
- Supabase Auth naturally integrates with Row Level Security (RLS)
- Internal users authenticate via email/password in Supabase Auth with a username-to-email lookup in the accounts table
- Cookie-based sessions via `@supabase/ssr` work seamlessly with Next.js server components and API routes

**Trade-off**: Internal users must have a valid email in Supabase Auth, even though they log in with a username. The accounts table provides the username → email mapping.

## AD-02: Next.js Middleware for Route Protection

**Decision**: Use `src/middleware.ts` with the standard `export default function middleware()` export for route protection.

**Context**: Next.js 16 uses the standard middleware API. Earlier drafts referenced a `proxy.ts` pattern which is not used.

**Rationale**: Following the framework's current middleware API ensures forward compatibility.

## AD-03: Admin Client for API Routes

**Decision**: API routes use a Supabase admin client (service role key) that bypasses RLS, with manual auth checks.

**Context**: RLS policies would need to be written for every table and every operation.

**Rationale**:
- Faster development iteration — no need to write and debug RLS policies for every edge case
- Clearer authorization logic visible in code rather than split across SQL policies
- Middleware handles authentication; API routes verify the session and check roles explicitly
- RLS can be added later as a defense-in-depth layer

**Trade-off**: Less defense-in-depth at the database level. If an API route has a bug that skips auth checks, the admin client won't prevent unauthorized access.

## AD-04: One-Active-Workflow Rule

**Decision**: Users can only have one active (non-sent/completed/archived) workflow at a time. Listings in `listing_review` state do not count toward this limit.

**Context**: The spec requires focusing users on one application at a time to ensure quality.

**Implementation**: Checked at the API level in `POST /api/workflows`. Excludes `listing_review`, `sent`, `completed`, and `archived` states from the active count.

## AD-05: AI Provider Abstraction

**Decision**: Abstract AI providers behind a common interface with a factory function.

**Context**: The app supports both Anthropic Claude and OpenAI GPT, with Anthropic as primary.

**Rationale**:
- `getConfiguredProvider()` auto-selects based on available API keys
- Adding new providers requires implementing the `AIProvider` interface
- Graceful degradation when no provider is configured (stub provider with helpful error)

## AD-06: Playwright for LinkedIn (Not OAuth)

**Decision**: Use Playwright browser automation for LinkedIn company research instead of LinkedIn OAuth API.

**Context**: Gathering 1st/2nd/3rd degree connection data is required. LinkedIn's OAuth API does not expose connection degree data.

**Rationale**:
- Opens a real browser window for the user to manually sign in (preserving LinkedIn ToS compliance for the sign-in step)
- After verification, the browser runs in the background for data gathering
- Gathers company info, posting activity, and connection data that OAuth cannot access

**Trade-off**: Requires Playwright as a dependency. May break if LinkedIn changes their page structure. Users must manually sign in each session.

## AD-07: 30-Day Soft Delete

**Decision**: Deleted items are moved to a `deleted_items` table with a 30-day recovery window.

**Context**: The spec requires recoverable deletion for workflows, outputs, and other user data.

**Implementation**: Items are serialized to JSON and stored with an expiry timestamp. Users can restore within 30 days or permanently delete immediately from the Trash page (`/trash`).

## AD-08: Client-Side Dashboard Pages

**Decision**: All dashboard pages are client components (`'use client'`).

**Context**: Dashboard pages need real-time interactivity (forms, modals, state management) and fetch data from authenticated API routes.

**Rationale**:
- Consistent pattern across all pages
- Auth state is naturally available via the session hook
- API routes handle data fetching with proper auth checks
- Skeleton loading states provide good perceived performance

**Trade-off**: No server-side rendering for dashboard pages, but these are behind auth and should not be indexed.

## AD-09: Workflow as the Central Data Model

**Decision**: A single `workflows` table spans the entire job application lifecycle. "Listings" and "Applications" are filtered views of the same workflow records — not separate entities.

**Context**: The spec describes a pipeline from listing intake through hired/rejected. Separating listings and applications into different tables would require migration logic when a user decides to apply.

**Rationale**:
- `state = 'listing_review'` → shown on the Listings page
- `state = 'draft'` and beyond → shown on the Applications page
- A single workflow record accumulates all outputs, status events, and metadata as it moves through states
- The `workflowToJob()` adapter in `src/lib/workflow-adapter.ts` converts workflow records to the `Job` shape used by UI components

**Trade-off**: Query filters must explicitly exclude `listing_review` when fetching active applications, and vice versa.

## AD-10: Denormalized Company Website URL

**Decision**: Store `company_website_url` on both the `companies` table and the `job_listings` table.

**Context**: When a listing in `listing_review` state has its company website set, the URL must survive if `company_id` is null (company join absent) or if the company record is changed.

**Rationale**:
- `job_listings.company_website_url` is the authoritative source for display on the listing and application pages
- `companies.website_url` remains for company-level data reuse
- Read priority: `listing.company_website_url ?? company.website_url`
- Write: both fields are updated on save

**Migration**: `supabase/migrations/002_add_company_website_to_listings.sql`

## AD-11: Fire-and-Forget AI Generation with Polling

**Decision**: AI document generation is triggered as a fire-and-forget fetch, and the UI polls the workflow every 3 seconds until the output appears.

**Context**: Document generation takes 10–30 seconds. Keeping the HTTP connection open for that duration is unreliable across serverless environments.

**Rationale**:
- The generate API route streams the response to the database, then closes
- The editor page polls `GET /api/workflows/:id` (which includes outputs) until `is_current = true` output appears
- Generation is only triggered once per output type (checked via `!generating` guard)

**Trade-off**: Polling creates a small amount of extra DB load. A WebSocket or SSE approach would be cleaner but adds infrastructure complexity.

## AD-12: Document Auto-Save with Debounce

**Decision**: Document editors auto-save to the server 2 seconds after the user stops typing.

**Context**: Users should not lose work if they navigate away, and manual save should not be required for every keystroke.

**Implementation**: Each editor page maintains an `autoSaveTimer` ref. On every `content` state change (after the initial load), the timer resets. On fire, it POSTs to `/api/workflows/:id/outputs`, which upserts an output record with `is_current = true`.

**Trade-off**: If the user types continuously, saves never fire until they pause. This is intentional to avoid hammering the API.
