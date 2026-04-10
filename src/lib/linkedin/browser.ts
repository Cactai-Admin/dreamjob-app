/**
 * LinkedIn Browser Automation
 *
 * Uses Playwright to manage an authenticated LinkedIn session.
 * The browser opens in forced desktop viewport, the user signs in manually,
 * then the browser runs in the background for data gathering.
 *
 * Flow:
 * 1. Launch browser in desktop viewport (1280x800)
 * 2. Navigate to LinkedIn login
 * 3. User signs in manually (we detect successful login)
 * 4. Browser becomes background-only
 * 5. When a job listing URL is added, system resolves company LinkedIn URL
 * 6. Visit company page, gather info, connections, posting activity
 * 7. Return structured data to the system
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

const DESKTOP_VIEWPORT = { width: 1280, height: 800 }
const LINKEDIN_BASE = 'https://www.linkedin.com'

interface LinkedInSessionState {
  browser: Browser | null
  context: BrowserContext | null
  page: Page | null
  isAuthenticated: boolean
}

// Module-level session state (per server instance)
const sessions = new Map<string, LinkedInSessionState>()

export async function launchLinkedInBrowser(accountId: string): Promise<{ success: boolean; message: string }> {
  // Clean up existing session
  const existing = sessions.get(accountId)
  if (existing?.browser) {
    await existing.browser.close().catch(() => {})
  }

  try {
    const browser = await chromium.launch({
      headless: false, // User needs to see the login page
      args: ['--disable-blink-features=AutomationControlled'],
    })

    const context = await browser.newContext({
      viewport: DESKTOP_VIEWPORT,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })

    const page = await context.newPage()
    await page.goto(`${LINKEDIN_BASE}/login`, { waitUntil: 'networkidle' })

    sessions.set(accountId, {
      browser,
      context,
      page,
      isAuthenticated: false,
    })

    return { success: true, message: 'LinkedIn browser launched. Please sign in.' }
  } catch (e) {
    return {
      success: false,
      message: `Failed to launch browser: ${e instanceof Error ? e.message : 'Unknown error'}`,
    }
  }
}

export async function verifyLinkedInSession(accountId: string): Promise<boolean> {
  const session = sessions.get(accountId)
  if (!session?.page) return false

  try {
    // Check if we're on the LinkedIn feed (authenticated)
    const url = session.page.url()
    const isOnFeed = url.includes('/feed') || url.includes('/mynetwork') || url.includes('/in/')

    if (isOnFeed) {
      session.isAuthenticated = true
      return true
    }

    // Try navigating to feed to check
    await session.page.goto(`${LINKEDIN_BASE}/feed`, { waitUntil: 'networkidle', timeout: 10000 })
    const newUrl = session.page.url()
    const authenticated = !newUrl.includes('/login') && !newUrl.includes('/authwall')

    session.isAuthenticated = authenticated
    return authenticated
  } catch {
    return false
  }
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
    profileUrl: string
    name: string
    title: string
    degree: number
  }[]
}

export async function gatherCompanyData(
  accountId: string,
  companyLinkedInUrl: string
): Promise<CompanyLinkedInData | null> {
  const session = sessions.get(accountId)
  if (!session?.page || !session.isAuthenticated) return null

  try {
    const page = session.page

    // Visit company page
    await page.goto(companyLinkedInUrl, { waitUntil: 'networkidle', timeout: 15000 })

    // Extract company info
    const companyData: CompanyLinkedInData = {
      name: '',
      description: null,
      industry: null,
      size: null,
      headquarters: null,
      website: null,
      recentPosts: [],
      connections: [],
    }

    // Company name
    companyData.name = await page.locator('h1').first().textContent() ?? ''

    // Company description (about section)
    const aboutSection = page.locator('[data-test-id="about-us"]').first()
    if (await aboutSection.isVisible().catch(() => false)) {
      companyData.description = await aboutSection.textContent()
    }

    // Try to get overview details
    const detailItems = page.locator('.org-top-card-summary-info-list__info-item')
    const detailCount = await detailItems.count().catch(() => 0)
    for (let i = 0; i < detailCount; i++) {
      const text = await detailItems.nth(i).textContent()
      if (text) {
        if (text.includes('employees')) companyData.size = text.trim()
        else if (text.includes(',')) companyData.headquarters = text.trim()
        else companyData.industry = text.trim()
      }
    }

    // Visit company posts
    try {
      await page.goto(`${companyLinkedInUrl}/posts/`, { waitUntil: 'networkidle', timeout: 10000 })
      const posts = page.locator('.feed-shared-update-v2__description')
      const postCount = Math.min(await posts.count().catch(() => 0), 5)
      for (let i = 0; i < postCount; i++) {
        const text = await posts.nth(i).textContent()
        if (text) {
          companyData.recentPosts.push({ text: text.trim().slice(0, 500), date: new Date().toISOString() })
        }
      }
    } catch { /* posts page may not load */ }

    // Visit people page for connections
    try {
      await page.goto(`${companyLinkedInUrl}/people/`, { waitUntil: 'networkidle', timeout: 10000 })

      // Look for connection cards
      const peopleCards = page.locator('.org-people-profile-card')
      const cardCount = Math.min(await peopleCards.count().catch(() => 0), 20)

      for (let i = 0; i < cardCount; i++) {
        const card = peopleCards.nth(i)
        const nameEl = card.locator('.org-people-profile-card__profile-title')
        const titleEl = card.locator('.artdeco-entity-lockup__subtitle')
        const linkEl = card.locator('a[href*="/in/"]').first()

        const name = await nameEl.textContent().catch(() => null)
        const title = await titleEl.textContent().catch(() => null)
        const href = await linkEl.getAttribute('href').catch(() => null)

        // Determine connection degree from badge
        const degreeEl = card.locator('.dist-value')
        const degreeText = await degreeEl.textContent().catch(() => '')
        let degree = 3
        if (degreeText?.includes('1st')) degree = 1
        else if (degreeText?.includes('2nd')) degree = 2

        if (name && href) {
          companyData.connections.push({
            profileUrl: href.startsWith('http') ? href : `${LINKEDIN_BASE}${href}`,
            name: name.trim(),
            title: title?.trim() ?? '',
            degree,
          })
        }
      }
    } catch { /* people page may not load */ }

    return companyData
  } catch {
    return null
  }
}

export async function closeLinkedInBrowser(accountId: string): Promise<void> {
  const session = sessions.get(accountId)
  if (session?.browser) {
    await session.browser.close().catch(() => {})
    sessions.delete(accountId)
  }
}

export function isSessionActive(accountId: string): boolean {
  const session = sessions.get(accountId)
  return !!session?.isAuthenticated
}
