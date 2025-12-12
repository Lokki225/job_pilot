import { 
  BaseAIProvider, 
  ChatCompletionOptions, 
  ChatCompletionResponse,
  AIProviderConfig 
} from './base'

/**
 * Google AI Provider - Access to Gemini models
 * Free tier: 60 requests/minute, 1500 requests/day
 * Get API key at: https://aistudio.google.com/app/apikey
 */
export class GoogleProvider extends BaseAIProvider {
  constructor(config: AIProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
    })
  }

  getName(): string {
    return 'Google AI'
  }

  getDefaultModel(): string {
    return 'gemini-1.5-flash'
  }

  getAvailableModels(): string[] {
    return [
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
      'gemini-2.0-flash-exp',
    ]
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    // Convert OpenAI-style messages to Gemini format
    const systemInstruction = options.messages.find(m => m.role === 'system')?.content
    const contents = options.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    const response = await fetch(
      `${this.baseUrl}/models/${this.defaultModel}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 2000,
            ...(options.responseFormat === 'json' && { 
              responseMimeType: 'application/json' 
            }),
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google AI API error: ${error}`)
    }

    const data = await response.json()

    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      model: this.defaultModel,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount || 0,
        completionTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0,
      } : undefined,
    }
  }
}
