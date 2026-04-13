# DreamJob Locked Rules Document

## Purpose

This document consolidates the currently locked product, UX, workflow, UI behavior, and implementation rules that should govern the next implementation-spec and coding-agent prompt work for DreamJob.

This is a source-of-truth checkpoint document.

It reflects the current agreed direction before writing the Codex implementation prompt.

---

## 1. Product identity

DreamJob is a **Cactai Inc. guided accomplishment system**.

It should not feel like a collection of tools the user must learn, manage, or orchestrate.

The user should only need to state their goal and respond to the system as it guides them through the process.

### Product behavior rules
- The system should determine the next best move.
- The system should do the heavy lifting.
- The system should keep momentum high.
- The system should ask only for necessary information.
- The system should produce professional, user-specific outputs.
- The system should feel intelligent, resourceful, proactive, and high-trust.
- The user should mainly:
  - respond
  - confirm
  - correct
  - approve
  - choose between clear options when necessary

---

## 2. App-level routing and entry logic

DreamJob is **not dashboard-first**.

The app should be governed by **state-aware routing** that takes the user to the most meaningful next experience.

### App open routing order
1. If required onboarding fields are missing, open the onboarding modal.
2. Else if the user has an active action in progress, return them directly to that action.
3. Else if the user has alerts, send them to the dashboard with alerts ranked by importance.
4. Else send them to Workflow Stage 1.

### Routing rules
- The user should not be dropped onto a dashboard by default.
- The dashboard is a management/alert surface, not the main productivity entrypoint.
- Workflow Stage 1 is the default productive landing surface when nothing else needs attention.

---

## 3. Dashboard role

The dashboard should exist as a **management and alert surface**.

It only has meaning once there are:
- alerts needing attention
- items in workflow stages
- situations that benefit from overview/triage

### Dashboard rules
- It is not the default landing page for productive work.
- It should surface alerts ranked by importance.
- It should help the user manage items that need attention, not initiate the primary work journey.

---

## 4. Onboarding

Onboarding should be a **warm, friendly, inviting chat-based modal**.

It should not be a standalone page.

### Why
- It signals that onboarding is a temporary support layer, not the app itself.
- It preserves continuity with the app experience.
- If it appears again later, it should feel familiar rather than like a redirect to a separate workflow.

### Onboarding rules
- Onboarding is a modal.
- Onboarding is chat-based.
- Onboarding is resumable.
- Onboarding may reappear later if a required foundational field is missing or needs confirmation.
- Onboarding should feel visually continuous with the app, but clearly separate from the main workflow surface.

### Onboarding fields to collect
Onboarding collects only:
- name
- contact information
- location
- which contact details the user wants included in application materials
- whether the user wants location included in application materials

### Onboarding should not ask for
- past experience
- future goals
- target roles
- work history
- skills
- education
- credentials

Professional background information should be collected later in meaningful workflow context.

---

## 5. Optional upload during onboarding

Onboarding should offer optional upload of:
- resume
- cover letter

### Upload framing
Upload should be presented as:
- optional
- helpful reference material
- a way for DreamJob to understand the user faster
- not required to start
- not the basis for future document reuse as-is

DreamJob authors **new, job-specific materials** for each application.

### If the user uploads
The system should:
1. parse the upload
2. confirm what it consumed
3. summarize what it extracted
4. let the user review, edit, and approve
5. store approved reusable information

### If the user declines upload
The system should:
- reassure the user that this is completely fine
- explicitly explain that DreamJob is designed to collect needed information organically through conversation
- move the user directly into Workflow Stage 1

---

## 6. One user experience, multiple internal stages

The user should feel like they are in **one continuous guided chat journey**.

Internally, the system may still use:
- multiple stage-scoped prompts
- multiple sub-prompts
- structured outputs
- stage-specific context packages

### Architecture rule
DreamJob should provide:
- one continuous user-facing guided experience
- multiple scoped internal prompt stages

It should not rely on one giant undifferentiated AI thread unless there is a strong reason to do so.

---

## 7. Workflow Stage 1 purpose

Workflow Stage 1 is a **unified UI and streamlined UX** for opportunity analysis and candidate positioning.

It begins when the user provides:
- a job listing URL
- or pasted listing text

### Stage 1 handles
- listing intake
- listing parsing
- profile/context comparison
- bundled review
- targeted data collection
- validation
- candidate positioning assessment
- proceed / do not proceed outcome

### Stage 1 behavior rules
- The user should feel the system understands the listing.
- The user should feel the system understands their profile data in context.
- The user should feel the system checked whether the data is valid in context.
- The user should feel the system identified additional data needed.
- The user should feel the system gathered that data.
- The user should feel the system verified the dataset with them before assessing positioning.
- The user should feel the system can inform them with insight about:
  - what their application should contain
  - what it should highlight
  - how it should be positioned effectively

### Stage 1 completion
If the user does not proceed after Stage 1, they start over.
If the user proceeds, the system enters Workflow Stage 2.

---

## 8. Review and collection efficiency rules

Efficiency is a governing principle.

The system should avoid:
- confusing the user
- overwhelming the user
- exhausting the user
- forcing overly fragmented interactions
- dumping large unreadable datasets

### Review rule
Review should happen in **digestible bundles** by default.

Use one-at-a-time review only when:
- there is only one item in that category
- or the item should be handled in an isolated session

### During review, the user should be able to:
- accept items
- eliminate items
- flag items for deeper review
- discuss items collaboratively

### Collection rule
Collection should usually happen **one missing item at a time**.

However, if a connected set of information is best provided together, the system should request that set together.

### Governing rule
- Bundle for review
- One item at a time for collection, unless connected information is better gathered together

---

## 9. Candidate positioning model

Stage 1 should not use `unclear` as a user-facing positioning outcome.

The purpose of the process is to create clarity.

### Locked user-facing positioning outcomes
- Overqualified
- Strong Fit
- Healthy Stretch
- Big Stretch
- Future Role Target

### Positioning behavior rules

#### Overqualified
- Encourage seeking more advanced roles
- Support application if the role still makes sense
- Explain the market risk of appearing too senior if relevant

#### Strong Fit
- Encourage application
- Suggest the user may also be able to pursue more advanced roles

#### Healthy Stretch
- Encourage application
- Frame it as ambitious but realistic

#### Big Stretch
- First test whether the gap is caused by missing information
- If information collection is complete and the gap remains, this may convert to Future Role Target
- If the user still wants to apply, support them honestly and constructively

#### Future Role Target
- Explain why the role is attractive
- Explain why it is better treated as a future target
- Suggest stepping-stone roles
- Offer to remember it as a goal
- Still support an application if the user insists

---

## 10. Gap-recovery and future-target logic

If the user does not appear qualified for a role, the system must first test whether the shortfall is due to **missing information** rather than a true lack of relevant experience.

### Gap-recovery rule
Before concluding that the role is beyond current readiness, the system should:
- identify the most important unsupported requirements
- ask the user whether they have relevant experience/evidence
- give enough context and explanation for them to answer effectively

### If the gaps remain after collection
The system should:
- recognize when the role is best treated as a Future Role Target
- suggest stepping-stone roles
- offer to remember the target
- explain what experience, scope, achievements, or credentials would likely make the user more competitive later

### Apply-anyway rule
If the user insists on applying anyway, the system should:
- support that choice
- remain honest
- remain encouraging
- help them make the strongest credible case possible

---

## 11. Career-path intelligence

DreamJob should not only assess:
- current candidacy fit

It should also assess:
- whether the role is beneath the user
- whether the role is a healthy growth move
- whether the role is a future target
- whether the role aligns with longer-term advancement

### Career-path rules
- The system should encourage growth.
- The system should not trap users into repeating the same level forever.
- The system should demonstrate awareness of real hiring dynamics.
- The system should help users aim upward when appropriate.

---

## 12. Workflow Stage 2

Workflow Stage 2 begins when the user proceeds from Stage 1.

Stage 2 is mostly intact in the current product.

### Stage 2 includes
- resume generation
- cover letter generation
- chat-supported revision
- analysis/evaluation of those materials

### Stage 2 revision rule
Changes to Stage 2 should mainly:
- preserve the currently working flow
- adapt to improvements enabled by Stage 1 revisions
- avoid unnecessary rebuilding

---

## 13. Cover letter rule

The cover letter must know what is in the **current resume**.

### Locked rule
The cover letter may only use claims supported by the current resume state.

### Implications
- If the resume changes, the cover letter’s allowed evidence set changes too.
- Accepted resume edits should update downstream cover-letter eligibility.
- The resume governs the candidate claims the cover letter is allowed to reference.

---

## 14. Workflow Stage 3

Workflow Stage 3 begins once the resume and cover letter have been analyzed and the user feels confident they have the best possible outputs.

### Current state
Stage 3 is partially created already because:
- interview pages exist
- negotiation pages exist
- both can generate files and chat

### Expansion status
Stage 3 is the area with the greatest amount of future creative expansion and new development.

---

## 15. Structured memory and manual intervention surfaces

DreamJob should be **chat-first**, but it should not hide trusted system memory inside the message stream only.

The UI should visibly balance:
- guided conversation
- structured stored data
- manual intervention/review

### Governing principle
Chat is the primary workflow surface.
Structured data pages and review surfaces are support layers for inspection, correction, and direct intervention.

### Trust and continuity rule
When data is collected in chat and approved by the user, the interface should visibly reinforce that:
- the system understood it
- it was approved
- it was stored
- it is now part of trusted reusable system memory

### Manual intervention rule
Users must be able to access stored workflow data directly for:
- review
- editing
- verification
- assessment

Manual data surfaces should support the workflow, not replace guided orchestration.

They should not become a second product hidden behind the chat.

---

## 16. Chat-to-memory UI behavior

When data is collected via chat and approved by the user, the UI should indicate that the approved data is moving from the conversation into trusted system memory.

### Animation rule
On mobile especially, the app should use a lightweight animation or state transition to indicate that approved data has been stored.

### Purpose
This animation is not decorative. It should:
- build trust
- show that approval has consequences
- reinforce that the system now knows something durable
- teach the product model visually

### Behavior constraints
- The effect should feel subtle, polished, and confidence-building
- It should not feel like arbitrary motion or a gimmick
- It should indicate approval and storage, not mysterious upload behavior

---

## 17. Workflow stage controls and progress UI

The workflow stages should be visible in the UI as a compact control/progress system.

These controls may live in the header and act as:
- progress indicators
- review access points
- manual intervention entrypoints
- visual state markers

### Stage control rules
- Stage controls should not feel like primary self-navigation that shifts workflow ownership to the user
- They should tell the user:
  - where they are
  - what is complete
  - what needs attention
  - what can be reviewed
- They should support inspection and intervention without undermining the system-led journey

### Dropdown / sheet rule
If stage controls open menus or detailed views:
- the content should be tightly structured
- the controls should show:
  - section names
  - completion state
  - items needing attention
  - quick jump targets into review surfaces
- they should avoid long, dense menus

---

## 18. Dedicated data pages / review pages

Each workflow stage may have dedicated data pages or review pages that store the approved data for that stage.

These pages should be designed for:
- direct intervention
- targeted review
- manual editing
- structured assessment

### Purpose
This is how DreamJob balances:
- chat guidance
- manual control
- inspectable memory
- confidence in the stored data

### Rules
- These pages should be lightweight and focused
- They should not become general-purpose admin pages
- They should remain subordinate to the guided workflow
- They should be easy to access from stage controls or structured UI affordances

---

## 19. Responsive UI behavior

DreamJob should adapt the relationship between chat and structured review based on screen size.

### Mobile
- chat should dominate
- stage progress should remain visible in the header
- tapping a stage control should open a sheet or compact review surface
- approved-data storage animation should reinforce movement into trusted memory
- manual intervention should remain available without cluttering the main conversation

### Desktop
- chat and structured review can live side by side
- a secondary review panel or drawer may be shown alongside chat
- stage controls should remain visible in the header for progress and manual workflow access
- the layout should support efficient review without turning into a dashboard-first product

---

## 20. Existing product implementation posture

This work is a **patch/update to an existing working product**.

It is not a rebuild.

### Patch rules
- Revise the repo only as much as necessary.
- Preserve working behavior unless revision is required by the new model.
- Reuse existing tools and functions wherever possible.
- UI changes should be minimal layout/interaction reformatting.
- Workflow changes should be minimal reformatting with better orchestration and validation.
- Backend schema changes should be controlled expansion/cleanup only where needed.

---

## 21. Chat architecture implementation rule

A single **user-facing guided chat experience** may still be backed by:
- multiple internal prompt executions
- stage-specific prompt contracts
- structured intermediate outputs

Do not assume that one giant shared AI thread is the best implementation.

---

## 22. Golden path to preserve during patching

The following flow must remain deploy-safe during patching until intentionally superseded:

- listing intake works
- listing review / analysis path works until superseded
- start application works
- resume page loads, generates, edits/saves, and chats
- cover letter page loads, generates, edits/saves, and chats
- interview page loads, generates, and chats
- negotiation page loads, generates, and chats
- workflow persists correctly
- app deploys cleanly after each pass

---

## 23. Safe transition strategy

Do not broadly clean out unused code before starting.

### Use three lanes
1. Preserve
2. Isolate
3. Replace in slices

### Transition rules
- Do not combine broad cleanup, schema deletion, workflow rewrite, and UI transition in one pass.
- Replace one source-of-truth area at a time.
- Verify deployability after each pass.
- Remove or supersede stale logic only after the replacement is live and verified.

---

## 24. Codex implementation posture

Use **Codex** for:
- repo discovery
- patch implementation
- PR-oriented change work
- incremental Vercel deploy/test loops

### Codex prompt rules
Prompts for Codex should be:
- patch-oriented
- repo-aware
- minimal-diff
- explicit about active vs legacy logic
- explicit about preserving working behavior
- PR-reviewable
- hostile to speculative redesign

---

## 25. Codex classification model

Codex should classify code using:

- `active-core`
- `active-but-transitional`
- `legacy-superseded`
- `future-expansion`
- `uncertain`

### Governing classification rule
Determine what is “current” primarily by:
- explicit product-intent alignment
- the declared golden path
- actual current flow relevance

Do not decide based mainly on:
- code age
- file names
- route names
- superficial usage signals

### When in doubt
Classify as `uncertain` and preserve it until the replacement is live and verified.

---

## 26. Source-of-truth and legacy handling rule

The coding agent should:
- identify active flow
- identify legacy/stale flow
- identify duplicate logic
- identify likely source-of-truth files
- avoid changing the wrong file while leaving the real source of truth untouched

Legacy logic should not be preserved just because it exists.
But it also should not be removed until a replacement is live, verified, and clearly authoritative.

---

## 27. Onboarding and profile memory rule

Profile-building should not be a detached prerequisite workflow beyond the truly required onboarding fields.

Reusable user information can be collected:
- through onboarding upload parse
- through Workflow Stage 1 conversation
- through later workflow interactions

### Memory rule
Approved reusable facts gathered anywhere in meaningful workflow should be eligible to become durable profile memory.

The goal is that:
- a user who fills out profile sections manually
- and a user who supplies information organically through workflow
should converge to the same durable end state.

---

## 28. Governing experience standard

DreamJob should feel like:
- one continuous guided accomplishment journey
- warm and inviting at entry
- highly capable and organized throughout
- efficient and respectful of the user’s energy
- expert enough to provide useful positioning and content guidance
- realistic, but encouraging
- comfortable and motivating to work with

The system should feel like it is carrying the user forward, not waiting for the user to drive it.
