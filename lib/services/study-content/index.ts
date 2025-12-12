/**
 * Study Content Service
 * Generates, validates, and manages Study Room content using AI
 */

import { aiService } from '../ai'
import { 
  CareerTrackId, 
  CAREER_TRACKS, 
  CHAPTER_BLUEPRINTS,
  GenerateLessonOptions,
  GenerateQuizOptions,
  GenerateChapterBlueprintOptions,
  GeneratedLesson,
  GeneratedQuiz,
  ChapterBlueprint,
} from './types'
import { 
  validateLesson, 
  validateQuiz, 
  validateChapterBlueprint,
  ValidatedLesson,
  ValidatedQuiz,
  ValidatedChapterBlueprint,
} from './schemas'
import {
  buildLessonPrompt,
  buildQuizPrompt,
  buildChapterBlueprintPrompt,
  buildRegenerationPrompt,
} from './prompts'

// ===========================================================
// STUDY CONTENT SERVICE
// ===========================================================

export interface GenerationResult<T> {
  success: boolean
  data?: T
  error?: string
  rawOutput?: string
  model?: string
  provider?: string
  retryCount?: number
}

class StudyContentService {
  private maxRetries = 2

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return aiService.isConfigured()
  }

  /**
   * Get current AI provider info
   */
  getProviderInfo() {
    return aiService.getCurrentProviderInfo()
  }

  /**
   * Get all available career tracks
   */
  getCareerTracks() {
    return Object.values(CAREER_TRACKS)
  }

  /**
   * Get chapter blueprints (without lessons)
   */
  getChapterTemplates() {
    return CHAPTER_BLUEPRINTS
  }

  // ===========================================================
  // LESSON GENERATION
  // ===========================================================

  /**
   * Generate a complete lesson with content
   */
  async generateLesson(options: GenerateLessonOptions): Promise<GenerationResult<ValidatedLesson>> {
    if (!this.isAvailable()) {
      return { success: false, error: 'AI service not configured' }
    }

    const prompt = buildLessonPrompt(options)
    let lastError = ''
    let lastOutput = ''

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const currentPrompt = attempt === 0 
          ? prompt 
          : buildRegenerationPrompt(prompt, lastOutput, lastError)

        const response = await aiService.chat({
          messages: [
            {
              role: 'system',
              content: 'You are an expert career coach creating comprehensive educational content for a professional learning platform. Create thorough, detailed lessons that genuinely teach skills. Always return valid JSON matching the exact schema requested.',
            },
            { role: 'user', content: currentPrompt },
          ],
          temperature: 0.7,
          maxTokens: 8000, // Increased for richer, more substantial lessons
          responseFormat: 'json',
        })

        lastOutput = response.content

        // Parse JSON from response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          lastError = 'No valid JSON object found in response'
          continue
        }

        const parsed = JSON.parse(jsonMatch[0])
        const validation = validateLesson(parsed)

        if (validation.success && validation.data) {
          return {
            success: true,
            data: validation.data,
            rawOutput: response.content,
            model: response.model,
            provider: response.provider,
            retryCount: attempt,
          }
        }

        lastError = validation.error || 'Validation failed'
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Unknown error'
      }
    }

    return {
      success: false,
      error: `Failed after ${this.maxRetries + 1} attempts: ${lastError}`,
      rawOutput: lastOutput,
    }
  }

  // ===========================================================
  // QUIZ GENERATION
  // ===========================================================

  /**
   * Generate a quiz for a chapter
   */
  async generateQuiz(options: GenerateQuizOptions): Promise<GenerationResult<ValidatedQuiz>> {
    if (!this.isAvailable()) {
      return { success: false, error: 'AI service not configured' }
    }

    const prompt = buildQuizPrompt(options)
    let lastError = ''
    let lastOutput = ''

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const currentPrompt = attempt === 0 
          ? prompt 
          : buildRegenerationPrompt(prompt, lastOutput, lastError)

        const response = await aiService.chat({
          messages: [
            {
              role: 'system',
              content: 'You are an expert at creating educational assessments. Always return valid JSON matching the exact schema requested.',
            },
            { role: 'user', content: currentPrompt },
          ],
          temperature: 0.5,
          maxTokens: 4000,
          responseFormat: 'json',
        })

        lastOutput = response.content

        const jsonMatch = response.content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          lastError = 'No valid JSON object found in response'
          continue
        }

        const parsed = JSON.parse(jsonMatch[0])
        const validation = validateQuiz(parsed)

        if (validation.success && validation.data) {
          return {
            success: true,
            data: validation.data,
            rawOutput: response.content,
            model: response.model,
            provider: response.provider,
            retryCount: attempt,
          }
        }

        lastError = validation.error || 'Validation failed'
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Unknown error'
      }
    }

    return {
      success: false,
      error: `Failed after ${this.maxRetries + 1} attempts: ${lastError}`,
      rawOutput: lastOutput,
    }
  }

  // ===========================================================
  // CHAPTER BLUEPRINT GENERATION
  // ===========================================================

  /**
   * Generate a detailed chapter blueprint with lesson outlines
   */
  async generateChapterBlueprint(options: GenerateChapterBlueprintOptions): Promise<GenerationResult<ValidatedChapterBlueprint>> {
    if (!this.isAvailable()) {
      return { success: false, error: 'AI service not configured' }
    }

    const chapterTemplate = CHAPTER_BLUEPRINTS.find(c => c.orderIndex === options.chapterIndex)
    if (!chapterTemplate) {
      return { success: false, error: `Chapter ${options.chapterIndex} not found in templates` }
    }

    const prompt = buildChapterBlueprintPrompt({
      ...options,
      chapterDescription: chapterTemplate.description,
    })

    let lastError = ''
    let lastOutput = ''

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const currentPrompt = attempt === 0 
          ? prompt 
          : buildRegenerationPrompt(prompt, lastOutput, lastError)

        const response = await aiService.chat({
          messages: [
            {
              role: 'system',
              content: 'You are an expert curriculum designer. Always return valid JSON matching the exact schema requested.',
            },
            { role: 'user', content: currentPrompt },
          ],
          temperature: 0.6,
          maxTokens: 3000,
          responseFormat: 'json',
        })

        lastOutput = response.content

        const jsonMatch = response.content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          lastError = 'No valid JSON object found in response'
          continue
        }

        const parsed = JSON.parse(jsonMatch[0])
        const validation = validateChapterBlueprint(parsed)

        if (validation.success && validation.data) {
          return {
            success: true,
            data: validation.data,
            rawOutput: response.content,
            model: response.model,
            provider: response.provider,
            retryCount: attempt,
          }
        }

        lastError = validation.error || 'Validation failed'
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Unknown error'
      }
    }

    return {
      success: false,
      error: `Failed after ${this.maxRetries + 1} attempts: ${lastError}`,
      rawOutput: lastOutput,
    }
  }

  // ===========================================================
  // FULL CHAPTER GENERATION
  // ===========================================================

  /**
   * Generate a complete chapter with all lessons and quiz
   * This is a high-level orchestration method
   */
  async generateFullChapter(
    trackId: CareerTrackId,
    chapterIndex: number,
    lessonCount: number = 5,
    onProgress?: (step: string, progress: number) => void
  ): Promise<{
    success: boolean
    blueprint?: ValidatedChapterBlueprint
    lessons?: ValidatedLesson[]
    quiz?: ValidatedQuiz
    errors?: string[]
  }> {
    const errors: string[] = []
    const track = CAREER_TRACKS[trackId]
    const chapterTemplate = CHAPTER_BLUEPRINTS.find(c => c.orderIndex === chapterIndex)

    if (!track || !chapterTemplate) {
      return { success: false, errors: ['Invalid track or chapter index'] }
    }

    onProgress?.('Generating chapter blueprint...', 10)

    // Step 1: Generate blueprint
    const blueprintResult = await this.generateChapterBlueprint({
      trackId,
      chapterIndex,
      chapterTitle: chapterTemplate.title,
      lessonCount,
    })

    if (!blueprintResult.success || !blueprintResult.data) {
      return { success: false, errors: [blueprintResult.error || 'Blueprint generation failed'] }
    }

    const blueprint = blueprintResult.data
    const lessons: ValidatedLesson[] = []
    const keyTermsAccumulated: string[] = []

    // Step 2: Generate lessons
    const textLessons = blueprint.lessons.filter(l => l.contentType === 'TEXT')
    for (let i = 0; i < textLessons.length; i++) {
      const lessonBlueprint = textLessons[i]
      const progress = 10 + ((i + 1) / textLessons.length) * 60

      onProgress?.(`Generating lesson ${i + 1}/${textLessons.length}: ${lessonBlueprint.title}`, progress)

      const lessonResult = await this.generateLesson({
        trackId,
        chapterTitle: blueprint.title,
        chapterIndex,
        lessonTitle: lessonBlueprint.title,
        lessonIndex: lessonBlueprint.orderIndex,
        learningObjectives: lessonBlueprint.learningObjectives,
        keyTerms: lessonBlueprint.keyTerms,
        previousLessonsSummary: i > 0 
          ? lessons.slice(-2).map(l => l.title).join(', ')
          : undefined,
      })

      if (lessonResult.success && lessonResult.data) {
        lessons.push(lessonResult.data)
        keyTermsAccumulated.push(...lessonBlueprint.keyTerms)
      } else {
        errors.push(`Lesson "${lessonBlueprint.title}": ${lessonResult.error}`)
      }
    }

    onProgress?.('Generating chapter quiz...', 80)

    // Step 3: Generate quiz
    const quizResult = await this.generateQuiz({
      trackId,
      chapterTitle: blueprint.title,
      lessonTitles: lessons.map(l => l.title),
      keyTerms: [...new Set(keyTermsAccumulated)].slice(0, 15),
      questionCount: 10,
      difficulty: 'medium',
    })

    let quiz: ValidatedQuiz | undefined
    if (quizResult.success && quizResult.data) {
      quiz = quizResult.data
    } else {
      errors.push(`Quiz: ${quizResult.error}`)
    }

    onProgress?.('Complete!', 100)

    return {
      success: lessons.length > 0,
      blueprint,
      lessons,
      quiz,
      errors: errors.length > 0 ? errors : undefined,
    }
  }
}

// Export singleton
export const studyContentService = new StudyContentService()

// Re-export types
export * from './types'
export * from './schemas'
