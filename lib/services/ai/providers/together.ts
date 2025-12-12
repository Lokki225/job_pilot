import { 
  BaseAIProvider, 
  ChatCompletionOptions, 
  ChatCompletionResponse,
  AIProviderConfig 
} from './base'

/**
 * Together AI Provider - Access to many open-source models
 * Free tier: $25 free credits on signup
 * Get API key at: https://api.together.xyz/settings/api-keys
 */
export class TogetherProvider extends BaseAIProvider {
  constructor(config: AIProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://api.together.xyz/v1',
    })
  }

  getName(): string {
    return 'Together AI'
  }

  getDefaultModel(): string {
    return 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'
  }

  getAvailableModels(): string[] {
    return [
      'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'mistralai/Mistral-7B-Instruct-v0.3',
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
      'deepseek-ai/deepseek-llm-67b-chat',
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
      throw new Error(`Together AI API error: ${error}`)
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
