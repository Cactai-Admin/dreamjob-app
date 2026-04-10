import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, AIGenerateOptions } from './provider'

export class AnthropicProvider implements AIProvider {
  name = 'anthropic'
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }

  isConfigured(): boolean {
    return !!process.env.ANTHROPIC_API_KEY
  }

  async generate(options: AIGenerateOptions): Promise<string> {
    const { messages, maxTokens = 4096, temperature = 0.7, model } = options

    // Separate system message from conversation messages
    const systemMessage = messages.find(m => m.role === 'system')?.content
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    const response = await this.client.messages.create({
      model: model || 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      temperature,
      system: systemMessage || undefined,
      messages: conversationMessages,
    })

    const textBlock = response.content.find(block => block.type === 'text')
    return textBlock?.text ?? ''
  }
}
