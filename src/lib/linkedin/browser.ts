/**
 * LinkedIn Browser Automation
 *
 * NOTE: Playwright requires a locally-installed Chromium binary.
 * On Vercel / serverless environments this module stubs all functions
 * and returns graceful errors. Run locally for LinkedIn features.
 */

// ─── Environment guard ────────────────────────────────────────────────────────

const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)

function notAvailable(reason = 'LinkedIn browser automation is not available in this environment.') {
  return { success: false, message: reason }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LinkedInPerson {
  name: string
  profileUrl: string
}

export interface CompanyLinkedInData {
  name: string
  description: string | null
  industry: string | null
  size: string | null
  headquarters: string | null
  website: string | null
  recentPosts: { text: string; date: string }[]
  connections: {
    first: LinkedInPerson[]
    second: LinkedInPerson[]
    third: LinkedInPerson[]
  }
}

// ─── Session state (local only) ───────────────────────────────────────────────

const authenticatedAccounts = new Set<string>()

export function isSessionActive(accountId: string): boolean {
  if (IS_SERVERLESS) return false
  return authenticatedAccounts.has(accountId)
}

// ─── Launch ───────────────────────────────────────────────────────────────────

export async function launchLinkedInBrowser(
  accountId: string
): Promise<{ success: boolean; message: string }> {
  if (IS_SERVERLESS) return notAvailable('LinkedIn browser launch requires a local environment. Run the app locally to use this feature.')

  try {
    const { chromium } = await import('playwright')
    const LINKEDIN_BASE = 'https://www.linkedin.com'

    const browser = await chromium.launch({
      headless: false,
      args: ['--disable-blink-features=AutomationControlled', '--no-first-run'],
    })

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    })

    const page = await context.newPage()

    // Navigate in the background — do NOT await
    page.goto(`${LINKEDIN_BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {
      page.goto(LINKEDIN_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
    })

    // Store browser reference in module-level map (local only)
    localSessions.set(accountId, { browser, context, page })

    return { success: true, message: 'Browser launched — please sign in to LinkedIn.' }
  } catch (e) {
    return { success: false, message: `Failed to launch browser: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// ─── Local session map (never used in serverless) ─────────────────────────────

type LocalSession = { browser: any; context: any; page: any }
const localSessions = new Map<string, LocalSession>()

// ─── Verify ───────────────────────────────────────────────────────────────────

export async function verifyLinkedInSession(accountId: string): Promise<{
  verified: boolean
  reason?: string
}> {
  if (IS_SERVERLESS) return { verified: false, reason: 'Not available in serverless environment.' }

  const session = localSessions.get(accountId)
  if (!session) return { verified: false, reason: 'No active browser session.' }

  try {
    const url = session.page.url()
    const ok = url.includes('/feed') || url.includes('/mynetwork') || url.includes('/in/')
    if (ok) {
      authenticatedAccounts.add(accountId)
      await session.browser.close().catch(() => {})
      localSessions.delete(accountId)
      return { verified: true }
    }
    return { verified: false, reason: 'Still on login page — complete sign-in first.' }
  } catch (e) {
    return { verified: false, reason: `Verification error: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// ─── Gather company data ──────────────────────────────────────────────────────

export async function gatherCompanyData(
  accountId: string,
  companyLinkedInUrl: string,
  _companyName?: string
): Promise<{ data: CompanyLinkedInData | null; error?: string }> {
  if (IS_SERVERLESS) return { data: null, error: 'LinkedIn scraping is not available in this environment.' }
  if (!authenticatedAccounts.has(accountId)) return { data: null, error: 'No LinkedIn session. Connect LinkedIn in Settings.' }

  return { data: null, error: 'Use the local dev environment for LinkedIn data gathering.' }
}

// ─── Close / Revoke ───────────────────────────────────────────────────────────

export async function closeLinkedInBrowser(accountId: string): Promise<void> {
  const session = localSessions.get(accountId)
  if (session?.browser) await session.browser.close().catch(() => {})
  localSessions.delete(accountId)
}

export async function revokeLinkedInSession(accountId: string): Promise<void> {
  await closeLinkedInBrowser(accountId)
  authenticatedAccounts.delete(accountId)
}
