 DreamJob Guided Accomplishment Journey Spec

## Purpose

DreamJob is a Cactai Inc. product designed to help a user achieve a clear end goal:

**I need a new job.**

The product should not behave like a collection of tools the user must manage.
It should behave like a guided accomplishment system that:
- understands the goal
- determines the process
- performs the heavy lifting
- keeps momentum high
- asks only for necessary inputs
- produces professional, user-specific outputs
- leads the user from stated goal to completed application process support

This document defines the experience as a guided customer journey, not just a list of features.

---

## Product Premise

The user should only need to state the goal.

After that, the system should:
- determine the next best step
- move the process forward proactively
- keep the user informed
- request only high-value missing information
- validate important inputs before generating outputs
- produce polished outputs that are accurate, aligned, and useful

The user should mainly:
- respond
- confirm
- correct
- approve
- choose between clear options when necessary

The user should **not** need to:
- design the workflow
- decide what the AI should do next
- manage multiple disconnected tools
- manually orchestrate the process

---

## Experience Standard

DreamJob should feel like:
- guided
- intelligent
- proactive
- resourceful
- high-trust
- calm
- professional
- user-specific
- momentum-preserving

The user should feel:
- the system understands me
- the system understands the opportunity
- the system knows what to do next
- the system is doing the hard parts for me
- the system is keeping me on track
- the outputs are credible and professional

---

## Core Product Capabilities

1. Analysis
2. Generation
3. Support
4. Tracking

These capabilities should not appear to the user as separate tools.
They should appear as phases of one guided accomplishment journey.

---

## Journey Structure

### Stage 1: Analysis
**Purpose:** Build and validate the working context needed to assess the opportunity, understand the user’s positioning, support downstream generation, and guide the user toward either current application action or future-target advancement.

### Stage 2: Generation
**Purpose:** Create and strengthen the application materials using the validated context from Stage 1.

### Stage 3: Support
**Purpose:** Help the user move from prepared materials to stronger submission follow-through, tracking, and interview / negotiation readiness.

---

# Stage 1: Analysis

## Stage Goal

Build a validated opportunity context package that the system and the user both trust.

The user should feel:
- the system understood the listing
- the system understood their profile
- the system checked whether the profile data is valid in the context of the listing
- the system identified what is missing
- the system helped gather what is needed
- the system verified the working dataset before assessing positioning
- the system gave realistic, motivating guidance about the role and the user’s path forward

## Stage 1 Journey Logic

### 1. Intake
- User inserts a job listing URL
- System retrieves the user’s current profile dataset

### 2. Parsing
- System extracts and normalizes job listing data
- System extracts and normalizes relevant profile data

### 3. Comparison
- System compares listing data to profile data
- System identifies:
  - matches
  - gaps
  - unknowns
  - likely blockers
  - strategic strengths
  - signals of stretch potential
  - signals of overqualification
  - signals of future-target value

### 4. Verification
- System presents concise summaries of:
  - what it understands about the role
  - what it understands about the user profile in the context of the role
  - what appears strong
  - what appears weak, missing, or uncertain
- Review should happen in digestible bundles of related items
- The system should ask whether any items should be:
  - accepted as-is
  - eliminated
  - reviewed further
  - discussed collaboratively
- User has the opportunity to confirm or correct that understanding

### 5. Collection
- System gathers missing or weak data through targeted suggestion/question pairs
- Chat asks for one high-value missing input at a time
- For each gap, the system should:
  - identify the missing item
  - explain why it matters
  - provide a brief example of what supporting evidence could look like
  - ask the user for relevant evidence for that one item
- User responses improve the working dataset

### 6. Validation
- System presents the completed working dataset to the user
- Validation should happen in digestible bundles unless the full dataset is small enough to review comfortably
- The user should be able to identify whether bundled items should be:
  - approved
  - corrected
  - removed
  - discussed further
- User confirms that the inputs are accurate enough for downstream generation and positioning analysis

### 7. Candidate Positioning Assessment
- Only after the user has had the chance to validate the inputs
- The system should assess where the user stands relative to the role, the likely hiring market reality, and the user’s growth potential
- The system should explain:
  - role insight
  - strongest matches
  - biggest gaps
  - stretch potential
  - overqualification if present
  - career advancement implications
  - recommendation
  - next best move

### 8. Gap-Recovery Check
- If the user does not appear well qualified for the role, the system must first check whether the shortfall is caused by missing profile evidence rather than true lack of experience
- The system should ask directly for evidence on the most important unsupported requirements before concluding that the user is not yet ready

### 9. Future-Target Conversion
- If the user still cannot support the important gaps, the system should treat the role as a future-target opportunity when appropriate
- The system should:
  - explain why the role is attractive
  - explain why it appears to be a future target rather than a current strong opportunity
  - offer to remember the role as a goal
  - suggest stepping-stone roles that would move the user toward readiness
  - explain what experience, achievements, scope, or credentials would likely make the user more competitive later

### 10. Apply-Anyway Support
- If the user still wants to apply for a role they are not yet strongly positioned for, the system should support them to the best of its ability
- The system should:
  - be honest about the stretch
  - remain encouraging
  - help the user present their strongest relevant evidence
  - help the user pursue the opportunity without discouraging them

### 11. Output
- System locks and formats the validated dataset for downstream prompts and future pathing use

## Stage 1 User Experience Rule

The chat should mirror the internal logic of the stage.

The user should see concise summaries that explain:
- what the system knows
- what the system understands
- what is missing
- why it matters
- what it needs next
- when the dataset is ready
- what the positioning assessment means
- how the opportunity fits the user’s current candidacy and longer-term career path

The system should not jump directly from parsing to recommendation.
It must earn trust through validation-first interaction.

## Stage 1 Positioning Outcomes

Stage 1 should not use `unclear` as a user-facing end state.

The user-facing positioning outcomes should be:

- **Strong current fit**
- **Healthy stretch**
- **Slight stretch with upside**
- **Overqualified**
- **Underqualified but excellent future role**

These should be framed with realism, optimism, and strategic guidance.

### Positioning behavior rules
- A strong current fit should feel encouraging and actionable
- A stretch should feel ambitious but possible
- A slight stretch should feel exciting and motivating
- Overqualification should trigger thoughtful upward guidance rather than simple encouragement to apply downward
- Underqualified but excellent future role should trigger future-target guidance, stepping-stone recommendations, and memory capture of the goal

## Stage 1 Output

**Validated Opportunity Context Package**

This output should include:
- normalized job listing data
- normalized candidate profile data relevant to the listing
- confirmed matches
- confirmed gaps
- unresolved unknowns that are non-blocking for progression
- validated role insight summary
- candidate positioning assessment
- opportunity level assessment
- career path fit assessment
- growth and stretch guidance
- overqualification signal, if applicable
- future-target role flag, if applicable
- stepping-stone role guidance, if applicable
- apply-anyway support context, if applicable
- downstream-ready keywords
- downstream-ready phrases
- downstream-ready skills targets
- downstream-ready education targets
- downstream-ready certification targets

---

# Stage 2: Generation

## Stage Goal

Create polished, user-editable application materials from the validated Stage 1 context and improve them through guided chat.

The system should feel like it is doing the heavy lifting while keeping the user in the loop on quality, credibility, and authenticity.

## Stage 2 Journey Logic

### 1. Resume Generation
- System creates the initial resume draft
- The draft should look polished and complete
- It should incorporate validated profile-based information where aligned
- It should use listing-aligned structure and professionally written scaffolding where user data is weak or missing
- It should be designed to help the user revise toward authenticity and stronger fit
- If the role is a stretch, the draft should position the user as credibly as possible without inventing facts
- If the role is an apply-anyway stretch, the draft should emphasize the strongest transferable evidence honestly

### 2. Resume Guidance
- System offers one improvement suggestion at a time through chat
- Each suggestion should:
  - explain what can be improved
  - explain why it matters
  - help the user provide missing evidence or clarity
  - keep momentum forward

### 3. Resume Revision
- User edits the resume directly or with AI assistance
- System updates the current resume state

### 4. Resume Evaluation
- System evaluates the resume against:
  - ATS criteria
  - recruiter criteria
  - hiring manager criteria
  - ideal candidate profile criteria
- Review feedback should be grouped into digestible bundles when multiple related issues can be assessed together
- The system should avoid overwhelming the user with a full issue dump unless the issue set is small and easy to review

### 5. Cover Letter Generation
- System creates the initial cover letter draft
- Cover letter must align with the current resume
- Cover letter may only use claims supported by the current resume state
- If the role is a stretch, the cover letter should position the user with ambition and credibility rather than false certainty
- If the role is an apply-anyway stretch, the cover letter should present the user’s strongest case honestly and optimistically

### 6. Cover Letter Guidance
- System offers one improvement suggestion at a time through chat
- Guidance should improve:
  - clarity
  - relevance
  - credibility
  - narrative strength
  - consistency with the resume

### 7. Cover Letter Revision
- User edits the cover letter directly or with AI assistance
- System updates the current cover letter state

### 8. Cover Letter Evaluation
- System evaluates the cover letter against:
  - ATS relevance
  - recruiter readability
  - hiring manager credibility
  - ideal candidate profile criteria
  - consistency with the current resume
- Review feedback should be grouped into digestible bundles when efficient
- The system should avoid presenting an overly fragmented review if several related items can be addressed together

## Stage 2 User Experience Rule

The user should feel like the system:
- drafted something strong
- knows how to improve it
- can explain what is missing
- can help fill content gaps
- can strengthen the material one decision at a time
- is protecting authenticity while improving competitiveness

## Stage 2 Output

**Approved Application Materials**

This output should include:
- current resume
- current cover letter
- evaluation summaries
- structured claim inventory derived from the current resume
- document consistency state for downstream support use

---

# Stage 3: Support

## Stage Goal

Help the user move from prepared materials to stronger candidacy, better submission behavior, and better post-submission readiness.

The system should feel like it is staying with the user through the outcome, not ending at document creation.

## Stage 3 Journey Logic

### 1. Application Preparation
- System prepares a checklist of submission requirements, supporting assets, and recommended actions

### 2. Application Guidance
- System offers chat-based help for tasks that may improve interview likelihood, including:
  - outreach messages
  - follow-up messages
  - recommendation requests
  - LinkedIn improvement suggestions
  - portfolio or supporting asset suggestions
  - supporting visibility actions that strengthen candidacy

### 3. Application Tracking
- System tracks application status, checklist progress, and key milestones

### 4. Reminders and Notifications
- System notifies the user when:
  - the listing is removed
  - important checklist items remain unresolved
  - follow-up timing is appropriate
  - additional action is recommended

### 5. Interview Preparation
- System generates the interview preparation document

### 6. Interview Guidance
- System offers chat-based help for clarification, practice, and targeted suggestions

### 7. Negotiation Preparation
- System generates the negotiation preparation document

### 8. Negotiation Guidance
- System offers chat-based help for scenario support, framing, and next-step guidance

## Stage 3 User Experience Rule

The user should feel like the system:
- is still actively helping after drafting
- knows what to do to improve odds
- knows when action is needed
- keeps the process moving
- reduces the risk of missed opportunities or weak follow-through

## Stage 3 Output

**Active Application Support Package**

This output should include:
- submission checklist
- outreach and follow-up assets
- tracking state
- reminders and notifications state
- interview preparation document
- negotiation preparation document

---

# Review and Collection Efficiency Rules

## Review Rule

When the system presents information for:
- verification
- validation
- approval
- comparison review
- evaluation review
- revision review

it should prefer **digestible bundles of related items** when bundled review is more efficient and more understandable for the user.

The system should:
- group related items together when they can be reviewed comfortably in bulk
- avoid dumping the entire dataset unless the dataset is small enough to review easily
- avoid forcing one-at-a-time review when grouped review would be clearer and faster
- make clear what the grouped items represent
- let the user indicate whether items should be:
  - accepted
  - eliminated
  - reviewed further
  - discussed collaboratively

## Collection Rule

When the system is gathering missing information, it should prefer **single-item collection**.

The system should:
- focus on one missing item at a time
- explain why that item matters
- provide enough explanation for the user to respond effectively
- give a brief example of what useful supporting evidence could look like
- ask only for the information needed for that one item
- avoid asking for large amounts of disparate information in one message

## Efficiency Standard

The product should choose the interaction shape that best balances:
- clarity
- speed
- cognitive load
- confidence
- downstream output quality

The general rule is:

- **bundle for review**
- **single-item for collection**

This rule applies across all stages unless a specific interaction is so small that a simpler form is clearly better.

---

# Cross-Stage Product Rules

## 1. Goal-first orchestration
The system should operate from the user’s end goal, not from a feature menu.

## 2. Chat is the primary experience layer
Chat is not just a communication surface.
It is the mechanism through which the system:
- explains progress
- requests necessary input
- validates understanding
- delivers outputs
- guides the next step

## 3. The system owns the process
The system should decide and lead the next best move.
The user should rarely face an open-ended blank state.

## 4. Inputs before outputs
The system should validate important inputs before generating downstream outputs.

## 5. Value before effort
The system should provide useful insight before asking the user for more work.

## 6. One high-value ask at a time
When additional input is needed, the system should ask for one high-value item at a time.

## 7. Clear output artifacts
Each stage should produce a clear, trusted output artifact that becomes the input for the next stage.

## 8. Authenticity protection
The system should improve competitiveness without inventing user facts.

## 9. Document consistency
The resume should govern downstream cover letter claims unless and until a later approved revision changes that rule.

## 10. Momentum preservation
The system should keep the journey moving and reduce friction, confusion, and user effort whenever possible.

## 11. Review and collection efficiency
The system should use digestible bundled review and single-item collection as the default interaction model across the journey.

## 12. Advancement awareness
The system should help the user not only compete for roles now, but also identify future-target roles and the path toward them.

## 13. Honest but encouraging guidance
The system should be realistic about gaps, stretch, and overqualification while remaining motivating, supportive, and forward-moving.

## 14. Apply-anyway support
If the user chooses to pursue a stretch role anyway, the system should support that choice honestly and constructively.

---

# UX Writing and Interaction Standard

Every meaningful system response should do one or more of the following:
- explain what the system just did
- explain what the system now knows
- explain what still matters
- explain why a missing input matters
- ask for the next highest-value input
- deliver a finished or improved output
- tell the user what happens next

When the system is asking the user to review information:
- it should prefer concise bundled summaries when bulk review is efficient
- it should make clear how the user can respond to the bundle
- it should avoid unnecessarily large review dumps

When the system is asking the user to provide missing information:
- it should ask for one item at a time
- it should explain the reason for the ask
- it should provide enough context for the user to respond well

When the system is discussing candidate positioning:
- it should be realistic
- it should be encouraging
- it should avoid discouraging language
- it should frame stretch as possible when credible
- it should frame overqualification as a strategic signal
- it should frame future-target roles as motivating opportunities rather than failures

The tone should be:
- professional
- calm
- friendly
- specific
- high-competence
- high-trust

The experience should not feel:
- generic
- tool-like
- reactive
- uncertain
- user-orchestrated

---

# Governing Experience Standard

DreamJob should feel like a guided accomplishment journey in which the system takes responsibility for moving the user from goal to outcome.

The user should feel supported, informed, and carried forward.

The system should feel:
- capable
- organized
- resourceful
- proactive
- precise
- comfortable to work with
