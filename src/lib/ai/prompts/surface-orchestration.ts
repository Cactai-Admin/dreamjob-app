import { QA_SYSTEM_PROMPT } from '@/lib/ai/prompts/qa-guidance'
import { LISTING_REVIEW_SYSTEM_PROMPT } from '@/lib/ai/prompts/surfaces/listing-review'
import { WORK_HISTORY_SYSTEM_PROMPT } from '@/lib/ai/prompts/surfaces/work-history'
import { RESUME_SURFACE_SYSTEM_PROMPT } from '@/lib/ai/prompts/surfaces/resume'
import { COVER_LETTER_SURFACE_SYSTEM_PROMPT } from '@/lib/ai/prompts/surfaces/cover-letter'
import { FINAL_HUB_SYSTEM_PROMPT } from '@/lib/ai/prompts/surfaces/final-hub'
import { FOLLOW_UP_SYSTEM_PROMPT } from '@/lib/ai/prompts/surfaces/follow-up'
import { INTERVIEW_SYSTEM_PROMPT } from '@/lib/ai/prompts/surfaces/interview'
import { NEGOTIATION_SYSTEM_PROMPT } from '@/lib/ai/prompts/surfaces/negotiation'

const APPLICATION_SUPPORT_SYSTEM_PROMPT = `You are DreamJob's post-submission application support assistant.

Focus your guidance on:
- practical follow-up timing and cadence
- concise follow-up message structure
- outreach/networking suggestions
- visibility-improvement actions
- status-tracking checklists and reminders`

const PROMPTS_BY_SURFACE: Record<string, string> = {
  listing_review: LISTING_REVIEW_SYSTEM_PROMPT,
  work_history: WORK_HISTORY_SYSTEM_PROMPT,
  qa: WORK_HISTORY_SYSTEM_PROMPT,
  resume_workspace: RESUME_SURFACE_SYSTEM_PROMPT,
  resume: RESUME_SURFACE_SYSTEM_PROMPT,
  cover_letter_workspace: COVER_LETTER_SURFACE_SYSTEM_PROMPT,
  cover_letter: COVER_LETTER_SURFACE_SYSTEM_PROMPT,
  application_hub_support: FINAL_HUB_SYSTEM_PROMPT,
  application_overview_support: FINAL_HUB_SYSTEM_PROMPT,
  final_hub: FINAL_HUB_SYSTEM_PROMPT,
  follow_up_support: FOLLOW_UP_SYSTEM_PROMPT,
  follow_up: FOLLOW_UP_SYSTEM_PROMPT,
  interview_guide: INTERVIEW_SYSTEM_PROMPT,
  interview: INTERVIEW_SYSTEM_PROMPT,
  negotiation_guide: NEGOTIATION_SYSTEM_PROMPT,
  negotiation: NEGOTIATION_SYSTEM_PROMPT,
}

export function getSurfaceSystemPrompt(surface: string, isApplicationSupport: boolean): string {
  const prompt = PROMPTS_BY_SURFACE[surface] ?? QA_SYSTEM_PROMPT
  if (isApplicationSupport && (surface === 'application_hub_support' || surface === 'application_overview_support')) {
    return `${prompt}\n\n${APPLICATION_SUPPORT_SYSTEM_PROMPT}`
  }
  return prompt
}

