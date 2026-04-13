# Architecture Map

## 1) Framework / app structure

### Observed
- App uses Next.js App Router under `src/app` with `(auth)` and `(dashboard)` route groups. API routes live under `src/app/api/**`.
- Nearly all dashboard pages are client components (`"use client"`) and fetch data from internal API routes.
- Auth/session checks are performed in API routes by deriving `account_id` from Supabase auth user.

### Inferred
- The app is intentionally client-driven for authenticated UX speed and UI interactivity; API routes are the server boundary.

## 2) Major routes/pages

### Observed
- `/` (dashboard root): listing intake (URL parse or manual create) and at-a-glance pending/in-progress status.
- `/listings`: listing_review queue.
- `/listings/[id]`: listing review/edit page, match scoring, LinkedIn checks, and “start application”.
- `/jobs`: active/non-listing workflows list.
- `/jobs/[id]`: application detail/status timeline + listing/meta editing.
- `/jobs/[id]/{resume|cover-letter|interview-guide|negotiation-guide}`: per-document generation/edit/chat.
- `/jobs/[id]/export`: copy/download docs.

## 3) Where chat UI lives

### Observed
- Primary chat component is `src/components/documents/ai-chat-panel.tsx`.
- Embedded in all doc pages with a `surface` prop (`resume`, `cover_letter`, `interview_guide`, `negotiation_guide`).
- Chat API endpoint is `/api/ai/chat`.

### Inferred
- Chat is contextual per workflow+surface and intended as document-refinement assistant (not global agent orchestration).

## 4) Workflow/state orchestration location

### Observed
- Primary orchestration is distributed across:
  - `src/app/api/workflows/**` (state/events/outputs persistence)
  - document pages under `src/app/(dashboard)/jobs/[id]/**` (generation trigger + polling + autosave)
  - `src/lib/workflow-adapter.ts` (status derivation + UI mapping)
- Status timeline logic exists both server-side (`status` route updates state) and client-side (status prerequisites/conflicts in page code).

### Inferred
- There is **no single central workflow engine file**; behavior is split across page components + API routes.

## 5) Where AI prompt files live

### Observed
- `src/lib/ai/prompts/listing-parse.ts`
- `src/lib/ai/prompts/qa-guidance.ts`
- `src/lib/ai/prompts/resume-generation.ts`

## 6) Where model API calls are made

### Observed
- Server-side model calls are made through provider abstraction in:
  - `/api/listings/parse`
  - `/api/ai/generate`
  - `/api/ai/chat`
  - `/api/workflows` (company website fallback lookup)
- Provider resolver: `src/lib/ai/provider.ts` -> OpenAI/Anthropic implementations.

## 7) Parsing / generation / evaluation logic

### Observed
- Listing parse: `/api/listings/parse` + `LISTING_PARSE_SYSTEM` prompt.
- Document generation: `/api/ai/generate` with output-type-specific system prompts.
- Match/evaluation scoring: inline `computeMatch` functions in listing and job detail pages (duplicated logic).
- Requirement parsing from mixed storage formats: inline `parseReqs` in multiple pages + adapter helper `toArray`.

### Risk note
- Parse/match logic duplication increases drift risk when modifying scoring or requirement parsing rules.

## 8) Persistence / database logic

### Observed
- Supabase admin client (`service role`) is used in most API routes (`src/lib/supabase/admin.ts`).
- Core lifecycle entities: `workflows`, `job_listings`, `outputs`, `status_events`, `qa_answers`, `chat_threads`, `chat_messages`.
- Full schema is migration-driven (`supabase/migrations/*.sql`) with additive migrations for enum/column drift.

## 9) Stage/step flow (current behavior)

### Observed current transitions
1. Create workflow from parsed/manual listing -> `workflows.state = listing_review`.
2. User starts application from listing review -> state patched to `draft` (client action).
3. Each document page auto-triggers generation if current output missing.
4. Generated/edited output versions saved in `outputs` via `/workflows/[id]/outputs`.
5. Status progression stored as append-only-ish `status_events`; some events also patch workflow state (`sent`, `hired`).

### Inferred
- Runtime flow is “listing -> draft docs -> status events” with QA/generating/review states mostly optional or lightly used in current UI.

---

## Required architecture-risk analysis

### A) Active flow that appears to drive working product

- **Listing intake + review + start app + per-doc generate/edit/chat flow** -> `active`.
  - Why: directly wired from dashboard/listings/jobs pages and used by all major user paths.

### B) Legacy/stale flow candidates

- `src/app/(dashboard)/jobs/new/page.tsx` redirect-only route -> `legacy`.
  - Why: explicit comment says creation moved to `/`.
- Rich workflow state model (`qa_intake`, `generating`, `review`, `ready_to_send`) in enums/constants -> `uncertain`.
  - Why: present in schema/types but partially exercised by UI.
- LinkedIn scraping depth in `lib/linkedin/browser.ts` -> `uncertain`/`legacy-like` in hosted env.
  - Why: implementation intentionally stubbed on serverless; likely only locally functional.

### C) Duplicate / overlapping logic

- Requirement parsing (`parseReqs`/`toArray`) in multiple files -> `duplicate`.
- Match score computation duplicated in listing review and job detail pages -> `duplicate`.
- Document page orchestration repeated across four doc routes (fetch/generate/poll/autosave/status/delete) -> `duplicate`.
- DB state typing split between `src/lib/types.ts` and `src/types/database.ts` -> `duplicate` (and partially divergent).

### D) Likely source-of-truth files

- Workflow orchestration: `src/app/api/workflows/**` + doc pages under `src/app/(dashboard)/jobs/[id]/**`.
- AI prompt execution: `/api/ai/generate`, `/api/ai/chat`, `/api/listings/parse`, and `src/lib/ai/provider.ts`.
- Chat state: DB tables (`chat_threads`, `chat_messages`) + `/api/ai/chat`.
- Listing parse: `/api/listings/parse` + `src/lib/ai/prompts/listing-parse.ts`.
- Document generation: `/api/ai/generate` + `src/lib/ai/prompts/resume-generation.ts`.
- Persistence/schema: `supabase/migrations/*.sql` (especially `001` + additive migrations `002`–`008`).

### E) “Change wrong file” hazard zones

- Updating only `src/types/database.ts` or only `src/lib/types.ts` can leave runtime/API behavior unchanged or type drift unresolved.
- Editing only `workflow-adapter.ts` does not alter persistence/state transitions in API routes.
- Updating prompt files without checking corresponding route context builders may not produce intended output changes.
- Refactoring one doc page without propagating shared behavior may introduce inconsistent autosave/poll/status behavior across doc types.

