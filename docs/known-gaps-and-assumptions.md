# Known Gaps & Assumptions

## Known Gaps

### 1. RLS Policies Not Implemented
Row Level Security policies are not yet written for any table. API routes use the admin client (service role key) and handle authorization in application code. RLS should be added as defense-in-depth.

### 2. LinkedIn "Openclaw Browser"
The user specified "openclaw browser" for LinkedIn automation. The current implementation uses Playwright's Chromium instead. If "openclaw" refers to a specific tool, the browser automation layer in `src/lib/linkedin/browser.ts` will need to be updated.

### 3. LinkedIn Session Persistence
LinkedIn sessions are stored in a module-level `Map` and do not persist across server restarts. A persistent session storage mechanism (e.g., cookie export/import) would improve the experience.

### 4. Stripe Not Active
Stripe is installed but no payment flows, webhook handlers, or pricing pages exist. See `docs/stripe-setup.md` for implementation guidance.

### 5. Email Notifications
The spec mentions email-based support. No email sending is implemented. Consider integrating Supabase Edge Functions, Resend, or SendGrid for transactional email.

### 6. File Upload / Resume Parsing
The `artifacts` table exists for file uploads, but no upload UI or file parsing logic is implemented. Users would need a file upload component and server-side parsing (PDF/DOCX extraction).

### 7. Automated Tests
No unit, integration, or E2E tests exist. See `docs/test-plan.md` for the test plan.

### 8. Scheduled Jobs
The 30-day deletion expiry and listing availability checks are not automatically processed. A cron job or Supabase Edge Function should handle:
- Permanently deleting expired items in `deleted_items`
- Periodic listing availability checks via `listing_availability_checks`

### 9. Analytics Dashboard
The `analytics_events` table captures events but there's no analytics dashboard or reporting UI.

### 10. Invite System
The `invites` table exists but no invite creation/redemption UI or API is fully wired up.

### 11. Education & Certifications UI
The `education` and `certifications` tables exist but no profile pages for managing them are built.

## Assumptions

### Authentication
- Internal users always have a valid email in Supabase Auth (even though they log in with username)
- The highest-privilege role is automatically the active role for a session
- Google OAuth callback always creates account records for new users

### Workflow Rules
- Only one active (non-sent/completed/archived) workflow is allowed at a time
- The Q&A phase transitions the workflow state to `qa_intake` on first answer
- The `[QA_COMPLETE]` marker in AI responses triggers transition to `review` state
- Status dependencies are validated at the API level, not the database level

### AI
- AI providers are stateless — no conversation memory beyond the current request
- Chat threads accumulate full message history for context
- AI output is always text/markdown (no binary file generation)
- The listing parse prompt truncates HTML to 15,000 characters to stay within token limits

### Data Model
- UUIDs are used for all primary keys
- Soft-deleted items store a JSON snapshot of the original record
- All timestamps use `TIMESTAMPTZ` (UTC)
- The `is_current` flag on outputs and status_events enables version tracking without complex queries

### Security
- The proxy (middleware) protects routes at the path level
- API routes independently verify sessions for defense-in-depth
- The admin client bypasses RLS — API-level auth checks are the primary access control
- No rate limiting is implemented on API routes

## Spec Contradictions Resolved

### 1. Support Model
**Spec says**: Full ticket-based support system.
**Decision**: Email-only support. No ticket system in MVP. Rationale: Reduces complexity, can be added later.

### 2. Admin Access
**Spec (Segment 06)**: Suggests broader admin capabilities.
**Spec (Segment 07)**: Stricter access model.
**Decision**: Follow Segment 07's stricter model. Admin features limited to user management and system config.

### 3. Deletion Flows
**Spec**: Mixed messaging on deletion support scope.
**Decision**: Full 30-day soft delete for all deletable entities. Thin support — no admin override for permanent deletion before expiry.
