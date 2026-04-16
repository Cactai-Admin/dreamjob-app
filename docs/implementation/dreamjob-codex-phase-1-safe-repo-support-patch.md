# DreamJob Codex Implementation Prompt — Phase 1 Safe Repo Support Patch

## Purpose

Use this prompt with Codex to apply **Phase 1** of the DreamJob repo update.

This phase is a **safe support-architecture patch** to an existing working product.

It is **not** the full implementation of the new Stage 1 experience yet.

Its purpose is to prepare the repo so later Stage 1, Stage 2, and Stage 3 prompt-driven UX changes can be implemented safely, incrementally, and without destabilizing the current working prototype.

---

## Prompt for Codex

```md
You are patching an existing working product. This is **not a rebuild**.

Your job is to make the **smallest coherent set of repo changes** required to prepare DreamJob for the new guided, chat-centered workflow model while preserving the current deploy-safe golden path.

## Primary objective

Implement **Phase 1: safe repo support patch**.

This phase should:
- preserve the active working product
- prepare the repo for later Stage 1 UX/workflow consolidation
- reconcile schema/type drift
- reduce the highest-risk duplication in shared pure logic where safe
- add minimal support structures for:
  - state-aware app entry routing
  - onboarding modal support
  - unified Stage 1 support scaffolding
  - structured memory / review surface support
- avoid broad UI redesign
- avoid broad deletion of legacy code
- keep the app deployable after the patch

## Source-of-truth inputs

Use these files as governing inputs:

1. DreamJob locked rules document, revised UI version
2. docs/repo-audit/repo-tree.md
3. architecture-map.md
4. key-files.md
5. schema-map.md

Treat those as the source of truth for:
- product direction
- workflow intent
- active flow protection
- duplication risk
- schema drift
- patch constraints

## Patch framing

Treat this as a targeted patch/update to an existing working prototype.

Do not:
- rebuild the app
- modernize for its own sake
- broadly refactor the repo
- replace working flows just because a cleaner architecture is possible
- delete legacy/stale code broadly in this phase
- redesign the visible UI beyond what is minimally necessary for safe support scaffolding

Preserve working behavior unless revision is required by the locked rules.

## Golden path to preserve

The following must remain deploy-safe after this phase:

- listing intake works
- listing review / analysis path works until intentionally superseded
- start application works
- resume page loads, generates, edits/saves, and chats
- cover letter page loads, generates, edits/saves, and chats
- interview page loads, generates, and chats
- negotiation page loads, generates, and chats
- workflow persists correctly
- app deploys cleanly after the patch

Do not break this path.

## Required classification model

Before making changes, classify relevant code and behavior using:

- `active-core`
- `active-but-transitional`
- `legacy-superseded`
- `future-expansion`
- `uncertain`

### Classification rule
Determine what is “current” primarily by:
- explicit product-intent alignment
- the locked rules document
- the declared golden path
- actual active route/UI/API usage

Do **not** decide based mainly on:
- code age
- route names
- file names
- superficial appearance of redundancy

When in doubt, classify as `uncertain` and preserve it.

## Active product intent to respect

### App entry / landing logic
The app is **not dashboard-first**.

The intended app-open routing model is:

1. if required onboarding fields are missing, open onboarding modal
2. else if user has an active action in progress, return them to that action
3. else if user has alerts, send them to dashboard with ranked alerts
4. else send them to Workflow Stage 1

This phase should add the **support foundation** for this routing model.
It should not require a fully finished UX implementation yet if that would create unnecessary scope or deploy risk.

### Onboarding
Onboarding is a **chat-based modal**, not a page.

Required onboarding fields are only:
- name
- contact information
- location
- which contact details to include in application materials
- whether location should be included in application materials

This phase should prepare the repo to support onboarding-as-modal.
Do not build a detached profile-first flow.

### Stage 1 direction
Stage 1 is moving toward a unified, chat-centered workflow.
This phase should add support structures for that direction, not fully replace the current Stage 1 UX yet unless a narrow safe change is obvious.

### Stage 2 / Stage 3
Stage 2 and Stage 3 should remain functionally intact in this phase except for compatibility/support changes that are strictly necessary.

## Specific tasks for this phase

### 1. Reconcile schema/type drift
Inspect the schema and type maps and bring the repo into safer alignment.

Focus on the mismatches identified in `schema-map.md`, especially:
- workflow states missing from TS types
- output states missing from TS types
- status event types missing from TS types
- profile fields added by migrations but absent from TS types
- job listing website URL field drift
- outputs status/state drift

Rules:
- prefer aligning types with current schema/runtime truth
- do not perform destructive schema cleanup yet
- if a field is ambiguous but actively used, preserve it and document the ambiguity
- add comments only where needed to prevent future confusion

### 2. Centralize highest-risk duplicated pure logic
Identify the smallest safe shared abstractions for duplicated pure logic.

Target areas:
- requirement parsing helpers
- match score / comparison helper logic
- low-risk shared utilities that currently exist in multiple active locations

Rules:
- centralize only where it clearly reduces drift and does not require broad UI rewiring
- do not attempt an ambitious workflow-engine rewrite
- do not collapse meaningful surface-specific behavior
- update active call sites carefully
- if a duplication area is too entangled, document it instead of forcing a risky rewrite

### 3. Prepare state-aware entry support
Add the minimal support layer needed for app-open routing logic.

This may include:
- a small resolver/helper
- a shared decision utility
- a lightweight route/load helper
- support state definitions for:
  - onboarding required
  - active action resume
  - alert-first dashboard
  - Stage 1 fallback

Rules:
- do not overengineer a full routing framework
- keep this support layer small and explicit
- preserve the current functioning routes while enabling later entry behavior changes
- if a feature flag or small guarded scaffold is helpful, use the lightest viable approach

### 4. Prepare onboarding modal support scaffolding
Add the minimum support required so onboarding can be implemented as a chat-based modal instead of a separate page-first workflow.

This may include:
- state shape for onboarding completeness
- modal trigger condition support
- storage shape for onboarding fields / inclusion preferences
- clear separation between onboarding support state and broader profile memory

Rules:
- do not force a full onboarding UI rewrite in this phase
- do not create a large detached profile flow
- build only the support structure necessary for the later implementation pass

### 5. Prepare structured memory / review surface support
Add the minimal support needed for the future UI model where:
- approved data in chat becomes trusted reusable memory
- structured review pages/surfaces exist for direct intervention
- stage progress controls can later surface stored sections

This phase may add:
- types/interfaces
- storage helpers
- state records or JSON structures
- clear placeholders/scaffolding for trusted approved data

Rules:
- do not build the full final UI yet
- do not create a second product behind the chat
- favor small, durable data contracts that later UI can consume

### 6. Preserve Stage 2 and Stage 3 compatibility
Do not redesign Stage 2 or Stage 3 in this phase.

Allowed changes:
- compatibility updates
- shared type alignment
- non-breaking support hooks/utilities
- low-risk reuse improvements

Not allowed in this phase:
- major prompt rewrites
- major UI changes
- document flow redesign
- interview/negotiation expansion work

### 7. Identify but do not broadly remove stale logic
If you encounter logic that appears legacy, duplicate, or stale:
- classify it
- isolate it mentally / in summary output
- supersede only where necessary for safe support work
- do not broadly delete it in this phase

If something clearly must be superseded to avoid conflict, do so narrowly and explain it.

## Out of scope for Phase 1

Do **not** do the following unless absolutely required for buildability:

- full Stage 1 unified chat implementation
- final onboarding UX implementation
- broad route restructuring
- broad UI redesign
- full dashboard redesign
- final stage progress UI
- final chat-to-memory animations
- final mobile/desktop review surfaces
- Stage 2 prompt redesign
- Stage 3 expansion
- broad schema deletion / cleanup migration
- broad removal of uncertain or legacy code

## Preferred change style

- Make the smallest coherent set of changes
- Keep diffs PR-reviewable
- Avoid formatting churn
- Avoid renaming large areas unnecessarily
- Reuse existing utilities/routes/components where viable
- Preserve existing conventions unless a locked rule requires change

## Output requirements

After making changes, provide a concise implementation summary with:

1. **What changed**
   - files changed
   - purpose of each change
   - whether each change was type alignment, shared logic extraction, entry support, onboarding support, or memory/review support

2. **What was intentionally left untouched**
   - especially active Stage 2 and Stage 3 flows
   - any risky areas deferred on purpose

3. **Legacy / duplicate / uncertain areas still present**
   - what remains
   - why it was not removed yet

4. **Source-of-truth notes**
   - any area where the real source of truth was tricky or split
   - any follow-up needed later

5. **Verification checklist**
   Confirm whether the following were preserved:
   - listing intake
   - listing review / analysis path
   - start application
   - resume generate/edit/chat
   - cover letter generate/edit/chat
   - interview generate/chat
   - negotiation generate/chat
   - persistence
   - clean build / deploy readiness

6. **Open risks**
   - anything that should be verified quickly in Vercel after deploy
   - anything intentionally scaffolded but not fully activated yet

## Final constraint

This phase should leave the repo in a **safer, cleaner, more governable state** for the next implementation pass without destabilizing the working prototype.
```

---

## Notes for use

Use this prompt **after** Codex has access to:
- the locked rules document
- the revised locked rules document with UI behavior
- the repo discovery files

This is a **Phase 1 repo support patch**, not the Stage 1 UX implementation prompt.

---

## Expected outcome

After this pass, the repo should be:
- safer to patch
- more aligned with actual schema/runtime truth
- less vulnerable to drift in shared pure logic
- prepared for state-aware app entry
- prepared for onboarding modal implementation
- prepared for structured memory/review UI support
- still deployable and functionally intact on the current golden path

---

## Next likely phase

After Phase 1 is complete and verified, the next prompt should likely be:

**Phase 2: Stage 1 unified chat experience patch**

That later prompt should:
- revise the visible Stage 1 entry/analysis flow
- integrate onboarding and Stage 1 more cleanly
- keep the app state-aware
- preserve Stage 2 and Stage 3 while the new Stage 1 becomes the primary productive landing surface
