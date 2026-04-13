import type { WorkflowState } from '@/types/database'

export type EntryDestination = 'onboarding_modal' | 'resume_active_action' | 'dashboard_alerts' | 'stage_1'

export interface EntryRoutingSnapshot {
  onboardingComplete: boolean
  activeWorkflowId?: string | null
  activeWorkflowState?: WorkflowState | null
  hasAlerts: boolean
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
  if (!snapshot.onboardingComplete) {
    return {
      destination: 'onboarding_modal',
      reason: 'required onboarding fields are incomplete',
    }
  }

  if (snapshot.activeWorkflowId && snapshot.activeWorkflowState && snapshot.activeWorkflowState !== 'archived') {
    return {
      destination: 'resume_active_action',
      workflowId: snapshot.activeWorkflowId,
      reason: 'active workflow in progress',
    }
  }

  if (snapshot.hasAlerts) {
    return {
      destination: 'dashboard_alerts',
      reason: 'alerts require attention',
    }
  }

  return {
    destination: 'stage_1',
    reason: 'no onboarding gaps, active actions, or alerts',
  }
}
