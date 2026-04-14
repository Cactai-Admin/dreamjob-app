# DreamJob Opportunity Intelligence and Advancement Guidance Spec

## Purpose

This document defines the **opportunity intelligence**, **career advancement**, and **unlock guidance** behavior for DreamJob.

Its purpose is to ensure DreamJob does not behave like a narrow single-listing optimizer.

Instead, when a user submits a target opportunity, the system should:

- evaluate that opportunity
- understand how it fits the user now
- identify nearby better opportunities
- encourage upward mobility where credible
- identify small realistic unlock actions
- guide the user toward stronger opportunities over time

This document is a source-of-truth for the next repo update and later product behavior.

---

## 1. Core principle

A submitted job listing is the **starting point**, not the whole opportunity universe.

DreamJob should not behave as though:
- the inserted URL is the only opportunity worth considering
- the best outcome is always “apply to this exact job”
- exact fit is better than healthy stretch
- the safest role is better than the best role

DreamJob should behave as though:
- every submitted opportunity reveals a **neighborhood of opportunities**
- the system should search for stronger nearby options
- the system should encourage realistic advancement
- the system should identify the smallest credible unlock to improve the user’s trajectory

---

## 2. Product behavior goal

When a user submits an opportunity, DreamJob should help answer all of these questions:

1. **How good is this opportunity for me right now?**
2. **Have I already seen or applied to this opportunity?**
3. **Are there better nearby opportunities?**
4. **What small actions would make me more competitive for better roles?**
5. **Should I apply now, apply to a different role, or unlock a better role first?**

---

## 3. Opportunity intelligence system role

Opportunity intelligence is the system layer responsible for:

- comparing the submitted listing to prior opportunities
- detecting duplicates and near-duplicates
- evaluating better alternatives
- identifying opportunity quality relative to the user
- identifying unlock actions
- producing advancement-aware recommendations

It is not a cosmetic recommendation layer.
It is part of the system’s core guidance and reasoning model.

---

## 4. Key outputs

This capability should produce the following outputs:

### 4.1 Opportunity comparison insight
A concise explanation of how the submitted listing compares to similar opportunities.

### 4.2 Advancement signal
A structured signal describing whether the opportunity:
- repeats the user’s current level
- is a healthy stretch
- is beneath them
- is a future target
- unlocks a better adjacent path

### 4.3 Unlock guidance
A structured recommendation for one or more small realistic actions that would improve eligibility.

### 4.4 Better-option suggestion
A recommendation to consider a better adjacent opportunity when one appears materially superior.

### 4.5 Opportunity relationship memory
A persistent record linking the submitted opportunity to:
- prior similar roles
- already-applied roles
- saved future targets
- nearby better options

---

## 5. Opportunity intelligence questions the system should always ask

For each submitted opportunity, DreamJob should evaluate:

### 1. Duplicate / prior relationship
- have we seen this exact URL before?
- have we seen a near-duplicate version of this role?
- has the user already applied?
- has the user already discarded it?
- has the user already saved it as a future target?

### 2. Opportunity quality
- is the compensation stronger than similar roles?
- are the benefits better or worse?
- are the requirements lighter or heavier?
- is the work mode/location better or worse?
- is the role a stronger growth move?

### 3. Advancement value
- does this move the user upward?
- is it just lateral repetition?
- is it beneath the user?
- is it a healthy stretch?
- is it a future-target opportunity?

### 4. Unlock path
- what is the smallest gap preventing strong viability?
- is that gap realistic to close?
- is there a certification, training program, project, or exposure area that would unlock the role?
- is there an adjacent role with nearly the same upside but lower barrier?

---

## 6. Opportunity comparison rules

DreamJob should compare the submitted listing against:

- previously analyzed opportunities
- previously applied opportunities
- saved future targets
- nearby role families
- newly surfaced adjacent opportunities if search/find capability is available

### Comparison dimensions
The system should compare on:
- compensation
- benefits
- number and severity of requirements
- level/seniority
- work mode / location
- path-fit value
- advancement value
- similarity to known user strengths
- similarity to prior targeted roles

### Important rule
The system should not recommend alternatives randomly.
Alternative suggestions must be grounded in:
- requirement similarity
- role-family similarity
- credible user path-fit
- better value for the user

---

## 7. Better opportunity criteria

A nearby opportunity should be treated as “better” when one or more of these are true:

- higher compensation
- better benefits
- fewer or lighter requirements
- stronger fit
- stronger advancement value
- better work-mode flexibility
- lower friction to qualify
- better long-term career path signal

### Priority rule
DreamJob should prefer opportunities that are:
- meaningfully better
- realistically attainable
- upward-moving
- not purely aspirational fantasy

---

## 8. Upward mobility rule

DreamJob should actively encourage the user toward opportunities that are:

- slightly more advanced
- slightly better compensated
- slightly more selective but still attainable
- strong for long-term career growth

It should not default to:
- exact fit only
- the same role level repeatedly
- over-safe targeting that leaves the user stuck

### Important limit
Upward mobility should remain realistic.
The system should recommend:
- healthy stretch
- not empty aspiration

---

## 9. Unlock guidance rules

Unlock guidance should identify the **smallest realistic intervention** that could materially improve the user’s viability.

Examples:
- certification
- training program
- portfolio piece
- hands-on exposure
- tool familiarity
- project evidence
- scope demonstration
- adjacent stepping-stone role

### Unlock guidance must be
- specific
- realistic
- small enough to act on
- clearly tied to the requirement gap
- clearly tied to a better opportunity or stronger candidacy

### Unlock guidance must not be
- vague self-improvement advice
- a giant career reinvention plan
- unrealistic pressure
- generic “go learn more” language

---

## 10. Unlock recommendation categories

DreamJob may classify unlock recommendations into these categories:

### 10.1 Immediate unlock
A small action that could quickly improve viability.
Examples:
- add project evidence
- complete a short certification
- adjust public materials to show an existing capability more clearly

### 10.2 Near-term unlock
A modest effort that improves eligibility within a realistic short horizon.
Examples:
- take a focused course
- complete a practical tool-specific training
- build one role-relevant portfolio sample

### 10.3 Stepping-stone unlock
The user is not close enough yet for the target role, but an adjacent role could close the gap.
Examples:
- intermediate role
- narrower-scope version of the same role family
- company/industry entry role that builds the missing exposure

---

## 11. When DreamJob should recommend “apply to this one now”

Recommend apply-now when:
- the submitted opportunity is good enough on value
- the user is credibly viable now
- no clearly better adjacent option is more compelling in the same opportunity neighborhood
- the system can generate strong materials with trusted context

---

## 12. When DreamJob should recommend “consider this better nearby role”

Recommend a better nearby role when:
- it is materially better on compensation, benefits, or growth
- it is not significantly harder to qualify for
- it has meaningfully similar requirements
- it is realistically attainable for the user

### Messaging rule
This should feel empowering, not disruptive.
The system should not make the user feel like they “picked the wrong job.”
It should feel like:
- DreamJob found a smarter move
- the user now has better leverage

---

## 13. When DreamJob should recommend “unlock first, then apply”

Recommend unlock-first when:
- the opportunity is close but not yet strong enough
- the gap is meaningful
- the gap is realistically closable
- the unlock action would materially change viability

### Messaging rule
This should feel:
- motivating
- concrete
- achievable
- not like a long-term abstract self-improvement lecture

---

## 14. When DreamJob should recommend “save as future target”

Recommend Future Role Target when:
- the opportunity is attractive
- the user is not yet realistically viable even after reasonable clarification
- a small unlock is not enough
- a longer stepping-stone path is more honest and useful

---

## 15. Duplicate / prior-application behavior

If the system detects the user may already know or have acted on the role, it should say so clearly.

Examples:
- “It looks like you may have already applied to this role.”
- “This appears to be a near-duplicate of a listing you already analyzed.”
- “You previously saved a very similar role as a future target.”

### Rule
Duplicate/proximity detection should be framed as helpful memory, not a warning alarm.

---

## 16. Opportunity history memory requirements

The system should persist enough opportunity-history data to support later reasoning.

For each opportunity, persist at minimum:

### Identity
- canonical opportunity key
- original URL
- company identifier
- title
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
- duplicate links to prior opportunities

### Derived comparison metadata
- requirement themes
- role family
- overlap to prior opportunities
- comp/benefit comparison markers
- advancement value markers

---

## 17. Decision model for opportunity guidance

For each opportunity, the system should decide among:

### A. Apply now
The opportunity is strong enough now.

### B. Apply now, but also consider a better adjacent role
The current opportunity is viable, but a better nearby option exists.

### C. Unlock first, then target a better role
A small realistic action could materially improve the user’s position for a better opportunity.

### D. Save as future target
The opportunity is valuable, but not yet realistic enough to pursue effectively now.

### E. Start over / discard
The opportunity is not compelling enough to pursue or retain.

---

## 18. User-facing explanation rules

The system should explain advancement guidance in language that is:

- optimistic
- professional
- specific
- strategic
- confidence-building

### Good examples of system behavior
- “You’re close to roles like this. A certification in X would meaningfully improve your odds.”
- “This role is solid, but this adjacent one appears to pay more with fewer requirements.”
- “You may already qualify for something slightly better than this.”
- “This is a strong future target. A role like Y would likely put you on the path to it.”

### Avoid
- discouraging language
- vague motivational platitudes
- overly deterministic claims
- harsh “not qualified” framing

---

## 19. Interaction rules

Opportunity intelligence should appear:
- during Stage 1 positioning
- during future-target guidance
- during opportunity comparison moments
- during later search/find assistance if the user asks DreamJob to find roles

It should not feel like a random side card or generic tip system.
It should feel like part of DreamJob’s core reasoning.

---

## 20. Relationship to Stage 1

Stage 1 should use this guidance layer to help answer:

- is this opportunity worth pursuing?
- is there a better nearby option?
- is this a healthy stretch?
- is there a small unlock action?
- should this be saved as a future target?

That means this guidance spec should directly influence:
- Candidate Positioning Assessment
- proceed / future target / start over branching
- future-target conversion
- later job-finding assistance

---

## 21. Relationship to global and run memory

This capability depends on three memory layers:

### Global account memory
Persistent user-level facts and preferences.

### Opportunity-history memory
Persistent records of all seen/analyzed/applied/saved opportunities.

### Application/run memory
The focused memory for one active pursuit.

### Promotion rule
Run-level facts may be promoted upward only when they are:
- reusable
- approved
- helpful for future guidance

---

## 22. What should be implemented next because of this spec

The next repo update should support:

1. opportunity-history persistence structure
2. duplicate / previously-seen detection
3. ability to compare a submitted opportunity to nearby alternatives
4. unlock-guidance messaging and action recommendations
5. Stage 1 positioning that can recommend:
   - apply now
   - better nearby role
   - unlock first
   - future target
   - start over

---

## 23. Failure conditions

DreamJob fails this spec if it:
- treats every URL as an isolated one-off
- only optimizes for the submitted job
- encourages safe stagnation over healthy stretch
- gives generic advice instead of unlock guidance
- cannot recognize duplicate or previously applied roles
- cannot compare job quality meaningfully
- cannot guide the user toward a better nearby option

---

## 24. Immediate use

This document should be added to the planning docs and used as source-of-truth for the next update to the code repo.

It should guide:
- memory architecture work
- Stage 1 enhancement work
- future job-finding assistance
- duplicate detection
- better-opportunity comparison behavior
- advancement-aware recommendation logic
