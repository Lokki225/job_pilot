import { BaseAIProvider, ChatCompletionOptions, ChatCompletionResponse, AIProviderConfig } from './base'

export class OpenRouterProvider extends BaseAIProvider {
  private baseURL = 'https://openrouter.ai/api/v1'

  constructor(config: AIProviderConfig) {
    super(config)
  }

  getName(): string {
    return 'OpenRouter'
  }

  getDefaultModel(): string {
    return 'meta-llama/llama-3.1-70b-instruct'
  }

  getAvailableModels(): string[] {
    return [
      'meta-llama/llama-3.1-70b-instruct',
      'meta-llama/llama-3.3-70b-instruct',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-pro-1.5',
      'openai/gpt-4o',
      'mistralai/mistral-large',
    ]
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Job Pilot',
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
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `OpenRouter API error: ${JSON.stringify(errorData)}`
      )
    }

    const data = await response.json()
    
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model || this.defaultModel,
    }
  }
}
