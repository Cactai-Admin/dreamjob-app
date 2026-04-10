# Architecture Decisions

## AD-01: Supabase Auth for Both Auth Methods

**Decision**: Use Supabase Auth for both Google OAuth and internal username/password authentication.

**Context**: The spec requires two auth methods — Google OAuth for external users and username/password for internal users. Options included NextAuth, separate auth systems, or unified Supabase Auth.

**Rationale**:
- Single auth system simplifies session management
- Supabase Auth naturally integrates with Row Level Security (RLS)
- Internal users authenticate via email/password in Supabase Auth with a username-to-email lookup in the accounts table
- Cookie-based sessions via `@supabase/ssr` work seamlessly with Next.js server components and API routes

**Trade-off**: Internal users must have a valid email in Supabase Auth, even though they log in with a username. The accounts table provides the username → email mapping.

## AD-02: Next.js 16 Proxy Instead of Middleware

**Decision**: Use `src/proxy.ts` with `export async function proxy()` instead of the traditional `middleware.ts`.

**Context**: Next.js 16 renamed middleware to proxy and changed the export convention.

**Rationale**: Following the framework's current API ensures forward compatibility and avoids deprecation warnings.

## AD-03: Admin Client for API Routes

**Decision**: API routes use a Supabase admin client (service role key) that bypasses RLS, with manual auth checks.

**Context**: RLS policies would need to be written for every table and every operation. With the admin client, we handle authorization in application code.

**Rationale**:
- Faster development iteration — no need to write and debug RLS policies for every edge case
- Clearer authorization logic visible in code rather than split across SQL policies
- The proxy handles authentication; API routes verify the session and check roles explicitly
- RLS can be added later as a defense-in-depth layer

**Trade-off**: Less defense-in-depth at the database level. If an API route has a bug that skips auth checks, the admin client won't prevent unauthorized access.

## AD-04: One-Active-Workflow Rule

**Decision**: Users can only have one active (non-sent/completed/archived) workflow at a time.

**Context**: The spec requires focusing users on one application at a time to ensure quality.

**Implementation**: Checked at the API level when creating new workflows and when restoring deleted workflows.

## AD-05: AI Provider Abstraction

**Decision**: Abstract AI providers behind a common interface with a factory function.

**Context**: The app should support both Anthropic Claude and OpenAI GPT, with Anthropic as primary.

**Rationale**:
- `getConfiguredProvider()` auto-selects based on available API keys
- Adding new providers requires implementing the `AIProvider` interface
- Graceful degradation when no provider is configured (stub provider with helpful error)

## AD-06: Playwright for LinkedIn (Not OAuth)

**Decision**: Use Playwright browser automation for LinkedIn company research instead of LinkedIn OAuth API.

**Context**: The user explicitly requires gathering 1st/2nd/3rd degree connections at target companies. LinkedIn's OAuth API does not expose connection degree data.

**Rationale**:
- Opens a real browser window for the user to manually sign in (preserving LinkedIn ToS compliance for the sign-in step)
- After verification, the browser runs in the background for data gathering
- Gathers company info, posting activity, and connection data that OAuth cannot access

**Trade-off**: Requires Playwright as a dependency. May break if LinkedIn changes their page structure. Users must manually sign in each session.

## AD-07: 30-Day Soft Delete

**Decision**: Deleted items are moved to a `deleted_items` table with a 30-day recovery window.

**Context**: The spec requires recoverable deletion for workflows, outputs, evidence, and other user data.

**Implementation**: Items are serialized to JSON and stored with an expiry timestamp. Users can restore within 30 days or permanently delete immediately.

## AD-08: CSS Custom Properties for Theming

**Decision**: Use CSS custom properties (variables) in `globals.css` for the color system instead of Tailwind's config-based colors.

**Context**: The app supports light, dark, and system themes.

**Rationale**:
- Theme switching is instant via toggling a `.dark` class on `<html>`
- No JavaScript needed to compute colors at runtime
- Tailwind utility classes reference semantic names (`text-foreground`, `bg-accent`) that resolve to the current theme's values

## AD-09: Client-Side Dashboard Pages

**Decision**: All dashboard pages are client components (`'use client'`).

**Context**: Dashboard pages need real-time interactivity (forms, modals, state management) and fetch data from authenticated API routes.

**Rationale**:
- Consistent pattern across all pages
- Auth state (via `useSession` hook) is naturally available
- API routes handle data fetching with proper auth checks
- Skeleton loading states provide good perceived performance

**Trade-off**: No server-side rendering for dashboard pages, but these are behind auth anyway and shouldn't be indexed.
