import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = params.sessionId

    // Get session with all questions
    const { data: session, error: sessionError } = await adminSupabase
      .from('training_sessions')
      .select('*, training_questions(*)')
      .eq('id', sessionId)
      .eq('userId', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const questions = session.training_questions || []
    const answeredQuestions = questions.filter((q: any) => q.userAnswer)

    // Aggregate feedback
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

    const results = {
      sessionId,
      sessionType: session.sessionType,
      prepPackId: session.prepPackId || null,
      totalQuestions: session.totalQuestions,
      completedQuestions: answeredQuestions.length,
      overallScore: session.overallScore || 0,
      durationSeconds: session.durationSeconds || 0,
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

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching session results:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
