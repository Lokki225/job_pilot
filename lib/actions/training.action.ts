'use server'

import { adminSupabase } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { generateInterviewQuestion, analyzeAnswer, type InterviewQuestion, type AnswerFeedback } from '@/lib/services/training/interview-ai.service'
import type { InterviewKitBlock } from '@/lib/actions/interview-kits.action'
import { awardXP } from '@/lib/services/gamification.service'
import { triggerAchievementCheck } from '@/lib/services/achievements.service'

// ===========================================================
// TYPES
// ===========================================================

const MASTER_COLUMNS =
  'id, slug, displayName, tagline, avatarUrl, systemPrompt, abilitiesJson, defaultKitId, voiceProvider, voiceModel, voiceSettingsJson, isActive, isPublic, updatedAt'
const DEFAULT_MASTER_SLUG = 'job-pilot-coach-base'

interface BuildAutoKitInput {
  jobTitle?: string | null
  companyName?: string | null
  sessionType: StartSessionParams['sessionType']
  focusAreas?: string[]
  totalQuestions: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  masterSnapshot: any | null
  prepContext?: PrepContext | null
}

interface PrepContext {
  prepPackId: string
  companyName?: string | null
  jobTitle?: string | null
  focusAreas: string[]
  summary: string | null
}

interface AutoKitSnapshot {
  title: string
  description: string | null
  blocksJson: InterviewKitBlock[]
  prepBlocksJson: InterviewKitBlock[]
}

export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface InterviewMasterOption {
  id: string
  slug: string
  displayName: string
  tagline: string | null
  avatarUrl: string | null
  defaultKitId: string | null
}

export interface StartSessionParams {
  sessionType: 'QUICK' | 'FULL_MOCK' | 'TARGETED' | 'COMPANY_PREP'
  companyId?: string
  companyName?: string
  jobTitle?: string
  jobApplicationId?: string
  prepPackId?: string
  prepStepId?: string
  kitId?: string
  masterId?: string
  focusAreas?: string[]
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
  language?: string
  kitMode?: 'AUTO' | 'MANUAL'
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

export async function getAvailableInterviewMasters(): Promise<ActionResult<InterviewMasterOption[]>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await adminSupabase
      .from('interview_masters')
      .select('id, slug, displayName, tagline, avatarUrl, defaultKitId')
      .eq('isActive', true)
      .eq('isPublic', true)
      .order('displayName', { ascending: true })

    if (error) {
      console.error('Error loading interview masters:', error)
      return { success: false, error: 'Failed to load interview masters' }
    }

    return { success: true, data: (data || []) as any }
  } catch (err) {
    console.error('Error loading interview masters:', err)
    return { success: false, error: 'Failed to load interview masters' }
  }
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

    const kitMode = params.kitMode === 'MANUAL' ? 'MANUAL' : 'AUTO'

    const masterAndKit = await resolveMasterAndKitForSession({
      userId: user.id,
      masterId: params.masterId,
      kitId: kitMode === 'MANUAL' ? params.kitId : undefined,
    })

    if (masterAndKit.error) {
      return { success: false, error: masterAndKit.error }
    }

    // Create training session
    let kitSnapshot = masterAndKit.data?.kitSnapshot || null
    let kitIdForSession = kitMode === 'MANUAL' ? masterAndKit.data?.kit?.id || null : null

    if (kitMode === 'AUTO') {
      const autoKit = await buildAutoKitSnapshot({
        jobTitle: params.jobTitle,
        companyName: params.companyName,
        sessionType: params.sessionType,
        focusAreas: params.focusAreas,
        totalQuestions,
        difficulty: params.difficulty || 'MEDIUM',
        masterSnapshot: masterAndKit.data?.masterSnapshot || null,
        prepContext: params.prepPackId
          ? {
              prepPackId: params.prepPackId,
              companyName: params.companyName,
              jobTitle: params.jobTitle,
              focusAreas: params.focusAreas || [],
              summary: null,
            }
          : undefined,
      })

      if (autoKit.error || !autoKit.data) {
        return { success: false, error: autoKit.error || 'Failed to generate kit for session' }
      }

      kitSnapshot = autoKit.data
      kitIdForSession = null
    } else if (kitMode === 'MANUAL' && !kitSnapshot) {
      return { success: false, error: 'Interview kit not found or inaccessible' }
    }

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
        kitId: kitIdForSession,
        masterId: masterAndKit.data?.master?.id || null,
        kitSnapshotJson: kitSnapshot,
        masterSnapshotJson: masterAndKit.data?.masterSnapshot || null,
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

    const masterContext = masterAndKit.data?.masterSnapshot
    const kitContext = kitSnapshot
    const kitQuestionBlocks = extractKitQuestionsFromSnapshot(kitContext)

    // Generate first question
    try {
      const questionType = (params.focusAreas?.[0] as any) || 'GENERAL'

      const kitQuestion = kitQuestionBlocks[0]

      const firstQuestion: InterviewQuestion = kitQuestion
        ? {
            question: kitQuestion.text,
            questionType: kitQuestion.questionType || questionType,
            context: '',
            hints: [],
            expectedElements: [],
          }
        : await generateInterviewQuestion({
            sessionType: params.sessionType,
            questionType,
            difficulty: params.difficulty || 'MEDIUM',
            jobTitle: params.jobTitle,
            companyName: params.companyName,
            focusAreas: params.focusAreas,
            language: params.language,
            masterSystemPrompt: (masterContext as any)?.systemPrompt || undefined,
            masterAbilities: (masterContext as any)?.abilitiesJson || undefined,
            kitContext: kitContextToPromptString(kitContext),
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

function normalizeQuestionType(value: unknown): 'BEHAVIORAL' | 'TECHNICAL' | 'SITUATIONAL' | 'GENERAL' | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toUpperCase()
  if (v === 'BEHAVIORAL' || v === 'TECHNICAL' || v === 'SITUATIONAL' || v === 'GENERAL') return v
  return null
}

type KitQuestionBlock = { text: string; questionType: 'BEHAVIORAL' | 'TECHNICAL' | 'SITUATIONAL' | 'GENERAL' | null }

function extractKitQuestionsFromSnapshot(kitSnapshot: any): KitQuestionBlock[] {
  const blocks = Array.isArray(kitSnapshot?.blocksJson) ? (kitSnapshot.blocksJson as any[]) : []
  return blocks
    .filter((b) => b && typeof b === 'object' && b.type === 'question' && typeof b.content === 'string' && b.content.trim())
    .map((b) => ({
      text: String(b.content).trim(),
      questionType: normalizeQuestionType((b as any)?.meta?.questionType),
    }))
}

function kitContextToPromptString(kitSnapshot: any): string | undefined {
  if (!kitSnapshot) return undefined
  const title = typeof kitSnapshot?.title === 'string' ? kitSnapshot.title : null
  const description = typeof kitSnapshot?.description === 'string' ? kitSnapshot.description : null
  const blocks = Array.isArray(kitSnapshot?.blocksJson) ? (kitSnapshot.blocksJson as any[]) : []

  const nonQuestionBlocks = blocks
    .filter((b) => b && typeof b === 'object' && b.type !== 'question' && typeof b.content === 'string' && b.content.trim())
    .slice(0, 12)
    .map((b) => `${String(b.type)}: ${String(b.content).trim()}`)

  const lines: string[] = []
  if (title) lines.push(`Title: ${title}`)
  if (description) lines.push(`Description: ${description}`)
  if (nonQuestionBlocks.length) {
    lines.push('Supporting blocks:')
    lines.push(...nonQuestionBlocks)
  }

  return lines.length ? lines.join('\n') : undefined
}

const FOCUS_PROMPTS: Record<string, string> = {
  BEHAVIORAL: 'Tell me about a time you influenced a team when the direction seemed unclear',
  TECHNICAL: 'Walk me through how you would design or debug a critical system for this role',
  SITUATIONAL: 'Imagine the interviewer pushes back on your approach during an onsite loop—how do you respond',
  GENERAL: 'Why are you the best candidate for this opportunity',
}

const RUBRIC_NOTES: Record<string, string> = {
  BEHAVIORAL:
    'Score for structure (STAR), ownership, measurable impact, and reflection on what you learned or would change.',
  TECHNICAL:
    'Score for clarity of reasoning, tradeoff awareness, and ability to communicate technical depth without rambling.',
  SITUATIONAL:
    'Score for empathy, prioritization under ambiguity, and how decisions ladder up to business outcomes.',
  GENERAL: 'Score for confidence, role alignment, and authentic motivation connected to the company mission.',
}

function difficultyCue(level: 'EASY' | 'MEDIUM' | 'HARD' | undefined) {
  switch (level) {
    case 'EASY':
      return 'Keep it concise and friendly; focus on fundamentals.'
    case 'HARD':
      return 'Expect deeper follow-ups—layer metrics, risks, and advanced tradeoffs.'
    default:
      return 'Provide clear structure with tangible examples and metrics.'
  }
}

function makeBlockId() {
  return `block_${Math.random().toString(36).slice(2, 9)}`
}

function createBlock(type: string, content: string, meta?: Record<string, any>): InterviewKitBlock {
  return {
    id: makeBlockId(),
    type,
    content,
    meta,
  }
}

function buildFocusQuestion(area: string, index: number, input: BuildAutoKitInput) {
  const template = FOCUS_PROMPTS[area as keyof typeof FOCUS_PROMPTS] || FOCUS_PROMPTS.GENERAL
  const role = input.jobTitle ? ` for the ${input.jobTitle}` : ''
  const company = input.companyName ? ` at ${input.companyName}` : ''
  return `${index + 1}. ${template}${role}${company}? ${difficultyCue(input.difficulty)}`
}

async function buildAutoKitSnapshot(input: BuildAutoKitInput): Promise<ActionResult<AutoKitSnapshot>> {
  try {
    const focusAreas = (input.focusAreas?.length ? input.focusAreas : ['BEHAVIORAL']).slice(0, 4)
    const blocks: InterviewKitBlock[] = []
    const prepBlocks: InterviewKitBlock[] = []

    focusAreas.forEach((area, index) => {
      blocks.push(createBlock('question', buildFocusQuestion(area, index, input), { questionType: area }))
      const rubric = RUBRIC_NOTES[area as keyof typeof RUBRIC_NOTES] || RUBRIC_NOTES.GENERAL
      blocks.push(createBlock('rubric', `${rubric}\n\n${difficultyCue(input.difficulty)}`))
    })

    if (input.prepContext) {
      prepBlocks.push(
        createBlock(
          'notes',
          `Prep Pack • ${input.prepContext.companyName || 'Target Company'}\nRole: ${
            input.prepContext.jobTitle || input.jobTitle || 'Interview Focus'
          }\nFocus areas: ${input.prepContext.focusAreas.join(', ') || focusAreas.join(', ')}`
        )
      )
      prepBlocks.push(
        createBlock(
          'checklist',
          [
            '• Study the company values and recent wins from the prep pack.',
            '• Pick 2-3 STAR stories that map to the listed focus areas.',
            '• Mirror the communication tone suggested in the prep notes.',
          ].join('\n')
        )
      )
      if (input.prepContext.summary) {
        prepBlocks.push(createBlock('notes', `Prep insights:\n${input.prepContext.summary}`))
      }
    } else {
      prepBlocks.push(
        createBlock(
          'notes',
          'Tip: Anchor every answer with the problem, specific actions you took, and the measurable result.'
        )
      )
    }

    const titleParts = [
      input.companyName ? `${input.companyName}` : null,
      input.jobTitle ? `${input.jobTitle}` : null,
    ].filter(Boolean)

    const title = titleParts.length
      ? `${titleParts.join(' – ')} Practice Kit`
      : `${input.sessionType === 'COMPANY_PREP' ? 'Company Prep' : 'Adaptive'} Practice Kit`

    const description = input.masterSnapshot?.displayName
      ? `Auto-generated kit guided by ${input.masterSnapshot.displayName} for ${
          focusAreas.join(', ') || 'core'
        } focus areas.`
      : 'Auto-generated kit tuned to your selected focus areas.'

    return {
      success: true,
      data: {
        title,
        description,
        blocksJson: blocks,
        prepBlocksJson: prepBlocks,
      },
    }
  } catch (err) {
    console.error('Error building auto kit snapshot:', err)
    return { success: false, error: 'Failed to craft auto kit snapshot' }
  }
}

async function resolveMasterAndKitForSession(params: {
  userId: string
  masterId?: string
  kitId?: string
}): Promise<
  | { data: { master: any | null; kit: any | null; masterSnapshot: any | null; kitSnapshot: any | null } | null; error: null }
  | { data: null; error: string }
> {
  try {
    let master: any | null = null
    let kit: any | null = null

    if (params.masterId) {
      const { data, error } = await adminSupabase
        .from('interview_masters')
        .select(MASTER_COLUMNS)
        .eq('id', params.masterId)
        .single()

      if (error || !data) return { data: null, error: 'Interview master not found' }
      if (!(data as any).isActive) return { data: null, error: 'This interview master is not active' }
      master = data
    }

    const effectiveKitId = params.kitId || (master as any)?.defaultKitId || null

    if (effectiveKitId) {
      const { data, error } = await adminSupabase
        .from('interview_kits')
        .select('id, ownerId, title, description, blocksJson, prepBlocksJson, visibility, isArchived, updatedAt')
        .eq('id', effectiveKitId)
        .single()

      if (error || !data) return { data: null, error: 'Interview kit not found' }
      if ((data as any).isArchived) return { data: null, error: 'This interview kit is archived' }

      const isOwner = (data as any).ownerId === params.userId
      const isPublic = (data as any).visibility === 'PUBLIC'
      if (!isOwner && !isPublic) return { data: null, error: 'You do not have access to this interview kit' }

      kit = data
    }

    const masterSnapshot = master ? makeMasterSnapshot(master) : null

    const kitSnapshot = kit
      ? {
          id: kit.id,
          title: kit.title,
          description: kit.description,
          blocksJson: kit.blocksJson,
          visibility: kit.visibility,
          updatedAt: kit.updatedAt,
          prepBlocksJson: kit.prepBlocksJson,
        }
      : null

    return { data: { master, kit, masterSnapshot, kitSnapshot }, error: null }
  } catch (err) {
    console.error('Error resolving master/kit for session:', err)
    return { data: null, error: 'Failed to resolve master/kit' }
  }
}
function makeMasterSnapshot(master: any) {
  return {
    id: master.id,
    slug: master.slug,
    displayName: master.displayName,
    tagline: master.tagline,
    avatarUrl: master.avatarUrl,
    systemPrompt: master.systemPrompt,
    abilitiesJson: master.abilitiesJson,
    defaultKitId: master.defaultKitId,
    voiceProvider: master.voiceProvider,
    voiceModel: master.voiceModel,
    voiceSettingsJson: master.voiceSettingsJson,
    updatedAt: master.updatedAt,
  }
}

async function upsertUserInterviewKitMastery(params: {
  userId: string
  kitId: string
  sessionScore: number
  completionRate: number
}): Promise<void> {
  try {
    const { data: existing, error: existingError } = await adminSupabase
      .from('user_interview_kit_mastery')
      .select('id, sessionsCount, avgScore, bestScore, avgCompletionRate')
      .eq('userId', params.userId)
      .eq('kitId', params.kitId)
      .maybeSingle()

    if (existingError) {
      console.error('Error loading kit mastery:', existingError)
      return
    }

    const prevSessions = Number((existing as any)?.sessionsCount || 0)
    const prevAvgScore = Number((existing as any)?.avgScore || 0)
    const prevBest = Number((existing as any)?.bestScore || 0)
    const prevAvgCompletion = Number((existing as any)?.avgCompletionRate || 0)

    const nextSessions = prevSessions + 1
    const nextAvgScore = Math.round((prevAvgScore * prevSessions + params.sessionScore) / nextSessions)
    const nextAvgCompletion = Math.round((prevAvgCompletion * prevSessions + params.completionRate) / nextSessions)
    const nextBest = Math.max(prevBest, params.sessionScore)

    const now = new Date().toISOString()

    const { error: upsertError } = await adminSupabase
      .from('user_interview_kit_mastery')
      .upsert(
        {
          userId: params.userId,
          kitId: params.kitId,
          sessionsCount: nextSessions,
          avgScore: nextAvgScore,
          bestScore: nextBest,
          avgCompletionRate: nextAvgCompletion,
          lastPracticedAt: now,
        },
        { onConflict: 'userId,kitId' }
      )

    if (upsertError) {
      console.error('Error upserting kit mastery:', upsertError)
    }
  } catch (err) {
    console.error('Error updating kit mastery:', err)
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
      .select('userId, jobTitle, kitId, masterId, kitSnapshotJson, masterSnapshotJson')
      .eq('id', question.sessionId)
      .single()

    if (sessionError || !session || session.userId !== user.id) {
      return { success: false, error: 'Unauthorized access to session' }
    }

    // Analyze answer with AI
    try {
      const kitContext = (session as any).kitSnapshotJson || null
      const masterContext = (session as any).masterSnapshotJson || null

      const feedback = await analyzeAnswer({
        question: question.questionText,
        questionType: question.questionType,
        answer: params.answer,
        jobTitle: session.jobTitle || undefined,
        language: params.language,
        masterSystemPrompt: (masterContext as any)?.systemPrompt || undefined,
        masterAbilities: (masterContext as any)?.abilitiesJson || undefined,
        kitContext: kitContextToPromptString(kitContext),
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

    const kitContext = (session as any).kitSnapshotJson || null
    const masterContext = (session as any).masterSnapshotJson || null
    const kitQuestionBlocks = extractKitQuestionsFromSnapshot(kitContext)

    // Generate next question
    try {
      // session.completedQuestions is already incremented after submitAnswer; orderIndex is 1-based.
      const kitQuestion = kitQuestionBlocks[session.completedQuestions]

      const nextQuestion: InterviewQuestion = kitQuestion
        ? {
            question: kitQuestion.text,
            questionType: kitQuestion.questionType || (nextQuestionType as any),
            context: '',
            hints: [],
            expectedElements: [],
          }
        : await generateInterviewQuestion({
            sessionType: session.sessionType,
            questionType: nextQuestionType as any,
            difficulty: session.difficulty,
            jobTitle: session.jobTitle || undefined,
            companyName: session.companyName || undefined,
            previousQuestions: previousQuestionTexts,
            focusAreas: (session.focusAreas as string[]) || undefined,
            language,
            masterSystemPrompt: (masterContext as any)?.systemPrompt || undefined,
            masterAbilities: (masterContext as any)?.abilitiesJson || undefined,
            kitContext: kitContextToPromptString(kitContext),
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

    // Update per-kit mastery stats (if session is linked to a kit)
    if ((session as any).kitId) {
      const completionRate = session.totalQuestions > 0
        ? Math.round((answeredQuestions.length / session.totalQuestions) * 100)
        : 0

      await upsertUserInterviewKitMastery({
        userId: user.id,
        kitId: (session as any).kitId,
        sessionScore: overallScore,
        completionRate,
      })
    }

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
