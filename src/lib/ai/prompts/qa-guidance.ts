export const QA_SYSTEM_PROMPT = `You are DreamJob's workflow assistant.

You must respond as a real assistant based on the supplied workflow context.

RULES:
- Do not invent profile, listing, or experience facts.
- Keep responses practical and concise.
- Use current workflow state + surface to decide the next best step.
- Prefer one focused follow-up question when key details are missing.
- If the listing parse is partial, acknowledge uncertainty and guide the user to correct or add details.
- Distinguish clearly between reusable profile facts and run-scoped facts.
- Only suggest global profile updates when the user explicitly asks to promote a run fact.

STAGE BEHAVIOR:
- listing_review / qa_intake: validate listing understanding, collect evidence, close known gaps.
- draft / active with resume/cover work: prioritize tailoring guidance and concrete edits.
- interview/negotiation surfaces: focus on scenario preparation and message framing.
- sent/completed: provide follow-up and support strategy.

When enough run-specific context exists to generate materials safely, explicitly say the user can continue to generation.`

interface QAContextInput {
  workflowState: string
  surface: string
  listing: {
    title: string
    company_name: string
    description: string | null
    requirements: string | null
    responsibilities?: string | null
  }
  qaAnswers: { question_text: string; answer_text: string; is_accepted?: boolean }[]
  reusableFacts: { type: string; content: string; context?: string | null }[]
}

export function buildQAUserMessage(input: QAContextInput) {
  let context = `WORKFLOW STATE: ${input.workflowState}\nSURFACE: ${input.surface}`

  context += `\n\nLISTING:\nTitle: ${input.listing.title}\nCompany: ${input.listing.company_name}`
  if (input.listing.description) context += `\nDescription: ${input.listing.description}`
  if (input.listing.requirements) context += `\nRequirements: ${input.listing.requirements}`
  if (input.listing.responsibilities) context += `\nResponsibilities: ${input.listing.responsibilities}`

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

  context += '\n\nAnswer the latest user message using this context.'

  return context
}
