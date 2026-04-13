# DreamJob Adaptive Guidance Model

## Purpose

This document defines the minimum **adaptive guidance model** for DreamJob.

Its purpose is to make DreamJob’s guided behavior improve over time while remaining:
- predictable
- understandable
- trust-preserving
- outcome-driven

This model is intended to correct the gap between one-time guidance and a truly adaptive Guidance-Assisted Software (GAS) product.

---

## 1. Core principle

DreamJob should not behave like a static guided script.

It should adapt its guidance based on:
- user actions
- approved data
- ignored recommendations
- friction signals
- saved future targets
- repeated patterns of success or difficulty

However, adaptation must never become:
- opaque
- manipulative
- unpredictable
- silently overriding of explicit user choices

---

## 2. What guidance should adapt

## 2.1 App-entry routing
The system should adapt what the user sees first based on:
- missing required onboarding data
- active action in progress
- alerts needing attention
- absence of blockers leading to Stage 1 fallback

This is the most basic adaptive behavior and should always remain explicit.

---

## 2.2 Recommendation priority
The system should adapt:
- which next step it recommends
- which missing item it asks for first
- which alert gets surfaced first
- which growth/pathing suggestion deserves emphasis

### Inputs
- current stage
- unresolved blockers
- prior ignored suggestions
- saved future targets
- current confidence state
- active user task momentum

---

## 2.3 Gap collection order
When Stage 1 identifies multiple missing items, the system should adapt the order based on:
- importance to positioning clarity
- likely downstream impact
- user fatigue risk
- whether a connected set should be requested together
- whether the user has repeatedly struggled with a category before

---

## 2.4 Upload prompting behavior
The system should adapt how it frames optional upload behavior based on:
- whether the user previously skipped upload
- whether the user already has enough approved reusable facts
- whether upload would materially reduce friction now

DreamJob should not keep nagging for upload if it is no longer valuable.

---

## 2.5 Future-target and stepping-stone guidance
The system should adapt:
- when it suggests saving a future target
- what stepping-stone roles it recommends
- how strongly it emphasizes growth-oriented pathing

based on:
- repeated stretch-role interest
- repeated future-target outcomes
- prior saved targets
- current opportunity level relative to the user

---

## 2.6 Manual intervention intensity
The system should adapt the balance between:
- guided chat
- bundle review
- direct manual intervention surfaces

based on:
- how often the user corrects stored data
- how often the user uses direct review pages
- how often chat-collected information is approved quickly

This should improve efficiency, not create new complexity.

---

## 3. Signals the system may use

## 3.1 Strong adaptation signals
These are high-value signals the system should use:

- approved onboarding facts
- approved parsed-upload facts
- approved Stage 1 facts
- repeated corrections to specific categories
- ignored recommendations
- repeatedly saved future-target roles
- repeated abandonment at the same step
- repeated successful completion patterns
- accepted or rejected application progression choices
- high-frequency manual intervention in certain areas

## 3.2 Weak signals
These may inform adaptation lightly, but should not dominate:
- time spent on a page alone
- one-off hesitation
- isolated skipped suggestion
- raw chat length

---

## 4. Adaptation constraints

Adaptation must obey these rules:

### 4.1 Explicit user choice wins
If the user explicitly chooses:
- to apply anyway
- not to upload
- to include or exclude certain contact/location data
- to save or not save a future target

the system must respect that choice.

It may revisit later when context changes, but must not silently override it.

### 4.2 High-impact outputs remain reviewable
Adaptation may influence:
- what is suggested
- what is surfaced first
- what is asked next

It may not silently finalize risky outputs without review.

### 4.3 Adaptation must be explainable
When adaptation affects meaningful behavior, the system should be able to explain:
- why this was suggested now
- what it already knows
- why this next step matters

### 4.4 Adaptation must reduce effort
If adaptation makes the product feel:
- harder to predict
- more complicated
- more repetitive
- more intrusive

then it is failing.

---

## 5. Adaptive behavior by stage

## 5.1 Onboarding
Onboarding may adapt:
- whether to encourage upload more strongly
- whether to skip upload encouragement if enough context already exists
- how much reassurance to provide when the user declines upload

It should not adapt into a broad profile interview.

---

## 5.2 Stage 1
Stage 1 may adapt:
- review bundle emphasis
- collection order
- amount of explanation
- whether connected information is requested together
- future-target conversion timing
- stepping-stone guidance emphasis

This is the most important adaptive stage.

---

## 5.3 Stage 2
Stage 2 may adapt:
- which improvement suggestion comes next
- whether suggestions focus more on clarity, evidence, or alignment
- how aggressively to push for stronger positioning
- whether stretch-role framing should be emphasized

The system should not overwhelm the user with too many simultaneous improvements.

---

## 5.4 Stage 3
Stage 3 may adapt:
- which support actions are prioritized
- which alerts rise to dashboard importance
- whether interview or negotiation support is surfaced first
- how strongly follow-up guidance is emphasized

This should remain tightly scoped in the prototype.

---

## 6. User-facing explanation model

Adaptive behavior should not feel invisible.

When relevant, DreamJob should naturally explain:
- what it now knows
- why it is asking this next
- why it thinks this is the best next move
- why a suggestion is more relevant now than before

This preserves trust and teaches the product logic.

---

## 7. What should not adapt yet

To keep the prototype stable, DreamJob should **not yet** adapt:
- visual theme or layout based on behavior
- stage definitions
- core routing priority order
- the user-facing positioning category taxonomy
- high-impact document claims without explicit approval
- role of the dashboard vs Stage 1
- onboarding required-field list

These should stay locked for prototype clarity.

---

## 8. Minimum prototype adaptation set

For the prototype, DreamJob only needs this minimum adaptation set:

### Must have
- app-entry routing based on state
- recommendation priority based on context
- gap collection order based on impact and efficiency
- future-target / stepping-stone guidance based on positioning outcomes

### Should have
- reduced upload prompting when unnecessary
- smarter balance between chat and manual review surfaces
- support action prioritization in Stage 3

### Exclude for now
- deep behavioral learning loops
- automated personalization experiments
- large-scale recommendation scoring systems
- opaque adaptive ranking models

---

## 9. Failure conditions

DreamJob fails as an adaptive guidance system if:

- it keeps asking the user for the same information repeatedly
- it ignores explicit user choices
- it surfaces the same low-value prompts despite prior behavior
- it changes behavior without any understandable reason
- it becomes more complicated as it learns
- it feels like a static wizard instead of a guided system

---

## 10. Immediate implementation implication

Future implementation work should create explicit structures for:
- adaptation signals
- recommendation prioritization
- user-approved memory reuse
- future-target history
- ignored/rejected suggestion handling

But it should do so in a lightweight, explicit way suitable for a prototype.

The goal is not a massive personalization engine.
The goal is a believable, trustworthy adaptive guidance layer.
