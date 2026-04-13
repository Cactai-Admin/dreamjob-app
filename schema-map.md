# Schema Map (Supabase/Postgres)

> Derived from SQL migrations (`001_initial_schema.sql` + `002`–`008`) and compared against `src/types/database.ts`/`src/lib/types.ts`.

## 1) Core enums and status fields

### Workflow/status enums
- `workflow_state`: `listing_review`, `qa_intake`, `generating`, `review`, `ready`, `active`, `ready_to_send`, `sent`, `completed`, `archived`, plus `draft` added in migration `003`.
- `output_type`: `resume`, `cover_letter`, `interview_guide`, `negotiation_guide`.
- `output_state`: originally `draft|active|ready|sent`; migration `003` adds `approved`.
- `status_event_type`: base values plus migration `007` adds `ready`; migration `003` also adds `submitted`, `interview_scheduled`, `offer_received`, `withdrawn`.

### Other notable enums
- Auth/roles (`user_role`, `account_state`, `auth_provider`).
- Data classification (`evidence_type`, `memory_type`, `preference_tag`, `notification_severity`, `insight_type`, `deleted_item_type`).

## 2) Table map by functional area

## A. Identity/auth and access

### `accounts`
- PK: `id`
- Key fields: `supabase_auth_id`, `email`, `username`, `display_name`, `provider`, `state`, privacy flags, lifecycle timestamps.

### `account_roles`
- FK: `account_id -> accounts.id`
- Role assignment history (`role`, `is_active`, grant/revoke metadata).

### `invites`, `sessions`, `access_grants`
- Invitation flow and internal role/session tracking.

## B. Profile and resume source data

### `profiles`
- FK unique: `account_id -> accounts.id`
- Bio/contact + preferences.
- Added arrays via migrations:
  - `skills`, `keywords` (migration `005`)
  - `tools`, `certifications`, `clearances` (migration `006`)
- Added `profile_icon` (migration `008`).

### `employment_history`, `education`, `certifications`
- FK: `account_id -> accounts.id`
- Resume inputs including achievements/technologies arrays.

### `evidence_library`, `profile_memory`, `artifacts`
- User evidence/memory and uploaded artifact parsing storage.

## C. Listings and companies

### `companies`
- Company metadata and URLs.

### `job_listings`
- FK: `company_id -> companies.id`, `created_by -> accounts.id`
- Listing text fields: title/company/description/requirements/responsibilities/benefits/etc.
- Availability fields: `is_available`, `last_availability_check`.
- Added `company_website_url` in migration `002`.

### `listing_availability_checks`
- FK: `listing_id -> job_listings.id`
- Historical availability checks.

## D. Workflow and generated content

### `workflows`
- FK: `account_id -> accounts.id`, `listing_id -> job_listings.id`, optional `company_id -> companies.id`
- State machine field: `state` (`workflow_state` enum)
- Timing fields: `qa_*`, `generation_*`, `sent_at`, etc.
- Added `notes` in migration `004`.

### `qa_answers`
- FK: `workflow_id`, `account_id`, optional `follow_up_of -> qa_answers.id`
- Sequenced Q&A context capture.

### `outputs`
- FK: `workflow_id`, `account_id`, optional `approved_by`, optional `superseded_by -> outputs.id`
- Document versioning: `type`, `state`, `version`, `is_current`, content.
- Migration `003` adds `status` text column (parallel to `state`).

### `sent_snapshots`, `copy_download_logs`
- Auditing sent/copy/download operations tied to outputs/workflows.

## E. Timeline/chat/insights

### `status_events`
- FK: `workflow_id`, `account_id`
- Event timeline with `event_type`, `occurred_at`, `is_current`.

### `chat_threads`, `chat_messages`, `chat_checkpoints`
- Chat thread/message persistence by workflow and `surface`.
- Unique constraint on `(workflow_id, surface)`.

### `insights`, `insight_preferences`
- Insight records and per-account/listing toggles.

## F. LinkedIn/support/ops

### `linkedin_sessions`, `linkedin_connections`
- Session status and stored connection records (degree 1/2/3).

### `notifications`, `user_preferences`, `deleted_items`, `analytics_events`, `system_config`
- Support/UX/system telemetry and soft-delete recovery.

---

## 3) Key relationships (high-signal)

- `accounts 1--1 profiles` (unique `profiles.account_id`).
- `accounts 1--many workflows`.
- `job_listings 1--many workflows`; each workflow references one listing.
- `workflows 1--many outputs`, `qa_answers`, `status_events`, `chat_threads`, `sent_snapshots`.
- `chat_threads 1--many chat_messages`.
- `companies 1--many job_listings` and optional `workflows.company_id` linkage.
- `deleted_items` stores serialized records for recoverable deletion.

## 4) Records used by major product capabilities

### Job listings
- Primary: `job_listings`
- Related: `companies`, `listing_availability_checks`, `linkedin_connections`

### Profile data
- Primary: `profiles`, `employment_history`, `education`, `certifications`
- Supplemental: `evidence_library`, `profile_memory`, `artifacts`

### Chat/thread state
- Primary: `chat_threads`, `chat_messages`
- Optional: `chat_checkpoints`

### Generated docs
- Primary: `outputs`
- Audit/history: `sent_snapshots`, `copy_download_logs`

### Tracking/support
- Primary: `status_events`, `notifications`, `analytics_events`, `deleted_items`

---

## 5) Mismatch / drift checks (SQL vs TS)

### Observed mismatches
1. `WorkflowState` in `src/types/database.ts` omits `draft`, but migration `003` adds it.
2. `OutputState` in `src/types/database.ts` omits `approved`, but migration `003` adds it.
3. `StatusEventType` in `src/types/database.ts` omits added enum values (`ready`, `submitted`, `interview_scheduled`, `offer_received`, `withdrawn`).
4. `profiles` arrays/`profile_icon` added by migrations are not reflected in the `Profile` interface in `src/types/database.ts`.
5. `job_listings.company_website_url` added in SQL but absent from `JobListing` in `src/types/database.ts`.
6. `outputs.status` exists in SQL (migration `003`) and is used in app runtime, but not represented in DB `Output` interface there.

### Inferred risk
- Type drift can hide runtime schema assumptions and create brittle refactors.

---

## 6) Fields likely unused, legacy, duplicated, or suspicious

### Likely duplicated semantics
- `outputs.state` (enum) and `outputs.status` (text) both indicate document status.

### Possibly stale/underused (uncertain)
- `structured_captures`, `chat_checkpoints`, `insights`, `insight_preferences`, `system_config` appear defined but not central in current UI flows.
- `workflows.resume_state` / `cover_letter_state` may be overshadowed by `outputs` records.

### Lifecycle ambiguity
- `status_events.is_current` exists, but code often appends/deletes events rather than maintaining a strict single-current invariant per status family.

### Denormalization to watch
- `job_listings.company_name` + `company_id` + `companies.name` and duplicated website fields (`job_listings.company_website_url`, `companies.website_url`) can drift without disciplined write rules.

