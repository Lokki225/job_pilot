"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Trophy,
  Target,
  Clock,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  Home,
  ChevronDown,
  ChevronUp,
  Star,
  Zap,
  Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useTranslation } from '@/components/providers/language-provider'
import confetti from 'canvas-confetti'

interface SessionResult {
  sessionId: string
  sessionType: string
  totalQuestions: number
  completedQuestions: number
  overallScore: number
  durationSeconds: number
  questions: {
    questionText: string
    userAnswer: string
    score: number
    feedback: any
  }[]
  strengths: string[]
  weaknesses: string[]
  improvementAreas: string[]
}

export default function SessionResultsPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string

  const [results, setResults] = useState<SessionResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set())
  const { t } = useTranslation()

  useEffect(() => {
    loadResults()
  }, [sessionId])

  const loadResults = async () => {
    setIsLoading(true)
    try {
      // Fetch from API or localStorage for now
      const response = await fetch(`/api/training/session/${sessionId}/results`)
      if (response.ok) {
        const data = await response.json()
        setResults(data)
        
        // Trigger confetti for good scores
        if (data.overallScore >= 70) {
          setTimeout(() => {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            })
          }, 500)
        }
      } else {
        // Mock data for now
        setResults({
          sessionId,
          sessionType: 'QUICK',
          totalQuestions: 5,
          completedQuestions: 5,
          overallScore: 78,
          durationSeconds: 900,
          questions: [],
          strengths: ['Clear communication', 'Good use of examples', 'Confident delivery'],
          weaknesses: ['Could add more metrics', 'Sometimes too verbose'],
          improvementAreas: ['Practice STAR method', 'Quantify achievements', 'Be more concise'],
        })
      }
    } catch (error) {
      console.error('Error loading results:', error)
      // Use mock data
      setResults({
        sessionId,
        sessionType: 'QUICK',
        totalQuestions: 5,
        completedQuestions: 5,
        overallScore: 78,
        durationSeconds: 900,
        questions: [],
        strengths: ['Clear communication', 'Good use of examples', 'Confident delivery'],
        weaknesses: ['Could add more metrics', 'Sometimes too verbose'],
        improvementAreas: ['Practice STAR method', 'Quantify achievements', 'Be more concise'],
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreGrade = (score: number) => {
    if (score >= 90) return { grade: 'A+', message: t('results.outstanding') }
    if (score >= 80) return { grade: 'A', message: t('results.excellentWork') }
    if (score >= 70) return { grade: 'B', message: t('results.goodJob') }
    if (score >= 60) return { grade: 'C', message: t('results.keepPracticing') }
    return { grade: 'D', message: t('results.roomForImprovement') }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-200">{t('training.loadingResults')}</p>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">{t('training.resultsNotFound')}</h2>
          <p className="text-purple-200 mb-6">{t('training.couldntLoadResults')}</p>
          <Button onClick={() => router.push('/dashboard/training')}>
            {t('training.backToTraining')}
          </Button>
        </div>
      </div>
    )
  }

  const scoreInfo = getScoreGrade(results.overallScore)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Hero Score Section */}
        <div className="text-center mb-12 pt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-6">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-medium">{t('training.sessionComplete')}</span>
          </div>
          
          {/* Score Circle */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-white/10"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="url(#resultGradient)"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(results.overallScore / 100) * 553} 553`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="resultGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-bold text-white">{results.overallScore}</span>
              <span className="text-purple-300 text-sm">{t('training.outOf100')}</span>
            </div>
          </div>

          {/* Grade Badge */}
          <div className="flex flex-col items-center gap-2">
            <Badge className="text-2xl px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              {t('training.grade')}: {scoreInfo.grade}
            </Badge>
            <p className="text-xl text-purple-200">{scoreInfo.message}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4 text-center">
              <MessageSquare className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{results.completedQuestions}</p>
              <p className="text-xs text-purple-300">{t('training.questions')}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{formatDuration(results.durationSeconds)}</p>
              <p className="text-xs text-purple-300">{t('training.duration')}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white capitalize">{results.sessionType.toLowerCase().replace('_', ' ')}</p>
              <p className="text-xs text-purple-300">{t('training.sessionType')}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4 text-center">
              <Award className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">+{Math.round(results.overallScore * 1.5)}</p>
              <p className="text-xs text-purple-300">{t('training.xpEarned')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-300">
                <TrendingUp className="w-5 h-5" />
                {t('training.strengths')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {results.strengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-green-100">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/10 border-orange-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-300">
                <TrendingDown className="w-5 h-5" />
                {t('training.areasToImprove')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {results.weaknesses.map((weakness, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <span className="text-orange-100">{weakness}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Improvement Tips */}
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 border-purple-500/30 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-300">
              <Lightbulb className="w-5 h-5" />
              {t('training.actionItems')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {results.improvementAreas.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">{i + 1}</span>
                  </div>
                  <span className="text-purple-100">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Question Review */}
        {results.questions.length > 0 && (
          <Card className="bg-white/10 border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MessageSquare className="w-5 h-5" />
                {t('training.questionReview')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.questions.map((q, i) => (
                <div 
                  key={i}
                  className="border border-white/10 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleQuestion(i)}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`text-lg font-bold ${getScoreColor(q.score)}`}>
                        {q.score}
                      </div>
                      <p className="text-white text-left line-clamp-1">
                        {q.questionText}
                      </p>
                    </div>
                    {expandedQuestions.has(i) ? (
                      <ChevronUp className="w-5 h-5 text-white/50" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white/50" />
                    )}
                  </button>
                  
                  {expandedQuestions.has(i) && (
                    <div className="p-4 bg-white/5 border-t border-white/10 space-y-4">
                      <div>
                        <h5 className="text-sm font-medium text-purple-300 mb-2">{t('results.yourAnswer')}</h5>
                        <p className="text-sm text-white/80">{q.userAnswer}</p>
                      </div>
                      {q.feedback && (
                        <>
                          <div>
                            <h5 className="text-sm font-medium text-green-300 mb-2">{t('results.whatYouDidWell')}</h5>
                            <ul className="text-sm text-green-200 space-y-1">
                              {q.feedback.strengths?.map((s: string, j: number) => (
                                <li key={j}>• {s}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-orange-300 mb-2">{t('results.howToImprove')}</h5>
                            <ul className="text-sm text-orange-200 space-y-1">
                              {q.feedback.improvementTips?.map((t: string, j: number) => (
                                <li key={j}>• {t}</li>
                              ))}
                            </ul>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/training')}
            className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10"
          >
            <Home className="w-4 h-4 mr-2" />
            {t('training.backToTraining')}
          </Button>
          
          <Button
            onClick={() => router.push('/dashboard/training/session/new?type=' + results.sessionType)}
            className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600 group"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('training.practiceAgain')}
          </Button>
          
          <Button
            onClick={() => router.push('/dashboard/training/history')}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600 group"
          >
            {t('training.viewHistory')}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

      </div>
    </div>
  )
}
