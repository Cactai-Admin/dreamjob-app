# DreamJob Workflow Overhaul UI/UX Spec

## Purpose

This document defines the **target workflow architecture and UI/UX model** for DreamJob from first login through application support.

Its purpose is to lock the overhaul direction so future repo updates are guided by one coherent product model instead of isolated patches.

This document is a source-of-truth for:

- landing behavior
- continuity table behavior
- page structure
- navigation
- central chat behavior
- right context panel behavior
- phase sequence
- Archive vs Trash behavior
- where application support, interview, and negotiation fit

---

## 1. Core product rule

DreamJob should feel like:

- one guided system
- with one stable central chat experience
- one changing right context panel
- one continuity-driven navigation model
- one phase-aware application workflow

The product should **not** feel like:
- multiple disconnected tools
- multiple inconsistent chat systems
- dashboard cards that replace the workflow
- forms pretending to be chat

---

## 2. Stable layout model

## 2.1 Center
The **center** of the app is the shared chat shell.

This is the primary working surface for:
- onboarding
- listing intake
- listing analysis guidance
- resume/cover letter guidance
- application support
- interview assistance
- negotiation assistance

## 2.2 Right panel
The **right context panel** changes based on the current phase.

It is used for:
- structured review
- structured editing
- current artifact display
- current workflow object context

The right panel is not the primary workflow engine.
It supports the chat.

## 2.3 Left navigation / continuity area
The left side of the app is for:
- high-level app navigation
- continuity table access
- object-level navigation
- not chat-thread browsing

On desktop, this may appear as a persistent left column.
On mobile, it should become the Home/continuity page or slide-out navigation.

---

## 3. Landing behavior rules

## 3.1 First login
A first-time user should land **directly in chat**.

Why:
- DreamJob should greet them
- onboarding should begin naturally
- the system should establish the relationship and process
- this is the only time the product should default directly into chat

## 3.2 Later login with missing required profile information
If required foundational profile information is missing, the user should also land **directly in chat**.

Why:
- the system needs to collect missing required information
- chat should handle that naturally
- the product should not send the user to Home when it cannot yet guide them correctly

## 3.3 Later login with complete required profile information and at least one active item
The user should land on **Home**.

Home should show the **continuity table**.

This is the default returning-user experience.

## 3.4 Later login with complete required profile information and no active items
The user should also land on **Home**.

Home should show:
- an empty-state continuity table
- a clear **Start New** action
- optional secondary action such as **Find Jobs**

### Rule
Chat is the primary working surface.
Home is the primary continuity surface.

---

## 4. Page list

These are the actual top-level pages to use:

- **Home**
- **Listings**
- **Applications**
- **Career Advancement**
- **Documents**
- **Profile**
- **Settings**
- **Archive**
- **Trash**

### Rule
Do not use alternate top-level terminology like:
- Active Run
- Opportunities
- Results
- Future Targets

The page list above is canonical.

---

## 5. Home page

## 5.1 Purpose
Home is the continuity surface.

It should help the user:
- see what they have going on
- continue prior work
- start something new

It should **not** be a generic dashboard or analytics page.

## 5.2 Primary contents
Home should contain:

- continuity table
- filter and sort controls
- primary action: **Start New**
- optional secondary action: **Find Jobs**
- status/alert hints where relevant

## 5.3 Continuity table role
The continuity table is the primary way the user finds:
- active application work
- listing analysis work
- previously sent applications
- archived items

The user should **not** browse past work through:
- chat history
- continuity cards in the thread
- a sidebar full of chats

---

## 6. Continuity table design

## 6.1 Table purpose
The continuity table lists durable workflow objects the user can resume or review.

Each row should represent one item such as:
- a listing under analysis
- an application in preparation
- a resume/cover-letter analysis item
- a sent application
- an archived item

## 6.2 Row layout
Each row should include:

- company
- role title
- stage/state tag
- destination/category
- last active timestamp
- optional short next-action hint

## 6.3 Default ordering
Default sort:
- **last active descending**

## 6.4 Filters to use
Use this filter list:

- **All**
- **Listing Analysis**
- **Application Preparation**
- **Resume/Cover Letter Analysis**
- **Sent**
- **Archive**

Do **not** use:
- In Progress
- Listing Review
- Resume / Cover Letter
- Submitted
- Future Targets
- Paused / Discarded

## 6.5 Sorting
Support lightweight sorting such as:
- Last active
- Newest
- Company
- Role title

### Rule
Filters and sort should be simple and fast, not complex report tooling.

## 6.6 Row click behavior
Selecting a row should open the **correct phase view** for where the user left off.

Examples:
- Listing Analysis row → open listing-analysis phase
- Application Preparation row → open application-prep phase
- Resume/Cover Letter Analysis row → open document refinement phase
- Sent row → open application support phase
- Archive row → open archived item detail/workflow view

---

## 7. Page behavior by page

## 7.1 Home
Primary landing for returning users with complete required profile information.

Contains:
- continuity table
- filter/sort
- Start New
- optional job-finding entry point

## 7.2 Listings
Contains listings that are currently being analyzed, reviewed, or considered before becoming full application work.

This page should support:
- listing review objects
- listing analysis state
- resume-to-application conversion triggers

## 7.3 Applications
Contains:
- active application preparation
- sent applications
- application support state

This is where post-send tracking and support belong.

## 7.4 Career Advancement
Contains:
- advancement targets
- unlock guidance
- better nearby opportunity guidance
- upward mobility suggestions
- long-term target paths

Future-target logic belongs here, not as a top-level nav label called “Future Targets.”

## 7.5 Documents
Contains:
- resumes
- cover letters
- related document artifacts
- exported/downloadable artifacts

Documents are artifact-focused, not application-tracking focused.

## 7.6 Profile
Contains:
- reusable user facts
- approved profile information
- preferences
- public links
- future-facing reusable profile context

## 7.7 Settings
Contains:
- account settings
- product preferences
- system-level settings

## 7.8 Archive
Contains items retained but no longer active.

Archive is for:
- dormant but useful items
- things worth keeping for reference or comparison
- inactive items not meant to clutter active workflow

## 7.9 Trash
Contains discarded items only.

Trash is for:
- items the user intends to remove from normal use
- short retention before permanent deletion if applicable

---

## 8. Archive vs Trash rules

## 8.1 Archive
An item may be archived at any stage after a listing is added to the system.

Archive means:
- keep for reference
- remove from active workflow views
- retain compact historical/intelligence value

## 8.2 Trash
An item may also be moved to Trash at any stage after a listing is added.

Trash means:
- remove from normal use
- retain only for restore/deletion policy window
- treat as discarded

## 8.3 Expired listing source rule
Listings in:
- Listings
- Applications
- Archive

may be checked daily to determine whether the source page still loads.

If the listing is no longer available:
- flag the item
- notify the user
- if the listing is in Archive, move it to Trash/Delete within 30 days according to the agreed rule

### Important rule
Applied or materially used listings may still retain compact structured records even if the source URL dies.

---

## 9. Central chat shell role

The central chat shell is the primary working surface once the user starts or resumes work.

The chat should:
- greet the user
- guide onboarding when needed
- guide listing intake
- guide listing analysis
- guide application preparation
- guide document refinement
- guide post-submission support

### Rule
The chat should not be the primary archive browser.
That is Home/continuity table territory.

---

## 10. Right context panel progression

The right panel should change in this order as the workflow progresses.

## 10.1 Onboarding / profile memory context
When the user is first onboarding or filling missing required information, the panel shows:
- known profile data
- missing required fields
- optional public links
- current reusable memory state

## 10.2 Listing extracted information
After a listing is submitted and parsed, the panel shows:
- extracted listing information
- editable extracted fields
- missing/uncertain listing fields

This is the **Listing Review** step.

The user can:
- edit
- add
- remove
- refine
the listing information here.

## 10.3 Applicable user profile data for the listing
Before resume generation, the panel switches to:
- the user profile data the system plans to use
- role-relevant user data
- fields that are strong enough as-is
- fields that need refinement
- placeholder areas that need replacement

The chat helps the user:
- refine
- tailor
- fill gaps
before resume generation.

## 10.4 Resume
After the user explicitly chooses to create an application, the panel switches to:
- resume view/editor
- structured sections
- current generation state
- version state

The first generated resume may include:
- real user data where available
- placeholders/scaffolded content where missing
- target structure the user should emulate truthfully

The chat helps the user complete/refine it.

## 10.5 Cover letter
After the resume reaches acceptable quality, the panel switches to:
- cover letter view/editor
- current generation state
- version state

The chat helps refine it.

## 10.6 Download / export state
After both documents are ready, the panel shows:
- export-ready state
- download actions
- send / mark as applied actions if applicable

## 10.7 Application support
After send/export, the panel switches to application support state:
- application status
- follow-up timing
- reminders
- supporting action suggestions
- outreach suggestions
- visibility/support tasks

## 10.8 Interview assistance
If the application progresses, the panel switches to:
- interview prep artifact(s)
- role/company question prep
- notes
- strategy support

## 10.9 Negotiation assistance
If the opportunity progresses to that phase, the panel switches to:
- negotiation guidance
- compensation notes
- response strategies
- negotiation-specific structured support

---

## 11. Workflow phase sequence

The correct phase sequence is:

### Phase 0
**Onboarding / Profile Context**

### Phase 1
**Listing Intake**

### Phase 2
**Listing Analysis + Listing Review/Edit**

### Phase 3
**Applicable User Profile Data Review**

### Phase 4
**Resume Generation + Guided Completion**

### Phase 5
**Cover Letter Generation + Guided Completion**

### Phase 6
**Download / Export / Send**

### Phase 7
**Application Support**

### Phase 8
**Interview Assistance**

### Phase 9
**Negotiation Assistance**

### Important rule
The system should not auto-skip Phase 2 or Phase 3 just because a listing was parsed.
The user should explicitly review and then choose to proceed.

---

## 12. New user workflow

## 12.1 First login
User lands directly in chat.

## 12.2 Onboarding in chat
The system gathers only minimum required onboarding/profile information.

## 12.3 Move into listing intake
Once enough information exists, the system asks for:
- a listing URL
- listing text
- or offers to help find jobs

## 12.4 Listing parse and review
The listing is parsed and the right panel shows extracted information for editing and correction.

## 12.5 User returns focus to chat and says they want to create an application
This explicit user intent triggers the application creation sequence.

## 12.6 Applicable profile data review
The right panel now shows the user profile data being used for the application.

## 12.7 Resume generation + guided completion
Chat guides completion while the resume is shown in the panel.

## 12.8 Cover letter generation + guided completion
Chat guides completion while the cover letter is shown in the panel.

## 12.9 Download/export/send
The user downloads or sends when ready.

## 12.10 Application support onward
The run moves into application support, then possibly interview and negotiation support.

---

## 13. Returning user workflow states

## 13.1 Missing required profile info
Land directly in chat.

## 13.2 Complete profile info + at least one active item
Land on Home continuity table.

## 13.3 Complete profile info + no active items
Land on Home continuity table with empty-state guidance.

## 13.4 Reopen a prior item
Open the correct phase view for where the user left off.

## 13.5 Active run exists
Home should make continuing it obvious.
Selecting it should reopen the correct working view.

---

## 14. “Start New” behavior

When the user chooses **Start New** from Home:
- they are taken into the central chat
- the system starts listing intake mode
- the right panel is ready to become the listing review surface after parsing

---

## 15. “Find Jobs” behavior

If the user asks DreamJob to find jobs:
- the conversation remains in the central chat
- the assistant gathers criteria conversationally
- 3 opportunities are surfaced as a first test of understanding

The continuity table is not the search surface.
Chat is.

---

## 16. Mobile behavior

On mobile:
- Home should show the continuity table directly
- chat should remain the primary working surface once the user enters a workflow
- left navigation should not behave like a desktop sidebar compressed into mobile
- right context panel should become drawers, sheets, or stacked contextual sections

### Rule
Mobile should feel native and focused.

---

## 17. Desktop behavior

On desktop:
- left side supports navigation and continuity access
- center is the chat
- right side is the current context/artifact panel

### Rule
Desktop adds visibility, not a new workflow model.

---

## 18. Chat vs continuity rule

This distinction is critical.

### Home / continuity table is for:
- finding what exists
- resuming prior work
- reviewing prior items
- starting new work

### Chat is for:
- doing the work
- being guided
- making progress inside a workflow
- refining the current active artifact/context

### Rule
Do not make chat the archive browser.
Do not make Home the work surface.

---

## 19. Failure conditions

DreamJob fails this overhaul spec if:

- returning users are still dropped into the wrong surface by default
- continuity is still hidden behind chat or cards
- the user cannot clearly find/resume prior items
- onboarding remains dominant modal-first UX
- the right context panel does not change cleanly by phase
- resume/cover-letter work still uses a sidebar chat pattern instead of central chat
- Archive and Trash are not clearly distinct
- phase progression is still ambiguous or automatic in the wrong places

---

## 20. Immediate implementation implication

Future repo updates should follow this order:

1. continuity, landing, and navigation implementation
2. right context panel phase switching implementation
3. Phase 2 listing review/edit implementation refinement
4. Phase 3 applicable profile data review implementation
5. resume / cover letter central-chat migration completion
6. application support integration
7. interview and negotiation support alignment

---

## 21. Relationship to other source-of-truth docs

This workflow overhaul UI/UX spec should work together with:

- locked rules document
- onboarding field decision matrix
- Stage 1 chat interaction spec
- Stage 1 data and decision matrix
- opportunity intelligence and advancement guidance spec
- memory architecture spec
- shared chat shell spec
- chat thread and action model

Those docs define:
- what the system should know
- what it should ask
- what it should decide
- how chat should behave

This document defines:
- **how the overall workflow and UI should be organized end-to-end**
