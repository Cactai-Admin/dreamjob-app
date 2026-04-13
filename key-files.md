# Key Files for Safe Transition to Guided Chat-Centered Product

> Format: path, purpose, why it matters, change risk, recommendation.

## Highest-priority product flow files

| Path | Purpose | Why it matters | Risk if changed | Recommendation |
|---|---|---|---|---|
| `src/app/(dashboard)/page.tsx` | Main intake UX (URL parse/manual create) | Entry point into active workflow lifecycle | High: can break workflow creation and routing | **Revise carefully** |
| `src/app/(dashboard)/listings/[id]/page.tsx` | Listing review, profile match, LinkedIn lookup, start application | Bridge between parsing and doc generation | High | **Preserve core, revise incrementally** |
| `src/app/(dashboard)/jobs/[id]/page.tsx` | Application detail, status progression, notes, listing edits | Central status/timeline UX | High | **Revise carefully** |
| `src/app/(dashboard)/jobs/[id]/resume/page.tsx` | Resume generation/edit/chat/autosave orchestration | Template for one active doc flow | High | **Likely preserve + refactor toward shared controller** |
| `src/app/(dashboard)/jobs/[id]/cover-letter/page.tsx` | Cover letter generation/edit/chat/autosave | Same orchestration pattern as resume | High | **Revise / possibly consolidate** |
| `src/app/(dashboard)/jobs/[id]/interview-guide/page.tsx` | Interview guide generation/edit/chat/autosave | Same orchestration pattern | High | **Revise / possibly consolidate** |
| `src/app/(dashboard)/jobs/[id]/negotiation-guide/page.tsx` | Negotiation guide generation/edit/chat/autosave | Same orchestration pattern | High | **Revise / possibly consolidate** |
| `src/components/documents/ai-chat-panel.tsx` | Chat UX and `/api/ai/chat` interaction | Primary conversational surface | High | **Preserve concept, revise implementation as needed** |

## API workflow and AI control plane

| Path | Purpose | Why it matters | Risk | Recommendation |
|---|---|---|---|---|
| `src/app/api/workflows/route.ts` | Workflow list/create + listing/company creation | Canonical workflow creation path | High | **Preserve, revise minimally** |
| `src/app/api/workflows/[id]/route.ts` | Workflow fetch/update/delete + joined relations | Central CRUD read model for UI | High | **Preserve** |
| `src/app/api/workflows/[id]/outputs/route.ts` | Versioned output upsert path | Drives autosave and generation persistence | High | **Preserve** |
| `src/app/api/workflows/[id]/status/route.ts` | Status event write/delete and state side effects | Timeline correctness source | High | **Revise cautiously** |
| `src/app/api/ai/generate/route.ts` | Document generation pipeline | Main AI generation backend | High | **Preserve; adapt prompt/context only with tests** |
| `src/app/api/ai/chat/route.ts` | Chat thread/message persistence and AI response | Core chat-centered behavior | High | **Preserve and evolve** |
| `src/app/api/listings/parse/route.ts` | Listing parsing and enrichment | Start of application data quality | High | **Preserve + harden** |

## Prompt and provider files

| Path | Purpose | Why it matters | Risk | Recommendation |
|---|---|---|---|---|
| `src/lib/ai/prompts/listing-parse.ts` | Structured extraction prompt | Directly controls parse fidelity | Medium/High | **Revise carefully** |
| `src/lib/ai/prompts/resume-generation.ts` | System prompts per output type | Directly controls generated docs | High | **Revise carefully** |
| `src/lib/ai/prompts/qa-guidance.ts` | Chat guidance system/user context builder | Shapes assistant behavior | Medium/High | **Revise likely** |
| `src/lib/ai/provider.ts` | Provider selection/fallback abstraction | All model calls depend on this | High | **Preserve** |
| `src/lib/ai/{openai,anthropic}.ts` | Provider-specific API clients | Runtime generation reliability | Medium/High | **Preserve** |

## Parsing, adapter, and generation-adjacent logic

| Path | Purpose | Why it matters | Risk | Recommendation |
|---|---|---|---|---|
| `src/lib/workflow-adapter.ts` | DB workflow -> UI status/job mapping | Shared state interpretation for many pages | High | **Preserve with synchronized changes** |
| `src/types/workflow.ts` | Workflow steps/dependencies constants | May represent intended but partially-active lifecycle | Medium | **Revise only if aligning flow globally** |
| `src/lib/types.ts` | App-level runtime types | Used heavily across UI | Medium/High | **Preserve; reconcile with DB types** |
| `src/types/database.ts` | DB-oriented type map | Useful for schema contracts, currently drift-prone | Medium | **Revise for alignment** |

## Profile / listing parse support + doc inputs

| Path | Purpose | Why it matters | Risk | Recommendation |
|---|---|---|---|---|
| `src/app/api/profile/route.ts` | Profile read/write | Supplies generation context and matching | High | **Preserve** |
| `src/app/api/profile/employment/route.ts` | Employment CRUD | Supplies skills/tech context | Medium/High | **Preserve** |
| `src/app/api/profile/parse-artifact/route.ts` | Artifact parse ingestion | Inputs into profile memory/evidence | Medium | **Revise later** |
| `src/components/profile/upload-artifact-modal.tsx` | Artifact intake UI | Supports profile enrichment flow | Medium | **Preserve** |

## Database schema and migrations

| Path | Purpose | Why it matters | Risk | Recommendation |
|---|---|---|---|---|
| `supabase/migrations/001_initial_schema.sql` | Baseline schema and enums | Core data model truth | Very High | **Preserve baseline; extend with additive migrations** |
| `supabase/migrations/002-008_*.sql` | Drift fixes and additive columns/enums | Reflect real runtime assumptions | High | **Preserve and audit before new migration** |

## Likely remove/supersede candidates (with caution)

| Path | Assessment | Why |
|---|---|---|
| `src/app/(dashboard)/jobs/new/page.tsx` | Possibly remove/supersede | Route already hard-redirects to `/` and comments mark as moved. |
| Repeated doc-page orchestration blocks | Supersede via shared controller/hook | Same logic repeated 4x; consolidation lowers divergence risk. |
| Repeated parse/match helpers embedded in pages | Supersede with shared utility | Current duplication likely to drift and cause inconsistent scoring. |

## Explicit uncertainties

- It is unclear whether `jobs/[id]/review/page.tsx` and `workflows/[id]/snapshots` are still first-class in current UX or residual scaffolding.
- LinkedIn “live scrape” path appears environment-limited; may be functionally inactive in serverless deployment despite full UI/API wiring.
- Workflow step constants and enums include states not consistently enforced in current page flows.

