# Test Plan

## Manual Testing Checklist

### Authentication

- [ ] **Internal login**: Sign in with admin@dreamjob.app / test1234
- [ ] **Internal login (username)**: Sign in with "superadmin" as identifier
- [ ] **Invalid credentials**: Shows error message
- [ ] **Session persistence**: Refresh page stays logged in
- [ ] **Sign out**: Clears session, redirects to login
- [ ] **Protected routes**: Unauthenticated access redirects to /login
- [ ] **Google OAuth**: (After configuration) Sign in with Google account
- [ ] **OAuth callback**: New Google user gets account + profile created

### Dashboard (Home)

- [ ] **Empty state**: Shows "Ghost Town" message when no workflows
- [ ] **Stats cards**: Display correct counts for active/ready/sent
- [ ] **Active workflow card**: Shows current workflow with correct state
- [ ] **Recent activity**: Lists recent status events

### Jobs

- [ ] **URL input**: Enter a job listing URL and click Go
- [ ] **Manual entry**: Open dialog, fill in company/title/description, create
- [ ] **One-active-workflow rule**: Cannot create second active workflow
- [ ] **Workflow cards**: List all workflows with correct state badges

### Job Detail (Jobs/[id])

- [ ] **Listing tab**: Shows parsed listing data
- [ ] **Q&A tab**: Chat interface works (requires AI provider)
- [ ] **Outputs tab**: Generate resume/cover letter (requires AI provider)
- [ ] **Output versioning**: Regenerating creates new version, marks previous as non-current
- [ ] **Status tab**: Timeline shows status events
- [ ] **Status dependencies**: Cannot add interview without sent, etc.

### Ready

- [ ] **Lists ready workflows**: Only shows ready/ready_to_send state
- [ ] **Copy to clipboard**: Copies output content
- [ ] **Mark as sent**: Creates snapshot and updates workflow state

### Sent

- [ ] **Lists sent workflows**: Shows sent/completed workflows
- [ ] **Status updates**: Add interview, offer, negotiation, hired, rejected, ghosted, declined
- [ ] **Status conflicts**: Cannot add conflicting statuses

### Profile

- [ ] **View profile**: Shows current profile data
- [ ] **Edit profile**: Change fields and save
- [ ] **Quick links**: Navigate to employment, deleted files, settings

### Employment History

- [ ] **Add employment**: Fill dialog, create record
- [ ] **Current position**: Toggle is_current, hides end date
- [ ] **Employment list**: Shows all records sorted by current/date

### Settings

- [ ] **Theme switching**: Light, dark, system themes work
- [ ] **Privacy toggles**: Switches toggle correctly
- [ ] **Account info**: Shows email and role

### Deleted Files

- [ ] **Empty state**: Shows message when no deleted items
- [ ] **Restore**: Restores a deleted workflow
- [ ] **Permanent delete**: Confirms and permanently removes
- [ ] **Expiry countdown**: Shows correct days remaining
- [ ] **One-active-workflow check**: Cannot restore workflow if one is already active

### Admin

- [ ] **Access control**: Only super_admin and admin can view
- [ ] **User list**: Shows all accounts with provider and state badges
- [ ] **Stats**: Correct counts for total/active/internal users

### LinkedIn (Requires Playwright + manual setup)

- [ ] **Launch browser**: Opens Chromium window
- [ ] **Manual sign-in**: User can log into LinkedIn
- [ ] **Verify session**: Confirms authenticated state
- [ ] **Company data**: Gathers company info from LinkedIn URL
- [ ] **Connections**: Discovers degree-based connections
- [ ] **Close session**: Closes browser cleanly

### AI Features (Requires API key)

- [ ] **Q&A chat**: AI asks relevant questions about the listing
- [ ] **Resume generation**: Produces tailored resume content
- [ ] **Cover letter generation**: Produces tailored cover letter
- [ ] **Interview guide**: Generates interview preparation guide
- [ ] **Negotiation guide**: Generates salary negotiation guide
- [ ] **Provider fallback**: Uses OpenAI if Anthropic key not set
- [ ] **No provider**: Shows helpful error when neither key is set

### Responsive Design

- [ ] **Desktop sidebar**: Collapsible, shows tooltips when collapsed
- [ ] **Mobile nav**: Bottom navigation bar on mobile
- [ ] **Form layouts**: Stack properly on narrow screens
- [ ] **Cards**: Responsive grid layouts

## Automated Test Setup (Future)

When adding automated tests, consider:

- **Unit tests**: Validators (zod schemas), utility functions, role hierarchy
- **API route tests**: Use supertest or similar with mocked Supabase client
- **Component tests**: React Testing Library for UI components
- **E2E tests**: Playwright for full user flows (login → create workflow → generate → send)

### Recommended Test Framework

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### Key Test Scenarios for Automation

1. Zod validators accept/reject expected inputs
2. Role hierarchy correctly ranks roles
3. Status dependency validation works
4. One-active-workflow rule enforced
5. 30-day soft delete lifecycle
6. AI provider selection logic
