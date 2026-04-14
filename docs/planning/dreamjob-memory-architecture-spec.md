# DreamJob Memory Architecture Spec

## Purpose

This document defines the **memory architecture** for DreamJob.

Its purpose is to make the system’s conversational continuity, reusable knowledge, opportunity intelligence, and application-specific context explicit and governable.

DreamJob should not rely on one giant undifferentiated thread.
It should use a stable user-facing chat surface backed by clearly separated memory scopes.

This document is a source-of-truth for:

- chat continuity design
- persistence design
- reusable fact promotion
- opportunity-history intelligence
- application/run memory
- transcript vs trusted memory boundaries
- future repo updates

---

## 1. Core principle

DreamJob should provide the user with:

- one stable, central, continuous chat experience

But internally it should maintain **separate memory layers** for different purposes.

### Why
This gives the user:
- continuity
- familiarity
- trust
- comfort

While giving the system:
- clean scoping
- safer reasoning
- better reuse
- better comparison logic
- less cross-contamination between roles and workflows

---

## 2. The five memory layers

DreamJob should use **five distinct memory layers**.

## 2.1 Transcript history
This is the full historical conversation/archive layer.

### Purpose
Preserve interaction history across the life of the account.

### What it contains
- all user messages
- all assistant messages
- system event messages if stored
- thread-level interaction history
- per-run conversation history

### Important rule
Transcript history is **not the same thing as trusted reusable memory**.

Not everything ever said should become authoritative system knowledge.

---

## 2.2 Global account memory
This is the durable account-level memory layer.

### Purpose
Store reusable user-level knowledge that should persist across all workflows.

### What it contains
- approved identity/contact data
- representation preferences
- approved reusable profile facts
- durable user preferences
- recurring goals
- future targets
- stable behavioral/context preferences where appropriate

### Important rule
Only approved or explicitly trusted information should live here as durable reusable memory.

---

## 2.3 Opportunity-history memory
This is the persistent account-level memory of all opportunities the user has touched.

### Purpose
Enable:
- duplicate detection
- prior-application awareness
- listing comparison
- requirement pattern awareness
- opportunity quality comparison
- advancement-aware suggestions

### What it contains
- seen listings
- parsed listing snapshots
- normalized listing structure
- prior analyze/apply/discard/save-target status
- comparison metadata
- relationship to other opportunities

### Important rule
This layer is not just transcript history.
It is structured opportunity intelligence.

---

## 2.4 Application / run memory
This is the focused memory layer for one active application pursuit.

### Purpose
Keep one opportunity-specific workflow coherent from Stage 1 through later support.

### What it contains
- Stage 1 bundles
- user clarifications for that opportunity
- validated opportunity context package
- candidate positioning assessment
- generated materials
- support actions
- interview/negotiation context
- run-specific decisions

### Important rule
This memory is scoped to one opportunity pursuit.
It should not automatically pollute global account memory.

---

## 2.5 Trusted promoted memory
This is the promotion layer that controls what graduates from transcript/run interaction into durable reusable memory.

### Purpose
Prevent the system from treating every message as equally authoritative.

### What it contains
- approved reusable facts extracted from onboarding
- approved reusable facts extracted from uploads
- approved reusable facts discovered during runs
- durable opportunity-history records
- durable target/goal records

### Important rule
Promotion into trusted memory must be intentional and rule-governed.

---

## 3. Why these layers are separate

DreamJob needs these layers separated because each one answers a different question:

### Transcript history
“What was said?”

### Global account memory
“What do we know about this user in durable reusable form?”

### Opportunity-history memory
“What opportunities has this user seen, pursued, rejected, or saved, and how do they compare?”

### Application/run memory
“What do we know about this one active opportunity pursuit?”

### Trusted promoted memory
“What information has been approved enough to be reused confidently later?”

---

## 4. Stable chat shell vs memory scopes

The user should experience:
- one stable chat shell

But the system should know whether the active context is:
- global/account-level
- opportunity-history lookup
- application/run-specific
- support-stage-specific

### Rule
One chat shell does **not** mean one memory blob.

The UI stays stable.
The memory scope changes based on the current workflow context.

---

## 5. Transcript history rules

## 5.1 What transcript history is for
Transcript history should support:
- continuity
- auditing
- revisiting earlier work
- context reconstruction
- user trust

## 5.2 What transcript history is not for
Transcript history should not automatically act as:
- approved fact memory
- profile truth
- durable comparison metadata
- canonical opportunity status

## 5.3 Storage guidance
DreamJob may store transcript history per:
- global chat surface
- application/run thread
- support interactions

But transcript and trusted memory must remain logically distinct.

---

## 6. Global account memory rules

## 6.1 Global account memory should contain
- first name
- last name
- email
- phone
- location
- inclusion preferences
- LinkedIn URL if approved
- website URL if approved
- approved reusable profile facts
- future targets
- durable user preferences that affect system behavior
- durable user-level guidance context if intentionally promoted

## 6.2 Global account memory should not contain by default
- every message the user ever wrote
- role-specific assumptions from one application
- temporary clarifications that are not reusable
- unapproved parse results

## 6.3 Update rule
Global account memory should only update when:
- the user enters or confirms data directly
- the user approves parsed/inferred data
- the system intentionally promotes reusable facts

---

## 7. Opportunity-history memory rules

## 7.1 Purpose
This layer enables the system to say things like:
- “It looks like you may have already applied for this role.”
- “This looks similar to jobs you targeted before.”
- “This role appears better than a similar one you previously reviewed.”
- “This is a healthier stretch than the last role you considered.”

## 7.2 Minimum contents per opportunity

### Identity
- canonical opportunity key
- original URL
- company identifier
- role title
- location/work mode
- employment type
- seniority estimate

### Content snapshot
- raw listing text if available
- parsed listing structure
- requirements
- benefits
- compensation if known

### User relationship
- first seen
- last seen
- analyzed
- applied
- discarded
- saved as future target
- started application packet
- duplicate / near-duplicate links

### Derived intelligence
- role family
- requirement themes
- overlap score to prior opportunities
- advancement value marker
- comp/benefit comparison markers

## 7.3 Opportunity-history memory must support
- exact duplicate detection
- near-duplicate detection
- prior-application awareness
- better-opportunity comparison
- repeated role-family detection
- upward mobility suggestions

---

## 8. Application / run memory rules

## 8.1 One run = one opportunity pursuit
Each active application/run should have its own persistent memory layer.

### It should contain
- listing intake data
- listing understanding bundle
- user-in-context bundle
- targeted collection answers
- validation bundle state
- candidate positioning assessment
- Stage 2 documents
- support-stage actions and outputs

## 8.2 Why this matters
Without run-specific memory, role-specific reasoning will bleed into:
- unrelated roles
- future applications
- global profile assumptions

## 8.3 Run memory must support
- Stage 1 trusted package creation
- Stage 2 generation continuity
- Stage 3 support continuity
- run-specific transcript continuity

---

## 9. Trusted promoted memory rules

## 9.1 Promotion principle
Data should move into trusted reusable memory only when:
- it is useful beyond the current turn
- it is reusable beyond the current run
- it has been user-entered or user-approved
- it improves future system guidance
- it does not violate the “ask only what is needed” principle

## 9.2 Promotion sources
Trusted promoted memory may come from:
- onboarding
- upload parse + approval
- Stage 1 clarification + approval
- later guided conversations
- explicit user edits

## 9.3 Promotion targets
Promoted memory may land in:
- global account memory
- opportunity-history memory
- future target memory
- structured user preference memory

## 9.4 Promotion must not happen automatically from
- raw transcript
- unreviewed parse results
- inferred assumptions
- low-confidence system guesses

---

## 10. Memory scope switching rules

The system should know what scope is active at a given moment.

### 10.1 Global landing scope
Use:
- transcript history
- global account memory
- opportunity-history memory

### 10.2 Active application scope
Use:
- run transcript
- application/run memory
- relevant global account memory
- relevant opportunity-history memory

### 10.3 Opportunity comparison scope
Use:
- current opportunity
- opportunity-history memory
- relevant global account memory
- advancement guidance logic

### Rule
The system should always know:
- which scope it is speaking from
- which memory is authoritative for the current task

---

## 11. Transcript vs trusted memory distinction

This distinction must remain explicit everywhere.

### Transcript history
- preserves everything said
- useful for continuity and audit
- not automatically reusable truth

### Trusted memory
- curated
- approved
- structured
- reusable
- safe for future guidance and downstream generation

### Important rule
The system should never behave as though:
“because it was once said, it is now permanently true.”

---

## 12. Memory update triggers

## 12.1 Global account memory update triggers
- onboarding save/confirm
- profile edit save
- approved upload parse facts
- approved reusable run facts
- explicit user preference changes

## 12.2 Opportunity-history memory update triggers
- listing submitted
- listing parsed
- listing reviewed
- application started
- application submitted
- role discarded
- role saved as future target
- duplicate/near-duplicate match discovered

## 12.3 Run memory update triggers
- Stage 1 clarifications
- validation approvals
- positioning result
- document generation/revision
- support actions

---

## 13. Duplicate detection and prior-application intelligence

The system should check opportunity-history memory on every submitted opportunity for:

- exact URL match
- normalized title/company/location match
- requirement-pattern match
- prior application status
- prior analyze/discard/save-target status

### User-facing examples
- “It looks like you may have already applied to this role.”
- “This appears very similar to a role you reviewed last month.”
- “You previously saved a similar opportunity as a future target.”

This depends on opportunity-history memory, not just transcript search.

---

## 14. Opportunity comparison intelligence

Opportunity-history memory and global user context together should allow the system to compare:

- compensation
- benefits
- requirement burden
- advancement value
- work mode / location fit
- similarity to user strengths
- similarity to prior targeted roles

This is how DreamJob can say:
- “This looks better than the last similar role you reviewed.”
- “This appears to pay more with fewer requirements.”
- “You may already qualify for a better adjacent opportunity.”

---

## 15. Future target memory

Future targets should persist as durable structured memory.

### Future target records should include
- target role/opportunity identity
- why it is a future target
- major missing areas
- stepping-stone guidance if known
- when it was saved
- related opportunity family

### Why
Future targets are not just bookmarks.
They are part of the user’s long-term advancement path.

---

## 16. User-facing stability rule

The user should feel:
- the chat is stable
- the system remembers them
- the system remembers their history
- the system remembers their applications
- the system can connect dots over time

But the user should not have to understand all internal memory layers.

### Rule
Memory architecture should improve the feeling of continuity, not expose architectural complexity.

---

## 17. Privacy / deletion rule

If the account is closed and deleted:
- transcript history should be deleted according to product policy
- global account memory should be deleted
- opportunity-history memory should be deleted
- run memories should be deleted
- promoted memory should be deleted

### Important rule
Memory persistence lasts for the life of the account, not beyond deletion.

---

## 18. Failure conditions

DreamJob fails this memory architecture if it:

- treats one giant thread as the only memory source
- cannot distinguish transcript from trusted memory
- cannot distinguish global memory from run memory
- re-asks known approved facts
- loses awareness of prior opportunities
- cannot recognize duplicates or prior applications
- lets one role’s logic pollute unrelated roles
- stores everything with equal authority

---

## 19. Immediate implementation implications

The next repo updates should explicitly support:

1. stable shared chat shell
2. global account memory persistence
3. opportunity-history persistence
4. one persistent memory per application/run
5. promotion rules from transcript/run into trusted memory
6. duplicate / prior-application detection
7. opportunity comparison logic
8. scope-aware chat context selection

---

## 20. Relationship to other source-of-truth docs

This memory architecture spec should work together with:

- locked rules document
- GOA object model spec
- onboarding field decision matrix
- Stage 1 chat interaction spec
- Stage 1 data and decision matrix
- opportunity intelligence and advancement guidance spec

This document defines **where the knowledge lives**.
Those documents define **how the system should behave using that knowledge**.
