# Known Gaps & Assumptions

## Known Gaps

### 1. RLS Policies Not Implemented
Row Level Security policies are not yet written for any table. API routes use the admin client (service role key) and handle authorization in application code. RLS should be added as defense-in-depth.

### 2. LinkedIn Session Persistence
LinkedIn sessions are stored in a module-level `Map` and do not persist across server restarts. A persistent session storage mechanism (e.g., cookie export/import) would improve the experience.

### 3. Stripe Not Active
Stripe is installed but no payment flows, webhook handlers, or pricing pages exist. See `docs/stripe-setup.md` for implementation guidance.

### 4. Email Notifications
No email sending is implemented. Consider integrating Supabase Edge Functions, Resend, or SendGrid for transactional email (application reminders, status updates).

### 5. File Upload / Resume Parsing
The `artifacts` table exists for file uploads, but no upload UI or file parsing logic is implemented. Users cannot upload an existing resume as a starting point.

### 6. Automated Tests
No unit, integration, or E2E tests exist. See `docs/test-plan.md` for the test plan.

### 7. Scheduled Jobs
The 30-day deletion expiry is not automatically processed. A cron job or Supabase Edge Function should permanently delete expired items in `deleted_items`.

### 8. Analytics Dashboard
The `analytics_events` table captures events (workflow created, etc.) but there is no analytics dashboard or reporting UI.

### 9. Invite System
The `invites` table exists but no invite creation/redemption UI or API is wired up.

### 10. Education & Certifications UI
The `education` and `certifications` tables exist but the profile page does not yet have sections for managing them.

### 11. PDF Export
The export page currently supports plain text copy and `.txt` download. PDF generation (formatted resume layout) is not yet implemented.

### 12. Negotiation & Interview Guide Prompts
The AI generate route handles `interview_guide` and `negotiation_guide` output types, but the prompts for these document types may need further tuning for quality — they currently share the base resume prompt infrastructure.

## Assumptions

### Authentication
- Internal users always have a valid email in Supabase Auth (even though they log in with username)
- The highest-privilege role is automatically the active role for a session
- Google OAuth callback always creates account records for new users

### Workflow Rules
- Only one active (non-listing_review, non-sent/completed/archived) workflow is allowed at a time
- Navigating to any document editor page while the workflow is in `listing_review` state automatically transitions it to `draft` and sets `is_active = true`
- Deleting a workflow from any editor page routes the user back to the Applications list (`/jobs`)
- Deleting a listing from the listing review page routes back to Listings (`/listings`)

### AI
- AI providers are stateless — no conversation memory beyond the current request
- Chat threads accumulate full message history per surface (resume, cover_letter, interview_guide, negotiation_guide) for context within a session
- AI output is always text/markdown (no binary file generation)
- The listing parse prompt truncates HTML to 15,000 characters to stay within token limits
- Generation fires once per output type; subsequent visits to an editor return the cached `is_current` output rather than regenerating

### Data Model
- UUIDs are used for all primary keys
- Soft-deleted items store a JSON snapshot of the original record
- All timestamps use `TIMESTAMPTZ` (UTC)
- The `is_current` flag on outputs enables version tracking without complex queries
- `company_website_url` is stored on both `job_listings` (authoritative for display) and `companies` (for reuse)

### Security
- Middleware protects dashboard routes at the path level
- API routes independently verify sessions for defense-in-depth
- The admin client bypasses RLS — API-level auth checks are the primary access control
- No rate limiting is implemented on API routes

## Spec Contradictions Resolved

### 1. Support Model
**Spec says**: Full ticket-based support system.
**Decision**: Email-only support. No ticket system in MVP.

### 2. Admin Access
**Spec (Segment 06)**: Suggests broader admin capabilities.
**Spec (Segment 07)**: Stricter access model.
**Decision**: Follow Segment 07's stricter model. Admin features limited to user management and system config.

### 3. Deletion Flows
**Spec**: Mixed messaging on deletion support scope.
**Decision**: Full 30-day soft delete for all deletable entities (workflows). Inline two-step confirm on all pages before deletion is triggered.
