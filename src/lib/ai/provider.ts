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

export function getConfiguredProvider(): AIProvider {
  // Try Anthropic first, then OpenAI
  if (process.env.ANTHROPIC_API_KEY) {
    const { AnthropicProvider } = require('./anthropic')
    return new AnthropicProvider()
  }

  if (process.env.OPENAI_API_KEY) {
    const { OpenAIProvider } = require('./openai')
    return new OpenAIProvider()
  }

  // Return a stub provider that explains configuration is needed
  return {
    name: 'unconfigured',
    async generate() {
      throw new Error(
        'No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in your environment. See docs/ai-providers-setup.md for instructions.'
      )
    },
    isConfigured() {
      return false
    },
  }
}
