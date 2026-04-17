# LinkedIn Integration

DreamJob uses browser automation (Playwright) to gather company insights from LinkedIn. This is **not** LinkedIn OAuth — it uses a real browser session where the user manually signs in.

## How It Works

1. **User initiates**: Click "Connect LinkedIn" in the app
2. **Browser opens**: A Chromium browser window opens in forced desktop view (1280x800)
3. **User signs in**: The user manually logs into LinkedIn in the browser
4. **Session verified**: The app verifies the session is authenticated
5. **Background mode**: The browser window becomes a background process
6. **Company research**: When a job listing is added, the system:
   - Uses AI to resolve the company's LinkedIn URL from the listing
   - Visits the company LinkedIn page via the authenticated session
   - Gathers company info (name, industry, size, description)
   - Checks the company's recent posting activity
   - Discovers 1st, 2nd, and 3rd degree connections at the company
7. **Insights populated**: Data is saved to the insights and listing sections

## Prerequisites

Playwright needs to be installed with browser binaries:

```bash
npx playwright install chromium
```

LinkedIn authenticated-session automation is currently **local-runtime only**. Hosted/serverless deployments cannot launch the interactive browser sign-in flow.

## Usage

### Starting a LinkedIn Session

The LinkedIn session is managed per-user. Start it from the dashboard or via the API:

```
POST /api/linkedin/session
Body: { "action": "launch" }
```

This opens a Chromium browser. Sign into LinkedIn manually.

### Verifying the Session

After signing in:

```
POST /api/linkedin/session
Body: { "action": "verify" }
```

Returns `{ authenticated: true }` if the session is valid.

### Gathering Company Data

When a workflow has a company with a LinkedIn URL:

```
POST /api/linkedin/company
Body: {
  "company_linkedin_url": "https://linkedin.com/company/acme-corp",
  "company_id": "uuid",
  "listing_id": "uuid",
  "workflow_id": "uuid"
}
```

This gathers:
- Company name, description, industry, size
- Recent posts from the company page
- 1st/2nd/3rd degree connections at the company

### Checking Session Status

```
GET /api/linkedin/session
```

Response includes runtime capability and readiness checks:

- `runtime.canLaunchInteractiveSession` — whether LinkedIn session launch/verify is supported in this runtime
- `runtime.mode` — `local-browser` or `hosted-unsupported`
- `runtime.checks[]` — explicit pass/fail checks describing why hosted runtime is blocked

### Closing the Session

```
DELETE /api/linkedin/session
```

## Architecture

The LinkedIn automation is in `src/lib/linkedin/browser.ts`:

- **`launchLinkedInBrowser(accountId)`** — Opens Chromium with desktop viewport and user agent
- **`verifyLinkedInSession(accountId)`** — Checks if user is on an authenticated LinkedIn page
- **`gatherCompanyData(accountId, companyUrl)`** — Visits company page, extracts data, checks connections
- **`closeLinkedInBrowser(accountId)`** — Closes the browser instance
- **`isSessionActive(accountId)`** — Checks if a browser session exists

Sessions are stored in a module-level `Map<string, BrowserSession>` keyed by account ID.

## Limitations

- **Manual sign-in required**: Each session requires the user to manually sign in to LinkedIn
- **Session persistence**: Sessions don't persist across server restarts
- **Hosted limitation**: Vercel/serverless/production hosted runtimes are intentionally staged as unavailable for LinkedIn authenticated browser sessions
- **Page structure changes**: If LinkedIn changes their HTML structure, selectors may need updating
- **Rate limiting**: LinkedIn may rate-limit or block automated browsing
- **Desktop only for launch**: The initial browser window must be visible for sign-in (not headless)

## Data Gathered

### Company Info
- Company name
- Description
- Industry
- Company size
- Headquarters location

### Recent Activity
- Recent posts from the company's LinkedIn page
- Post content and engagement metrics (when available)

### Connections
- 1st degree connections (direct)
- 2nd degree connections (friend of friend)
- 3rd degree connections
- For each: name, title, profile URL

## Troubleshooting

### Browser doesn't open

Ensure Playwright and Chromium are installed:
```bash
npx playwright install chromium
```

### "Session not found" error

The LinkedIn session may have expired or the server restarted. Launch a new session.

### LinkedIn blocks the browser

LinkedIn may detect automated browsing. Try:
- Signing in normally and interacting briefly before automation
- Waiting between requests
- Using your regular browsing patterns

### Selectors return empty data

LinkedIn may have changed their page structure. Check `src/lib/linkedin/browser.ts` and update the CSS selectors to match the current LinkedIn layout.

## Note on "Openclaw Browser"

The current implementation uses Playwright's Chromium. If you intended to use a different browser tool (e.g., "openclaw"), replace the Playwright calls in `src/lib/linkedin/browser.ts` with your preferred browser automation library. The API layer (`/api/linkedin/*`) remains the same regardless of the browser engine used.
