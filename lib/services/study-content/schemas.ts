/**
 * Zod Schemas for Study Content Validation
 * Ensures AI-generated content matches expected structure
 */

import { z } from 'zod'

// ===========================================================
// TEXT SECTION SCHEMA
// ===========================================================

export const TextSectionDataSchema = z.object({
  title: z.string().optional(),
  body: z.string().min(200).max(10000), // Markdown content - increased for richer lessons
  highlights: z.array(z.string()).min(2).max(6).optional(),
  examples: z.array(z.object({
    title: z.string(),
    content: z.string().min(20).max(500),
  })).optional(),
})

export const ContentSectionSchema = z.object({
  type: z.enum(['text', 'interactive', 'download']),
  data: TextSectionDataSchema, // For MVP, only text sections
})

export const LessonContentSchema = z.object({
  sections: z.array(ContentSectionSchema).min(4).max(8), // Require at least 4 substantial sections
})

// ===========================================================
// GENERATED LESSON SCHEMA
// ===========================================================

export const GeneratedLessonSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(300),
  estimatedMinutes: z.number().min(5).max(60),
  contentType: z.literal('TEXT'),
  content: LessonContentSchema,
})

// ===========================================================
// QUIZ QUESTION SCHEMA
// ===========================================================

export const QuizOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(500),
})

export const QuizQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['multiple-choice', 'true-false', 'multi-select']),
  question: z.string().min(10).max(500),
  options: z.array(QuizOptionSchema).min(2).max(6),
  correctAnswers: z.array(z.string()).min(1),
  explanation: z.string().min(20).max(500),
  points: z.number().min(1).max(10).default(1),
})

export const GeneratedQuizSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(300),
  passingScore: z.number().min(50).max(100).default(70),
  questions: z.array(QuizQuestionSchema).min(5).max(20),
})

// ===========================================================
// LESSON BLUEPRINT SCHEMA
// ===========================================================

export const LessonBlueprintSchema = z.object({
  orderIndex: z.number().min(1),
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(300),
  estimatedMinutes: z.number().min(5).max(60),
  contentType: z.enum(['TEXT', 'QUIZ', 'PRACTICE']),
  isPremium: z.boolean().default(false),
  learningObjectives: z.array(z.string()).min(2).max(5),
  keyTerms: z.array(z.string()).min(2).max(10),
})

export const ChapterBlueprintSchema = z.object({
  orderIndex: z.number().min(1),
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(300),
  icon: z.string().max(10),
  estimatedMinutes: z.number().min(30).max(180),
  isPremium: z.boolean().default(false),
  lessons: z.array(LessonBlueprintSchema).min(3).max(8),
})

// ===========================================================
// VALIDATION HELPERS
// ===========================================================

export function validateLesson(data: unknown): { success: boolean; data?: z.infer<typeof GeneratedLessonSchema>; error?: string } {
  try {
    const result = GeneratedLessonSchema.parse(data)
    return { success: true, data: result }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.issues.map(err => `${err.path.join('.')}: ${err.message}`).join('; ') }
    }
    return { success: false, error: 'Unknown validation error' }
  }
}

export function validateQuiz(data: unknown): { success: boolean; data?: z.infer<typeof GeneratedQuizSchema>; error?: string } {
  try {
    const result = GeneratedQuizSchema.parse(data)
    return { success: true, data: result }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.issues.map(err => `${err.path.join('.')}: ${err.message}`).join('; ') }
    }
    return { success: false, error: 'Unknown validation error' }
  }
}

export function validateChapterBlueprint(data: unknown): { success: boolean; data?: z.infer<typeof ChapterBlueprintSchema>; error?: string } {
  try {
    const result = ChapterBlueprintSchema.parse(data)
    return { success: true, data: result }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.issues.map(err => `${err.path.join('.')}: ${err.message}`).join('; ') }
    }
    return { success: false, error: 'Unknown validation error' }
  }
}

// Type exports
export type ValidatedLesson = z.infer<typeof GeneratedLessonSchema>
export type ValidatedQuiz = z.infer<typeof GeneratedQuizSchema>
export type ValidatedChapterBlueprint = z.infer<typeof ChapterBlueprintSchema>
