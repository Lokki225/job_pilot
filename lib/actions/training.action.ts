'use server'

import { adminSupabase } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { generateInterviewQuestion, analyzeAnswer, type InterviewQuestion, type AnswerFeedback } from '@/lib/services/training/interview-ai.service'
import { awardXP } from '@/lib/services/gamification.service'
import { triggerAchievementCheck } from '@/lib/services/achievements.service'

// ===========================================================
// TYPES
// ===========================================================

export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

interface StartSessionParams {
  sessionType: 'QUICK' | 'FULL_MOCK' | 'TARGETED' | 'COMPANY_PREP'
  companyId?: string
  companyName?: string
  jobTitle?: string
  jobApplicationId?: string
  prepPackId?: string
  prepStepId?: string
  focusAreas?: string[]
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
  language?: string
}

interface SubmitAnswerParams {
  sessionId: string
  questionId: string
  answer: string
  answerDurationSeconds: number
  audioUrl?: string
  language?: string
}

interface SessionResults {
  sessionId: string
  sessionType: string
  totalQuestions: number
  completedQuestions: number
  overallScore: number
  durationSeconds: number
  xpEarned?: number
  questions: {
    questionText: string
    userAnswer: string
    score: number
    feedback: AnswerFeedback
  }[]
  strengths: string[]
  weaknesses: string[]
  improvementAreas: string[]
}

// ===========================================================
// START TRAINING SESSION
// ===========================================================

export async function startTrainingSession(
  params: StartSessionParams
): Promise<ActionResult<{ sessionId: string; firstQuestion: InterviewQuestion }>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Determine total questions based on session type
    const questionCounts = {
      QUICK: 5,
      FULL_MOCK: 15,
      TARGETED: 8,
      COMPANY_PREP: 10,
    }

    const totalQuestions = questionCounts[params.sessionType]

    // Create training session
    const { data: session, error: sessionError } = await adminSupabase
      .from('training_sessions')
      .insert({
        userId: user.id,
        sessionType: params.sessionType,
        companyId: params.companyId || null,
        companyName: params.companyName || null,
        jobTitle: params.jobTitle || null,
        jobApplicationId: params.jobApplicationId || null,
        prepPackId: params.prepPackId || null,
        prepStepId: params.prepStepId || null,
        focusAreas: params.focusAreas || null,
        difficulty: params.difficulty || 'MEDIUM',
        totalQuestions,
        status: 'IN_PROGRESS',
      })
      .select('id')
      .single()

    if (sessionError || !session) {
      console.error('Error creating session:', sessionError)
      return { success: false, error: 'Failed to create training session' }
    }

    // Generate first question
    try {
      const firstQuestion = await generateInterviewQuestion({
        sessionType: params.sessionType,
        questionType: params.focusAreas?.[0] as any || 'GENERAL',
        difficulty: params.difficulty || 'MEDIUM',
        jobTitle: params.jobTitle,
        companyName: params.companyName,
        focusAreas: params.focusAreas,
        language: params.language,
      })

      // Save first question to database
      const { data: questionData, error: questionError } = await adminSupabase
        .from('training_questions')
        .insert({
          sessionId: session.id,
          orderIndex: 1,
          questionType: firstQuestion.questionType as any,
          questionText: firstQuestion.question,
          questionContext: firstQuestion.context,
        })
        .select('id')
        .single()

      if (questionError || !questionData) {
        console.error('Error saving question:', questionError)
        return { success: false, error: 'Failed to generate first question' }
      }

      return {
        success: true,
        data: {
          sessionId: session.id,
          firstQuestion: {
            ...firstQuestion,
            id: questionData.id,
          } as any,
        },
      }
    } catch (aiError) {
      console.error('AI generation error:', aiError)
      return { success: false, error: 'Failed to generate question. Please check your AI service configuration.' }
    }
  } catch (err) {
    console.error('Error starting session:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ===========================================================
// SUBMIT ANSWER & GET FEEDBACK
// ===========================================================

export async function submitAnswer(
  params: SubmitAnswerParams
): Promise<ActionResult<AnswerFeedback>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get the question
    const { data: question, error: questionError } = await adminSupabase
      .from('training_questions')
      .select('questionText, questionType, sessionId')
      .eq('id', params.questionId)
      .single()

    if (questionError || !question) {
      return { success: false, error: 'Question not found' }
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await adminSupabase
      .from('training_sessions')
      .select('userId, jobTitle')
      .eq('id', question.sessionId)
      .single()

    if (sessionError || !session || session.userId !== user.id) {
      return { success: false, error: 'Unauthorized access to session' }
    }

    // Analyze answer with AI
    try {
      const feedback = await analyzeAnswer({
        question: question.questionText,
        questionType: question.questionType,
        answer: params.answer,
        jobTitle: session.jobTitle || undefined,
        language: params.language,
      })

      // Update question with answer and feedback
      const { error: updateError } = await adminSupabase
        .from('training_questions')
        .update({
          userAnswer: params.answer,
          answerAudioUrl: params.audioUrl || null,
          answerDurationSeconds: params.answerDurationSeconds,
          aiFeedback: feedback as any,
          score: feedback.overallScore,
          improvementTips: feedback.improvementTips,
          keywordsUsed: feedback.keywordsUsed,
          keywordsMissing: feedback.keywordsMissing,
          revisedAnswer: feedback.revisedAnswer,
          answeredAt: new Date().toISOString(),
        })
        .eq('id', params.questionId)

      if (updateError) {
        console.error('Error updating question:', updateError)
        return { success: false, error: 'Failed to save feedback' }
      }

      // Update session progress
      const { data: currentSession } = await adminSupabase
        .from('training_sessions')
        .select('completedQuestions')
        .eq('id', question.sessionId)
        .single()

      const { error: sessionUpdateError } = await adminSupabase
        .from('training_sessions')
        .update({
          completedQuestions: (currentSession?.completedQuestions || 0) + 1,
        })
        .eq('id', question.sessionId)

      if (sessionUpdateError) {
        console.error('Error updating session:', sessionUpdateError)
      }

      return { success: true, data: feedback }
    } catch (aiError) {
      console.error('AI analysis error:', aiError)
      return { success: false, error: 'Failed to analyze answer. Please try again.' }
    }
  } catch (err) {
    console.error('Error submitting answer:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ===========================================================
// GET NEXT QUESTION
// ===========================================================

export async function getNextQuestion(
  sessionId: string,
  language?: string
): Promise<ActionResult<{ question: InterviewQuestion; isComplete: boolean }>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get session details
    const { data: session, error: sessionError } = await adminSupabase
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('userId', user.id)
      .single()

    if (sessionError || !session) {
      return { success: false, error: 'Session not found' }
    }

    // Check if session is complete
    if (session.completedQuestions >= session.totalQuestions) {
      return { success: true, data: { question: null as any, isComplete: true } }
    }

    // Get previous questions
    const { data: previousQuestions } = await adminSupabase
      .from('training_questions')
      .select('questionText')
      .eq('sessionId', sessionId)
      .order('orderIndex', { ascending: true })

    const previousQuestionTexts = previousQuestions?.map(q => q.questionText) || []

    // Determine next question type (rotate through focus areas)
    const focusAreas = session.focusAreas as string[] || ['GENERAL']
    const nextQuestionType = focusAreas[session.completedQuestions % focusAreas.length]

    // Generate next question
    try {
      const nextQuestion = await generateInterviewQuestion({
        sessionType: session.sessionType,
        questionType: nextQuestionType as any,
        difficulty: session.difficulty,
        jobTitle: session.jobTitle || undefined,
        companyName: session.companyName || undefined,
        previousQuestions: previousQuestionTexts,
        focusAreas: session.focusAreas as string[] || undefined,
        language,
      })

      // Save question to database
      const { data: questionData, error: questionError } = await adminSupabase
        .from('training_questions')
        .insert({
          sessionId,
          orderIndex: session.completedQuestions + 1,
          questionType: nextQuestion.questionType as any,
          questionText: nextQuestion.question,
          questionContext: nextQuestion.context,
        })
        .select('id')
        .single()

      if (questionError || !questionData) {
        return { success: false, error: 'Failed to save question' }
      }

      return {
        success: true,
        data: {
          question: { ...nextQuestion, id: questionData.id } as any,
          isComplete: false,
        },
      }
    } catch (aiError) {
      console.error('AI generation error:', aiError)
      return { success: false, error: 'Failed to generate next question' }
    }
  } catch (err) {
    console.error('Error getting next question:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ===========================================================
// COMPLETE SESSION
// ===========================================================

export async function completeSession(
  sessionId: string
): Promise<ActionResult<SessionResults>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get session with all questions
    const { data: session, error: sessionError } = await adminSupabase
      .from('training_sessions')
      .select('*, training_questions(*)')
      .eq('id', sessionId)
      .eq('userId', user.id)
      .single()

    if (sessionError || !session) {
      return { success: false, error: 'Session not found' }
    }

    const questions = session.training_questions || []
    const answeredQuestions = questions.filter((q: any) => q.userAnswer)

    // Calculate overall score
    const scores = answeredQuestions.map((q: any) => q.score || 0)
    const overallScore = scores.length > 0
      ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
      : 0

    // Calculate session duration
    const startedAt = new Date(session.startedAt)
    const completedAt = new Date()
    const durationSeconds = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)

    // Aggregate strengths and weaknesses
    const allStrengths: string[] = []
    const allWeaknesses: string[] = []
    const improvementAreas: string[] = []

    answeredQuestions.forEach((q: any) => {
      if (q.aiFeedback) {
        allStrengths.push(...(q.aiFeedback.strengths || []))
        allWeaknesses.push(...(q.aiFeedback.weaknesses || []))
        improvementAreas.push(...(q.aiFeedback.improvementTips || []))
      }
    })

    // Update session as completed
    const { error: updateError } = await adminSupabase
      .from('training_sessions')
      .update({
        status: 'COMPLETED',
        completedAt: completedAt.toISOString(),
        overallScore,
        durationSeconds,
        feedbackSummary: {
          strengths: [...new Set(allStrengths)].slice(0, 5),
          weaknesses: [...new Set(allWeaknesses)].slice(0, 5),
          improvementAreas: [...new Set(improvementAreas)].slice(0, 5),
        },
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Error updating session:', updateError)
    }

    // Update user interview stats
    await updateUserInterviewStats(user.id, session, overallScore)

    // If this session is linked to a prep pack step, auto-mark the step complete
    if (session.prepPackId && session.prepStepId) {
      try {
        const { data: pack } = await adminSupabase
          .from('interview_prep_packs')
          .select('completedSteps, totalSteps')
          .eq('id', session.prepPackId)
          .eq('userId', user.id)
          .single()

        if (pack) {
          const completedSteps = (pack.completedSteps as string[] | null) || []
          const stepId = session.prepStepId as string

          const nextCompletedSteps = completedSteps.includes(stepId)
            ? completedSteps
            : [...completedSteps, stepId]

          const totalSteps = pack.totalSteps || 0
          const progressPercent = totalSteps > 0
            ? Math.round((nextCompletedSteps.length / totalSteps) * 100)
            : 0

          await adminSupabase
            .from('interview_prep_packs')
            .update({
              completedSteps: nextCompletedSteps,
              progressPercent,
            })
            .eq('id', session.prepPackId)
            .eq('userId', user.id)
        }
      } catch (err) {
        console.error('Error updating prep pack progress:', err)
      }
    }

    // Award XP for completing training session
    let xpEarned = 0
    const xpResult = await awardXP(user.id, 'training_session_complete', sessionId)
    xpEarned = xpResult.data?.xpAwarded || 30

    // Bonus XP for high score (90+)
    if (overallScore >= 90) {
      const bonusResult = await awardXP(user.id, 'training_perfect_score', sessionId)
      xpEarned += bonusResult.data?.xpAwarded || 100
    }

    // Check achievements
    await triggerAchievementCheck(user.id, ['training_sessions', 'high_score_sessions', 'current_streak'])

    const results: SessionResults = {
      sessionId,
      sessionType: session.sessionType,
      totalQuestions: session.totalQuestions,
      completedQuestions: answeredQuestions.length,
      overallScore,
      durationSeconds,
      xpEarned,
      questions: answeredQuestions.map((q: any) => ({
        questionText: q.questionText,
        userAnswer: q.userAnswer,
        score: q.score || 0,
        feedback: q.aiFeedback,
      })),
      strengths: [...new Set(allStrengths)].slice(0, 5),
      weaknesses: [...new Set(allWeaknesses)].slice(0, 5),
      improvementAreas: [...new Set(improvementAreas)].slice(0, 5),
    }

    return { success: true, data: results }
  } catch (err) {
    console.error('Error completing session:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ===========================================================
// HELPER: Update User Interview Stats
// ===========================================================

async function updateUserInterviewStats(
  userId: string,
  session: any,
  sessionScore: number
) {
  try {
    const { data: stats } = await adminSupabase
      .from('user_interview_stats')
      .select('*')
      .eq('userId', userId)
      .single()

    const today = new Date().toISOString().split('T')[0]

    if (stats) {
      // Update existing stats
      const newTotalSessions = stats.totalSessions + 1
      const newTotalQuestions = stats.totalQuestionsAnswered + session.completedQuestions
      const newTotalTime = stats.totalPracticeTimeSeconds + (session.durationSeconds || 0)
      const newAvgScore = ((stats.avgSessionScore || 0) * stats.totalSessions + sessionScore) / newTotalSessions

      // Update streak
      const lastPractice = stats.lastPracticeDate
      let newStreak = stats.currentStreakDays
      if (lastPractice) {
        const daysDiff = Math.floor((new Date(today).getTime() - new Date(lastPractice).getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff === 1) {
          newStreak += 1
        } else if (daysDiff > 1) {
          newStreak = 1
        }
      } else {
        newStreak = 1
      }

      await adminSupabase
        .from('user_interview_stats')
        .update({
          totalSessions: newTotalSessions,
          totalQuestionsAnswered: newTotalQuestions,
          totalPracticeTimeSeconds: newTotalTime,
          avgSessionScore: newAvgScore,
          highestScore: Math.max(stats.highestScore, sessionScore),
          currentStreakDays: newStreak,
          longestStreakDays: Math.max(stats.longestStreakDays, newStreak),
          lastPracticeDate: today,
        })
        .eq('userId', userId)
    } else {
      // Create new stats
      await adminSupabase
        .from('user_interview_stats')
        .insert({
          userId,
          totalSessions: 1,
          totalQuestionsAnswered: session.completedQuestions,
          totalPracticeTimeSeconds: session.durationSeconds || 0,
          avgSessionScore: sessionScore,
          highestScore: sessionScore,
          currentStreakDays: 1,
          longestStreakDays: 1,
          lastPracticeDate: today,
        })
    }
  } catch (err) {
    console.error('Error updating user stats:', err)
  }
}

// ===========================================================
// GET TRAINING HISTORY
// ===========================================================

export async function getTrainingHistory(params?: {
  limit?: number
  offset?: number
  sessionType?: string
}): Promise<ActionResult<{ sessions: any[]; total: number }>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    let query = adminSupabase
      .from('training_sessions')
      .select('*', { count: 'exact' })
      .eq('userId', user.id)
      .order('startedAt', { ascending: false })

    if (params?.sessionType) {
      query = query.eq('sessionType', params.sessionType)
    }

    if (params?.limit) {
      query = query.limit(params.limit)
    }

    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      return { success: false, error: 'Failed to fetch training history' }
    }

    return { success: true, data: { sessions: data || [], total: count || 0 } }
  } catch (err) {
    console.error('Error fetching history:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ===========================================================
// GET INTERVIEW STATS
// ===========================================================

export async function getInterviewStats(): Promise<ActionResult<any>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: stats, error } = await adminSupabase
      .from('user_interview_stats')
      .select('*')
      .eq('userId', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: 'Failed to fetch stats' }
    }

    return { success: true, data: stats || null }
  } catch (err) {
    console.error('Error fetching stats:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
