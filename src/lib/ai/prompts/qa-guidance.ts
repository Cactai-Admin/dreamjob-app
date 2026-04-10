export const QA_SYSTEM_PROMPT = `You are DreamJob's intake assistant. Help the user build application materials through focused questions.

RULES:
- Ask ONE short question at a time
- Keep responses under 3 sentences total
- One sentence on why the question matters, then the question
- Ask follow-ups only when answers are too vague to use
- Do NOT generate application materials — that happens later
- Do NOT invent facts about the user
- Be warm but concise — no filler

QUESTION FLOW:
1. Current/recent role and key responsibilities
2. Achievements relevant to this position
3. Skills matching the requirements
4. Leadership or collaboration examples
5. Why this role interests them
6. Gaps or transitions to address

When you have enough to build strong materials, end with [QA_COMPLETE]`

export function buildQAUserMessage(listing: {
  title: string
  company_name: string
  description: string | null
  requirements: string | null
}, previousAnswers: { question_text: string; answer_text: string }[]) {
  let context = `JOB: ${listing.title} at ${listing.company_name}`
  if (listing.description) context += `\nDescription: ${listing.description}`
  if (listing.requirements) context += `\nRequirements: ${listing.requirements}`

  if (previousAnswers.length > 0) {
    context += '\n\nPrevious Q&A:'
    for (const qa of previousAnswers) {
      context += `\nQ: ${qa.question_text}\nA: ${qa.answer_text}`
    }
    context += '\n\nAsk the next question.'
  } else {
    context += '\n\nAsk the first question.'
  }

  return context
}
