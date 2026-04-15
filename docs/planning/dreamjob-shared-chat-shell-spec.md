# DreamJob Shared Chat Shell Spec

## Purpose

This document defines the **shared chat shell** for DreamJob.

Its purpose is to make the central conversational surface of the product stable, consistent, and reusable across:

- first-use entry
- global landing
- onboarding
- Stage 1 analysis
- Stage 2 document work
- Stage 3 support

DreamJob should not have multiple disconnected “kinds” of chat.
It should have **one canonical chat shell** with stage-specific behavior, scoped memory, and attached structured UI elements.

This document is a source-of-truth for:
- chat UI architecture
- thread continuity design
- stage-to-stage interaction consistency
- message rendering expectations
- chat-adjacent review/action surfaces
- future repo updates

---

## 1. Core principle

DreamJob should present the user with **one fixed, central, continuous chat surface**.

The user should feel:
- the conversation is stable
- the assistant is continuous
- the product remembers them
- the process is moving forward in one place
- surrounding UI changes support the chat, not replace it

### Important rule
One stable chat shell does **not** mean one giant undifferentiated memory blob.

The shell stays visually stable.
The active prompt logic, scoped memory, and attached structured UI may change by workflow context.

---

## 2. What the shared chat shell is

The shared chat shell is the product’s canonical interaction surface.

It is responsible for:
- rendering assistant turns
- rendering user turns
- accepting user input
- showing loading/progress states
- presenting in-thread structured review cards
- presenting action buttons / next-step choices
- preserving thread continuity
- attaching the current stage’s reasoning and action model

It should be used as the base for:
- first-use greeting
- onboarding conversation
- Stage 1 opportunity analysis
- Stage 2 document guidance
- Stage 3 support guidance

---

## 3. What the shared chat shell is not

The shared chat shell is not:
- static conversational copy above a form
- a wizard disguised as chat
- multiple different chat implementations per page
- a blank thread with no system initiative
- a dashboard card pretending to be a conversation

### Anti-pattern rule
DreamJob must not rely on “chat-styled form submission” as a substitute for a real conversational interaction model.

---

## 4. User experience goal

The shell should make the user feel:

- welcomed
- oriented
- guided
- understood
- continuously supported
- comfortable returning to the same place

The product should feel like:
- one stable conversational home
- with different types of work happening inside it

---

## 5. Chat shell invariants

These should remain stable across stages.

## 5.1 Stable layout center
The chat thread should remain the primary center of gravity.

## 5.2 Stable message grammar
Users should recognize the same basic message system everywhere:
- assistant messages
- user replies
- structured cards/actions in-thread
- loading/progress indicators
- approvals/review steps
- next-step actions

## 5.3 Stable input location
The user should always know where to type or respond.

## 5.4 Stable assistant identity
DreamJob should feel like one continuous assistant, not multiple tools wearing the same skin.

## 5.5 Stable thread continuity
The user should feel that the thread persists and matters, even when internal stage logic changes.

---

## 6. What changes around the shell

While the shell remains stable, these may change by stage:

- system prompt
- stage contract
- scoped memory
- structured review cards
- attached context panels
- allowed actions
- next-step options
- visible side surfaces
- stage-specific metadata shown near the thread

### Rule
The shell remains the center.
The surrounding UI adapts to support the current work.

---

## 7. Shell and memory scope relationship

The shell must be able to operate inside different memory scopes without changing its core UX.

### Supported scope modes
- global/account scope
- opportunity-history lookup scope
- application/run scope
- support-stage scope

### Rule
The shell remains visually stable while the active memory scope changes behind the scenes.

This should support:
- continuity for the user
- correctness for the system
- clean separation between account memory and run memory

---

## 8. Global landing behavior in the shell

The first-time and return-user landing experience should happen in the shared chat shell.

### First-time user behavior
The shell should:
- greet naturally
- explain that DreamJob wants to get to know a little about the user
- explain the process in plain language
- ask for a job listing URL
- if the user does not have one, support finding listings conversationally

### Return-user behavior
The shell should:
- feel familiar
- use known memory appropriately
- pick up from the most meaningful next context
- avoid pretending it knows nothing

---

## 9. Onboarding behavior in the shell

Onboarding should not be a detached modal-first form experience as the long-term pattern.

It should live in the shared chat shell as guided conversation.

### Onboarding in-shell rules
- ask only the locked onboarding field universe
- prefill or acknowledge what is already known
- ask only what is missing/unconfirmed
- feel like conversation, not a static form
- use compact confirmation/review moments where necessary

### Important rule
Onboarding should not interrupt the shell identity.
It should happen inside the shell, as one stage of the product relationship.

---

## 10. Stage 1 behavior in the shell

Stage 1 should use the shared chat shell as the primary guided workspace.

The shell should support:
- URL or pasted-text intake
- parsing/orientation turns
- listing understanding bundle
- user-in-context bundle
- targeted collection turns
- validation bundle
- positioning outcome
- proceed / future target / start over actions

### Rule
The shell should make Stage 1 feel like guided analysis, not a page with chat attached.

---

## 11. Stage 2 behavior in the shell

Stage 2 should also use the shared chat shell.

The shell should support:
- document generation guidance
- one-improvement-at-a-time suggestions
- clarification turns
- in-thread structured recommendations
- coordination with document surfaces

### Rule
The shell remains the same assistant experience even when the user is editing documents nearby.

---

## 12. Stage 3 behavior in the shell

Stage 3 should use the same shell for:
- application support guidance
- follow-up guidance
- interview clarification
- negotiation clarification
- reminder/action conversations

### Rule
Support should feel like continued guidance in the same relationship, not a new tool.

---

## 13. In-thread structured elements

The shell must support more than plain text messages.

### Required in-thread elements
- review bundles
- approval cards
- validation cards
- structured fact summaries
- action buttons
- next-step choice cards
- future target save actions
- proceed/start-over actions
- loading/progress status blocks

### Rule
These structured elements should appear **inside the thread**, not detached beneath it as unrelated forms.

---

## 14. Message types the shell must support

The shell should support these message categories:

### 14.1 Assistant narrative turn
Natural-language explanation, guidance, or response.

### 14.2 User reply turn
Natural-language answer or instruction from the user.

### 14.3 Assistant review bundle
A concise grouped review of system understanding.

### 14.4 Assistant collection prompt
A targeted ask for missing information.

### 14.5 Assistant validation prompt
A final check of the trusted working set.

### 14.6 Assistant positioning result
A clear outcome and recommended next move.

### 14.7 Action card
Interactive next-step options.

### 14.8 System progress/status message
Parsing, analyzing, saving, checking, comparing, etc.

---

## 15. Real chat vs fake chat rules

A shared chat shell should feel like a real chat when:

- the assistant responds in turns
- the user responds in turns
- the system acknowledges what it knows
- the system asks only what is needed
- structured cards appear in-thread naturally
- the user is not just filling a static multi-field form under some bubbles

### Fake chat indicators to avoid
- static assistant text block above a form
- form-first interaction with decorative bubbles
- staged text that does not react to user knowledge state
- repeated asking for already-known information
- no continuity between turns

---

## 16. Input behavior rules

The input area should remain stable and predictable.

### Rules
- always visible in a familiar position
- clearly tied to the active thread
- can support normal text responses
- can support stage-specific action submissions
- can support URL or pasted text when relevant
- should not be replaced by detached form panels as the primary interaction pattern

---

## 17. Attached side surfaces

The shell may be accompanied by side/context surfaces.

### Examples
- structured memory view
- profile/reusable fact view
- listing context view
- document view
- action checklist
- review surface

### Rule
These are **support surfaces**, not the primary workflow center.

The chat remains primary.
The side surfaces support inspection, editing, or confidence-building.

---

## 18. Mobile behavior

On mobile:
- chat should dominate
- structured review/action surfaces should be compact
- cards should appear in-thread
- side/context surfaces should appear as sheets/drawers when needed
- the user should never lose the sense that the chat is the product center

### Rule
Do not compress a desktop dashboard into mobile.
Let the chat shell stay central and let supporting surfaces appear around it only when needed.

---

## 19. Desktop behavior

On desktop:
- chat remains the center
- larger surrounding surfaces may appear alongside it
- structured review/memory panels may sit beside the thread
- document surfaces may coexist with the chat for Stage 2
- the experience should still feel guided, not dashboard-first

### Rule
Desktop adds visibility, not workflow ownership transfer.

---

## 20. Thread continuity rules

The user should experience:
- one stable ongoing conversational relationship

But the system must still know:
- what thread is global/account-level
- what thread is application/run-specific
- when to attach to one vs the other

### Rule
Continuity should feel natural to the user, even if internally the system routes to different scoped threads.

---

## 21. Greeting and tone rules

The shell’s voice should be:
- natural
- professional
- warm
- not robotic
- not obviously prewritten
- specific to what the system knows

### Greeting rule
The first-time greeting should not feel like a canned splash screen.
It should feel like the assistant is genuinely beginning the relationship.

### Return-user greeting rule
The assistant should acknowledge continuity when appropriate, but should not overstate memory in ways that feel uncanny or false.

---

## 22. Shell ownership rules

The shared chat shell should be a single canonical implementation.

### Rule
DreamJob should not maintain multiple competing chat systems for:
- onboarding
- Stage 1
- document pages
- support pages

There should be one canonical shell and stage-specific configurations around it.

---

## 23. Shell persistence rule

The shell should feel persistent:
- visually
- interactionally
- relationally

The surrounding page/surface may change, but the user should not feel thrown into a new product each time.

### Rule
The shell is the stable center.
The UI changes around it.

---

## 24. Failure conditions

DreamJob fails this shared shell spec if:

- onboarding uses one fake chat
- Stage 1 uses another pseudo-chat
- document pages use a different real chat
- the user experiences multiple inconsistent conversational systems
- the shell is not visually central
- structured actions live outside the thread as the real primary interaction
- the user keeps getting thrown into disconnected surfaces
- the product feels like stitched-together chat experiments

---

## 25. Immediate implementation implication

The next major repo update after memory support should target:

1. identifying the canonical chat implementation already present in the document pages
2. elevating it into the shared shell
3. migrating onboarding onto it
4. migrating Stage 1 onto it
5. keeping structured review/action elements in-thread
6. preserving memory scope correctness while keeping the shell visually stable

---

## 26. Relationship to other source-of-truth docs

This shared shell spec should work together with:

- locked rules document
- onboarding field decision matrix
- Stage 1 chat interaction spec
- Stage 1 data and decision matrix
- opportunity intelligence and advancement guidance spec
- memory architecture spec

Those documents define:
- what the system should know
- what it should decide
- what it should ask
- what it should remember

This document defines:
- **where and how the user experiences those behaviors**
