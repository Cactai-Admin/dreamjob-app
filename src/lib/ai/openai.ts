import OpenAI from 'openai'
import type { AIProvider, AIGenerateOptions } from './provider'

export class OpenAIProvider implements AIProvider {
  name = 'openai'
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY
  }

  async generate(options: AIGenerateOptions): Promise<string> {
    const { messages, maxTokens = 4096, temperature = 0.7, model } = options

    const response = await this.client.chat.completions.create({
      model: model || 'gpt-4o',
      max_tokens: maxTokens,
      temperature,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    })

    return response.choices[0]?.message?.content ?? ''
  }
}
