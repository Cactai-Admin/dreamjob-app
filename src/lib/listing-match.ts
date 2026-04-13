export interface MatchInputs {
  requirements: string[]
  skills: string[]
  keywords: string[]
  tools: string[]
  certifications: string[]
  clearances: string[]
  technologies: string[]
  manuallyMarked?: string[]
}

export interface MatchResult {
  score: number
  matched: string[]
  missing: string[]
}

export function parseRequirements(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value !== 'string') return []

  const trimmed = value.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string')
    } catch {
      // fall back to string parsing below
    }
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((segment) => segment.trim())
      .filter(Boolean)
  }

  if (trimmed.includes('\n')) {
    return trimmed
      .split('\n')
      .map((segment) => segment.trim())
      .filter(Boolean)
  }

  return [trimmed]
}

export function computeRequirementMatch(
  inputs: MatchInputs,
  options: { includeAllMissingWhenNoProfileTerms?: boolean } = {}
): MatchResult {
  const manuallyMarked = inputs.manuallyMarked ?? []
  if (inputs.requirements.length === 0) return { score: 0, matched: [], missing: [] }

  const userTerms = [
    ...new Set(
      [
        ...inputs.skills,
        ...inputs.keywords,
        ...inputs.tools,
        ...inputs.certifications,
        ...inputs.clearances,
        ...inputs.technologies,
      ]
        .map((term) => term.toLowerCase().trim())
        .filter((term) => term.length > 2)
    ),
  ]

  if (userTerms.length === 0 && manuallyMarked.length === 0) {
    return {
      score: 0,
      matched: [],
      missing: options.includeAllMissingWhenNoProfileTerms ? inputs.requirements.slice(0, 10) : [],
    }
  }

  const termCoversRequirement = (userTerm: string, requirementLower: string): boolean => {
    if (requirementLower.includes(userTerm)) return true
    const significantWords = userTerm.split(/\s+/).filter((word) => word.length >= 4)
    return significantWords.length > 0 && significantWords.some((word) => requirementLower.includes(word))
  }

  const matchedTerms = userTerms.filter((term) =>
    inputs.requirements.some((requirement) => termCoversRequirement(term, requirement.toLowerCase()))
  )

  const coveredRequirements = inputs.requirements.map((requirement) => {
    if (manuallyMarked.includes(requirement)) return true
    const requirementLower = requirement.toLowerCase()
    return userTerms.some((term) => termCoversRequirement(term, requirementLower))
  })

  const coveredCount = coveredRequirements.filter(Boolean).length
  const score = Math.round((coveredCount / inputs.requirements.length) * 100)
  const missing = inputs.requirements.filter((_, index) => !coveredRequirements[index])

  return {
    score,
    matched: matchedTerms.slice(0, 12),
    missing: missing.slice(0, 10),
  }
}
