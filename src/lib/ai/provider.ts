import { AnthropicProvider } from './anthropic'
import { OpenAIProvider } from './openai'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIGenerateOptions {
  messages: AIMessage[]
  maxTokens?: number
  temperature?: number
  model?: string
}

export interface AIProvider {
  name: string
  generate(options: AIGenerateOptions): Promise<string>
  isConfigured(): boolean
}

export type ProviderName = 'openai' | 'anthropic'

export const AVAILABLE_PROVIDERS: ProviderName[] = ['openai', 'anthropic']

export function getDefaultProvider(): ProviderName {
  const env = process.env.DEFAULT_AI_PROVIDER?.toLowerCase()
  if (env === 'anthropic' || env === 'openai') return env
  return 'openai'
}

function instantiate(name: ProviderName): AIProvider {
  if (name === 'anthropic') {
    return new AnthropicProvider()
  }
  return new OpenAIProvider()
}

/**
 * Resolve a provider for a single AI call.
 * Selection order: explicit `requested` arg → DEFAULT_AI_PROVIDER env → openai.
 * Falls back to the other provider if the chosen one isn't configured.
 * Returns an unconfigured stub only if neither key is set.
 */
export function getProvider(requested?: ProviderName | null): AIProvider {
  const preferred: ProviderName = requested ?? getDefaultProvider()
  const fallback: ProviderName = preferred === 'openai' ? 'anthropic' : 'openai'

  const primary = instantiate(preferred)
  if (primary.isConfigured()) return primary

  const secondary = instantiate(fallback)
  if (secondary.isConfigured()) return secondary

  return {
    name: 'unconfigured',
    async generate() {
      throw new Error(
        'No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in your environment. See docs/ai-providers-setup.md.'
      )
    },
    isConfigured() {
      return false
    },
  }
}

/** @deprecated Use getProvider() instead. Kept for backward compatibility. */
export function getConfiguredProvider(): AIProvider {
  return getProvider()
}
