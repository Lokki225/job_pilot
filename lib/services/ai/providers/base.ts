/**
 * Base AI Provider Interface
 * All AI providers must implement this interface
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json'
}

export interface ChatCompletionResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface AIProviderConfig {
  apiKey: string
  baseUrl?: string
  defaultModel?: string
}

export abstract class BaseAIProvider {
  protected apiKey: string
  protected baseUrl?: string
  protected defaultModel: string

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl
    this.defaultModel = config.defaultModel || this.getDefaultModel()
  }

  abstract getName(): string
  abstract getDefaultModel(): string
  abstract getAvailableModels(): string[]
  abstract chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse>

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0
  }

  setModel(model: string): void {
    this.defaultModel = model
  }

  getCurrentModel(): string {
    return this.defaultModel
  }
}

export type AIProviderType = 'openai' | 'groq' | 'together' | 'google' | 'openrouter'
