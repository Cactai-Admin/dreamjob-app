# DreamJob Continuity, Navigation, and Landing Spec

## Purpose

This document defines the **continuity model**, **landing behavior**, and **navigation structure** for DreamJob.

Its purpose is to turn the workflow overhaul direction into an implementation-ready navigation and continuity specification.

This document is a source-of-truth for:
- when users land on Home vs chat
- how the continuity table works
- row states and tags
- filter behavior
- sort behavior
- reopen behavior
- page/navigation behavior
- desktop vs mobile continuity access

---

## 1. Core rule

DreamJob has two distinct top-level user modes:

### 1.1 Continuity mode
Used for:
- seeing what exists
- resuming prior work
- reviewing active and past workflow objects
- deciding what to do next

This is the job of **Home** and the continuity table.

### 1.2 Work mode
Used for:
- doing guided work
- progressing an active workflow
- interacting with the assistant
- editing the current artifact/context

This is the job of the **central chat shell** plus the right context panel.

### Rule
Do not mix these roles.
Home is not the chat work surface.
Chat is not the archive browser.

---

## 2. Landing behavior

## 2.1 First login
Land directly in **chat**.

Reason:
- DreamJob needs to greet the user
- onboarding/profile-context collection begins here
- the product relationship starts here

## 2.2 Later login with missing required profile data
Land directly in **chat**.

Reason:
- missing required data must be resolved before the system can guide correctly
- chat handles this naturally

## 2.3 Later login with complete required profile data and at least one active item
Land on **Home**.

Home should display:
- continuity table
- the most recently active items
- clear continue/start options

## 2.4 Later login with complete required profile data and no active items
Land on **Home**.

Home should display:
- empty-state continuity table
- primary CTA: **Start New**
- secondary CTA: **Find Jobs** if supported

### Rule
The only default-direct-to-chat conditions are:
- first login
- missing required profile data

---

## 3. Top-level pages

Use this page list as canonical:

- **Home**
- **Listings**
- **Applications**
- **Career Advancement**
- **Documents**
- **Profile**
- **Settings**
- **Archive**
- **Trash**

### Rule
Do not introduce alternate top-level labels for the same concepts.

---

## 4. Home page role

## 4.1 Home is the continuity surface
Home should answer:
- what do I currently have going on?
- what can I continue?
- what have I already sent?
- what should I do next?
- how do I start something new?

## 4.2 Home should not be
- a dashboard full of unrelated cards
- a message archive
- a document browser
- a thread list
- the primary work surface

## 4.3 Primary Home contents
Home should contain:
- continuity table
- filter controls
- sort controls
- Start New action
- optional Find Jobs action
- lightweight alert/status indicators where relevant

---

## 5. Continuity table

## 5.1 Continuity table purpose
The continuity table is the primary way users browse and resume their workflow objects.

A row represents a durable object such as:
- listing under analysis
- application in preparation
- resume/cover-letter refinement item
- sent application
- archived item

## 5.2 Row contents
Each row should display:

- company
- role title
- state tag
- page/category
- last active timestamp
- optional next-action/status hint

### Optional secondary indicators
If helpful:
- work mode/location
- current phase icon
- urgency/attention badge

## 5.3 Default sort
Default sort:
- **Last Active** descending

## 5.4 Supported sorts
Allow lightweight sorting by:
- Last Active
- Newest
- Company
- Role Title

### Rule
Sort controls should remain simple and useful.

---

## 6. Filters

Use this filter list:

- **All**
- **Listing Analysis**
- **Application Preparation**
- **Resume/Cover Letter Analysis**
- **Sent**
- **Archive**

### Filter meanings

#### All
Show all continuity-table items except items in Trash.

#### Listing Analysis
Show items in listing intake/review/analysis states.

#### Application Preparation
Show items actively moving toward application creation or pre-send state.

#### Resume/Cover Letter Analysis
Show items in the document refinement phase.

#### Sent
Show submitted applications and post-submission items.

#### Archive
Show archived retained items.

### Rule
Do not add extra filters unless later explicitly locked.

---

## 7. Row state/tag model

Each continuity table row should have a clear stage/state tag.

Recommended canonical tag families:

### 7.1 Listing Analysis
Used when the item is in:
- intake complete
- parsed
- under review/edit
- not yet converted into application prep

### 7.2 Application Preparation
Used when the item is in:
- applicable profile data review
- resume generation
- cover letter generation
- pre-send/export

### 7.3 Resume/Cover Letter Analysis
Used when the item is specifically in:
- resume refinement
- cover letter refinement
- document review and guidance

### 7.4 Sent
Used when:
- application was sent
- marked as applied
- under post-submission support

### 7.5 Archive
Used when the user archived the item.

### Rule
Trash items do not belong in the Home continuity table.

---

## 8. Reopen behavior

Selecting a row should reopen the **correct workflow view** based on current saved state.

## 8.1 Listing Analysis row
Open:
- central chat in listing-analysis context
- right panel showing extracted listing information

## 8.2 Application Preparation row
Open:
- central chat in application-prep context
- right panel showing applicable profile data or current artifact as appropriate

## 8.3 Resume/Cover Letter Analysis row
Open:
- central chat in document-guidance context
- right panel showing resume or cover letter editor/view

## 8.4 Sent row
Open:
- central chat in application-support context
- right panel showing post-submission support state

## 8.5 Archive row
Open:
- archived item detail/workflow context
- central chat only if the user chooses to resume or inspect it
- right panel appropriate to the archived item state

### Rule
The user should return to where they left off, not to a generic start point.

---

## 9. Relationship between Home and chat

## 9.1 Start New from Home
When the user clicks **Start New**:
- open the central chat
- enter listing-intake mode
- prepare the right panel for listing review after parse

## 9.2 Resume from Home
When the user selects a continuity item:
- open the correct workflow context
- keep chat as the work surface
- load the corresponding right panel state

## 9.3 Return to Home
The user should always be able to return to Home to see:
- other active items
- sent items
- archived items
- what else exists in continuity

### Rule
Home is the object browser.
Chat is the workflow execution surface.

---

## 10. Listings page

## 10.1 Purpose
Listings is the dedicated page for listing-stage items.

Use it when the user specifically wants to browse or manage listing-stage objects rather than use Home.

## 10.2 Expected contents
- listing-stage table/list
- status tags
- last active
- filters if needed
- open/resume actions
- archive/delete actions

### Rule
Listings is a focused page, while Home is the broad continuity overview.

---

## 11. Applications page

## 11.1 Purpose
Applications is the dedicated page for:
- application preparation
- sent applications
- application support

## 11.2 Expected contents
- application-stage rows
- sent rows
- support status
- follow-up/support indicators
- open/resume actions

### Rule
Applications is not a document browser.
It is the run/application management page.

---

## 12. Career Advancement page

## 12.1 Purpose
Career Advancement is the page for:
- long-term target roles
- unlock suggestions
- better nearby opportunity suggestions
- upward mobility planning

## 12.2 Continuity relevance
It may have its own list/table pattern, but it is distinct from Home’s main continuity table.

---

## 13. Documents page

## 13.1 Purpose
Documents is the page for document artifacts:
- resumes
- cover letters
- exports
- versions or downloadable records if needed

### Rule
Documents contains artifacts, not the main application workflow continuity list.

---

## 14. Archive page

## 14.1 Purpose
Archive contains inactive but retained items.

## 14.2 Archive behavior
Items may be archived from any stage after listing addition.

Archive should support:
- inspect
- restore/reopen
- move to Trash
- visibility into expired-source status

## 14.3 Expired listing source rule
Archived items whose listing source no longer loads may be:
- flagged
- user-notified
- moved toward Trash/Delete within 30 days per agreed policy

---

## 15. Trash page

## 15.1 Purpose
Trash contains discarded items only.

## 15.2 Trash behavior
Trash should support:
- restore if within retention window
- final deletion according to product policy

### Rule
Trash is not an archive alternative.
It is the discard state.

---

## 16. Desktop navigation model

On desktop, the left-side navigation/continuity area should support:
- top-level page navigation
- access to Home continuity behavior
- access to filtered/focused pages
- object resumption

### Recommended structure
- top nav/logo area
- page list
- optional continuity preview snippet
- utility/settings area

### Rule
Do not turn the left side into a raw thread list.

---

## 17. Mobile navigation model

On mobile:
- Home should be the default continuity surface for returning users
- navigation should be accessible via a compact menu/sheet
- continuity table should be the main content on Home
- once the user opens a workflow, chat becomes central

### Rule
Do not force a desktop sidebar concept directly onto mobile.

---

## 18. Alerts and continuity

Alerts should enhance continuity, not replace it.

Examples:
- listing source unavailable
- follow-up due
- item needs review
- document ready
- archived item expiring toward Trash

### Display rule
Alerts may appear:
- as lightweight badges in rows
- as small status indicators on Home
- as chat guidance once the user opens the relevant item

### Rule
Do not turn Home into an alert center instead of a continuity table.

---

## 19. Search behavior

Search across continuity objects may be supported later, but it should search:
- company
- role title
- current state
- archived item names

### Rule
Search should operate on durable workflow objects, not raw messages.

---

## 20. Failure conditions

DreamJob fails this continuity/navigation spec if:
- returning users still cannot easily find prior work
- the user must use chat to browse history
- the user must rely on a thread list to find items
- the continuity table does not reopen the correct state
- filters do not match the locked workflow taxonomy
- Home is overloaded with non-continuity content
- Archive and Trash are conflated

---

## 21. Immediate implementation implication

The next continuity/navigation implementation work should include:

1. landing-rule enforcement
2. Home continuity table implementation
3. canonical filters and sort
4. row tag/state mapping
5. reopen behavior wiring
6. Archive and Trash distinction enforcement
7. desktop/mobile continuity access alignment

---

## 22. Relationship to other source-of-truth docs

This continuity, navigation, and landing spec should work together with:

- workflow overhaul UI/UX spec
- shared chat shell spec
- memory architecture spec
- Stage 1 interaction and decision specs
- opportunity intelligence and advancement guidance spec

Those documents define:
- what the workflow is
- what the assistant should do
- what memory exists
- how chat should behave

This document defines:
- **how users find, resume, and navigate durable work across sessions**
