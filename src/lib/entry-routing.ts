export type EntryDestination = 'chat' | 'home'

export interface EntryRoutingSnapshot {
  isFirstLogin: boolean
  onboardingComplete: boolean
}

export interface EntryResolution {
  destination: EntryDestination
  workflowId?: string
  reason: string
}

/**
 * Phase 1 support helper for state-aware app entry.
 * This is intentionally side-effect free and route-agnostic so current behavior can remain stable.
 */
export function resolveAppEntry(snapshot: EntryRoutingSnapshot): EntryResolution {
  if (snapshot.isFirstLogin || !snapshot.onboardingComplete) {
    return {
      destination: 'chat',
      reason: snapshot.isFirstLogin ? 'first login should land in chat' : 'required onboarding fields are incomplete',
    }
  }

  return {
    destination: 'home',
    reason: 'returning user with complete required profile data',
  }
}
