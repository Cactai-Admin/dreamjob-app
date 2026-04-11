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

    // Separate system prompt from conversation turns
    const systemMsg = messages.find(m => m.role === 'system')
    const inputMsgs = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const response = await this.client.responses.create({
      model: model || 'gpt-4o',
      max_output_tokens: maxTokens,
      temperature,
      store: false,
      ...(systemMsg ? { instructions: systemMsg.content } : {}),
      input: inputMsgs,
    })

    return response.output_text ?? ''
  }
}
