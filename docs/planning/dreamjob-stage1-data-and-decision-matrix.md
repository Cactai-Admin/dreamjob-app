# DreamJob Stage 1 Data and Decision Matrix

## Purpose

This document defines the **Stage 1 data model, trust model, missingness logic, and decision rules** for DreamJob.

Its purpose is to make Stage 1 implementation precise enough that the system knows:

- what data it is allowed to use
- what data it is allowed to ask for
- what sources count as trusted
- what counts as missing
- what counts as blocking vs non-blocking
- when Stage 1 can produce trusted outputs
- what conditions trigger:
  - proceed to Stage 2
  - Future Role Target
  - start over

This is a decision/governance spec, not a prompt file.

---

## 1. Stage 1 responsibility

Stage 1 is responsible for turning:

- a target opportunity
- current trusted user context
- a small amount of targeted additional collection if needed

into:

1. **Validated Opportunity Context Package**
2. **Candidate Positioning Assessment**
3. a clear next move:
   - proceed to Stage 2
   - save as Future Role Target
   - start over

---

## 2. Stage 1 allowed data sources

Stage 1 may only use data from the following source classes.

## 2.1 Opportunity source data
- listing URL
- pasted listing text
- listing parse output
- company/context enrichment tied to the opportunity

### Use
Required for every Stage 1 run.

### Trust level
- raw listing text: untrusted until parsed
- parsed listing structure: system-interpreted, user-reviewable
- company/context enrichment: inferred/supporting unless directly confirmed

---

## 2.2 Onboarding-approved facts
- first name
- last name
- email
- phone
- location
- inclusion preferences
- LinkedIn URL if present and approved
- website URL if present and approved

### Use
Allowed as trusted identity/contact context only.

### Trust level
**Trusted if approved**

### Important rule
These facts are not enough to determine role positioning by themselves. They are foundational context, not professional evidence.

---

## 2.3 Profile-approved reusable facts
Any user facts that already exist in approved reusable form in profile memory.

### Use
Allowed if relevant to the opportunity.

### Trust level
**Trusted if approved**

### Important rule
Stage 1 must not ask again for profile-approved facts as though they are unknown.

---

## 2.4 Upload-derived approved facts
Facts extracted from uploaded resume/cover letter or other supported inputs, but only after user review/approval.

### Use
Allowed if relevant to the opportunity.

### Trust level
**Trusted if approved**
**Untrusted if merely parsed and not approved**

---

## 2.5 Prior workflow-approved facts
Facts collected and approved during earlier workflows that are reusable and still relevant.

### Use
Allowed if relevant to the current opportunity.

### Trust level
**Trusted if approved**

---

## 2.6 Saved future target data
Saved Future Role Target objects and pathing context.

### Use
Allowed only for:
- path-fit reasoning
- growth guidance
- future-target comparison
- stepping-stone guidance

### Trust level
**Trusted as historical/pathing context**
Not sufficient by itself for current-role positioning.

---

## 2.7 New Stage 1 user responses
Information newly provided by the user during the current Stage 1 run.

### Use
Allowed for:
- resolving missingness
- improving opportunity-specific understanding
- supporting downstream document accuracy

### Trust level
- user-provided but not yet validated: provisional
- user-provided and approved in bundle/validation: trusted

---

## 3. Stage 1 prohibited data behavior

Stage 1 must not:
- treat raw parsed/inferred data as fully trusted without user review where appropriate
- ask for information already present in approved reusable form
- ask for broad background data that is not currently needed
- expand into detached profile-building
- assume professional evidence exists just because identity/contact info is complete

---

## 4. Trust classes

Every Stage 1 datum should be treated as one of these:

## 4.1 Trusted approved
Definition:
- user-entered and accepted
- or parsed/inferred and explicitly approved

Use:
- may be used in trusted bundles
- may feed Stage 2 outputs
- may become reusable memory

## 4.2 Provisional user-provided
Definition:
- user has provided it in the current run
- not yet finalized through review/validation

Use:
- may inform current reasoning
- should be validated before final downstream reliance

## 4.3 Inferred/system-interpreted
Definition:
- parse output
- enrichment
- system classification
- system estimate

Use:
- useful for bundle presentation and reasoning
- should not be silently treated as fully trusted where user correction matters

## 4.4 Optional supporting context
Definition:
- useful but non-essential context
- may improve explanation or targeting but is not required for stage completion

Use:
- may appear in reasoning
- should not block progression by default

## 4.5 Missing
Definition:
- required or materially helpful data not currently available in trusted form

Use:
- may trigger collection or downgrade confidence

---

## 5. Stage 1 data categories

Stage 1 may reason about data in these categories:

## 5.1 Opportunity identity
- role title
- company
- location/work mode
- employment type
- seniority estimate

## 5.2 Opportunity requirements
- required qualifications
- preferred qualifications
- skills/themes
- experience expectations
- constraints/hard filters

## 5.3 User foundational context
- identity/contact/location
- inclusion preferences
- public links

## 5.4 User opportunity-relevant context
This includes only information that is already available in trusted or provisional form and is relevant to the current opportunity.

Examples may include:
- prior approved work-history facts
- prior approved skill/experience facts
- prior approved education/credential facts
- new current-run facts collected only because this opportunity required them

## 5.5 Pathing context
- future targets
- stepping-stone direction
- advancement signals
- overqualification signals

---

## 6. Missingness logic

Stage 1 should distinguish between:

## 6.1 Missing but non-blocking
Information that would be nice to have, but is not required to:
- understand the opportunity
- present a credible positioning result
- create a trusted downstream package

Examples:
- optional public links
- low-impact inferred context
- secondary nice-to-have qualifications

## 6.2 Missing and confidence-reducing
Information that may not block progression outright, but materially weakens confidence.

Examples:
- a key relevant context item for a major requirement
- a meaningful ambiguity in seniority fit
- unresolved evidence around a central role theme

## 6.3 Missing and blocking
Information missing to such a degree that:
- the system cannot honestly produce a trusted positioning result
- or the Stage 2 downstream package would be too weak/unreliable

### Important rule
Blocking should be used sparingly.
The product is designed to create clarity, not to stall unnecessarily.

---

## 7. What may block Stage 1 completion

Stage 1 may be blocked only when one of these is true:

### 1. Opportunity understanding is not good enough
The role/listing is too poorly understood to produce a meaningful analysis.

### 2. A critical requirement cannot be interpreted
A central requirement or constraint remains too ambiguous.

### 3. User context is too thin for honest positioning
There is not enough relevant user context in trusted or validated form to produce a credible positioning result.

### 4. User refuses or cannot clarify a critical issue
A genuinely critical ambiguity remains unresolved after targeted collection.

### Important rule
Stage 1 should not block because it lacks nice-to-have background detail.

---

## 8. What Stage 1 is allowed to ask for

Stage 1 may ask only for information that is:

- materially relevant to the current opportunity
- not already available in trusted form
- needed to reduce ambiguity
- needed to improve confidence in positioning
- needed to improve downstream document fidelity

### Stage 1 ask rules
- prefer one missing item at a time
- allow connected sets when efficiency is better
- ask only after the role bundle and user-in-context bundle have been shown
- do not begin by interrogating the user broadly

---

## 9. What Stage 1 is not allowed to ask for prematurely

Stage 1 must not ask for information simply because it might be useful later.

It must not ask prematurely for:
- broad career biography
- full work history
- full skills inventory
- full education history
- broad credential inventory
- long future planning narratives

Those may only be touched if:
- directly needed for this opportunity
- and not already available in trusted form

---

## 10. Review bundle input rules

The listing understanding bundle may use:
- inferred/system-interpreted opportunity data
- raw listing-derived structure
- company/context enrichment

The user-in-context bundle may use:
- trusted approved user facts
- relevant provisional current-run facts
- inferred comparisons clearly marked as inferred

### Rule
Bundles must distinguish:
- known/trusted
- inferred/likely
- unknown/missing

---

## 11. Validation bundle eligibility

The Stage 1 validation bundle may be produced only when:
- opportunity understanding is sufficient
- the key relevant user context has been surfaced
- required targeted collection has occurred if needed
- the system can present a human-readable trusted working set

The validation bundle should include:
- opportunity understanding
- relevant user context
- key matches
- key gaps
- any intentional non-blocking unknowns
- the working basis for positioning

---

## 12. Positioning decision inputs

The positioning assessment should use:

- trusted opportunity understanding
- trusted user context
- validated/provisional current-run clarifications
- gap severity
- path-fit logic
- overqualification logic
- advancement logic

It must not use:
- vague optimistic guessing
- hidden unvalidated assumptions as though they were facts
- purely numeric fit scoring without explanation

---

## 13. Positioning outcome decision matrix

## 13.1 Overqualified
Choose when:
- the user appears materially more senior or more experienced than the role’s likely intended level
- the role may underuse the user
- the market risk of appearing too senior is meaningful

### Next move
- encourage application only if it still makes sense
- also encourage considering more advanced roles

---

## 13.2 Strong Fit
Choose when:
- the user appears well-positioned for the role now
- major requirements are well supported
- important ambiguities are resolved enough to proceed confidently

### Next move
- encourage application
- may also suggest slightly more advanced roles as upside

---

## 13.3 Healthy Stretch
Choose when:
- the user is not a perfect match
- but the role is credibly attainable
- and the stretch is motivating rather than unrealistic

### Next move
- encourage application
- frame the opportunity as an ambitious but realistic move

---

## 13.4 Big Stretch
Choose when:
- there is real distance between current trusted user context and the role
- but the opportunity may still be worth pursuing
- and the result is not yet better classified as Future Role Target

### Required rule
Before finalizing Big Stretch, the system must test whether missing information is the real issue.

### Next move
- if user wants to pursue it, support honestly
- if not, may steer toward future-target handling

---

## 13.5 Future Role Target
Choose when:
- the opportunity is attractive
- the user is not yet well-positioned even after meaningful clarification
- and it is more useful to treat the role as a future target than a current application target

### Next move
- offer to save the role as a Future Role Target
- suggest stepping-stone roles
- explain what would make the user more competitive later
- still support application if the user insists

---

## 14. Proceed / save target / start over decision rules

## 14.1 Proceed to Stage 2
Proceed when:
- a trusted positioning result exists
- the opportunity is worth pursuing now
- the Validated Opportunity Context Package is complete enough for Stage 2
- no unresolved critical blocker remains

## 14.2 Save as Future Role Target
Offer/save when:
- positioning outcome is Future Role Target
- or the user explicitly wants to remember a stretch role for later

## 14.3 Start over
This is appropriate when:
- the user does not want to pursue the role
- the role is not worth continuing
- the user chooses not to save it as a future target

---

## 15. Validated Opportunity Context Package minimum data requirements

Stage 1 may output a Validated Opportunity Context Package only when all of the following exist:

### Required
- normalized opportunity understanding
- relevant trusted user context
- key matches
- key gaps
- trusted or intentionally bounded non-blocking unknowns
- user-reviewed/validated working set
- positioning outcome

### Optional but useful
- path-fit context
- future-target signal
- stepping-stone logic
- growth notes

### Rule
Stage 2 should never have to reconstruct basic truth from raw Stage 1 chat.

---

## 16. Stage 2 handoff eligibility

The system may move into Stage 2 only when:

- Stage 1 completion conditions are met
- the user chooses to proceed
- the downstream package is trusted enough to generate materials responsibly

If this is not true:
- do not proceed
- resolve missing issues
- or classify as Future Role Target / start over

---

## 17. Future target conversion rules

A Future Role Target may be created when:
- the positioning outcome is Future Role Target
- the user agrees to save it
- the system has enough context to record why it matters and what the stepping-stone logic is

### Minimum data for save
- target opportunity identity
- why it is a future target
- major missing areas
- stepping-stone direction if available

---

## 18. Trusted memory promotion rules

Stage 1 may promote data into reusable trusted memory only when:
- it is relevant beyond the immediate turn
- it has been user-entered or user-approved
- it could improve future workflow quality
- it does not violate the “ask only what is needed” principle

---

## 19. Profile / memory reuse rule

Before any new Stage 1 ask, the system must evaluate:

- is this already known in approved form?
- is it known but unconfirmed?
- is it optional?
- is it required now?
- is it better deferred?

### Rule
No redundant asks.
No asking because a component expects a field.
Only asking because Stage 1 truly needs it.

---

## 20. Failure conditions

Stage 1 fails this spec if it:
- asks for broad unrelated data too early
- treats inferred data as fully trusted without review
- blocks on low-value missingness
- proceeds to Stage 2 without enough trusted context
- labels the user with a positioning result without meaningful validation
- uses “unclear” as the user-facing final result
- re-asks known approved information

---

## 21. Immediate implementation use

This matrix should govern:

- the next Stage 1 refinement pass
- Stage 1 prompt design later
- gating and missingness logic
- collection sequencing logic
- proceed / Future Role Target / start over branching
- trusted handoff into Stage 2
