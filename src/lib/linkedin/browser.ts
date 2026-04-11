/**
 * LinkedIn Browser Automation
 *
 * Flow:
 * 1. launchLinkedInBrowser — opens a visible Chromium window at linkedin.com/login
 *    Returns immediately; browser runs in background.
 * 2. User signs in manually.
 * 3. verifyLinkedInSession — checks the current URL / navigates to /feed.
 *    On success, saves cookies to disk so the session survives restarts.
 * 4. gatherCompanyData — visits company /people/ page and scrapes connections.
 *    Returns null (with reason) if not authenticated.
 * 5. closeLinkedInBrowser — closes browser and deletes saved cookies.
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const DESKTOP_VIEWPORT = { width: 1280, height: 800 }
const LINKEDIN_BASE = 'https://www.linkedin.com'
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Persist cookies in the OS tmp dir so they survive dev hot-reloads
const COOKIE_DIR = path.join(os.tmpdir(), 'dreamjob-linkedin')

function cookiePath(accountId: string) {
  return path.join(COOKIE_DIR, `${accountId}.json`)
}

function saveCookies(accountId: string, cookies: object[]) {
  fs.mkdirSync(COOKIE_DIR, { recursive: true })
  fs.writeFileSync(cookiePath(accountId), JSON.stringify(cookies), 'utf8')
}

function loadCookies(accountId: string): object[] | null {
  try {
    const raw = fs.readFileSync(cookiePath(accountId), 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function deleteCookies(accountId: string) {
  try { fs.unlinkSync(cookiePath(accountId)) } catch { /* ignore */ }
}

interface LinkedInSession {
  browser: Browser
  context: BrowserContext
  page: Page
  isAuthenticated: boolean
  headful: boolean  // true = visible window launched for manual auth; false = headless for scraping
}

// Module-level map — survives within a single server process
const sessions = new Map<string, LinkedInSession>()

// ─── Launch ────────────────────────────────────────────────────────────────

export async function launchLinkedInBrowser(
  accountId: string
): Promise<{ success: boolean; message: string }> {
  // Close any existing session for this account
  await closeLinkedInBrowser(accountId)

  try {
    const browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    })

    const context = await browser.newContext({
      viewport: DESKTOP_VIEWPORT,
      userAgent: USER_AGENT,
    })

    // Restore saved cookies if we have them
    const savedCookies = loadCookies(accountId)
    if (savedCookies?.length) {
      await context.addCookies(savedCookies as Parameters<typeof context.addCookies>[0])
    }

    const page = await context.newPage()

    sessions.set(accountId, { browser, context, page, isAuthenticated: false, headful: true })

    // Navigate in the background — do NOT await, return immediately
    page
      .goto(`${LINKEDIN_BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      .catch(() => {
        // If navigation fails, try the base URL
        page.goto(LINKEDIN_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
      })

    return { success: true, message: 'Browser launched — please sign in to LinkedIn.' }
  } catch (e) {
    return {
      success: false,
      message: `Failed to launch browser: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

// ─── Verify ────────────────────────────────────────────────────────────────

export async function verifyLinkedInSession(accountId: string): Promise<{
  verified: boolean
  reason?: string
}> {
  const session = sessions.get(accountId)

  // No live browser — try restoring from saved cookies
  if (!session) {
    const saved = loadCookies(accountId)
    if (!saved?.length) return { verified: false, reason: 'No session and no saved cookies.' }

    // Restore a headless context just to verify
    try {
      const browser = await chromium.launch({ headless: true })
      const context = await browser.newContext({ viewport: DESKTOP_VIEWPORT, userAgent: USER_AGENT })
      await context.addCookies(saved as Parameters<typeof context.addCookies>[0])
      const page = await context.newPage()
      await page.goto(`${LINKEDIN_BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const url = page.url()
      const ok = !url.includes('/login') && !url.includes('/authwall') && !url.includes('/checkpoint')
      if (ok) {
        sessions.set(accountId, { browser, context, page, isAuthenticated: true, headful: false })
        return { verified: true }
      }
      await browser.close()
      deleteCookies(accountId)
      return { verified: false, reason: 'Saved cookies are no longer valid.' }
    } catch (e) {
      return { verified: false, reason: `Restore failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  }

  // Live browser exists — check current URL first (non-disruptive)
  try {
    const currentUrl = session.page.url()
    const alreadyIn =
      currentUrl.includes('/feed') ||
      currentUrl.includes('/mynetwork') ||
      currentUrl.includes('/in/') ||
      currentUrl.includes('/jobs') ||
      (currentUrl.includes('linkedin.com') && !currentUrl.includes('/login') && !currentUrl.includes('/authwall'))

    if (alreadyIn) {
      session.isAuthenticated = true
      const cookies = await session.context.cookies()
      saveCookies(accountId, cookies)
      // Only close visible (headful) auth windows. Headless scraping sessions stay alive.
      if (session.headful) {
        await session.browser.close().catch(() => {})
        sessions.delete(accountId)
      }
      return { verified: true }
    }

    // Navigate to feed to check
    await session.page.goto(`${LINKEDIN_BASE}/feed`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    })

    const url = session.page.url()
    const authenticated =
      !url.includes('/login') &&
      !url.includes('/authwall') &&
      !url.includes('/checkpoint')

    if (authenticated) {
      session.isAuthenticated = true
      const cookies = await session.context.cookies()
      saveCookies(accountId, cookies)
      // Only close visible (headful) auth windows. Headless scraping sessions stay alive.
      if (session.headful) {
        await session.browser.close().catch(() => {})
        sessions.delete(accountId)
      }
      return { verified: true }
    }

    return { verified: false, reason: 'Still on login/authwall page — complete sign-in first.' }
  } catch (e) {
    return { verified: false, reason: `Verification error: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// ─── Session status ────────────────────────────────────────────────────────

export function isSessionActive(accountId: string): boolean {
  const session = sessions.get(accountId)
  if (session?.isAuthenticated) return true
  // Also consider it "active" if we have saved cookies (will be verified on next use)
  return !!loadCookies(accountId)?.length
}

// ─── Ensure authenticated before scraping ─────────────────────────────────

async function ensureAuthenticated(accountId: string): Promise<{
  ok: boolean
  session?: LinkedInSession
  reason?: string
}> {
  let session = sessions.get(accountId)

  if (!session) {
    // Try to restore from cookies
    const saved = loadCookies(accountId)
    if (!saved?.length) return { ok: false, reason: 'No LinkedIn session. Connect LinkedIn in Settings.' }

    try {
      const browser = await chromium.launch({ headless: true })
      const context = await browser.newContext({ viewport: DESKTOP_VIEWPORT, userAgent: USER_AGENT })
      await context.addCookies(saved as Parameters<typeof context.addCookies>[0])
      const page = await context.newPage()
      sessions.set(accountId, { browser, context, page, isAuthenticated: false, headful: false })
      session = sessions.get(accountId)!
    } catch (e) {
      return { ok: false, reason: `Failed to restore session: ${e instanceof Error ? e.message : String(e)}` }
    }
  }

  // Quick auth check without navigating away if already on LinkedIn
  if (!session.isAuthenticated) {
    const result = await verifyLinkedInSession(accountId)
    if (!result.verified) {
      // Session is dead — clean up
      await closeLinkedInBrowser(accountId)
      return { ok: false, reason: result.reason ?? 'LinkedIn session expired. Reconnect in Settings.' }
    }
  }

  return { ok: true, session: sessions.get(accountId) }
}

// ─── Gather company data ───────────────────────────────────────────────────

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

export async function gatherCompanyData(
  accountId: string,
  companyLinkedInUrl: string,
  companyName?: string
): Promise<{ data: CompanyLinkedInData | null; error?: string }> {
  const auth = await ensureAuthenticated(accountId)
  if (!auth.ok) return { data: null, error: auth.reason }

  const { session } = auth
  if (!session) return { data: null, error: 'Session lost after authentication. Try reconnecting LinkedIn.' }

  const page = session.page

  try {
    // Derive a search term: prefer explicit companyName, else humanise the URL slug
    // e.g. "https://www.linkedin.com/company/acme-corp" → "acme corp"
    const urlSlug = companyLinkedInUrl
      .replace(/\/$/, '')
      .split('/company/')
      .pop()
      ?.split('/')?.[0]
      ?.replace(/-/g, ' ') ?? ''
    const rawName = (companyName ?? urlSlug).trim()

    // Strip common legal suffixes that won't appear in LinkedIn autocomplete
    // e.g. "CrowdStrike, Inc." → "CrowdStrike"
    const searchTerm = rawName
      .replace(/,?\s*(Inc\.?|LLC\.?|Ltd\.?|Corp\.?|Co\.?|L\.P\.?|PLC\.?|GmbH|S\.A\.?)$/i, '')
      .trim()

    if (!searchTerm) {
      return { data: null, error: 'Could not determine company name for search.' }
    }

    // ── 1. Start at the feed page ─────────────────────────────────────────────
    await page.goto(`${LINKEDIN_BASE}/feed`, { waitUntil: 'domcontentloaded', timeout: 20000 })

    // Guard against session expiry
    const landedUrl = page.url()
    if (landedUrl.includes('/login') || landedUrl.includes('/authwall')) {
      session.isAuthenticated = false
      deleteCookies(accountId)
      return { data: null, error: 'LinkedIn session expired. Reconnect in Settings.' }
    }

    await page.waitForTimeout(1500)

    // ── 2. Type company name into the top search bar ──────────────────────────
    const searchInput = page.locator(
      '[data-testid="typeahead-input"], input[placeholder*="looking for" i], input[aria-autocomplete="list"]'
    ).first()
    await searchInput.click({ timeout: 10000 })
    await searchInput.fill(searchTerm)
    await page.waitForTimeout(1500)   // let autocomplete populate

    // ── 3. Click the company result in the autocomplete dropdown ─────────────
    // LinkedIn autocomplete shows entity type as a secondary line (e.g. "Company").
    // We find the first result whose text matches our search term and is a company/page.
    const clicked = await page.evaluate((term: string) => {
      // Autocomplete results live in a listbox/dropdown
      const items = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[role="option"], [role="listitem"], .search-global-typeahead__suggestions-item, li'
        )
      )
      for (const item of items) {
        const text = (item.innerText ?? '').toLowerCase()
        // Must contain our search term AND a company indicator
        const hasCompanyLabel = /company|page|organization/i.test(text)
        const hasTerm = text.includes(term.toLowerCase())
        if (hasTerm && hasCompanyLabel) {
          // Click the anchor or the item itself
          const anchor = item.querySelector<HTMLElement>('a, button') ?? item
          anchor.click()
          return true
        }
      }
      // Fallback: click the first result that contains the term
      for (const item of items) {
        const text = (item.innerText ?? '').toLowerCase()
        if (text.includes(term.toLowerCase())) {
          const anchor = item.querySelector<HTMLElement>('a, button') ?? item
          anchor.click()
          return true
        }
      }
      return false
    }, searchTerm)

    if (!clicked) {
      return { data: null, error: `Could not find "${searchTerm}" in LinkedIn search autocomplete. Try searching manually.` }
    }

    // Wait for the company search-result page to load
    await page.waitForTimeout(3000)

    // Capture the URL now — we'll reload it fresh before each degree scrape
    // so we never need to worry about toggle state carrying over
    const searchResultUrl = page.url()

    const result: CompanyLinkedInData = {
      name: searchTerm,
      description: null,
      industry: null,
      size: null,
      headquarters: null,
      website: null,
      recentPosts: [],
      connections: { first: [], second: [], third: [] },
    }

    // Grab the company name from the card at the top if available
    const h1 = (await page.locator('h1').first().textContent().catch(() => null))?.trim()
    if (h1) result.name = h1

    // ── 4. Scrape connections via degree toggle buttons ───────────────────────
    //
    // Degree filters are <label> elements: <label for=":r0:">1st</label> etc.
    // They are toggles — one click on, one click off. To avoid stale toggle state
    // carrying over between degrees, we reload the search result page fresh before
    // each degree click.
    //
    const DEGREES: Array<{ key: 'first' | 'second' | 'third'; labels: string[] }> = [
      { key: 'first',  labels: ['1st', '1st degree', 'first degree'] },
      { key: 'second', labels: ['2nd', '2nd degree', 'second degree'] },
      { key: 'third',  labels: ['3rd', '3rd+', '3rd degree', 'third degree'] },
    ]

    // Helper: collect all visible /in/ profile links + names from the page.
    // Uses img[alt] inside profile links — the photo alt="Full Name" is the most
    // reliable source because the outer card <a> and inner name <a> share the
    // same href, causing dedup-by-href to miss the inner link.
    async function scrapeVisibleProfiles(): Promise<LinkedInPerson[]> {
      return page.evaluate((base: string) => {
        const out: { name: string; profileUrl: string }[] = []
        const seen = new Set<string>()

        for (const img of Array.from(document.querySelectorAll<HTMLImageElement>('a[href*="/in/"] img[alt]'))) {
          const name = (img.alt ?? '').trim()
          if (!name || name.length < 2 || name.length > 80) continue

          const link = img.closest<HTMLAnchorElement>('a[href*="/in/"]')
          if (!link) continue

          const href = (link.href ?? '').split('?')[0]
          const segments = href.replace(/^https?:\/\/[^/]+/, '').split('/').filter(Boolean)
          if (segments.length < 2 || segments[0] !== 'in') continue
          if (seen.has(href)) continue

          seen.add(href)
          out.push({ name, profileUrl: href.startsWith('http') ? href : `${base}${href}` })
          if (out.length >= 50) break
        }
        return out
      }, LINKEDIN_BASE)
    }

    for (const { key, labels } of DEGREES) {
      // Reload the page fresh so no previous degree toggle is active
      await page.goto(searchResultUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.waitForTimeout(2000)

      const degreeClicked = await page.evaluate((labelList: string[]) => {
        const candidates = Array.from(
          document.querySelectorAll<HTMLElement>('label, button, [role="tab"], [role="button"], [role="option"]')
        )
        for (const el of candidates) {
          const text = (el.innerText ?? '').trim().toLowerCase()
          if (labelList.some(l => text === l.toLowerCase())) {
            el.click()
            return true
          }
        }
        return false
      }, labels)

      if (!degreeClicked) continue

      // Wait for the filtered list to re-render
      await page.waitForTimeout(2500)

      result.connections[key] = await scrapeVisibleProfiles()
    }

    // Refresh saved cookies after successful scrape
    const cookies = await session.context.cookies()
    saveCookies(accountId, cookies)

    return { data: result }
  } catch (e) {
    return { data: null, error: `Scrape failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// ─── Close ─────────────────────────────────────────────────────────────────

export async function closeLinkedInBrowser(accountId: string): Promise<void> {
  const session = sessions.get(accountId)
  if (session?.browser) {
    await session.browser.close().catch(() => {})
  }
  sessions.delete(accountId)
}

export async function revokeLinkedInSession(accountId: string): Promise<void> {
  await closeLinkedInBrowser(accountId)
  deleteCookies(accountId)
}
