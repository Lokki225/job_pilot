import { 
  BaseAIProvider, 
  ChatCompletionOptions, 
  ChatCompletionResponse,
  AIProviderConfig 
} from './base'

/**
 * Groq Provider - Uses Groq's ultra-fast inference
 * Free tier: Very generous limits
 * Get API key at: https://console.groq.com/keys
 */
export class GroqProvider extends BaseAIProvider {
  constructor(config: AIProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://api.groq.com/openai/v1',
    })
  }

  getName(): string {
    return 'Groq'
  }

  getDefaultModel(): string {
    return 'llama-3.3-70b-versatile'
  }

  getAvailableModels(): string[] {
    return [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.2-3b-preview',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ]
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.defaultModel,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        ...(options.responseFormat === 'json' && { 
          response_format: { type: 'json_object' } 
        }),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Groq API error: ${error}`)
    }

    const data = await response.json()

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    }
  }
}
