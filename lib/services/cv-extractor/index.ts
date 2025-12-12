/**
 * CV Extractor Service Client
 * Communicates with local Python CV extractor API
 */

export interface CVExtractionOptions {
  mode?: 'auto' | 'pdf_only' | 'ocr_only'
  returnBlocks?: boolean
  language?: string
  preprocess?: boolean
}

export interface PageInfo {
  page_number: number
  text: string
  source: 'pdf_text' | 'ocr' | 'merged'
  confidence?: number
  char_count: number
}

export interface TextBlock {
  page_number: number
  text: string
  bbox?: number[]
  block_type?: string
}

export interface ExtractionStats {
  total_chars: number
  emails_found: number
  phones_found: number
  urls_found: number
  num_pages: number
}

export interface CVExtractionResult {
  document_type: string
  mode_used: 'auto' | 'pdf_only' | 'ocr_only'
  num_pages: number
  full_text: string
  pages: PageInfo[]
  blocks?: TextBlock[]
  stats: ExtractionStats
  warnings: string[]
}

class CVExtractorService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.CV_EXTRACTOR_URL || 'http://localhost:8001'
  }

  /**
   * Check if the CV extractor service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Extract text from CV file
   */
  async extractText(
    file: File,
    options: CVExtractionOptions = {}
  ): Promise<CVExtractionResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', options.mode || 'auto')
    formData.append('return_blocks', String(options.returnBlocks || false))
    formData.append('language', options.language || 'eng')
    formData.append('preprocess', String(options.preprocess !== false))

    const response = await fetch(`${this.baseUrl}/v1/cv/extract-text`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(60000), // 60 second timeout for OCR
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`CV extraction failed: ${error}`)
    }

    return response.json()
  }

  /**
   * Extract text from file buffer (for server-side use)
   */
  async extractTextFromBuffer(
    buffer: Buffer,
    filename: string,
    options: CVExtractionOptions = {}
  ): Promise<CVExtractionResult> {
    // Convert Buffer to Uint8Array for browser compatibility
    const uint8Array = new Uint8Array(buffer)
    const mimeType = this.getMimeType(filename)
    const blob = new Blob([uint8Array], { type: mimeType })
    const file = new File([blob], filename, {
      type: mimeType,
    })

    console.log(`[CVExtractor] Sending file: ${filename} (${mimeType}, ${buffer.length} bytes)`)
    return this.extractText(file, options)
  }

  private getMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop()
    switch (ext) {
      case 'pdf':
        return 'application/pdf'
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'png':
        return 'image/png'
      default:
        return 'application/octet-stream'
    }
  }
}

// Export singleton
export const cvExtractorService = new CVExtractorService()
