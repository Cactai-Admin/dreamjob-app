export interface EvidenceReferenceItem {
  id: string
  listingText: string
  listingKind: 'requirement' | 'nice_to_have'
  matchedProfileData: string[]
  matchedWorkHistory: string[]
  extractedEvidence: string | null
  placeholder: string | null
  confidence: 'high' | 'medium' | 'low'
}

export interface EvidenceMatch {
  id: string
  listingText: string
  listingKind: 'requirement' | 'nice_to_have'
  extractedEvidence?: string | null
  placeholder?: string | null
  confidence?: 'high' | 'medium' | 'low'
}

export function toEvidenceReferenceItems(
  matches: EvidenceMatch[],
  extras?: Partial<Record<string, Pick<EvidenceReferenceItem, 'matchedProfileData' | 'matchedWorkHistory'>>>
): EvidenceReferenceItem[] {
  return matches.map((item) => ({
    id: item.id,
    listingText: item.listingText,
    listingKind: item.listingKind,
    matchedProfileData: extras?.[item.id]?.matchedProfileData ?? [],
    matchedWorkHistory: extras?.[item.id]?.matchedWorkHistory ?? [],
    extractedEvidence: item.extractedEvidence ?? null,
    placeholder: item.placeholder ?? 'Click to add relevant evidence',
    confidence: item.confidence ?? 'medium',
  }))
}
