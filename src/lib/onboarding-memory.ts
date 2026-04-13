export interface OnboardingContactPreferences {
  includeEmail: boolean
  includePhone: boolean
  includeLinkedin: boolean
  includeWebsite: boolean
  includeLocation: boolean
}

export interface OnboardingProfileDraft {
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  location: string | null
  contactPreferences: OnboardingContactPreferences
}

export const DEFAULT_ONBOARDING_CONTACT_PREFERENCES: OnboardingContactPreferences = {
  includeEmail: true,
  includePhone: true,
  includeLinkedin: true,
  includeWebsite: true,
  includeLocation: true,
}

export interface ApprovedMemoryRecord {
  key: string
  value: string
  source: 'onboarding' | 'listing_review' | 'qa' | 'chat'
  approvedAt: string
}

export function isOnboardingComplete(draft: OnboardingProfileDraft): boolean {
  return Boolean(
    draft.firstName?.trim() &&
      draft.lastName?.trim() &&
      (draft.email?.trim() || draft.phone?.trim()) &&
      draft.location?.trim()
  )
}
