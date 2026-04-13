# DreamJob Stage 1 Chat Interaction Spec

## Purpose

This document defines the **Stage 1 chat interaction contract** for DreamJob.

Its purpose is to make Stage 1 implementation precise enough that:
- the user experience is guided and consistent
- the system knows what it should say and do first
- Codex can implement Stage 1 without guessing the interaction model
- later prompt work can be built against a stable behavioral spec

This is a UX/interaction specification, not a prompt file.

---

## 1. Stage 1 role in the product

Stage 1 is the first real productive workflow in DreamJob.

It is the point where the system:
- receives a target opportunity
- understands the opportunity
- understands the user in relation to the opportunity
- validates what it knows
- collects what it needs
- assesses positioning
- determines whether to proceed
- prepares the trusted downstream context for Stage 2

Stage 1 should feel like:
- the start of meaningful progress
- a guided analysis conversation
- a high-trust intake and assessment experience
- the place where the system proves it understands both the job and the user

---

## 2. Stage 1 must not feel like

Stage 1 must not feel like:
- a generic dashboard
- a blank chatbot
- a form wizard
- a detached admin workflow
- a static listing review page
- an ATS checker with extra words
- a tool the user has to operate manually

---

## 3. Core Stage 1 objective

Stage 1 exists to produce a **Validated Opportunity Context Package** and a **Candidate Positioning Assessment** that the user trusts enough to use as the basis for document generation.

That means Stage 1 is successful only when:
- the user believes the system understood the opportunity
- the user believes the system understood what is known about them
- the user has had the chance to correct important inputs
- the system has resolved ambiguity into a meaningful positioning outcome
- the system has enough trusted context to move into Stage 2

---

## 4. What the user sees first

When the user lands in Stage 1 with no active interruption, the primary visible experience should be:

- a chat-first workspace
- a clear, inviting prompt to submit:
  - a job listing URL
  - or pasted job listing text

### First visible user-facing purpose
The user should understand immediately:
- this is where DreamJob begins helping with a real opportunity
- they do not need to prepare everything first
- the system will guide them through what matters

### First visible message characteristics
The first Stage 1 message should:
- orient the user
- invite action
- reduce anxiety
- make the next step obvious
- avoid jargon or dense explanation

### It should not
- dump instructions
- ask for broad profile data
- ask multiple unrelated questions
- present a dead-empty chat with no direction

---

## 5. What the system should already know before asking anything

Before asking the user for new Stage 1 data, the system should assemble the current known context from:

- auth/account identity
- approved onboarding fields
- approved onboarding preferences
- approved reusable profile facts
- approved upload-derived facts
- prior workflow-approved facts relevant to the current stage
- saved future targets if relevant to path-fit logic

### Rule
The system must not ask for information it already has in approved reusable form.

### Stage 1 should begin from
- known facts
- not from blank-state assumptions

---

## 6. What Stage 1 is allowed to ask first

The first user action in Stage 1 should be limited to:

- job listing URL
- or pasted listing text

That is the only required entry input to begin the workflow.

### Stage 1 should not begin by asking
- past work history
- skills inventory
- education background
- credentials
- career aspirations
- future-target planning
- role-fit evidence
- anything that is not immediately needed to begin analyzing the opportunity

Those belong later, only if required by the workflow.

---

## 7. Stage 1 high-level chat sequence

Stage 1 should follow this sequence:

### Step 1 — Opportunity intake
The user provides:
- a listing URL
- or pasted listing text

### Step 2 — System parsing and orientation
The system parses the opportunity and returns:
- a concise explanation of what it understands
- a clear signal that analysis is underway
- the first meaningful summary of the role

### Step 3 — Listing understanding bundle
The system presents a concise bundled review of the opportunity.

### Step 4 — User-in-context understanding bundle
The system presents what it currently knows about the user relative to the opportunity.

### Step 5 — Gap identification and targeted collection
The system asks only for what is needed to reduce ambiguity or improve downstream accuracy.

### Step 6 — Validation bundle
The system shows the user the trusted working dataset and invites approval/correction.

### Step 7 — Positioning outcome
The system presents the user-facing positioning result and explains what it means.

### Step 8 — Stage 1 outcome choice
The system guides the user into:
- proceeding to Stage 2
- saving as Future Role Target
- or starting over with another opportunity

---

## 8. Step 1 — Opportunity intake interaction

### Allowed inputs
- URL
- pasted listing text

### System behavior
When the user submits one of these:
- acknowledge receipt
- begin parsing
- do not ask for unrelated data first
- do not ask the user to classify the listing manually
- do not require profile completion before proceeding

### Expected feeling
The system should feel ready and capable immediately.

---

## 9. Step 2 — System parsing and orientation

After intake, the system should return a message that does three things:

### 1. Confirms action
Examples of meaning:
- I’ve got the listing
- I’m analyzing the role
- I’m mapping what matters

### 2. Gives a first summary
The system should summarize the opportunity at a high level:
- role
- company
- likely level
- major themes
- obvious constraints

### 3. Sets expectation
It should tell the user what will happen next:
- review what the system found
- validate what it knows
- fill important gaps only if needed
- then assess positioning

### The system should not
- jump straight to fit judgment
- dump a huge parsed object
- ask for broad user history immediately

---

## 10. Step 3 — Listing understanding bundle

This is the first major review bundle.

### Purpose
Give the user confidence that DreamJob understood the target opportunity correctly.

### Bundle should include
- role title
- company
- location / work mode if known
- level/seniority estimate
- major requirement themes
- obvious hard requirements / constraints
- notable context worth calling out

### User response model
The user should be able to:
- accept this understanding
- correct it
- flag items for discussion
- indicate missing/incorrect interpretation

### Rule
This should be concise and digestible.
It is a review bundle, not a raw parse dump.

---

## 11. Step 4 — User-in-context understanding bundle

This is the second major review bundle.

### Purpose
Show the user what the system currently believes about them relative to the opportunity.

### It should include
- relevant known facts already available
- what appears aligned
- what appears uncertain
- what appears absent
- what may need confirmation before strong positioning is possible

### Rule
This bundle must be built from currently trusted or currently inferred context and must clearly distinguish:
- known
- likely
- unknown

### User response model
The user should be able to:
- confirm
- correct
- reject
- identify what needs deeper discussion

---

## 12. Review bundle rules

Stage 1 review should use **digestible bundles** by default.

### One-at-a-time review is allowed only when
- there is only one item in that category
- or the item should be handled in an isolated session

### Review bundle design requirements
Each bundle should make it easy for the user to understand:
- what the system believes
- why it matters
- what is still uncertain
- how to correct or approve it

### Review bundle must not
- overwhelm the user
- feel like dense admin screens
- require the user to manually inspect a large schema object

---

## 13. Step 5 — Gap identification and targeted collection

After the two core review bundles, the system may collect additional information only if needed.

### Allowed reasons to ask
- a required interpretation is still unclear
- a positioning outcome cannot be trusted yet
- downstream document quality would be materially harmed without the missing information
- a specific unsupported requirement needs user clarification
- a key confidence-building fact is missing

### Collection rule
Collection should usually happen one missing item at a time.

### Exception
If a connected set of information is best provided together in one response, the system may request that grouped set together.

### Governing principle
Efficiency is king:
- do not confuse the user
- do not overwhelm the user
- do not exhaust the user
- do not ask for broad, unrelated background information

---

## 14. What Stage 1 may ask for later, if needed

Only after the system has:
- parsed the listing
- shown the listing understanding bundle
- shown the user-in-context bundle

may it ask for additional contextual information needed for the opportunity analysis.

This may include only what is necessary to:
- validate key assumptions
- support a major requirement
- clarify positioning
- improve downstream trust and document targeting

### It should not become
- a profile-building interview
- a career biography
- a generic resume intake flow

---

## 15. Step 6 — Validation bundle

Once enough information has been collected, the system should present a final validation bundle.

### Purpose
Give the user one last chance to confirm the trusted dataset that will power Stage 2.

### It should include
- opportunity understanding
- user-relevant approved context
- key matches
- key gaps
- any intentional non-blocking unknowns
- the overall trusted working set in concise, human-readable form

### User action
The user should be able to:
- approve
- correct
- discuss a remaining issue

### Rule
The system should not move to positioning and downstream recommendation without giving the user this validation opportunity.

---

## 16. Step 7 — Candidate positioning outcome

After validation, the system must resolve the opportunity into a user-facing positioning outcome.

### Canonical positioning outcomes
- Overqualified
- Strong Fit
- Healthy Stretch
- Big Stretch
- Future Role Target

### The positioning message should do three things
1. clearly name the outcome
2. explain why the system reached it
3. explain what the best next move is

### Tone rules
- realistic
- encouraging
- useful
- strategic
- never deflating for the sake of bluntness

### Special rules
- Overqualified should encourage upward targeting
- Strong Fit should encourage proceeding and may suggest upward possibility
- Healthy Stretch should encourage proceeding
- Big Stretch should test whether missing information is the real issue and still support application if chosen
- Future Role Target should offer saving and stepping-stone guidance

---

## 17. Step 8 — Stage 1 outcome choice

After positioning, the system should guide the user into one of the following:

### Proceed to Stage 2
When the opportunity is worth pursuing now.

### Save as Future Role Target
When the opportunity is better treated as a future target and the user wants to remember it.

### Start over
When the user does not want to pursue the opportunity further.

### Rule
The system should lead the user into the next best action, not leave them in an ambiguous dead end.

---

## 18. What Stage 1 must never do

Stage 1 must never:
- start with profile-building
- ask for broad professional history before it is needed
- dump raw parse data
- jump to judgment without validation
- use “unclear” as the final user-facing result
- ask for information it already has in approved form
- require the user to orchestrate the workflow manually
- behave like a generic chatbot with no system structure

---

## 19. Chat style requirements

Stage 1 should be **chat-first**, which means the interaction model itself should feel conversational and guided.

It should **not** be:
- static conversational copy above a traditional form
- form completion disguised as chat
- a blank thread waiting for the user to guess what to do

### Chat-first means
- the system speaks in guided turns
- the user responds in context
- the system acknowledges and advances
- the user always understands what happens next

---

## 20. What the system should know before asking again

Before every new Stage 1 ask, the system should evaluate:

- what is already known
- what is approved
- what is inferred but unconfirmed
- what is truly missing
- what is blocking
- what is optional
- what is better deferred to later stages

### Rule
The system should never ask the user for a field simply because the UI component expects it.
It should ask only because the Stage 1 workflow actually needs it.

---

## 21. Stage 1 output artifacts

Stage 1 must produce two primary outputs:

### 1. Validated Opportunity Context Package
This is the trusted downstream context artifact.

### 2. Candidate Positioning Assessment
This is the structured user-facing outcome artifact.

### These outputs should be sufficient for
- Stage 2 document generation
- path-fit / future-target logic
- structured memory and review surfaces
- later support behavior

---

## 22. Relationship to structured memory and review surfaces

Stage 1 is chat-first, but it must remain compatible with structured memory and manual review surfaces.

That means:
- approved facts should be promotable into trusted memory
- review bundles should be compatible with structured review surfaces
- the eventual UI can show where approved information lives without changing the core interaction contract

### Important rule
Chat remains primary.
Structured pages support inspection and intervention.

---

## 23. Mobile and desktop interaction expectations

### Mobile
- chat dominates
- review bundles remain concise
- manual review/intervention should be secondary and unobtrusive
- the user should always know the next action

### Desktop
- chat may coexist with structured review surfaces
- but Stage 1 should still feel guided, not dashboard-first
- side-by-side visibility may improve confidence, but must not change workflow ownership

---

## 24. Stage 1 completion conditions

Stage 1 is complete only when:
- the listing has been understood
- the user-in-context understanding has been reviewed
- important missing data has been collected if needed
- the trusted working dataset has been validated
- a positioning outcome has been presented
- the user has a clear next move

---

## 25. Immediate implementation use

This spec should govern:
- the next Stage 1 Codex implementation pass
- the later Stage 1 prompt design work
- the UI structure of `/` as the default productive landing surface
- the sequencing of Stage 1 system responses
- the boundary between onboarding and Stage 1
