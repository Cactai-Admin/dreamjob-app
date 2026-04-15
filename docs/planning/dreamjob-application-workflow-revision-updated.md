# DreamJob Application Workflow Revision

## Purpose
This document updates the core DreamJob workflow UI model for the next implementation pass.

It supersedes earlier assumptions where:
- Home behaved too much like an execution surface
- the non-Home workflow shell was under-specified
- reference content and active document work were not clearly separated
- support workflows were surfaced too early

---

## 1. Core Flow

### 1.1 Listing Review
The **Listing Review** page uses a **two-column layout**:

- **Left:** editable listing information fields
- **Right:** persistent chat thread

From this page, the user has three actions:

- **Save for later** — locks the listing information and returns the user to the Home screen, where the saved listing appears in the continuity table
- **Create application** — locks the listing information and advances the user into the application workflow
- **Delete** — moves the listing to deleted with a 30-day recovery window

### Rule
Listing Review remains a dedicated page and remains the canonical parsed-listing workspace.

---

### 1.2 Application Creation State
When the user selects **Create application**, the screen changes from a **two-column layout** to a **three-column layout**:

- **Left sidebar:** listing-related reference content
- **Center:** active workflow content
- **Right:** persistent chat thread

The first center-state in this workflow shows:
- match fit
- extracted line items from the job listing
- matching profile information
- AI-generated listing-specific placeholder content where gaps exist

The user can review and edit this content before continuing.

### Left sidebar tabs in Application Creation
The left sidebar shows:
- **Listing**
- **Fit & Evidence**

### Rule
This is the first center-state in the application workflow and acts as the fit/evidence review bridge before resume generation.

---

### 1.3 Resume Generation
Once the user is satisfied with the fit review and evidence content, they can generate the resume.

The **center panel** updates to:
- a loading state while the resume is being generated
- the generated resume once complete

The **left sidebar** remains reference-only and uses **tabbed views** so the user can switch between relevant source material while working on the resume.

Left-sidebar tabs for the **Resume** view:
- **Listing** — original job listing information
- **Fit & Evidence** — extracted fit criteria, matched profile evidence, and placeholder strings

The **center panel** contains:
- **Resume** — the active generated resume content and editing surface

The **right panel** continues to show the persistent chat thread.

After editing and saving the resume, the user can:
- export the resume
- continue directly to cover letter generation

### Rule
The center panel is always the active working surface.  
The left panel is reference/support context only.  
The right panel is chat guidance.

---

### 1.4 Cover Letter Generation
When the user proceeds to the cover letter step, the **center panel** again shows:
- a loading state while the cover letter is generated
- the generated cover letter once complete

The **left sidebar** remains reference-only and uses **tabbed views** so the user can reference the right material while refining the letter.

Left-sidebar tabs for the **Cover Letter** view:
- **Listing** — original job listing information
- **Fit & Evidence** — isolated fit criteria and supporting evidence
- **Resume** — approved or current resume draft

The **center panel** contains:
- **Cover Letter** — the active generated letter content and editing surface

The **right panel** continues to show the persistent chat thread.

After the user reviews and saves the cover letter, they can:
- export either file individually
- export both files together

---

### 1.5 Support Workflow Visibility
Once the resume and cover letter are complete, the **support workflow** becomes visible and available as a separate workflow within the **Application Overview**.

This support workflow can include downstream materials such as:
- interview support documents
- negotiation support documents

### Rule
Support workflows appear only after core application materials are completed.

---

## 2. Layout Rules

### 2.1 Desktop
The primary application workflow uses a **three-column layout**:

- **Left:** sidebar with tabbed reference content
- **Center:** active document or workflow state
- **Right:** persistent chat thread

### 2.2 Mobile
On mobile, the same content areas should be preserved, but the side panels should become **drawers**:

- listing/reference content becomes a drawer
- chat becomes a drawer
- center content remains the primary active workspace

### Rule
Mobile preserves the same information architecture as desktop, but converts side panels into drawers rather than removing them.

---

## 3. Decisions Already Made

The following are locked:

- Listing Review remains a dedicated page
- Listing Review uses a two-column layout
- Chat persists throughout the workflow
- Creating an application transitions the user into a three-column workspace
- Resume and cover letter generation each use a loading state followed by an editable generated document
- Support workflows appear only after core application materials are completed
- The left sidebar is reference-only
- The active artifact stays in the center panel

---

## 4. Resolved UX Decisions

### 4.1 Application Creation State Sidebar Contents
**Decision:** the left sidebar should include both listing information and structured fit/evidence content from the start.

#### Reason
This makes the three-column model useful immediately and avoids forcing the user to rely only on the center panel for context.

---

### 4.2 Resume Sidebar Tabs
**Decision:** in the Resume view, the left sidebar should show only:
- **Listing**
- **Fit & Evidence**

#### Reason
The resume itself is already the active center content. A Resume Draft tab in the sidebar is redundant and weakens the reference-only sidebar model.

---

### 4.3 Cover Letter Sidebar Tabs
**Decision:** in the Cover Letter view, the left sidebar should show:
- **Listing**
- **Fit & Evidence**
- **Resume**

#### Reason
The cover letter step benefits from cross-reference to the role, evidence, and approved resume. The cover letter itself is already the active center content, so it does not need a sidebar tab.

---

### 4.4 Export Availability
**Decision:** exports should be available only after save.

#### Reason
This keeps export behavior trustworthy and avoids ambiguous file states while edits are still in progress.

### Rule
- saved resume can be exported
- saved cover letter can be exported
- combined export becomes available only after both are saved

---

## 5. Interaction Model Summary

### Home
Home remains:
- listing intake
- continuity navigation
- not the primary execution workspace

### Listing Review
Listing Review is:
- the parsed-listing validation workspace
- the place where the user decides whether to save, create application, or delete

### Application Workflow
Once application creation begins:
- the workflow uses three columns on desktop
- the left panel becomes contextual reference material only
- the center panel becomes the active work artifact/state
- the right panel remains persistent chat

### Support Workflow
Support is:
- not part of the initial core application-material creation path
- revealed only after core materials are complete

---

## 6. Implementation Implications

This revision implies the next implementation passes should focus on:

1. enforcing the two-column Listing Review page
2. enforcing the three-column application workflow shell
3. implementing reference-only left-sidebar tab systems for Application Creation, Resume, and Cover Letter phases
4. preserving persistent right-side chat throughout non-Home workflow phases
5. gating support workflow visibility until resume and cover letter are completed
6. gating exports until save state exists

---

## 7. v3 Build Guidance

v3 should build from this revised workflow model and should not regress to:
- chat as the primary main-column surface on Home
- packet overview as the only application workspace
- support workflows appearing before core materials are complete
- sidebar tabs for active center content artifacts

This revised spec should be treated as the new core workflow baseline for the next thread.
