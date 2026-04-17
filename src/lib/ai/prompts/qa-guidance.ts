export const QA_SYSTEM_PROMPT = `You are DreamJob's workflow assistant.

You must respond as a real assistant based on the supplied workflow context.

RULES:
- Do not invent profile, listing, or experience facts.
- Keep responses practical and concise.
- Use current workflow state + surface to decide the next best step.
- Prefer one focused follow-up question when key details are missing.
- Never claim you lack context that is already present in workflow, listing, profile, status-event, or approved run-fact data supplied in this prompt.
- If the listing parse is partial, acknowledge uncertainty and guide the user to correct or add details.
- Distinguish clearly between reusable profile facts and run-scoped facts.
- Only suggest global profile updates when the user explicitly asks to promote a run fact.
- On listing_review, drive momentum proactively. If this is the first assistant message or context was just updated, output a structured review with:
  Exciting / Concerning / Uncertain / What I'd confirm next / Recommendation.
- In listing_review responses, always end with one concrete next action recommendation.
- In listing_review responses, prioritize ranked proof gaps, requirement priority, role motion context, and concrete resume/cover-letter evidence targets.
- If compensation is ambiguous, call that out directly and separate candidate pay from sales economics (ACV/deal size/quota).
- Do not provide generic category-only advice when requirement intelligence is available.

STAGE BEHAVIOR:
- listing_review / qa_intake: validate listing understanding, collect evidence, close known gaps.
- draft / active with resume/cover work: prioritize tailoring guidance and concrete edits.
- interview/negotiation surfaces: focus on scenario preparation and message framing.
- sent/completed: provide follow-up and support strategy.

When enough run-specific context exists to generate materials safely, explicitly say the user can continue to generation.`

interface QAContextInput {
  workflowId: string
  workflowState: string
  surface: string
  workflowPhase?: string | null
  workflowStatusSummary?: string | null
  listing: {
    title: string
    company_name: string
    location?: string | null
    salary_range?: string | null
    employment_type?: string | null
    experience_level?: string | null
    description: string | null
    requirements: string | null
    responsibilities?: string | null
    benefits?: string | null
    company_website_url?: string | null
    company_linkedin_url?: string | null
    work_mode?: string | null
    years_experience?: string | null
    language_requirements?: string[]
    tools_platforms?: string[]
    preferred_qualifications?: string | null
    parse_quality?: string | null
  }
  qaAnswers: { question_text: string; answer_text: string; is_accepted?: boolean }[]
  reusableFacts: { type: string; content: string; context?: string | null }[]
  profileSummary?: string | null
  matchSummary?: {
    score: number
    matched: string[]
    missing: string[]
  } | null
}

export function buildQAUserMessage(input: QAContextInput) {
  let context = `WORKFLOW ID: ${input.workflowId}\nWORKFLOW STATE: ${input.workflowState}\nSURFACE: ${input.surface}`
  if (input.workflowPhase) context += `\nWORKFLOW PHASE: ${input.workflowPhase}`
  if (input.workflowStatusSummary) context += `\nWORKFLOW STATUS EVENTS: ${input.workflowStatusSummary}`

  context += `\n\nLISTING:\nTitle: ${input.listing.title}\nCompany: ${input.listing.company_name}`
  if (input.listing.location) context += `\nLocation: ${input.listing.location}`
  if (input.listing.salary_range) context += `\nSalary range: ${input.listing.salary_range}`
  if (input.listing.employment_type) context += `\nEmployment type: ${input.listing.employment_type}`
  if (input.listing.experience_level) context += `\nSeniority / level: ${input.listing.experience_level}`
  if (input.listing.description) context += `\nDescription: ${input.listing.description}`
  if (input.listing.requirements) context += `\nRequirements: ${input.listing.requirements}`
  if (input.listing.responsibilities) context += `\nResponsibilities: ${input.listing.responsibilities}`
  if (input.listing.benefits) context += `\nBenefits: ${input.listing.benefits}`
  if (input.listing.company_website_url) context += `\nCompany website: ${input.listing.company_website_url}`
  if (input.listing.company_linkedin_url) context += `\nCompany LinkedIn: ${input.listing.company_linkedin_url}`
  if (input.listing.work_mode) context += `\nWork mode: ${input.listing.work_mode}`
  if (input.listing.years_experience) context += `\nYears of experience: ${input.listing.years_experience}`
  if (input.listing.language_requirements?.length) context += `\nLanguage requirements: ${input.listing.language_requirements.join(', ')}`
  if (input.listing.tools_platforms?.length) context += `\nTools/platforms: ${input.listing.tools_platforms.join(', ')}`
  if (input.listing.preferred_qualifications) context += `\nPreferred qualifications: ${input.listing.preferred_qualifications}`
  if (input.listing.parse_quality) context += `\nListing parse quality: ${input.listing.parse_quality}`

  const accepted = input.qaAnswers.filter((qa) => qa.is_accepted !== false)
  if (accepted.length) {
    context += '\n\nAPPROVED RUN FACTS (CURRENT WORKFLOW):'
    for (const qa of accepted.slice(-12)) {
      context += `\nQ: ${qa.question_text}\nA: ${qa.answer_text}`
    }
  } else {
    context += '\n\nAPPROVED RUN FACTS (CURRENT WORKFLOW): none yet'
  }

  if (input.reusableFacts.length) {
    context += '\n\nREUSABLE PROFILE FACTS:'
    for (const fact of input.reusableFacts.slice(0, 25)) {
      context += `\n- [${fact.type}] ${fact.content}${fact.context ? ` (Context: ${fact.context})` : ''}`
    }
  } else {
    context += '\n\nREUSABLE PROFILE FACTS: none available'
  }

  if (input.profileSummary) {
    context += `\n\nPROFILE SUMMARY IN ACTIVE WORKFLOW:\n${input.profileSummary}`
  }

  if (input.matchSummary) {
    context += '\n\nALIGNMENT SUMMARY FROM CURRENT WORKFLOW:'
    context += `\nMatch score: ${input.matchSummary.score}%`
    context += `\nMatched terms: ${input.matchSummary.matched.join(', ') || 'none'}`
    context += `\nMissing requirement highlights: ${input.matchSummary.missing.join(' | ') || 'none'}`
  }

  context += '\n\nAnswer the latest user message using this context.'

  return context
}
