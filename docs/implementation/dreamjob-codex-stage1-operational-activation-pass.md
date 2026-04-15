# DreamJob Codex Prompt — Stage 1 Operational Activation Pass

## Purpose

Use this prompt with Codex for the next DreamJob repo update.

The shared chat activation pass appears to have succeeded well enough:
- the chat is now the central experience
- known profile data is reused
- missing required data is collected before continuing
- URL intake connects to the real listing parse flow
- the old downstream workflow still functions

The next step is to make **Stage 1 do the real guided operational work inside the chat**, instead of handing off too early to the old listing-analysis flow.

This is **not** a rebuild.
This is **not** a broad cleanup pass.
This is a **targeted Stage 1 operational activation pass**.

---

## Prompt for Codex

```md
You are working on the current DreamJob integration branch.

Build on the current branch state.
Do not restart from main.
Do not rely on deleted or obsolete branches.
Preserve already accepted work on this branch unless a real bug or inconsistency requires refinement.

Patch the existing working product. This is **not a rebuild**.

## Governing docs

Use the canonical planning docs in `docs/planning/`, especially:

- `dreamjob-locked-rules-document-revised-ui.md`
- `dreamjob-goa-object-model-spec.md`
- `dreamjob-outcome-metrics-and-stage-success-spec.md`
- `dreamjob-adaptive-guidance-model.md`
- `dreamjob-onboarding-field-decision-matrix.md`
- `dreamjob-stage1-chat-interaction-spec.md`
- `dreamjob-stage1-data-and-decision-matrix.md`
- `dreamjob-opportunity-intelligence-and-advancement-guidance-spec.md`
- `dreamjob-memory-architecture-spec.md`
- `dreamjob-shared-chat-shell-spec.md`
- `dreamjob-chat-thread-and-action-model.md`

## Current observed state

The shared chat shell is now central enough to proceed.

Observed working behavior:
- onboarding happens in the chat
- known profile data is reused correctly
- missing required onboarding data is collected before continuing
- the user can provide a URL or ask DreamJob to find jobs
- URL intake connects to the listing parse flow
- downstream workflow still hands off to the older listing-analysis page and later stages

The key missing piece is that Stage 1 does not yet perform the real guided operational analysis inside the chat before that handoff.

## Primary objective

Activate the first real operational Stage 1 behavior inside the shared chat so the system begins doing the actual guided analysis work in-thread:

1. listing understanding bundle
2. user-in-context bundle
3. targeted collection only when needed
4. validation bundle
5. positioning outcome
6. next-step branching

## Required behavior

### 1. Listing understanding bundle
After URL or pasted-text intake and parse, the chat should present a real bundled understanding of the opportunity, including where available:

- role title
- company
- location / work mode
- level / seniority estimate
- major requirement themes
- obvious hard requirements or constraints
- notable context worth calling out

This should be a real in-thread bundle, not just generic explanatory copy.

### 2. User-in-context bundle
After the listing bundle, the chat should present what it currently knows about the user relative to the opportunity using available trusted data.

It should clearly distinguish:
- known / trusted
- inferred / likely
- unknown / missing

Do not re-ask known approved data.

### 3. Targeted collection
Only ask for additional information when it is actually needed to:
- reduce meaningful ambiguity
- support a major requirement
- improve positioning confidence
- improve downstream document fidelity

Do not turn this into broad profile-building.

Prefer:
- one missing item at a time
- or a connected set only when that is clearly more efficient

### 4. Validation bundle
Before finalizing positioning, present a concise validation bundle showing:
- trusted opportunity understanding
- relevant trusted user context
- key matches
- key gaps
- any intentional non-blocking unknowns

The user should be able to review this before the system finalizes the outcome.

### 5. Positioning outcome
Implement real Stage 1 positioning behavior using the canonical outcomes:

- Overqualified
- Strong Fit
- Healthy Stretch
- Big Stretch
- Future Role Target

The system should:
- determine the outcome
- explain why
- explain the best next move

Do not use `unclear` as a user-facing final state.

### 6. Next-step branching
After positioning, the system should guide the user into real next-step actions:

- proceed to Stage 2
- save as Future Role Target
- start over

If it can be done safely in this pass, these should be more than narrative copy and should become real interactive in-thread actions or state changes.

## Handoff rule

Do not remove the older listing-analysis page or deeper downstream mechanics yet unless a replacement is clearly live and safe.

But the handoff should occur **after** the chat has completed the new Stage 1 operational flow, not before.

## Scope

### In scope
- real Stage 1 bundle behavior in chat
- real user-in-context behavior in chat
- targeted collection logic in chat
- validation bundle in chat
- positioning outcome in chat
- next-step branching in chat
- safe handoff into existing downstream workflow after the Stage 1 operational flow

### Out of scope
- full job search engine implementation
- full opportunity comparison engine
- full duplicate detection engine
- Stage 2 redesign
- Stage 3 redesign
- broad cleanup
- broad dashboard/layout polish

## Constraints

- minimal diff
- preserve current onboarding/chat shell behavior
- preserve current golden path
- preserve Stage 2 and Stage 3
- preserve accepted branch work
- do not broadly restructure routes
- keep the app deployable

Prefer:
- real in-thread bundles and actions
- explicit, safe decision logic
- additive migration
- reusing current parse and workflow mechanics where helpful

Avoid:
- decorative chat copy that only pretends to do the Stage 1 work
- broad rebuild of the listing-analysis system
- broad profile-building inside Stage 1
- regressions to current working flows

## Required output

After making changes, provide:

1. **Decision summary**
   - what Stage 1 operational behavior is now active in chat

2. **Files changed**
   - exact files changed
   - purpose of each change

3. **What is now truly active**
   - listing understanding bundle
   - user-in-context bundle
   - targeted collection
   - validation bundle
   - positioning result
   - next-step branching

4. **What was intentionally left untouched**
   - deeper old listing-analysis mechanics still preserved
   - Stage 2
   - Stage 3
   - full search/comparison engines

5. **Verification checklist**
   Confirm whether:
   - onboarding still works
   - central chat shell still works
   - URL intake still works
   - pasted text intake still works if supported
   - Stage 1 now performs the bundle/validation/positioning flow in chat
   - proceed / future target / start over behavior works
   - no regression to Stage 2 / Stage 3
   - app remains buildable/deployable

6. **Open risks / next-step readiness**
   - what still needs another pass
   - what this now makes possible next

## Final constraint

This pass should make Stage 1 feel like a real guided analysis system in the chat, not just a better chat wrapper around the old page flow.
```
