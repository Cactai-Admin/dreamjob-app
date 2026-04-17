import type { ProviderName } from '@/lib/ai/provider'

interface WorkflowLike {
  autosave_data?: Record<string, unknown> | null
}

interface UserPreferencesLike {
  preferred_ai_provider?: string | null
  preferred_ai_model?: string | null
}

export interface ProviderPin {
  provider: ProviderName
  model: string | null
}

export function resolveProviderPin(
  workflow: WorkflowLike | null | undefined,
  userPreferences: UserPreferencesLike | null | undefined,
  requestedProvider: ProviderName | undefined,
  activeProviderName: string,
  requestedModel?: string | null
): ProviderPin {
  const autosave = workflow?.autosave_data && typeof workflow.autosave_data === 'object'
    ? workflow.autosave_data
    : null
  const pinnedProvider = autosave?.ai_provider_pin
  const pinnedModel = autosave?.ai_model_pin
  const preferredProvider = userPreferences?.preferred_ai_provider
  const preferredModel = userPreferences?.preferred_ai_model

  const provider = (requestedProvider
    ?? (preferredProvider === 'openai' || preferredProvider === 'anthropic' ? preferredProvider : null)
    ?? (pinnedProvider === 'openai' || pinnedProvider === 'anthropic' ? pinnedProvider : null)
    ?? (activeProviderName === 'openai' || activeProviderName === 'anthropic' ? activeProviderName : 'openai')) as ProviderName

  return {
    provider,
    model: requestedModel
      ?? (typeof preferredModel === 'string' ? preferredModel : null)
      ?? (typeof pinnedModel === 'string' ? pinnedModel : null),
  }
}

export function withProviderPinMetadata(
  autosaveData: Record<string, unknown> | null | undefined,
  pin: ProviderPin
): Record<string, unknown> {
  return {
    ...(autosaveData && typeof autosaveData === 'object' ? autosaveData : {}),
    ai_provider_pin: pin.provider,
    ai_model_pin: pin.model,
  }
}
