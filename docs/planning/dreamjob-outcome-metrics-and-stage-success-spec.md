# DreamJob Outcome Metrics and Stage Success Spec

## Purpose

This document defines the minimum **outcome metrics**, **stage success criteria**, and **completion logic** for DreamJob.

Its purpose is to move DreamJob from activity-oriented behavior toward measurable outcome-driven software.

This document should govern:
- stage completion logic
- success analytics
- workflow reporting
- later evaluation of whether the prototype proves its value

---

## 1. Measurement philosophy

DreamJob should not primarily measure:
- page visits
- document generation counts
- raw chat volume
- activity for its own sake

DreamJob should primarily measure:
- progress toward user outcomes
- reduction in effort
- readiness of application materials
- speed to meaningful value
- quality of guided execution
- movement toward career advancement

---

## 2. Primary product outcomes

DreamJob should help users achieve these measurable outcomes:

1. **Reach meaningful application readiness quickly**
2. **Produce stronger job-specific materials with less manual effort**
3. **Feel confident about whether a role is worth pursuing**
4. **Preserve future-target opportunities and career-path guidance**
5. **Maintain momentum through submission support and next actions**

---

## 3. Global north-star metrics

## 3.1 Time to first meaningful output
### Definition
Elapsed time from first entry into the app to the first high-value output the user can act on.

### Examples of meaningful outputs
- approved onboarding completion
- validated Stage 1 context package
- first usable resume draft
- clear positioning outcome

### Why it matters
Measures whether the product delivers value quickly.

---

## 3.2 Time to Stage 1 completion
### Definition
Elapsed time from starting Stage 1 to validated positioning outcome and downstream-ready context package.

### Why it matters
Measures how efficiently DreamJob turns raw intent into trusted application context.

---

## 3.3 Stage 1 → Stage 2 progression rate
### Definition
Percentage of Stage 1 opportunities that move into document generation.

### Why it matters
Measures whether Stage 1 produces enough confidence and clarity to create action.

---

## 3.4 Application materials completion rate
### Definition
Percentage of opportunity pursuit goals that reach:
- usable resume state
- usable cover letter state
- or both

### Why it matters
Measures whether DreamJob meaningfully gets users to execution-ready materials.

---

## 3.5 Future target save rate
### Definition
Percentage of underqualified/future-target opportunities that are saved as remembered goals rather than dropped.

### Why it matters
Measures whether the product is capturing long-term retention and advancement value.

---

## 3.6 Support engagement rate
### Definition
Percentage of users who engage with Stage 3 support after document confidence is reached.

### Why it matters
Measures whether DreamJob continues helping beyond drafting.

---

## 4. Onboarding success criteria

Onboarding is successful when:

- required onboarding fields are captured:
  - name
  - contact information
  - location
  - inclusion preferences for contact/location in materials
- optional upload is either:
  - processed and approved
  - or explicitly skipped
- the system can move the user into Stage 1 without requiring a detached profile-building session

## Onboarding completion states
- `incomplete`
- `awaiting_approval`
- `complete`

## Onboarding metrics
- onboarding completion rate
- time to onboarding completion
- upload acceptance rate
- upload skip rate
- parsed-upload approval rate

---

## 5. Stage 1 success criteria

Stage 1 is successful when:

- a listing is received and parsed
- relevant approved user context is available
- key review bundles have been shown
- required missing information has been collected or explicitly left non-blocking
- the validated opportunity context package exists
- a user-facing positioning outcome has been reached
- the user can either:
  - proceed to Stage 2
  - save the role as a future target
  - abandon and restart

## Stage 1 completion states
- `analyzing`
- `reviewing`
- `collecting`
- `validating`
- `positioned`
- `ready_for_stage_2`
- `converted_to_future_target`
- `abandoned`

## Stage 1 metrics
- parse success rate
- review bundle approval rate
- average number of collection turns to validated context
- time to positioning outcome
- Stage 1 completion rate
- Stage 1 → Stage 2 progression rate
- future-target conversion rate
- Stage 1 abandonment rate

---

## 6. Stage 2 success criteria

Stage 2 is successful when:

- a resume is generated
- a cover letter is generated
- the user has enough revision support to feel confident in both
- the current resume and cover letter states are suitable for Stage 3 support

## Stage 2 completion states
- `resume_generating`
- `resume_in_revision`
- `resume_ready`
- `cover_letter_generating`
- `cover_letter_in_revision`
- `cover_letter_ready`
- `materials_confident`
- `ready_for_stage_3`

## Stage 2 metrics
- time to first usable resume draft
- time to first usable cover letter draft
- average number of revision cycles per document
- percentage of users who reach materials_confident
- resume approval rate
- cover letter approval rate

---

## 7. Stage 3 success criteria

Stage 3 is successful when:

- submission support checklist exists
- the user receives next-action support where relevant
- tracking/support state exists
- interview and negotiation support are available if relevant
- the system remains useful after materials are complete

## Stage 3 completion states
- `support_initialized`
- `submission_preparing`
- `tracking_active`
- `interview_support_ready`
- `negotiation_support_ready`
- `support_engaged`
- `support_paused`

## Stage 3 metrics
- checklist completion rate
- alert response rate
- interview guide generation rate
- negotiation guide generation rate
- follow-up support engagement rate

---

## 8. Positioning outcome metrics

DreamJob should track how often each positioning outcome occurs:

- Overqualified
- Strong Fit
- Healthy Stretch
- Big Stretch
- Future Role Target

### Why this matters
This helps evaluate whether the system:
- is over-classifying users into one bucket
- is producing believable market-aware positioning
- is creating enough future-target value
- is helping users reach stretch roles rather than only safe roles

---

## 9. Career advancement metrics

Because DreamJob is intended to support advancement, not just task completion, it should track:

- percentage of opportunities classified as growth-positive
- future-target roles saved per user
- stepping-stone recommendations generated
- later opportunities that align with saved future targets
- percentage of Strong Fit users also encouraged upward
- percentage of Overqualified users redirected to more advanced roles

---

## 10. Trust and effort-reduction metrics

DreamJob should measure not just outcome completion, but also whether the product actually reduces effort.

### Suggested measures
- average number of explicit manual data-entry turns before Stage 1 completion
- percentage of reusable facts captured through guided workflow rather than detached profile entry
- approval rate of parsed/uploaded data
- number of corrections per review bundle
- percentage of users who reach Stage 1 without needing full profile completion

These help prove that DreamJob is reducing manual effort rather than merely relocating it.

---

## 11. Minimum prototype KPI set

For the current prototype, the minimum KPI set should be:

### Must track
- time to onboarding completion
- time to Stage 1 completion
- Stage 1 → Stage 2 progression rate
- time to first usable resume draft
- future-target save rate
- application materials completion rate

### Should track
- Stage 1 abandonment rate
- average collection turns to validated context
- resume/cover letter approval rates
- support engagement rate

### Exclude for now
- complex ROI metrics
- deep cohort analytics
- enterprise reporting
- advanced user segmentation dashboards

---

## 12. Stage gating rules

The system should only move to the next stage when the required success conditions are met.

### Onboarding → Stage 1
Requires:
- onboarding required fields complete
- onboarding approval state complete enough to proceed

### Stage 1 → Stage 2
Requires:
- validated opportunity context package exists
- positioning outcome exists
- user chooses to proceed
- no unresolved critical blocker remains

### Stage 2 → Stage 3
Requires:
- resume and cover letter have reached confident/ready state
- user is ready for support-oriented next steps

---

## 13. What would invalidate the prototype

DreamJob would fail as an outcome-driven prototype if it cannot show:

- faster time to meaningful value than detached manual workflows
- visible Stage 1 clarity and positioning outcomes
- structured progression from analysis to materials to support
- reuse of approved facts across stages
- advancement-aware handling of stretch, overqualification, and future-target roles

If the system mainly shows activity but not measurable goal progression, it is not succeeding.

---

## 14. Immediate implementation implication

Future implementation work should map:
- DB state fields
- analytics events
- stage transitions
- progress UI
- alert logic

to these success criteria and metrics, rather than inventing local page-level definitions.
