import type { ProviderName } from '@/lib/ai/provider'

interface WorkflowLike {
  autosave_data?: Record<string, unknown> | null
}

export interface ProviderPin {
  provider: ProviderName
  model: string | null
}

export function resolveProviderPin(
  workflow: WorkflowLike | null | undefined,
  requestedProvider: ProviderName | undefined,
  activeProviderName: string,
  requestedModel?: string | null
): ProviderPin {
  const autosave = workflow?.autosave_data && typeof workflow.autosave_data === 'object'
    ? workflow.autosave_data
    : null
  const pinnedProvider = autosave?.ai_provider_pin
  const pinnedModel = autosave?.ai_model_pin

  const provider = (requestedProvider
    ?? (pinnedProvider === 'openai' || pinnedProvider === 'anthropic' ? pinnedProvider : null)
    ?? (activeProviderName === 'openai' || activeProviderName === 'anthropic' ? activeProviderName : 'openai')) as ProviderName

  return {
    provider,
    model: requestedModel ?? (typeof pinnedModel === 'string' ? pinnedModel : null),
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

