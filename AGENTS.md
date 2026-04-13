<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## DreamJob patch rules

This repo is a **working product prototype**. Treat changes as a **targeted patch/update**, not a rebuild.

### Governing change rules

* Preserve existing working behavior unless the requested spec explicitly requires revision.
* Make the **smallest coherent set of changes**.
* Do not broadly refactor, modernize, rename, or reorganize files for cleanliness alone.
* Do not broadly delete legacy/stale code in an early pass.
* When in doubt, preserve and classify rather than remove.

### Workflow classification rules

When analyzing the repo, classify relevant areas as:

* `active-core`
* `active-but-transitional`
* `legacy-superseded`
* `future-expansion`
* `uncertain`

Determine what is current primarily by:

* explicit product-intent alignment
* active workflow behavior
* source-of-truth files
* declared golden path behavior

Do **not** determine current behavior mainly by:

* code age
* route/file names
* superficial duplication
* assumptions based on older framework habits

### Golden path to protect

Until explicitly superseded, preserve the deploy-safe golden path:

* listing intake works
* listing review / analysis path works
* start application works
* resume page loads, generates, edits/saves, and chats
* cover letter page loads, generates, edits/saves, and chats
* interview page loads, generates, and chats
* negotiation page loads, generates, and chats
* workflow persists correctly
* app builds and deploys cleanly

### Source-of-truth discipline

Before changing behavior, identify:

* active flow
* legacy/stale flow
* duplicate logic
* likely source-of-truth files
* areas where changing the wrong file would leave real behavior untouched

### Scope discipline

For early migration passes:

* prefer support-structure changes over visible UX rewrites
* prefer additive scaffolding over destructive replacement
* preserve Stage 2 and Stage 3 behavior unless compatibility changes are required
* do not combine broad cleanup, schema deletion, workflow rewrite, and UI redesign in one pass

### Verification

After changes:

* run the relevant checks
* confirm the app still builds
* summarize what changed
* summarize what was intentionally left untouched
* call out legacy/duplicate/uncertain areas still present
