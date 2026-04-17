# DreamJob App — Product-Specific AI/System Architecture

## Purpose

This architecture is designed specifically for the **DreamJob App** as it exists today and as it should behave when fully hardened.

It is not a generic “AI assistant app” architecture.

It is designed for one thing:

**help a user win a target job opportunity by producing and improving application materials and support outputs for a real job listing.**

---

# 1. Product boundary

## What DreamJob is for
DreamJob is for:
- opportunity intake from a real job listing
- listing analysis
- evidence alignment from user profile/work history
- resume generation and revision
- cover letter generation and revision
- application support:
  - follow up
  - interview preparation
  - negotiation guidance
- Google Docs-linked working artifacts
- one active Run at a time

## What DreamJob is not for
DreamJob is not for:
- general web browsing
- random document editing
- school essays
- erotica/porn/adult content
- unrelated business writing
- generic chatbot use
- arbitrary URL analysis outside the hiring workflow
- productivity/wiki/notebook use

## Product rule
Every major AI/system behavior should answer this question:

**Does this help the user get hired for this specific target opportunity?**

If not, it should be:
- suppressed
- redirected
- or rejected with a product-appropriate response

---

# 2. Core system principle

DreamJob should not be “just a model call.”

It should be:

## Model + orchestration + memory + workflow state + domain guardrails

That means the app needs these layers:

1. **Domain boundary layer**
2. **Opportunity intelligence layer**
3. **Run state / workflow orchestration layer**
4. **User memory + evidence layer**
5. **Artifact generation + editing layer**
6. **Assistant/chat orchestration layer**
7. **Action + transition engine**
8. **Trust/safety/evaluation layer**
9. **Document sync/export layer**
10. **Observability + feedback layer**

---

# 3. Canonical domain objects

These should be the real source-of-truth objects across the system.

## User
Persistent person/account identity.

## Profile
Long-lived user data and reusable capability memory.

## Employment History
Structured past work evidence.

## Opportunity
The target job opportunity.

## Listing
Parsed and normalized listing intelligence.

## Run
The active application process for one Opportunity.

## Evidence Alignment
The requirement-by-requirement mapping between listing needs and user evidence.

## Artifact
A generated or edited output:
- resume
- cover letter
- interview guide
- negotiation guide

## Support State
Follow Up / Interview / Negotiation state and unlock signals.

## AI Preference
Durable user-level preference for provider/model behavior.

---

# 4. Required architecture layers

# Layer A — Domain boundary and misuse guardrails

## Purpose
Stop the app from drifting outside the DreamJob mission.

## Required behavior
Every URL, user input, or major request should be classified as one of:

- valid job-listing intake
- valid DreamJob workflow action
- ambiguous but possibly valid hiring content
- invalid / out-of-domain content

## Examples of out-of-domain input
- pornography URL
- social media post not tied to a job opportunity
- shopping page
- random blog post
- restaurant website
- school assignment prompt
- generic request unrelated to getting hired

## Required system action
When input is out-of-domain:
- do not attempt normal listing parsing
- do not silently fail
- do not produce generic assistant behavior
- return a product-branded redirect response

## Tone rule
Use light, cheeky, non-hostile responses.

### Example responses
- “Naughty naughty… nice try, but let’s stay focused on getting you hired.”
- “That does not look like a job opportunity. Let’s aim this thing at a real listing.”
- “DreamJob is laser-focused on helping you get hired. Drop in a real job listing and let’s get to work.”
- “Fun detour, but wrong app mission. Bring me a real opportunity and I’ll help you chase it.”

## Implementation pattern
Create an **Input Intent Classifier** before parsing and before assistant handling for major surfaces.

### Output shape
```json
{
  "intent": "job_listing" | "dreamjob_action" | "ambiguous" | "out_of_domain",
  "confidence": 0.0,
  "reason": "string",
  "recommended_response_type": "continue" | "clarify" | "reject"
}
```

---

# Layer B — Opportunity intelligence

## Purpose
Turn raw listing content into hiring-useful structured intelligence.

## Required outputs
The listing layer should not just extract text.
It should produce:

### Canonical listing contract
- title
- company
- location
- compensation
- work mode
- seniority
- summary
- exact requirements
- nice to haves
- responsibilities
- tools/platforms
- domain signals
- confidence/provenance
- uncertainty notes

### Prioritized requirement model
Each requirement should also carry:
- requirement type
- priority weight
- whether user-facing
- evidence needed
- likely resume relevance
- likely cover-letter relevance
- suppression reason if not worth surfacing

### Smart suppression examples
Do not bother the user with low-value requirements if strongly implied already.

Example:
- English fluency in an English-only app with clearly fluent English input

## Requirement example
For:
- “7+ years of closing experience in B2B SaaS or technology sales with $30K-$50K ACV deals”

the system should retain:
- years minimum
- closing motion
- domain
- ACV range
- hard-requirement status
- priority

---

# Layer C — Run orchestration / workflow state machine

## Purpose
Make the app behave like one guided, coherent run instead of disconnected screens.

## Required states
Suggested core states:

1. Listing Review
2. Work History
3. Resume
4. Cover Letter
5. Final Hub

Support subtree:
- Follow Up
- Interview
- Negotiation

## Rules
- Listing Review is outside the milestone tracker
- Work History is the first tracked milestone
- only one active Run at a time
- Final Hub is the post-material operations hub
- support unlocks depend on specific state transitions and user signals

## Required system responsibilities
- know what the current active step is
- know what completion means for each step
- know what transition conditions are satisfied
- know when to auto-generate
- know when to show loading
- know when to block progression
- know what the assistant should help with in the current step

---

# Layer D — Memory and evidence system

## Purpose
Make the assistant and generators act like they remember the user properly.

## Required memory layers

### 1. Profile memory
Reusable, long-lived facts about the user.

### 2. Work history evidence
Structured past achievement evidence.

### 3. Run-scoped evidence
Opportunity-specific aligned facts and edits.

### 4. Artifact state
What has already been generated, edited, approved, or synced.

## Required fact schema
Each fact should support:
- fact_type
- subject
- value
- source
- confidence
- verification_status
- scope
- updated_at
- conflict_group if relevant

## Required behavior
- explicit conflict detection
- smart suppression of obvious facts
- evidence freshness awareness
- distinction between suggested evidence and user-confirmed evidence

---

# Layer E — Assistant orchestration

## Purpose
Make chat feel like a real, context-aware DreamJob copilot.

## Key rule
Chat should not be one generic assistant.
It should be **surface-aware and Run-aware**.

## Surface-specific assistant modes
- Listing Review assistant
- Work History assistant
- Resume assistant
- Cover Letter assistant
- Final Hub assistant
- Follow Up assistant
- Interview assistant
- Negotiation assistant

## Assistant output shape
Every response should be able to produce:
- `message`
- `suggestions`
- `actions`
- `warnings`
- `facts_to_confirm`
- `completion_signal`

## The system must decide
- what context to include
- what to suppress
- what the user still needs
- what next action matters most now

---

# Layer F — Artifact generation + editing

## Purpose
Generate working artifacts that are actually useful, editable, and syncable.

## Required artifact model
Use one DreamJob-native document schema for:
- resume
- cover letter
- interview guide
- negotiation guide

## Required behavior
- artifact generation uses canonical listing + evidence alignment + profile memory
- artifacts are editable inside the app
- artifacts sync to native Google Docs
- one Google Doc per artifact
- one per-listing subfolder inside a chosen Drive root

## Important rule
The app should not pretend sync succeeded if it failed.
Use truthful states:
- synced
- pending
- error

---

# Layer G — Action and transition engine

## Purpose
Turn assistant suggestions and workflow conditions into real app behavior.

## Examples
- “Use suggestion” on evidence rows
- “Generate resume”
- “Generate cover letter”
- “Open in Google Docs”
- “I got an interview”
- “Unlock negotiation”

## Required behavior
Actions rendered in UI must be:
- actually wired
- step-aware
- backed by real state transitions

No dead action buttons.

---

# Layer H — Trust, ranking, and suppression layer

## Purpose
Prevent the system from being noisy, dumb, or distracting.

## Required behaviors

### Prioritization
The system should rank:
- what matters most in the listing
- what evidence is strongest
- what gap matters most
- what should be shown first

### Suppression
The system should suppress:
- already-obvious user capabilities
- low-signal requirements
- irrelevant extracted noise
- redundant reminders

### Confidence display
The system should show uncertainty only where it matters.

### Domain guardrails
The system should reject or redirect out-of-domain use with product-consistent cheeky messaging.

---

# Layer I — Evaluation and observability

## Purpose
Make the app debuggable and improvable.

## Track at minimum
- input classification result
- parse quality
- confidence summaries
- generation trigger reasons
- generation failure reasons
- chat surface/thread used
- action clicks
- save success/failure
- sync success/failure
- state transitions
- unsupported/runtime fallback states

## Important rule
Never debug by guessing when the app can log the reason.

---

# 5. Recommended request flow by use case

## Use case 1 — User pastes listing URL
1. classify input
2. reject if out-of-domain
3. fetch and parse listing
4. normalize into canonical listing
5. create Opportunity + Run
6. show listing parse loading screen
7. land on Listing Review

## Use case 2 — User moves to Work History
1. read canonical listing
2. create prioritized requirement/evidence map
3. suppress trivial/implicit items
4. show editable evidence rows
5. persist user-confirmed evidence to backend truth

## Use case 3 — User moves to Resume
1. verify Work History evidence is saved
2. trigger generation when readiness conditions are met
3. show Resume generating loading screen
4. generate native document
5. sync to Google Docs
6. show editable artifact + sync status + chat guidance

## Use case 4 — User uses assistant in a step
1. detect surface
2. load correct thread/context
3. assemble shared context
4. generate structured assistant response
5. render message + suggestions + actions + warnings

## Use case 5 — User tries out-of-domain behavior
1. classify as out-of-domain
2. stop normal workflow
3. return cheeky redirect response
4. do not create junk runs/listings/documents

---

# 6. Suggested implementation modules

## Intake / boundary
- `input-intent-classifier`
- `listing-source-validator`
- `domain-guardrail-responder`

## Listing intelligence
- `canonical-listing-normalizer`
- `requirements-prioritizer`
- `evidence-target-builder`
- `suppression-rule-engine`

## Workflow
- `run-state-machine`
- `transition-guard-engine`
- `loading-state-orchestrator`
- `completion-truth-engine`

## Memory / evidence
- `fact-registry`
- `conflict-detector`
- `evidence-alignment-store`
- `artifact-state-store`

## Assistant
- `surface-orchestrator`
- `shared-context-builder`
- `structured-output-validator`
- `assistant-action-router`

## Documents
- `native-document-model`
- `google-doc-sync-service`
- `sync-status-tracker`

## Trust / evaluation
- `confidence-engine`
- `suppression-engine`
- `telemetry-logger`

---

# 7. Special product behaviors DreamJob should have

## Smart suppression example
If the user is clearly fluent in English, do not waste attention on “English fluency” as a user-facing missing requirement.

## Compensation handling
The system should never miss obvious salary data if it is clearly stated.

## Numeric threshold preservation
Never lose:
- years of experience
- deal-size ranges
- percentages
- quotas
- travel requirements
- team sizes
- location qualifiers

## Tone
Keep the product premium, focused, and motivating.
Even error responses should feel on-brand.

---

# 8. Example out-of-domain policy responses

## Pornography URL
“Naughty naughty… nice try, but let’s stay focused on getting you hired.”

## Generic unrelated URL
“That doesn’t look like a job opportunity. Bring me a real listing and I’ll help you chase it.”

## Random non-career request
“Wrong mission for this app. DreamJob is here to help you win the right opportunity.”

---

# 9. What this app still needs most

The biggest gaps are not model intelligence alone.
They are:

- better domain boundary control
- better prioritization
- better suppression
- stronger workflow truth
- stronger memory/evidence truth
- better assistant orchestration
- better sync/error truth
- better observability

That is how DreamJob gets closer to the kind of “awareness” users experience in ChatGPT.

---

# 10. Bottom line

DreamJob should be architected as a **hiring workflow intelligence system**, not a generic chat wrapper.

Its AI should always operate in service of:
- understanding the opportunity
- aligning the user’s evidence
- producing stronger application artifacts
- guiding the user through the Run
- protecting the app from misuse outside that mission
