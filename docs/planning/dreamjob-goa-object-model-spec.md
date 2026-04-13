# DreamJob GOA Object Model Spec

## Purpose

This document defines the minimum **Goal-Oriented Architecture (GOA)** object model for DreamJob.

Its purpose is to make DreamJob’s architecture explicitly goal-native rather than merely workflow-driven or page-driven.

This object model is intended to govern:
- product architecture
- workflow/state design
- persistence design
- prompt input/output contracts
- downstream implementation decisions

---

## 1. Prototype objective

DreamJob must prove that a job-application product can be architected around **goal progression**, not around disconnected pages, documents, and utilities.

The system should treat:
- the user’s employment objective
- the target opportunity
- the workflow required to pursue it
- the structured state of progress toward submission and advancement

as first-class architectural objects.

---

## 2. Core architectural principle

DreamJob should not be modeled as:
- a dashboard with tools
- a CRUD app for listings and documents
- a chat app with loosely attached workflows

DreamJob should be modeled as:
- a **goal-native system**
- where each meaningful user outcome is represented by structured objects
- where workflows and steps exist to serve those goal objects
- where system intelligence helps translate goals into execution

---

## 3. Primary goal hierarchy

## 3.1 Root user goal
**Advance Career Through Opportunities**

This is the highest-level persistent goal concept in DreamJob.

### Definition
The user’s longer-term objective to improve their career position, not just to generate a single application packet.

### Purpose
Provides the architectural reason for:
- future-target memory
- stepping-stone role guidance
- path-fit assessment
- growth/stretch logic
- overqualification guidance

### Owner
- user

### Core outputs
- saved future targets
- path-fit signals
- stepping-stone opportunities
- advancement guidance

---

## 3.2 Opportunity pursuit goal
**Pursue Opportunity**

This is the primary active goal object for one specific role/listing.

### Definition
A structured goal representing the user’s attempt to assess, prepare for, and potentially pursue a specific opportunity.

### Purpose
This is the main execution-goal object the product operates around during active use.

### Inputs
- listing URL or listing text
- user-approved identity/contact context
- user-provided and system-collected candidate evidence
- company/network enrichment
- approved document states

### Outputs
- validated opportunity context package
- candidate positioning assessment
- resume
- cover letter
- support package for submission/interview/negotiation

### Relationships
- belongs to one user
- references one opportunity object
- may produce one or more support artifacts
- may be abandoned, paused, advanced, or converted to future-target logic

---

## 3.3 Future target goal
**Future Role Target**

### Definition
A saved aspirational opportunity or role category the user is not yet ready for, but wants to work toward.

### Purpose
Makes DreamJob retention- and advancement-aware rather than purely application-centric.

### Inputs
- role/opportunity evaluation
- unresolved capability gaps
- stepping-stone logic
- user confirmation to remember the target

### Outputs
- remembered target role
- stepping-stone guidance
- progression suggestions
- future path-fit comparisons

### Relationships
- belongs to root user goal
- may be created from an opportunity pursuit goal
- informs future Stage 1 positioning/path-fit analysis

---

## 4. Core system objects

## 4.1 User
### Definition
The person using DreamJob.

### Purpose
Owns goals, workflows, memory, documents, and support state.

### Inputs
- identity
- contact information
- location
- inclusion preferences
- approved profile memory
- uploads
- workflow responses

### Outputs
- approvals
- corrections
- evidence
- final decisions
- accepted or rejected recommendations

### Key relationships
- owns root career goal
- owns opportunity pursuit goals
- owns future-target goals
- owns reusable memory
- owns application/support artifacts

---

## 4.2 Opportunity
### Definition
A structured representation of a specific job role/listing.

### Purpose
Acts as the target object around which Stage 1 analysis and Stage 2/3 work are organized.

### Inputs
- listing URL
- raw listing text
- parsed listing data
- company and context enrichment

### Outputs
- normalized listing structure
- explicit requirements
- preferred requirements
- hard filters
- keywords/themes
- company context
- market/opportunity signals

### Key relationships
- referenced by one opportunity pursuit goal
- compared against user memory/context
- feeds validated opportunity context package

---

## 4.3 Workflow
### Definition
The structured execution path used by the system to move a goal toward completion.

### Purpose
Represents the decomposition of the opportunity pursuit goal into meaningful phases.

### DreamJob workflow phases
- onboarding support
- Stage 1 analysis
- Stage 2 generation
- Stage 3 support

### Inputs
- goal state
- opportunity state
- current approved data
- unresolved gaps
- current system state

### Outputs
- next step
- stage progress
- artifacts
- prompts/tasks for the user and system

### Key relationships
- serves one goal object
- contains stages
- contains steps
- consumes and produces state

---

## 4.4 Stage
### Definition
A major workflow phase with its own purpose, completion conditions, and outputs.

### Purpose
Creates coherent progress states that are meaningful in terms of outcome completion.

### DreamJob stages
- Stage 1: Analysis
- Stage 2: Generation
- Stage 3: Support

### Key relationships
- contained within a workflow
- made up of steps
- produces output artifacts used by later stages

---

## 4.5 Step
### Definition
A bounded unit of execution within a stage.

### Purpose
Translates stage intent into system-led or user-confirmed progress.

### Examples
- parse listing
- compare listing to user context
- present review bundle
- collect missing evidence
- validate opportunity context
- generate resume
- review cover letter
- produce support checklist

### Inputs
- current stage state
- approved data
- unresolved data needs

### Outputs
- updated state
- approval-needed bundles
- new artifacts
- next-step recommendations

---

## 4.6 Approved Fact
### Definition
A user-confirmed piece of reusable information trusted by the system.

### Purpose
Serves as durable system memory.

### Inputs
- onboarding responses
- upload parse results
- Stage 1 collection
- later workflow clarifications

### Outputs
- reusable memory entry
- prompt input eligibility
- review surface content

### Key relationships
- belongs to user memory
- may feed multiple future workflows/stages
- must be approved before durable reuse

---

## 4.7 Validated Opportunity Context Package
### Definition
The authoritative Stage 1 output object used by Stage 2 and Stage 3.

### Purpose
Acts as the trusted handoff artifact from analysis into execution.

### Inputs
- normalized opportunity data
- relevant approved user facts
- collected evidence
- review/validation approvals
- positioning/path-fit analysis

### Outputs
- downstream-ready context
- positioning assessment
- document targeting inputs
- growth/pathing signals

### Minimum contents
- normalized listing data
- relevant user context
- confirmed matches
- confirmed gaps
- non-blocking unknowns
- positioning outcome
- opportunity level assessment
- career path fit assessment
- downstream-ready keywords/phrases/targets

---

## 4.8 Candidate Positioning Assessment
### Definition
A structured assessment of where the user stands relative to the opportunity and their broader advancement path.

### Purpose
Replaces simplistic fit scoring with actionable positioning logic.

### Locked outcomes
- Overqualified
- Strong Fit
- Healthy Stretch
- Big Stretch
- Future Role Target

### Inputs
- validated opportunity context
- missing info recovery
- path-fit analysis
- advancement logic

### Outputs
- user-facing positioning
- recommended next move
- future-target conversion
- apply-anyway support stance

---

## 4.9 Application Material
### Definition
A generated or revised artifact used to pursue an opportunity.

### Types
- resume
- cover letter
- interview guide
- negotiation guide

### Purpose
Supports execution of the opportunity pursuit goal.

### Relationships
- belongs to an opportunity pursuit goal
- may depend on current validated context
- cover letter depends on current resume-supported claims

---

## 4.10 Support Plan
### Definition
A structured package of post-generation support actions and assets.

### Purpose
Represents Stage 3 support around submission and follow-through.

### Contents
- submission checklist
- reminders / alerts
- outreach/follow-up assets
- interview support
- negotiation support

---

## 4.11 Alert
### Definition
A system-generated signal that something needs attention.

### Purpose
Supports state-aware routing and intervention prioritization.

### Examples
- unresolved item needing attention
- reminder timing reached
- listing changed/removed
- follow-up recommended

---

## 5. Object relationships

The minimum relationship chain should be:

**User**
→ owns **Root Career Goal**
→ owns one or more **Opportunity Pursuit Goals**
→ each references an **Opportunity**
→ each uses a **Workflow**
→ each workflow contains **Stages**
→ each stage contains **Steps**
→ steps produce **Approved Facts**, **Validated Context**, **Positioning Assessments**, and **Application Materials**
→ later stages produce a **Support Plan**
→ some opportunities may convert into **Future Role Targets**

---

## 6. State model at object level

## 6.1 Opportunity pursuit goal states
Recommended minimum object-level states:
- created
- analyzing
- validating
- positioned
- generating_materials
- materials_in_revision
- support_active
- paused
- abandoned
- converted_to_future_target
- completed

## 6.2 Future target states
- saved
- active_reference_target
- stepping_stone_in_progress
- retired

## 6.3 Approved fact states
- captured
- awaiting_review
- approved
- rejected
- superseded

---

## 7. Success and completion conditions by object

## Root career goal
### Success condition
The system meaningfully helps the user progress toward better roles, not just complete isolated tasks.

## Opportunity pursuit goal
### Success condition
The user either:
- completes pursuit with strong materials/support
- intentionally abandons
- converts the opportunity into a future target with preserved learning/path value

## Validated opportunity context package
### Success condition
Enough approved and trusted context exists for downstream generation and support.

## Candidate positioning assessment
### Success condition
The system resolves ambiguity into a meaningful user-facing outcome and clear next move.

## Future target goal
### Success condition
A role not ready now is preserved as actionable future direction, not discarded as dead-end information.

---

## 8. GOA compliance rules for DreamJob

To remain GOA-compliant, DreamJob must:
- treat opportunity pursuit as a goal object, not merely a record
- treat future targets as goal objects, not loose bookmarks
- treat stages and steps as serving goal progression
- make object states reflect real outcome progression
- make AI influence interpretation, sequencing, positioning, and adaptation
- preserve traceability from goal → workflow → step → artifact → support

DreamJob must not drift into:
- page-first architecture
- document-first architecture
- dashboard-first architecture
- AI-as-text-generator without system responsibility

---

## 9. Immediate implementation implication

The next implementation specs and Codex prompts should reference these objects explicitly.

At minimum, future implementation work should map:
- routes
- state
- DB fields
- prompt contracts
- UI progress controls
- memory/review surfaces

back to this GOA object model rather than to disconnected pages or feature labels.
