# DreamJob Chat Thread and Action Model

## Purpose

This document defines the **chat thread model** and the **in-thread action model** for DreamJob.

Its purpose is to specify how the shared chat shell should behave at the message and interaction level so the product feels like:

- one stable conversational system
- with structured review, approval, and next-step actions
- without devolving into fake chat or detached form workflows

This document is a source-of-truth for:
- message types
- thread structure
- in-thread action patterns
- review/approval interactions
- next-step actions
- stage-specific conversational actions
- future repo updates

---

## 1. Core principle

DreamJob should not treat the thread as:
- plain text only
- decorative chat bubbles
- or a form wrapper

The thread must support:
- normal conversational turns
- structured review bundles
- approval requests
- validation moments
- next-step choices
- stage-specific action cards

### Rule
The thread is both:
- a conversation surface
- and a guided action surface

---

## 2. What the thread model must support

The thread must support:

- assistant narrative messages
- user natural-language replies
- structured review cards
- approval/rejection controls
- targeted collection prompts
- validation cards
- positioning result cards
- next-step action cards
- system progress/status messages
- future-target save actions
- proceed/start-over actions
- optional comparison / better-opportunity suggestions
- unlock guidance actions

---

## 3. Message categories

DreamJob should support these canonical message categories.

## 3.1 Assistant narrative message
Natural-language assistant turn used to:
- greet
- explain
- orient
- guide
- summarize
- clarify
- recommend

### Example purposes
- onboarding greeting
- Stage 1 orientation
- explanation of what happens next
- explanation of positioning outcome

---

## 3.2 User reply message
Natural-language response from the user.

### Example purposes
- answering a targeted question
- submitting a URL
- giving pasted listing text
- confirming or correcting understanding
- asking for help finding jobs
- choosing a next direction

---

## 3.3 System progress message
Non-decorative status turn showing that work is happening.

### Example purposes
- parsing listing
- checking profile context
- comparing to prior opportunities
- saving approved facts
- preparing review bundle

### Rule
Progress messages should feel useful and real, not fake theatrical loading copy.

---

## 3.4 Review bundle card
A grouped, structured summary of what the system currently believes.

### Used for
- listing understanding bundle
- user-in-context bundle
- grouped issue/review bundles in later stages

### Required features
- concise grouped content
- clear distinction between:
  - known/trusted
  - inferred/likely
  - unknown/missing
- actions to:
  - approve
  - correct
  - discuss
  - review further

---

## 3.5 Collection prompt card
A targeted ask for one missing item or one connected set.

### Used for
- Stage 1 gap clarification
- evidence requests
- missing required context
- unlock guidance follow-ups

### Required features
- clear missing item
- why it matters
- brief example of useful response
- one focused response expectation

---

## 3.6 Validation card
A final review of the trusted working set before a consequential step.

### Used for
- Stage 1 pre-positioning validation
- later material review checkpoints if needed

### Required features
- concise trusted working set
- clear sense of what is ready
- actions to:
  - approve
  - correct
  - discuss remaining issue

---

## 3.7 Positioning result card
A structured message showing:
- the positioning outcome
- why it was chosen
- the best next move

### Required outcomes
- Overqualified
- Strong Fit
- Healthy Stretch
- Big Stretch
- Future Role Target

### Required features
- result label
- reason summary
- next-step choices

---

## 3.8 Action card
A structured in-thread action surface.

### Used for
- proceed to Stage 2
- save as Future Role Target
- start over
- compare nearby opportunities
- unlock-first guidance actions
- review/edit accepted data

### Rule
Actions should appear naturally inside the thread, not as detached page controls.

---

## 3.9 Comparison insight card
A structured card for nearby-opportunity comparison.

### Used for
- duplicate awareness
- already-applied awareness
- better nearby role suggestions
- compensation/benefit/requirements comparison

### Required features
- concise comparison claim
- why the comparison matters
- what the recommended action is

---

## 3.10 Unlock guidance card
A structured recommendation for a small realistic action that improves viability.

### Used for
- certification suggestions
- training suggestions
- portfolio/project suggestions
- stepping-stone role suggestions

### Required features
- unlock category
- why it matters
- what it unlocks
- next-step choice or save behavior

---

## 4. Thread grammar rules

The thread should have a recognizable grammar:

1. assistant explains or asks
2. user responds or chooses
3. system acknowledges and advances
4. structured review/action appears when needed
5. assistant interprets the result and moves forward

### Rule
The user should never feel like the thread is randomly switching between:
- normal chat
- forms
- hidden workflow steps
- disconnected panels

---

## 5. Action model principles

## 5.1 Actions must be in-thread
Major workflow choices should appear in the thread itself.

## 5.2 Actions must be meaningful
Buttons and choices should trigger real product state, not decorative placeholders.

## 5.3 Actions must be stage-aware
Only show actions appropriate to the current stage and state.

## 5.4 Actions must preserve continuity
Choosing an action should feel like continuing the conversation, not leaving it.

---

## 6. Canonical action types

DreamJob should support these canonical action types.

### 6.1 Approve
Confirms a bundle/card as good enough to proceed.

### 6.2 Correct
Signals that something needs fixing.

### 6.3 Discuss further
Keeps the issue conversational instead of forcing binary approval.

### 6.4 Submit input
Sends a focused user response or artifact.

### 6.5 Proceed
Moves to the next stage or next major step.

### 6.6 Save target
Saves an opportunity as Future Role Target.

### 6.7 Start over
Exits the current opportunity path and returns to new-opportunity mode.

### 6.8 Compare opportunities
Views or accepts a better nearby opportunity recommendation.

### 6.9 Unlock-first
Commits to a small unlock action path before applying.

### 6.10 Edit reviewed data
Opens the appropriate structured review/edit surface without abandoning the thread.

---

## 7. Thread state model

The thread should be able to represent:

- idle / ready
- assistant thinking / system processing
- awaiting user reply
- awaiting user approval
- awaiting user action choice
- completed step
- blocked on missing critical info
- redirected to another stage or run context

### Rule
Thread state should drive what action cards appear next.

---

## 8. Stage-specific thread behavior

## 8.1 Onboarding
The thread should support:
- greeting
- lightweight identity/contact collection
- known-data acknowledgment
- optional public-links step
- preference confirmation
- compact onboarding completion summary

### Rule
Not a detached form.
Not static copy above inputs.

---

## 8.2 Stage 1
The thread should support:
- URL or pasted text intake
- parsing/orientation message
- listing understanding bundle
- user-in-context bundle
- targeted collection prompts
- validation card
- positioning result
- next-step branching

---

## 8.3 Stage 2
The thread should support:
- document generation acknowledgment
- one-improvement-at-a-time suggestions
- clarification turns
- consistency warnings
- approve/revise actions

---

## 8.4 Stage 3
The thread should support:
- support guidance
- follow-up messaging help
- interview/negotiation clarification
- reminders and recommended actions
- support-stage branching

---

## 9. Review bundle behavior rules

Review bundles should be:
- concise
- grouped
- easy to scan
- easy to approve or challenge

### Review actions should include
- Looks right
- Change this
- Tell me more
- Let’s review this part

### Rule
Do not force the user into a full freeform correction flow when a lightweight action would be clearer.

---

## 10. Collection behavior rules

Collection prompts should:
- request one missing item at a time by default
- explain why the item matters
- give a brief example where useful
- avoid broad multi-question dumps

### Exception
Use a connected set only when one grouped response is clearly more efficient.

---

## 11. Validation behavior rules

Validation should happen before:
- positioning finalization
- downstream generation when the trusted working set matters

### Validation actions should include
- Looks good
- I need to change something
- Talk me through this part

### Rule
Validation must feel like a meaningful checkpoint, not a perfunctory confirmation box.

---

## 12. Positioning result behavior rules

Positioning results should:
- feel like a real outcome
- explain the reasoning
- connect directly to next steps

### Required next-step actions
At minimum:
- Continue with this opportunity
- Save as future target
- Start over

### Optional next-step actions
When supported:
- Show me better nearby roles
- Show me the smallest unlock action first

---

## 13. Opportunity intelligence action rules

When the system has opportunity-intelligence output, the thread may show:

- duplicate/prior-application warning card
- better nearby opportunity card
- unlock-first guidance card

### Rule
These should appear as part of the normal thread flow, not as disconnected side recommendations.

---

## 14. Transcript and action persistence

The thread should persist:
- narrative turns
- user replies
- card appearances
- approvals
- chosen next-step actions

### Important rule
Not every thread item becomes global trusted memory.
But all meaningful thread actions should be durable enough to reconstruct workflow state.

---

## 15. Mobile thread behavior

On mobile:
- action cards should be compact
- review cards should be easy to scan
- action buttons should not overwhelm the thread
- the next step should always be obvious

### Rule
Mobile should still feel like one stable conversation, not a stack of mini forms.

---

## 16. Desktop thread behavior

On desktop:
- thread remains central
- cards may be richer
- side surfaces may exist
- actions may be more visible

### Rule
More space should improve clarity, not turn the thread into a dashboard wrapper.

---

## 17. Error and fallback behavior

The thread should support graceful fallback when:
- a parse fails
- a fetch fails
- a required action cannot complete
- a card action errors

### Required behavior
- explain what happened
- explain what the user can do next
- keep continuity in the thread
- do not eject the user into a dead end

---

## 18. Anti-patterns to avoid

DreamJob fails this thread/action model if it:
- uses decorative chat bubbles above a normal form
- keeps major actions outside the thread as the real primary controls
- makes approvals/discussions feel disconnected from the conversation
- uses buttons that do not trigger real state changes
- uses cards as ornamental summaries instead of interaction surfaces
- forces the user to mentally bridge multiple disconnected systems

---

## 19. Immediate implementation implications

The next repo work after the shared shell should support:

1. canonical message types
2. canonical action types
3. in-thread review bundles
4. in-thread validation cards
5. in-thread positioning results
6. in-thread next-step actions
7. opportunity comparison and unlock cards
8. persistence of thread actions separately from trusted memory promotion

---

## 20. Relationship to other source-of-truth docs

This chat thread and action model should work together with:

- shared chat shell spec
- memory architecture spec
- Stage 1 chat interaction spec
- Stage 1 data and decision matrix
- onboarding field decision matrix
- opportunity intelligence and advancement guidance spec

Those docs define:
- what the system should know
- what the system should ask
- what the system should decide
- what the shell should be

This document defines:
- **how those things appear and behave inside the thread**
