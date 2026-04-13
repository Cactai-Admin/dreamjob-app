# DreamJob Codex-First Implementation Working Notes

## Decision

Use **Codex** for:
1. repo discovery
2. patch implementation
3. PR creation / update workflow
4. iterative repo refinement tied to Vercel deployments

This project should be treated as a **targeted patch/update to an existing working product**, not as a rebuild.

---

## Why this changes the prompt/instruction style

Because Codex is already connected to the GitHub repo and your deployment loop is:

- change repo
- review PR
- merge/commit
- deploy to Vercel
- test quickly

the implementation prompts should be optimized for:

- minimal safe diffs
- repo-aware discovery
- source-of-truth identification
- staged patching
- PR-friendly output
- preservation of working behavior unless explicitly revised

The prompts should **not** encourage speculative redesign, broad rewrites, or style-only cleanup.

---

## Codex-first operating assumptions

All future implementation prompts should assume:

- the repo already exists and works as a prototype
- changes should be incremental and reviewable
- Codex should inspect before changing
- Codex should identify active vs legacy logic before patching
- Codex should preserve conventions unless a change is required by the new product model
- Codex should prefer minimal architectural movement with maximum functional clarity
- Codex should create patch-oriented changes that are easy to validate in Vercel

---

## Governing implementation rule

**Preserve what materially works. Revise only what is necessary to support the new guided journey, state model, prompt/data contracts, and chat-centered orchestration. Remove or supersede stale logic only when leaving it in place would create ambiguity, duplication, or broken downstream behavior.**

---

## How prompts for Codex should differ

### 1. Explicitly frame the work as a patch
Every implementation prompt should say:
- this is a patch/update to an existing working repo
- do not rebuild the app
- do not redesign broadly
- preserve working functionality unless the new spec requires revision

### 2. Require source-of-truth detection before edits
Every repo-change prompt should instruct Codex to identify:
- active flow
- legacy/stale flow
- duplicate logic
- likely source-of-truth files
- risky files that look important but are not actually authoritative

### 3. Require minimal-diff thinking
Every patch prompt should instruct Codex to:
- make the smallest coherent set of changes
- avoid broad formatting churn
- avoid renaming large areas unless necessary
- avoid moving files just to “clean things up”
- keep diffs readable for PR review

### 4. Separate user-facing chat from internal prompt execution
Prompts should not assume:
- one giant context thread
- one giant orchestration function
- one giant prompt

Instead they should prefer:
- one guided user-facing chat experience
- stage-aware internal prompt/data orchestration behind the scenes
- structured persisted outputs between stages

### 5. Treat Vercel deployment as the validation loop
Prompts should encourage:
- compile/build safety
- minimal regression risk
- incremental patches that can be deployed and inspected quickly

---

## What I will optimize for in future prompts

When drafting future implementation prompts for Codex, I will optimize for:

- safety
- clarity
- repo continuity
- minimal breakage risk
- identifiable checkpoints
- staged implementation
- compatibility with GitHub PR review
- compatibility with fast Vercel deploy/test cycles

---

## Required instruction pattern for Codex patch prompts

Future prompts should include the following guidance, adapted to the specific task:

### Patch framing
- Treat this as a targeted patch/update to an existing working product
- Preserve existing working behavior unless the new spec requires revision
- Avoid speculative redesign or broad refactors

### Discovery before change
- Inspect current implementation paths before editing
- Identify active, legacy, duplicate, and uncertain logic
- Determine likely source-of-truth files before modifying behavior

### Change discipline
- Make the smallest coherent set of changes
- Reuse existing utilities, prompts, state, and components where viable
- Remove or supersede stale logic only when needed to prevent ambiguity or conflict
- Keep diffs focused and reviewable

### Output discipline
- Summarize what was changed
- Summarize what was intentionally left untouched
- Call out any legacy logic that still exists but was not removed
- Call out any assumptions that should be verified in Vercel after deployment

### Risk discipline
- Highlight any area where the real source of truth was uncertain
- Avoid silently changing multiple competing flows without noting it
- Do not introduce new architecture unless the current repo cannot support the required behavior without it

---

## Preferred implementation rhythm with Codex

### Phase 1 — Discovery
Codex inspects the repo and creates architecture/discovery files.

### Phase 2 — Architecture patch spec application
Codex applies narrowly scoped repo updates to support the new stage/state/data model.

### Phase 3 — Stage-specific patching
Codex patches Stage 1 first, then later Stage 2, then Stage 3.

### Phase 4 — Verification loop
You review the PR, deploy through Vercel, inspect behavior, and then iterate.

---

## Important distinction for Codex prompts

Future prompts should not say:
- “refactor the app to make it cleaner”
- “rebuild the workflow”
- “modernize the implementation”
- “consolidate everything”

Future prompts should say:
- “identify the minimum repo changes required”
- “preserve active working flow where possible”
- “replace or supersede only the outdated parts that conflict with the new guided journey”
- “keep the patch narrowly scoped and PR-reviewable”

---

## What this means for the next deliverable

The next implementation prompt I write for you should be:

1. Codex-compatible
2. patch-oriented
3. repo-aware
4. explicit about active vs legacy logic
5. explicit about minimal diffs
6. explicit about preserving working prototype behavior unless revision is required

---

## Locked working assumptions

Use these assumptions in future implementation prompts unless I explicitly revise them:

- tool: Codex
- repo: GitHub-connected
- deploy/host: Vercel
- work style: patch/update, not rebuild
- UI changes: minimal layout/interaction reformatting
- workflow changes: minimal reformatting with clearer orchestration and validation
- AI changes: reorganize chat/prompt/state flow only as needed for higher fidelity
- schema changes: controlled expansion/cleanup only where required
- review style: PR-oriented and incremental
