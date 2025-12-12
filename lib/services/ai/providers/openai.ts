import OpenAI from 'openai'
import { 
  BaseAIProvider, 
  ChatCompletionOptions, 
  ChatCompletionResponse,
  AIProviderConfig 
} from './base'

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI

  constructor(config: AIProviderConfig) {
    super(config)
    this.client = new OpenAI({ 
      apiKey: this.apiKey,
      baseURL: this.baseUrl 
    })
  }

  getName(): string {
    return 'OpenAI'
  }

  getDefaultModel(): string {
    return 'gpt-4o-mini'
  }

  getAvailableModels(): string[] {
    return [
      'gpt-4o-mini',
      'gpt-4o',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
    ]
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const response = await this.client.chat.completions.create({
      model: this.defaultModel,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      ...(options.responseFormat === 'json' && { 
        response_format: { type: 'json_object' } 
      }),
    })

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    }
  }
}
