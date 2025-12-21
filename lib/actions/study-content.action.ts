"use server"

/**
 * Server Actions for Study Content Generation
 * Admin-only actions for generating and managing Study Room content
 */

import { studyContentService, CareerTrackId, ValidatedLesson, ValidatedQuiz, ValidatedChapterBlueprint } from '@/lib/services/study-content'
import { getCurrentUser } from '@/lib/auth'
import { requireUserAtLeastRole } from '@/lib/auth/rbac'

// ===========================================================
// TYPES
// ===========================================================

interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

// ===========================================================
// ADMIN CHECK (placeholder - implement proper admin check)
// ===========================================================

async function isAdmin(): Promise<boolean> {
  const { user } = await getCurrentUser()
  if (!user) return false

  try {
    await requireUserAtLeastRole(user.id, 'ADMIN')
    return true
  } catch {
    return false
  }
}

// ===========================================================
// GET AVAILABLE DATA
// ===========================================================

export async function getCareerTracks(): Promise<ActionResult<ReturnType<typeof studyContentService.getCareerTracks>>> {
  return {
    success: true,
    data: studyContentService.getCareerTracks(),
  }
}

export async function getChapterTemplates(): Promise<ActionResult<ReturnType<typeof studyContentService.getChapterTemplates>>> {
  return {
    success: true,
    data: studyContentService.getChapterTemplates(),
  }
}

export async function getAIProviderInfo(): Promise<ActionResult<{ provider: string; model: string } | null>> {
  return {
    success: true,
    data: studyContentService.getProviderInfo(),
  }
}

// ===========================================================
// GENERATION ACTIONS
// ===========================================================

export async function generateChapterBlueprint(
  trackId: CareerTrackId,
  chapterIndex: number,
  lessonCount: number = 5
): Promise<ActionResult<ValidatedChapterBlueprint>> {
  // Check admin
  if (!(await isAdmin())) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  // Check AI availability
  if (!studyContentService.isAvailable()) {
    return { success: false, error: 'AI service not configured. Please add GROQ_API_KEY to environment.' }
  }

  const templates = studyContentService.getChapterTemplates()
  const template = templates.find(t => t.orderIndex === chapterIndex)
  
  if (!template) {
    return { success: false, error: `Chapter ${chapterIndex} not found` }
  }

  const result = await studyContentService.generateChapterBlueprint({
    trackId,
    chapterIndex,
    chapterTitle: template.title,
    lessonCount,
  })

  if (result.success && result.data) {
    return { success: true, data: result.data }
  }

  return { success: false, error: result.error }
}

export async function generateLesson(
  trackId: CareerTrackId,
  chapterTitle: string,
  chapterIndex: number,
  lessonTitle: string,
  lessonIndex: number,
  learningObjectives: string[],
  keyTerms: string[]
): Promise<ActionResult<ValidatedLesson>> {
  if (!(await isAdmin())) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  if (!studyContentService.isAvailable()) {
    return { success: false, error: 'AI service not configured' }
  }

  const result = await studyContentService.generateLesson({
    trackId,
    chapterTitle,
    chapterIndex,
    lessonTitle,
    lessonIndex,
    learningObjectives,
    keyTerms,
  })

  if (result.success && result.data) {
    return { success: true, data: result.data }
  }

  return { success: false, error: result.error }
}

export async function generateQuiz(
  trackId: CareerTrackId,
  chapterTitle: string,
  lessonTitles: string[],
  keyTerms: string[],
  questionCount: number = 10,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<ActionResult<ValidatedQuiz>> {
  if (!(await isAdmin())) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  if (!studyContentService.isAvailable()) {
    return { success: false, error: 'AI service not configured' }
  }

  const result = await studyContentService.generateQuiz({
    trackId,
    chapterTitle,
    lessonTitles,
    keyTerms,
    questionCount,
    difficulty,
  })

  if (result.success && result.data) {
    return { success: true, data: result.data }
  }

  return { success: false, error: result.error }
}

// ===========================================================
// FULL CHAPTER GENERATION (returns everything at once)
// ===========================================================

export async function generateFullChapter(
  trackId: CareerTrackId,
  chapterIndex: number,
  lessonCount: number = 5
): Promise<ActionResult<{
  blueprint: ValidatedChapterBlueprint
  lessons: ValidatedLesson[]
  quiz: ValidatedQuiz | null
  generationErrors: string[]
}>> {
  if (!(await isAdmin())) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  if (!studyContentService.isAvailable()) {
    return { success: false, error: 'AI service not configured' }
  }

  const result = await studyContentService.generateFullChapter(
    trackId,
    chapterIndex,
    lessonCount
  )

  if (result.success && result.blueprint && result.lessons) {
    return {
      success: true,
      data: {
        blueprint: result.blueprint,
        lessons: result.lessons,
        quiz: result.quiz || null,
        generationErrors: result.errors || [],
      },
    }
  }

  return { success: false, error: result.errors?.join('; ') || 'Generation failed' }
}

// ===========================================================
// PUBLISH TO DATABASE
// ===========================================================

export async function publishChapterToDatabase(
  trackId: CareerTrackId,
  blueprint: ValidatedChapterBlueprint,
  lessons: ValidatedLesson[],
  quiz: ValidatedQuiz | null
): Promise<ActionResult<{ chapterId: string; lessonIds: string[]; quizId: string | null }>> {
  if (!(await isAdmin())) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  const { adminSupabase } = await import('@/lib/supabase/server')

  try {
    // 1. Create study_chapters record
    const { data: chapter, error: chapterError } = await adminSupabase
      .from('study_chapters')
      .insert({
        orderIndex: blueprint.orderIndex,
        title: blueprint.title,
        description: blueprint.description,
        estimatedMinutes: blueprint.estimatedMinutes,
        icon: blueprint.icon,
        isPremium: blueprint.isPremium || false,
      })
      .select('id')
      .single()

    if (chapterError || !chapter) {
      console.error('Error creating chapter:', chapterError)
      return { success: false, error: `Failed to create chapter: ${chapterError?.message}` }
    }

    const chapterId = chapter.id
    const lessonIds: string[] = []
    let quizId: string | null = null

    // 2. Create study_lessons records
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i]
      const { data: lessonData, error: lessonError } = await adminSupabase
        .from('study_lessons')
        .insert({
          chapterId,
          orderIndex: i + 1,
          title: lesson.title,
          description: lesson.description,
          estimatedMinutes: lesson.estimatedMinutes,
          contentType: 'TEXT',
          content: lesson.content,
          isPremium: false, // Lessons inherit from chapter
        })
        .select('id')
        .single()

      if (lessonError || !lessonData) {
        console.error('Error creating lesson:', lessonError)
        // Continue with other lessons even if one fails
        continue
      }

      lessonIds.push(lessonData.id)

      // 3. Create quiz for the last lesson if quiz exists
      if (quiz && i === lessons.length - 1) {
        const { data: quizData, error: quizError } = await adminSupabase
          .from('study_quizzes')
          .insert({
            lessonId: lessonData.id,
            title: quiz.title,
            passingScore: quiz.passingScore,
            questions: quiz.questions,
          })
          .select('id')
          .single()

        if (quizError) {
          console.error('Error creating quiz:', quizError)
        } else if (quizData) {
          quizId = quizData.id
        }
      }
    }

    return {
      success: true,
      data: { chapterId, lessonIds, quizId },
    }
  } catch (err) {
    console.error('Error publishing chapter:', err)
    return { success: false, error: `Failed to publish: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }
}

// ===========================================================
// BULK POPULATION
// ===========================================================

export type PopulationProgress = {
  totalTracks: number
  totalChapters: number
  completedChapters: number
  currentTrack: string
  currentChapter: number
  status: 'idle' | 'running' | 'completed' | 'error'
  errors: string[]
  results: { trackId: string; chapterIndex: number; chapterId: string; lessonCount: number }[]
}

export async function populateFullDatabase(
  options: {
    trackIds?: CareerTrackId[]  // If not provided, all tracks
    chapterIndices?: number[]   // If not provided, all chapters (1-7)
    lessonCount?: number        // Default 5
  } = {}
): Promise<ActionResult<PopulationProgress>> {
  if (!(await isAdmin())) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  if (!studyContentService.isAvailable()) {
    return { success: false, error: 'AI service not configured. Set GROQ_API_KEY.' }
  }

  const allTrackIds: CareerTrackId[] = [
    'software-engineer',
    'data-analyst', 
    'product-manager',
    'ui-ux-designer',
    'marketing-specialist',
  ]

  const trackIds = options.trackIds || allTrackIds
  const chapterIndices = options.chapterIndices || [1, 2, 3, 4, 5, 6, 7]
  const lessonCount = options.lessonCount || 5

  const progress: PopulationProgress = {
    totalTracks: trackIds.length,
    totalChapters: trackIds.length * chapterIndices.length,
    completedChapters: 0,
    currentTrack: '',
    currentChapter: 0,
    status: 'running',
    errors: [],
    results: [],
  }

  try {
    for (const trackId of trackIds) {
      progress.currentTrack = trackId
      console.log(`\n📚 Starting track: ${trackId}`)

      for (const chapterIndex of chapterIndices) {
        progress.currentChapter = chapterIndex
        console.log(`  📖 Generating chapter ${chapterIndex}...`)

        // Generate chapter content
        const genResult = await generateFullChapter(trackId, chapterIndex, lessonCount)

        if (!genResult.success || !genResult.data) {
          const error = `Failed to generate ${trackId} chapter ${chapterIndex}: ${genResult.error}`
          console.error(`  ❌ ${error}`)
          progress.errors.push(error)
          continue
        }

        console.log(`  ✅ Generated ${genResult.data.lessons.length} lessons`)

        // Publish to database
        const pubResult = await publishChapterToDatabase(
          trackId,
          genResult.data.blueprint,
          genResult.data.lessons,
          genResult.data.quiz
        )

        if (!pubResult.success || !pubResult.data) {
          const error = `Failed to publish ${trackId} chapter ${chapterIndex}: ${pubResult.error}`
          console.error(`  ❌ ${error}`)
          progress.errors.push(error)
          continue
        }

        progress.results.push({
          trackId,
          chapterIndex,
          chapterId: pubResult.data.chapterId,
          lessonCount: pubResult.data.lessonIds.length,
        })

        progress.completedChapters++
        console.log(`  ✅ Published! Chapter ID: ${pubResult.data.chapterId}`)

        // Wait 60 seconds between chapters to avoid rate limiting (Groq: 12k tokens/min)
        // Each chapter uses ~11k tokens, so we need to wait for the rate limit window to reset
        if (chapterIndex < chapterIndices[chapterIndices.length - 1]) {
          console.log(`  ⏳ Waiting 60s to avoid rate limits...`)
          await new Promise(resolve => setTimeout(resolve, 60000))
        }
      }
    }

    progress.status = progress.errors.length > 0 ? 'completed' : 'completed'
    console.log(`\n🎉 Population complete! ${progress.completedChapters}/${progress.totalChapters} chapters created.`)

    return { success: true, data: progress }
  } catch (err) {
    progress.status = 'error'
    progress.errors.push(err instanceof Error ? err.message : 'Unknown error')
    return { success: false, error: progress.errors.join('; '), data: progress }
  }
}

// Populate a single track (convenience function)
export async function populateTrack(
  trackId: CareerTrackId,
  options: { chapterIndices?: number[]; lessonCount?: number } = {}
): Promise<ActionResult<PopulationProgress>> {
  return populateFullDatabase({
    trackIds: [trackId],
    chapterIndices: options.chapterIndices,
    lessonCount: options.lessonCount,
  })
}

// Populate free chapters only (1-4)
export async function populateFreeChapters(
  trackIds?: CareerTrackId[]
): Promise<ActionResult<PopulationProgress>> {
  return populateFullDatabase({
    trackIds,
    chapterIndices: [1, 2, 3, 4],
  })
}

// ===========================================================
// PREVIEW (generate without saving)
// ===========================================================

export async function previewLessonGeneration(
  trackId: CareerTrackId,
  lessonTitle: string,
  learningObjectives: string[],
  keyTerms: string[]
): Promise<ActionResult<ValidatedLesson>> {
  // Preview doesn't require admin - useful for testing prompts
  if (!studyContentService.isAvailable()) {
    return { success: false, error: 'AI service not configured' }
  }

  const result = await studyContentService.generateLesson({
    trackId,
    chapterTitle: 'Preview Chapter',
    chapterIndex: 1,
    lessonTitle,
    lessonIndex: 1,
    learningObjectives,
    keyTerms,
  })

  if (result.success && result.data) {
    return { success: true, data: result.data }
  }

  return { success: false, error: result.error }
}
