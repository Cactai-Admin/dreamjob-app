import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getProvider } from '@/lib/ai/provider'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

const SYSTEM_PROMPT = `You are a resume and cover letter parser. Extract structured profile data from the provided document content.

Return ONLY valid JSON in this exact shape:
{
  "profile": {
    "first_name": "..." or null,
    "last_name": "..." or null,
    "email": "..." or null,
    "phone": "..." or null,
    "location": "..." or null,
    "headline": "one-line professional headline" or null,
    "summary": "professional summary paragraph" or null,
    "linkedin_url": "..." or null,
    "github_url": "..." or null,
    "portfolio_url": "..." or null,
    "skills": ["skill1", "skill2", ...],
    "keywords": ["keyword1", "keyword2", ...],
    "tools": ["tool1", "tool2", ...],
    "certifications": ["cert1", "cert2", ...],
    "clearances": ["clearance1", ...]
  },
  "employment": [
    {
      "company_name": "...",
      "title": "...",
      "location": "..." or null,
      "start_date": "Mon YYYY or YYYY" or null,
      "end_date": "Mon YYYY or YYYY" or null,
      "is_current": true or false,
      "description": "role summary" or null,
      "technologies": ["tech1", "tech2", ...]
    }
  ],
  "education": [
    {
      "institution": "...",
      "degree": "BS, MS, PhD, etc." or null,
      "field_of_study": "..." or null,
      "start_date": "YYYY" or null,
      "end_date": "YYYY" or null,
      "gpa": "..." or null,
      "description": null
    }
  ]
}

Rules:
- Only include fields that are clearly present in the document. Use null for anything not found.
- skills: concrete, named capabilities and competencies (e.g. "Financial Modeling", "Public Speaking", "Data Analysis", "Project Management"). Do NOT put software or platforms here.
- tools: software applications, platforms, and technologies (e.g. "Salesforce", "Excel", "Python", "Tableau", "JIRA", "Slack").
- keywords: ATS/industry buzzwords, domain terms, methodologies, soft skills (e.g. "B2B SaaS", "cross-functional leadership", "agile methodology", "go-to-market").
- certifications: named credentials, licenses, or professional designations (e.g. "PMP", "CPA", "AWS Solutions Architect", "Series 7").
- clearances: government or security clearances (e.g. "Secret", "Top Secret", "TS/SCI", "Public Trust").
- All profile arrays must be flat arrays of strings (no objects).
- employment and education must be arrays (empty array if none found).
- For cover letters, extract name/contact info/summary only — employment/education will usually be absent.
- Do not invent or guess information.`

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await request.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: 'No content provided' }, { status: 400 })
  }

  const provider = getProvider()
  if (!provider.isConfigured()) {
    return NextResponse.json({ error: 'No AI provider configured' }, { status: 503 })
  }

  try {
    const result = await provider.generate({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Parse this document:\n\n${content.slice(0, 20000)}` },
      ],
      temperature: 0.1,
    })

    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse document structure' }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Parse failed' },
      { status: 500 }
    )
  }
}
