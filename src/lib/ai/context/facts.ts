export type FactConfidence = 'high' | 'medium' | 'low'
export type FactVerificationStatus = 'verified' | 'user_confirmed' | 'unverified' | 'conflicted'

export interface SharedFact {
  key: string
  value: string
  source: 'run_fact' | 'profile_memory'
  confidence: FactConfidence
  verification_status: FactVerificationStatus
  accepted: boolean
  evidence?: string | null
}

export interface FactConflict {
  key: string
  values: string[]
  sources: string[]
  warning: string
}

function toFactKey(raw: string, fallback: string): string {
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || fallback
}

export function buildRunFacts(
  qaAnswers: Array<{ question_text: string; answer_text: string; is_accepted?: boolean }>
): SharedFact[] {
  return qaAnswers
    .filter((answer) => typeof answer.answer_text === 'string' && answer.answer_text.trim().length > 0)
    .map((answer, index) => {
      const accepted = answer.is_accepted !== false
      return {
        key: toFactKey(answer.question_text, `run_fact_${index + 1}`),
        value: answer.answer_text.trim(),
        source: 'run_fact' as const,
        confidence: accepted ? 'high' : 'low',
        verification_status: accepted ? 'user_confirmed' : 'unverified',
        accepted,
        evidence: answer.question_text || null,
      }
    })
}

export function buildReusableFacts(
  memory: Array<{ type: string; content: string; context?: string | null }>
): SharedFact[] {
  return memory
    .filter((item) => typeof item.content === 'string' && item.content.trim().length > 0)
    .map((item, index) => ({
      key: toFactKey(item.type, `profile_memory_${index + 1}`),
      value: item.content.trim(),
      source: 'profile_memory' as const,
      confidence: 'medium' as const,
      verification_status: 'verified' as const,
      accepted: true,
      evidence: item.context ?? null,
    }))
}

export function detectFactConflicts(facts: SharedFact[]): FactConflict[] {
  const byKey = new Map<string, SharedFact[]>()

  for (const fact of facts) {
    if (!byKey.has(fact.key)) byKey.set(fact.key, [])
    byKey.get(fact.key)!.push(fact)
  }

  const conflicts: FactConflict[] = []

  byKey.forEach((items, key) => {
    const distinctValues = [...new Set(items.map((item) => item.value.trim().toLowerCase()).filter(Boolean))]
    if (distinctValues.length <= 1) return

    conflicts.push({
      key,
      values: items.map((item) => item.value),
      sources: items.map((item) => item.source),
      warning: `Conflicting fact values for "${key}" from ${[...new Set(items.map((item) => item.source))].join(', ')}`,
    })
  })

  return conflicts
}

