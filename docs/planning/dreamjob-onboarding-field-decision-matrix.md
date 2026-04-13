# DreamJob Onboarding Field Decision Matrix

## Purpose

This document defines the **canonical onboarding field set** and the decision rules that govern:

- what the system is allowed to ask during onboarding
- what counts as missing
- what should be inferred or prefilled
- what must be confirmed
- what is optional
- where the data should be stored
- where the data should be displayed

This document is intended to stop onboarding from drifting into pseudo-chat forms, redundant questioning, or detached profile-building.

It is a source-of-truth for onboarding implementation and future refinement.

---

## Governing rule

Onboarding may only operate on this locked field universe:

- first name
- last name
- email
- phone
- location
- contact inclusion preferences
- location inclusion preference
- LinkedIn profile URL
- personal website URL

Onboarding must **not** expand into professional-background discovery.

It must not ask about:
- role-relevant experience evidence
- skills evidence
- credential evidence
- scope/seniority clarification
- missing requirement support
- future-target relevance

Those belong later in workflow context, not in onboarding.

---

## Decision principles

### 1. Ask only if needed
The system should ask only for fields that are:
- missing
- invalid
- unconfirmed
- or explicitly required for the current onboarding completion state

### 2. Do not ask for known approved data
If the system already has a field in approved reusable form, it should:
- prefill it
- surface it for confirmation only if needed
- not ask for it again as though it is unknown

### 3. Use onboarding only for foundational identity/contact representation
Onboarding exists to establish:
- who the user is
- how they can be contacted
- what contact/location information may appear in application materials
- optional public links the user may want included

### 4. Optional does not mean irrelevant
LinkedIn profile URL and personal website URL are optional, but if provided they should:
- be stored
- be displayed in profile
- be available for future reuse

### 5. Confirmation matters
Data should not be treated as fully trusted reusable memory unless the user has:
- entered it directly
- or reviewed and approved it after inference/parse

---

# Canonical field decision matrix

## 1. First name

### Canonical field name
`first_name`

### Purpose
User identity for application materials and system representation.

### Source of truth
- profile record
- onboarding input
- optional upload parse only if later approved

### Requiredness
**Required**

### Ask rule
- ask if missing
- prefill if known
- allow confirmation/edit if present

### Collection mode
- direct ask
- may be shown in conversational onboarding as a simple response turn or compact grouped identity step

### Approval requirement
**Yes**
User-entered or user-confirmed before durable reuse.

### Storage target
- canonical persisted profile/account-linked record

### Display target
- profile
- document header identity context
- onboarding review state

---

## 2. Last name

### Canonical field name
`last_name`

### Purpose
User identity for application materials and system representation.

### Source of truth
- profile record
- onboarding input
- optional upload parse only if later approved

### Requiredness
**Required**

### Ask rule
- ask if missing
- prefill if known
- allow confirmation/edit if present

### Collection mode
- direct ask
- may be grouped with first name

### Approval requirement
**Yes**

### Storage target
- canonical persisted profile/account-linked record

### Display target
- profile
- document header identity context
- onboarding review state

---

## 3. Email

### Canonical field name
`email`

### Purpose
Primary contact identity and application material contact option.

### Source of truth
- auth/account record
- profile record if mirrored
- onboarding input if missing or needing confirmation

### Requiredness
**Required**

### Ask rule
- if known from auth/account, prefill it
- ask only if unavailable or clearly missing from reusable app state
- allow user confirmation/edit if the product supports editable contact email at onboarding

### Collection mode
- prefer prefill
- direct ask only if missing

### Approval requirement
**Yes**
Even if prefilled from auth, the user should be able to confirm that it is the address appropriate for application materials.

### Storage target
- canonical account/profile-linked record

### Display target
- profile
- onboarding review state
- application-material contact context if included by preference

---

## 4. Phone

### Canonical field name
`phone`

### Purpose
Optional contact channel that may be included in application materials.

### Source of truth
- profile record
- onboarding input
- optional upload parse only if later approved

### Requiredness
**Required for onboarding capture**
Because it is in the locked minimum data set, even if the user may later choose not to display it.

### Ask rule
- ask if missing
- prefill if known
- allow confirmation/edit if present

### Collection mode
- direct ask

### Approval requirement
**Yes**

### Storage target
- canonical persisted profile record

### Display target
- profile
- onboarding review state
- application-material contact context if included by preference

---

## 5. Location

### Canonical field name
`location`

### Purpose
Identity/location context for application materials and user representation.

### Source of truth
- profile record
- onboarding input
- optional upload parse only if later approved

### Requiredness
**Required**

### Ask rule
- ask if missing
- prefill if known
- allow confirmation/edit if present

### Collection mode
- direct ask

### Approval requirement
**Yes**

### Storage target
- canonical persisted profile record

### Display target
- profile
- onboarding review state
- application-material identity context if included by preference

---

## 6. Contact inclusion preferences

### Canonical field names
- `show_email`
- `show_phone`
- `show_linkedin`
- `show_website`

### Purpose
Controls which contact/public-link fields may appear in application materials.

### Source of truth
- onboarding input
- later profile/edit review only if explicitly changed

### Requiredness
**Required**
These are foundational representation preferences.

### Ask rule
- ask only after the relevant fields are known or visibly referenced
- do not silently infer from defaults alone
- if previously confirmed, treat as known unless the user changes them

### Collection mode
- direct confirmation
- can be grouped into one preference step

### Approval requirement
**Yes**
These must be explicitly confirmed, not inferred from a default object.

### Storage target
- canonical persisted preference storage
- local storage may be transitional only, not final source of truth

### Display target
- onboarding review state
- profile representation settings / review area
- document-generation input layer

---

## 7. Location inclusion preference

### Canonical field name
`show_location`

### Purpose
Controls whether location appears in application materials.

### Source of truth
- onboarding input
- later profile/edit review only if explicitly changed

### Requiredness
**Required**

### Ask rule
- ask directly
- if already confirmed, do not ask again unless changed or reset

### Collection mode
- direct confirmation
- can be grouped with contact inclusion preferences

### Approval requirement
**Yes**

### Storage target
- canonical persisted preference storage

### Display target
- onboarding review state
- profile representation settings / review area
- document-generation input layer

---

## 8. LinkedIn profile URL

### Canonical field name
`linkedin_url`

### Purpose
Optional public professional profile link for reuse in materials/profile.

### Source of truth
- profile record
- onboarding input
- user manual edit later

### Requiredness
**Optional**

### Ask rule
- may be asked in onboarding because it is in the locked field universe
- should not block onboarding completion if missing
- if inclusion preference references LinkedIn display, the field should exist as an input opportunity
- if already known, prefill and allow confirmation/edit

### Collection mode
- direct ask or optional grouped public-links step

### Approval requirement
**Yes**

### Storage target
- canonical persisted profile record

### Display target
- profile
- onboarding review state
- application-material contact/public-link context if included by preference

---

## 9. Personal website URL

### Canonical field name
`website_url`

### Purpose
Optional public website/portfolio link for reuse in materials/profile.

### Source of truth
- profile record
- onboarding input
- user manual edit later

### Requiredness
**Optional**

### Ask rule
- may be asked in onboarding because it is in the locked field universe
- should not block onboarding completion if missing
- if inclusion preference references website display, the field should exist as an input opportunity
- if already known, prefill and allow confirmation/edit

### Collection mode
- direct ask or optional grouped public-links step

### Approval requirement
**Yes**

### Storage target
- canonical persisted profile record

### Display target
- profile
- onboarding review state
- application-material contact/public-link context if included by preference

---

# Onboarding completeness logic

## Required for onboarding completion
The system should treat onboarding as complete only when the following are present and confirmed:

- first name
- last name
- email
- phone
- location
- confirmed contact inclusion preferences
- confirmed location inclusion preference

## Optional but collectable in onboarding
These should not block completion:
- LinkedIn profile URL
- personal website URL

## Important rule
The system must not infer “complete” purely from default preference objects.
Preferences count only when they have been explicitly confirmed.

---

# Ask / do not ask logic

## The system should ask when:
- a required field is missing
- a required field exists but has not been confirmed in reusable form
- a required preference has not been confirmed
- an optional field is part of the locked onboarding universe and the system is presenting the optional public-links step

## The system should not ask when:
- the field already exists in approved reusable form
- the field is optional and the user has already explicitly skipped or left it blank
- the field belongs to later workflow context rather than onboarding
- the system is only missing broader professional data unrelated to onboarding

---

# Prefill logic

For every onboarding field in the locked universe:

- if known and approved, prefill it
- if known but unconfirmed, prefill it and request confirmation
- if unknown, ask for it
- if optional and unknown, offer the opportunity without blocking progression

---

# Display rules

## Profile should display these when present
- email
- phone
- location
- LinkedIn profile URL
- personal website URL

## Profile should also reflect
- inclusion preferences for contact/location display in materials

## Onboarding review state should show
- what was collected
- what is optional and skipped
- what representation preferences are now active

---

# Implementation rules

## 1. Separate evaluation types from form types
The system may use:
- partial or nullable field objects for dynamic completeness evaluation

But the actual onboarding form/chat draft state should always receive:
- a normalized, fully shaped object where required by component typing

## 2. Separate “completed once” from “currently complete”
The system should track:
- onboarding has been completed before
- current required foundational data is still complete

These are not the same thing.

## 3. Do not let onboarding become profile-building
Do not add any additional field categories to onboarding unless explicitly locked in a future decision.

## 4. Preserve trust
If a field is prefilled, the user should still be able to:
- confirm
- edit
- understand how it will be used

---

# Immediate use

This matrix should govern the next onboarding refinement pass so the system knows:

- what it is allowed to ask
- what it should prefill
- what counts as missing
- what is required
- what is optional
- what should appear on profile
- what should never be asked in onboarding
