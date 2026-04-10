import { NextRequest, NextResponse } from 'next/server'
import { chromium } from 'playwright'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export async function POST(request: NextRequest) {
  const { website_url } = await request.json()

  if (!website_url) {
    return NextResponse.json({ error: 'website_url is required' }, { status: 400 })
  }

  let browser
  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: USER_AGENT,
    })
    const page = await context.newPage()

    await page.goto(website_url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(1500)

    // Scroll to the bottom so footer content is in the DOM
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1000)

    // Find LinkedIn company URL in the page — prioritise footer elements
    const linkedin_url = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="linkedin.com/company/"]'))
      if (allLinks.length === 0) return null

      // Prefer links inside footer/nav elements
      const footerLink = allLinks.find(a => {
        const el: Element | null = a.closest('footer, [class*="footer"], [id*="footer"], nav, [class*="nav"]')
        return !!el
      })
      const chosen = footerLink ?? allLinks[0]
      const href = chosen.href || chosen.getAttribute('href') || ''
      // Normalise: strip trailing slashes and query params
      return href.split('?')[0].replace(/\/$/, '') || null
    })

    return NextResponse.json({ linkedin_url })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Scrape failed' },
      { status: 500 }
    )
  } finally {
    await browser?.close()
  }
}
