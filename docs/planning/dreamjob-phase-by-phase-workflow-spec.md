# DreamJob Phase-by-Phase Workflow Spec

## Purpose

This document defines the DreamJob workflow phase by phase.

Its purpose is to make the end-to-end workflow implementation-ready by specifying, for each phase:

- entry condition
- chat behavior
- right context panel behavior
- user actions
- system actions
- exit condition
- persistence requirements

This document is a source-of-truth for:
- workflow orchestration
- phase transitions
- central chat behavior by phase
- right context panel switching
- state persistence
- future Codex overhaul prompts

---

## 1. Core workflow rule

DreamJob should feel like one guided system moving through clearly defined phases.

The user should not feel like they are being dropped into disconnected pages or tools.

Across all phases:
- the **chat** remains the primary working surface
- the **right context panel** changes to show the current structured artifact/context
- the **system** leads the process
- the **user** responds, reviews, edits, approves, and chooses next steps

---

## 2. Workflow phase list

The canonical phase sequence is:

- **Phase 0 — Onboarding / Profile Context**
- **Phase 1 — Listing Intake**
- **Phase 2 — Listing Analysis + Listing Review/Edit**
- **Phase 3 — Applicable User Profile Data Review**
- **Phase 4 — Resume Generation + Guided Completion**
- **Phase 5 — Cover Letter Generation + Guided Completion**
- **Phase 6 — Download / Export / Send**
- **Phase 7 — Application Support**
- **Phase 8 — Interview Assistance**
- **Phase 9 — Negotiation Assistance**

---

# Phase 0 — Onboarding / Profile Context

## Entry condition
Enter this phase when:
- user is logging in for the first time
- or required foundational profile data is missing

## Chat behavior
The chat should:
- greet the user naturally
- explain briefly that DreamJob wants to get to know a little about them
- explain the process in plain language
- collect only the locked onboarding field universe
- acknowledge what is already known
- ask only what is missing or unconfirmed
- avoid broad profile-building

## Right context panel behavior
Show:
- known identity/contact data
- missing required fields
- optional public links
- reusable memory state
- confirmation/progress state for onboarding completion

## User actions
The user can:
- answer onboarding questions
- confirm known data
- edit incorrect data
- skip optional public-link items if allowed
- continue once required information is complete

## System actions
The system should:
- prefill known approved data
- separate known / missing / optional
- store required foundational data
- store inclusion preferences
- update global account memory appropriately

## Exit condition
Exit this phase when:
- all required onboarding/profile-context fields are present and confirmed

## Persistence
Persist:
- required onboarding fields
- inclusion preferences
- optional public links if provided and approved
- onboarding completion state
- promoted trusted reusable facts

---

# Phase 1 — Listing Intake

## Entry condition
Enter this phase when:
- onboarding/profile-context requirements are satisfied
- user chooses Start New
- or user resumes a run at listing intake

## Chat behavior
The chat should:
- invite a job listing URL
- or invite pasted listing text
- or support “find me jobs” as a conversational path
- acknowledge intake naturally
- avoid asking unrelated questions before the listing is captured

## Right context panel behavior
Initially:
- neutral opportunity-ready state
- no dominant artifact yet

After listing intake begins:
- loading/progress context for parsing
- pending transition to listing review panel

## User actions
The user can:
- paste a URL
- paste listing text
- ask DreamJob to find jobs
- refine job-search criteria conversationally if using the search path

## System actions
The system should:
- parse listing input
- create the initial listing record
- begin opportunity-history checks
- prepare the right panel for extracted listing information
- if using job-finding path, gather criteria and surface 3 listings as a first test of understanding

## Exit condition
Exit this phase when:
- a listing has been successfully parsed and is ready for review in the right panel

## Persistence
Persist:
- raw listing input
- parsed listing structure
- opportunity identity metadata
- opportunity-history relationship checks
- initial transcript and phase state

---

# Phase 2 — Listing Analysis + Listing Review/Edit

## Entry condition
Enter this phase when:
- listing parse is complete
- extracted listing information is available

## Chat behavior
The chat should:
- explain that the listing data has been extracted into the right panel
- guide the user to review, correct, or add information
- help resolve ambiguities in the listing
- answer questions about what the listing means
- support discussion of obvious strengths/weaknesses of the opportunity

The chat should not yet jump into resume generation.

## Right context panel behavior
Show the **Listing Review** surface with editable extracted listing information:
- title
- company
- location / work mode
- compensation
- benefits
- responsibilities
- requirements
- qualifications
- tools / technologies
- certifications
- company website / LinkedIn
- missing/uncertain fields

The user must be able to:
- edit
- add
- remove
- refine

## User actions
The user can:
- edit the extracted listing data
- add missing information
- remove incorrect information
- ask the chat for help interpreting the listing
- tell the system they want to create an application when ready

## System actions
The system should:
- maintain the structured listing record
- update listing analysis state as fields are confirmed
- use opportunity-history memory to identify duplicates / previously seen items when supported
- prepare the listing understanding bundle
- surface notable opportunity-quality insight where available

## Exit condition
Exit this phase when:
- the user indicates the listing is accurate enough
- and explicitly chooses to proceed with application creation

## Persistence
Persist:
- corrected/validated listing fields
- listing understanding summary
- review/edit history
- transcript of listing analysis discussion
- updated opportunity-history metadata

---

# Phase 3 — Applicable User Profile Data Review

## Entry condition
Enter this phase when:
- the user has chosen to create an application
- and the validated listing context exists

## Chat behavior
The chat should:
- explain that DreamJob is now showing the user information it plans to use
- identify what looks strong
- identify what needs tailoring to the listing
- identify what is thin, missing, or placeholder-worthy
- help the user refine or fill gaps before resume generation

This is the trust bridge between listing review and resume generation.

## Right context panel behavior
Show the **Applicable Profile Data** surface:
- user facts the system plans to use
- role-relevant profile data
- strengths as currently represented
- fields needing tailoring
- fields that are missing or weak
- placeholder/scaffold indicators where appropriate

## User actions
The user can:
- edit profile-alignment information
- add missing relevant user details
- tailor facts to the listing
- confirm what should be used
- ask the chat for help strengthening weak sections

## System actions
The system should:
- gather relevant approved user data
- distinguish:
  - strong enough as-is
  - needs tailoring
  - missing/weak
- prepare the application-specific user context package
- decide where placeholders/scaffolded structure will be necessary

## Exit condition
Exit this phase when:
- the user confirms the applicable profile data is ready enough for resume generation

## Persistence
Persist:
- run-specific applicable profile data set
- tailored user-context selections for this listing
- weak/missing flags
- transcript of clarification and refinement
- promoted reusable facts only if intentionally approved

---

# Phase 4 — Resume Generation + Guided Completion

## Entry condition
Enter this phase when:
- the listing is validated enough
- applicable user profile data is ready enough
- the user has chosen to proceed

## Chat behavior
The chat should:
- explain that it is generating the resume
- describe how the draft is structured
- clarify that some areas may use placeholders/scaffolded patterns if user information is missing
- guide the user one improvement at a time
- help replace placeholder language with authentic information
- request evidence or clarification only when needed

## Right context panel behavior
Show the **Resume** surface:
- preformatted resume draft
- editable sections
- placeholder/scaffolded sections where needed
- version state
- approval state

## User actions
The user can:
- edit resume sections directly
- ask the chat for help improving specific sections
- replace placeholder content
- approve or continue refining

## System actions
The system should:
- generate the resume draft using:
  - validated listing context
  - applicable user profile data
  - approved memory
- track sections that are:
  - strong
  - weak
  - placeholder-based
  - approved
- guide the user through refinement

## Exit condition
Exit this phase when:
- the resume is strong enough to support cover letter generation

## Persistence
Persist:
- current resume version
- approved resume sections
- unresolved weak points
- placeholder replacement progress
- run transcript and artifact history

---

# Phase 5 — Cover Letter Generation + Guided Completion

## Entry condition
Enter this phase when:
- the resume is strong enough
- the user chooses to proceed

## Chat behavior
The chat should:
- explain that it is generating the cover letter
- ensure the letter reflects the resume and validated listing context
- help improve specificity, tone, and relevance
- guide refinement one issue at a time

## Right context panel behavior
Show the **Cover Letter** surface:
- cover letter draft
- editable sections
- version state
- approval state

The panel may support tabs or switching between resume and cover letter.

## User actions
The user can:
- edit the cover letter
- ask for help improving specific parts
- compare it with the resume
- approve or continue refining

## System actions
The system should:
- generate the cover letter using:
  - validated listing context
  - current resume content
  - approved run context
- track weak sections, revisions, and approval state

## Exit condition
Exit this phase when:
- the cover letter is strong enough
- and the user is ready to export/send

## Persistence
Persist:
- current cover letter version
- approval state
- revision history
- run transcript and artifact history

---

# Phase 6 — Download / Export / Send

## Entry condition
Enter this phase when:
- the resume and cover letter are ready enough

## Chat behavior
The chat should:
- explain that the documents are ready
- offer download/export/send next steps
- explain what happens after sending
- prepare the user for application support if applicable

## Right context panel behavior
Show the **Export / Send** surface:
- export-ready status
- download actions
- send / mark as applied actions
- document-ready indicators

## User actions
The user can:
- download the resume
- download the cover letter
- mark the application as sent
- continue refining instead of sending

## System actions
The system should:
- generate export artifacts
- record export/send state
- transition the run into application support after send/mark as applied

## Exit condition
Exit this phase when:
- the user downloads or sends/marks as applied
- or chooses to move into application support

## Persistence
Persist:
- exported artifacts
- export timestamps
- sent/applied status
- run phase transition
- transcript of final pre-send actions

---

# Phase 7 — Application Support

## Entry condition
Enter this phase when:
- the application has been sent
- or the user marks it as applied

## Chat behavior
The chat should:
- shift into post-submission support
- explain next recommended actions
- support follow-up guidance
- support outreach / networking guidance
- support visibility-improvement actions
- help the user track progress

## Right context panel behavior
Show the **Application Support** surface:
- application status
- date sent
- follow-up due
- reminders
- supporting action suggestions
- outreach suggestions
- current status notes

## User actions
The user can:
- update status
- ask for follow-up help
- ask for outreach support
- move into interview prep if the process advances
- archive or trash the item if appropriate

## System actions
The system should:
- track application-support state
- prompt follow-up where appropriate
- surface reminders and status guidance
- maintain continuity into interview/negotiation phases if reached

## Exit condition
Exit this phase when:
- the user moves into interview assistance
- moves into negotiation assistance
- archives the item
- or the application is closed out

## Persistence
Persist:
- sent status
- support history
- follow-up timing
- reminders/status changes
- transcript of post-submission support

---

# Phase 8 — Interview Assistance

## Entry condition
Enter this phase when:
- the user indicates interview progression
- or the system/application status reflects interview stage

## Chat behavior
The chat should:
- help prepare the user for interviews
- support question preparation
- support company/role-specific preparation
- support answer refinement and strategy

## Right context panel behavior
Show the **Interview Assistance** surface:
- interview prep notes
- question sets
- company/role preparation artifacts
- readiness/support structure

## User actions
The user can:
- ask for prep help
- rehearse answers
- refine talking points
- track interview-related notes

## System actions
The system should:
- use validated listing/run context
- use the sent application artifacts
- tailor prep support to the role/company

## Exit condition
Exit this phase when:
- interview support is complete
- the run moves to negotiation
- or the process closes

## Persistence
Persist:
- interview prep notes
- tailored prep artifacts
- transcript history
- status transitions

---

# Phase 9 — Negotiation Assistance

## Entry condition
Enter this phase when:
- the user indicates negotiation stage
- or the process advances to offer/negotiation context

## Chat behavior
The chat should:
- support negotiation planning
- support response strategy
- support compensation discussion framing
- support decision-making around offer terms

## Right context panel behavior
Show the **Negotiation Assistance** surface:
- offer/compensation notes
- negotiation strategy structure
- current negotiation state
- response planning artifacts

## User actions
The user can:
- ask for negotiation help
- compare options
- refine response language
- track negotiation notes

## System actions
The system should:
- tailor negotiation guidance to the role/run context
- maintain continuity from earlier phases
- help the user weigh and respond strategically

## Exit condition
Exit this phase when:
- negotiation is completed
- the run is closed
- or the user archives/trashes the item

## Persistence
Persist:
- negotiation notes
- strategy artifacts
- status outcomes
- transcript history

---

## 3. Cross-phase rules

## 3.1 Explicit progression rule
The system should not skip major phases automatically when user review or confirmation is needed.

## 3.2 Chat continuity rule
The chat remains the primary guide throughout every phase.

## 3.3 Right panel switching rule
The right panel must always reflect the current structured artifact/context for the phase.

## 3.4 Persistence rule
Each phase must persist enough state so the user can leave and return to the correct point.

## 3.5 Archive / Trash rule
Items may be archived or trashed from any stage after listing addition.

---

## 4. Reentry rule

If the user returns later, the system should reopen the correct phase based on saved state:
- chat resumes in the correct workflow context
- right panel restores the correct artifact/context
- the user does not restart from the beginning unnecessarily

---

## 5. Failure conditions

DreamJob fails this workflow spec if:
- phases blur together without clear state transitions
- the right panel does not switch cleanly by phase
- resume generation happens before listing review and applicable profile review are complete
- post-send support is missing or folded incorrectly into other phases
- interview/negotiation do not inherit the run context
- the user cannot resume the correct phase later

---

## 6. Immediate implementation implication

Future repo updates should use this spec to:
- wire phase transitions
- restore correct reentry behavior
- align right panel switching
- support explicit user progression between phases
- complete the overhaul of resume/cover-letter and support workflows into the central chat system

---

## 7. Relationship to other source-of-truth docs

This phase-by-phase workflow spec should work together with:

- workflow overhaul UI/UX spec
- continuity, navigation, and landing spec
- shared chat shell spec
- chat thread and action model
- memory architecture spec
- Stage 1 interaction and decision specs
- opportunity intelligence and advancement guidance spec

Those documents define:
- the navigation and shell model
- the memory model
- the analysis and guidance logic

This document defines:
- **how each phase behaves operationally**
