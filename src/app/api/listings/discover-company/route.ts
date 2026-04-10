import { NextRequest, NextResponse } from 'next/server'
import { getProvider } from '@/lib/ai/provider'

export async function POST(request: NextRequest) {
  const { company_name, description, location } = await request.json()

  if (!company_name) {
    return NextResponse.json({ error: 'company_name is required' }, { status: 400 })
  }

  const provider = getProvider()

  const context = [
    description ? `Job description excerpt: "${description.slice(0, 400)}"` : null,
    location ? `Location: ${location}` : null,
  ].filter(Boolean).join('\n')

  try {
    const response = await provider.generate({
      messages: [
        {
          role: 'system',
          content: 'You are a research assistant. Return only the exact URL requested — no explanation, no markdown, no punctuation.',
        },
        {
          role: 'user',
          content: `What is the official company website URL for "${company_name}"?${context ? `\n\nContext:\n${context}` : ''}\n\nReturn only the URL (e.g. https://example.com). If you are not confident, return your best guess anyway.`,
        },
      ],
      maxTokens: 100,
      temperature: 0,
    })

    const raw = response.trim()
    // Extract a URL from the response in case the AI added any prose
    const match = raw.match(/https?:\/\/[^\s"'<>]+/)
    const website_url = match ? match[0].replace(/[.,)]+$/, '') : null

    if (!website_url) {
      return NextResponse.json({ error: 'Could not determine company website' }, { status: 404 })
    }

    return NextResponse.json({ website_url })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI lookup failed' },
      { status: 500 }
    )
  }
}
