"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Keyboard,
  ArrowRight,
  Pause,
  Play,
  X,
  Lightbulb,
  Clock,
  MessageSquare,
  CheckCircle,
  Loader2,
  Wifi,
  WifiOff,
  Send,
  RotateCcw,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { useVoiceInterview } from '@/hooks/useVoiceInterview'
import { submitAnswer, getNextQuestion, completeSession } from '@/lib/actions/training.action'
import { toast } from '@/components/ui/use-toast'
import type { AnswerFeedback } from '@/lib/services/training/interview-ai.service'
import { SpeechLanguageSelector, useSpeechLanguage } from '@/components/ui/speech-language-selector'

interface Question {
  id?: string
  question: string
  questionType: string
  context?: string
  hints?: string[]
  expectedElements?: string[]
}

type SessionPhase = 'listening' | 'speaking' | 'thinking' | 'feedback' | 'complete'

export default function InterviewSessionPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string

  // Session state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [totalQuestions, setTotalQuestions] = useState(5)
  const [phase, setPhase] = useState<SessionPhase>('listening')
  const [isLoading, setIsLoading] = useState(true)

  // Input state
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [textInput, setTextInput] = useState('')
  const [answerStartTime, setAnswerStartTime] = useState<number | null>(null)

  // Feedback state
  const [currentFeedback, setCurrentFeedback] = useState<AnswerFeedback | null>(null)
  const [showHints, setShowHints] = useState(false)

  // Timer
  const [elapsedTime, setElapsedTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Speech language
  const { speechLanguage, setSpeechLanguage } = useSpeechLanguage()

  // Voice hook
  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setTranscript(prev => prev + ' ' + text)
      setInterimTranscript('')
    } else {
      setInterimTranscript(text)
    }
  }, [])

  const handleVoiceError = useCallback((error: string) => {
    toast({
      title: 'Voice Error',
      description: error,
      variant: 'destructive',
    })
    setInputMode('text')
  }, [])

  const voice = useVoiceInterview({
    onTranscript: handleTranscript,
    onError: handleVoiceError,
    language: speechLanguage,
    autoRestart: true,
  })

  // Load initial question from URL state or fetch
  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true)
      try {
        // Try to get next question (which handles first question too)
        const result = await getNextQuestion(sessionId, speechLanguage)
        if (result.success && result.data) {
          if (result.data.isComplete) {
            router.push(`/dashboard/training/session/${sessionId}/results`)
            return
          }
          setCurrentQuestion(result.data.question)
          setPhase('listening')
          speakQuestion(result.data.question.question)
        } else {
          toast({
            title: 'Error loading session',
            description: result.error || 'Could not load interview session',
            variant: 'destructive',
          })
          router.push('/dashboard/training')
        }
      } catch (error) {
        console.error('Error loading session:', error)
        router.push('/dashboard/training')
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()
  }, [sessionId, router])

  // Timer
  useEffect(() => {
    if (phase === 'speaking' && answerStartTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - answerStartTime) / 1000))
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [phase, answerStartTime])

  const speakQuestion = (text: string) => {
    setPhase('listening')
    voice.speak(text, () => {
      // After speaking, wait for user to start answering
      setPhase('speaking')
      setAnswerStartTime(Date.now())
      if (inputMode === 'voice') {
        voice.startListening()
      }
    })
  }

  const handleStartAnswer = () => {
    setPhase('speaking')
    setAnswerStartTime(Date.now())
    setTranscript('')
    setInterimTranscript('')
    if (inputMode === 'voice') {
      voice.startListening()
    }
  }

  const handleSubmitAnswer = async () => {
    const answer = inputMode === 'voice' ? transcript.trim() : textInput.trim()
    
    if (!answer) {
      toast({
        title: 'No answer provided',
        description: 'Please provide an answer before submitting',
        variant: 'destructive',
      })
      return
    }

    if (!currentQuestion || !currentQuestion.id) return

    voice.stopListening()
    voice.stopSpeaking()
    setPhase('thinking')

    const duration = answerStartTime 
      ? Math.floor((Date.now() - answerStartTime) / 1000) 
      : 0

    try {
      const result = await submitAnswer({
        sessionId,
        questionId: currentQuestion.id,
        answer,
        answerDurationSeconds: duration,
        language: speechLanguage,
      })

      if (result.success && result.data) {
        setCurrentFeedback(result.data)
        setPhase('feedback')
        
        // Speak summary feedback
        const feedbackText = `Your score is ${result.data.overallScore} out of 100. ${result.data.strengths[0] || ''}`
        voice.speak(feedbackText)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to analyze answer',
          variant: 'destructive',
        })
        setPhase('speaking')
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
      setPhase('speaking')
    }
  }

  const handleNextQuestion = async () => {
    setPhase('thinking')
    setCurrentFeedback(null)
    setTranscript('')
    setTextInput('')
    setElapsedTime(0)
    setShowHints(false)

    try {
      const result = await getNextQuestion(sessionId, speechLanguage)
      
      if (result.success && result.data) {
        if (result.data.isComplete) {
          // Complete the session
          await completeSession(sessionId)
          router.push(`/dashboard/training/session/${sessionId}/results`)
          return
        }
        
        setCurrentQuestion(result.data.question)
        setQuestionNumber(prev => prev + 1)
        speakQuestion(result.data.question.question)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to get next question',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error getting next question:', error)
    }
  }

  const handleEndSession = async () => {
    try {
      await completeSession(sessionId)
      router.push(`/dashboard/training/session/${sessionId}/results`)
    } catch (error) {
      console.error('Error ending session:', error)
      router.push('/dashboard/training')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse mx-auto flex items-center justify-center">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <div className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-ping opacity-20 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Preparing Your Interview</h2>
          <p className="text-purple-200">Getting everything ready...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEndSession}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4 mr-2" />
              End Session
            </Button>
            <div className="h-4 w-px bg-white/20" />
            <span className="text-white/70 text-sm">
              Question {questionNumber} of {totalQuestions}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Speech Language Selector */}
            <SpeechLanguageSelector 
              value={speechLanguage}
              onChange={setSpeechLanguage}
              variant="compact"
            />
            
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {voice.connectionQuality === 'good' ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-yellow-400" />
              )}
              <span className="text-xs text-white/50">
                {voice.connectionQuality}
              </span>
            </div>
            
            {/* Input Mode Toggle */}
            <div className="flex items-center bg-white/10 rounded-full p-1">
              <button
                onClick={() => setInputMode('voice')}
                className={`p-2 rounded-full transition-colors ${
                  inputMode === 'voice' 
                    ? 'bg-purple-500 text-white' 
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={() => setInputMode('text')}
                className={`p-2 rounded-full transition-colors ${
                  inputMode === 'text' 
                    ? 'bg-purple-500 text-white' 
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Keyboard className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 bg-white/10">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-32 px-4 min-h-screen">
        <div className="max-w-4xl mx-auto">
          
          {/* AI Interviewer Avatar */}
          <div className="flex justify-center mb-8 pt-8">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 flex items-center justify-center shadow-2xl ${
                phase === 'listening' || voice.isSpeaking ? 'animate-pulse' : ''
              }`}>
                <div className="w-28 h-28 rounded-full bg-slate-800 flex items-center justify-center">
                  {voice.isSpeaking ? (
                    <Volume2 className="w-12 h-12 text-purple-400 animate-bounce" />
                  ) : (
                    <MessageSquare className="w-12 h-12 text-purple-400" />
                  )}
                </div>
              </div>
              
              {/* Speaking Animation Rings */}
              {(phase === 'listening' || voice.isSpeaking) && (
                <>
                  <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-purple-500/30 animate-ping" />
                  <div className="absolute inset-[-8px] w-[144px] h-[144px] rounded-full border-2 border-pink-500/20 animate-ping" style={{ animationDelay: '0.2s' }} />
                </>
              )}
              
              {/* Phase Badge */}
              <Badge className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${
                phase === 'listening' ? 'bg-blue-500' :
                phase === 'speaking' ? 'bg-green-500' :
                phase === 'thinking' ? 'bg-yellow-500' :
                phase === 'feedback' ? 'bg-purple-500' :
                'bg-emerald-500'
              } text-white border-0 shadow-lg`}>
                {phase === 'listening' && 'Speaking...'}
                {phase === 'speaking' && 'Your Turn'}
                {phase === 'thinking' && 'Analyzing...'}
                {phase === 'feedback' && 'Feedback'}
                {phase === 'complete' && 'Complete'}
              </Badge>
            </div>
          </div>

          {/* Question Card */}
          {currentQuestion && phase !== 'feedback' && (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl mb-8">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-4">
                  <Badge variant="outline" className="bg-purple-500/20 text-purple-200 border-purple-400/30">
                    {currentQuestion.questionType}
                  </Badge>
                  {phase === 'speaking' && (
                    <Badge variant="outline" className="bg-green-500/20 text-green-200 border-green-400/30 ml-auto">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTime(elapsedTime)}
                    </Badge>
                  )}
                </div>
                
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-relaxed mb-4">
                  {currentQuestion.question}
                </h2>
                
                {currentQuestion.context && (
                  <p className="text-purple-200/70 text-sm mb-4">
                    {currentQuestion.context}
                  </p>
                )}

                {/* Hints Toggle */}
                {currentQuestion.hints && currentQuestion.hints.length > 0 && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowHints(!showHints)}
                      className="flex items-center gap-2 text-sm text-purple-300 hover:text-purple-100 transition-colors"
                    >
                      <Lightbulb className="w-4 h-4" />
                      {showHints ? 'Hide Hints' : 'Show Hints'}
                      <ChevronRight className={`w-4 h-4 transition-transform ${showHints ? 'rotate-90' : ''}`} />
                    </button>
                    
                    {showHints && (
                      <div className="mt-3 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <ul className="space-y-2">
                          {currentQuestion.hints.map((hint, i) => (
                            <li key={i} className="text-sm text-yellow-200 flex items-start gap-2">
                              <span className="text-yellow-400">•</span>
                              {hint}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Feedback Display */}
          {phase === 'feedback' && currentFeedback && (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl mb-8">
              <CardContent className="p-8">
                {/* Score Display */}
                <div className="text-center mb-8">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-white/10"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="url(#scoreGradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(currentFeedback.overallScore / 100) * 352} 352`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">{currentFeedback.overallScore}</span>
                    </div>
                  </div>
                  <p className="text-purple-200 mt-2">Overall Score</p>
                </div>

                {/* Communication Scores */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {Object.entries(currentFeedback.communication).map(([key, value]) => (
                    <div key={key} className="text-center p-4 bg-white/5 rounded-xl">
                      <div className="text-2xl font-bold text-white mb-1">{value}</div>
                      <div className="text-xs text-purple-300 capitalize">{key}</div>
                    </div>
                  ))}
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                    <h4 className="font-semibold text-green-300 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Strengths
                    </h4>
                    <ul className="space-y-2">
                      {currentFeedback.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-green-200">• {s}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                    <h4 className="font-semibold text-orange-300 mb-3">Areas to Improve</h4>
                    <ul className="space-y-2">
                      {currentFeedback.weaknesses.map((w, i) => (
                        <li key={i} className="text-sm text-orange-200">• {w}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Improvement Tips */}
                <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20 mb-6">
                  <h4 className="font-semibold text-purple-300 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Tips for Improvement
                  </h4>
                  <ul className="space-y-2">
                    {currentFeedback.improvementTips.map((tip, i) => (
                      <li key={i} className="text-sm text-purple-200">• {tip}</li>
                    ))}
                  </ul>
                </div>

                {/* Revised Answer */}
                {currentFeedback.revisedAnswer && (
                  <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <h4 className="font-semibold text-blue-300 mb-3">Suggested Answer</h4>
                    <p className="text-sm text-blue-200 leading-relaxed">
                      {currentFeedback.revisedAnswer}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Answer Input Area */}
          {phase === 'speaking' && (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
              <CardContent className="p-6">
                {inputMode === 'voice' ? (
                  <div className="space-y-4">
                    {/* Voice Waveform Visualization */}
                    <div className="flex items-center justify-center gap-1 h-16">
                      {[...Array(20)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full transition-all duration-150 ${
                            voice.isListening 
                              ? 'animate-pulse' 
                              : ''
                          }`}
                          style={{
                            height: voice.isListening 
                              ? `${Math.random() * 100}%` 
                              : '20%',
                            animationDelay: `${i * 50}ms`,
                          }}
                        />
                      ))}
                    </div>

                    {/* Transcript Display */}
                    <div className="min-h-[100px] p-4 bg-white/5 rounded-xl">
                      <p className="text-white">
                        {transcript}
                        <span className="text-purple-300 opacity-70">{interimTranscript}</span>
                        {!transcript && !interimTranscript && (
                          <span className="text-white/30">Start speaking...</span>
                        )}
                      </p>
                    </div>

                    {/* Voice Controls */}
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => {
                          setTranscript('')
                          setInterimTranscript('')
                        }}
                        className="text-white/70 hover:text-white hover:bg-white/10"
                      >
                        <RotateCcw className="w-5 h-5 mr-2" />
                        Clear
                      </Button>
                      
                      <button
                        onClick={() => voice.isListening ? voice.stopListening() : voice.startListening()}
                        className={`p-6 rounded-full transition-all duration-300 ${
                          voice.isListening
                            ? 'bg-red-500 hover:bg-red-600 scale-110'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                        }`}
                      >
                        {voice.isListening ? (
                          <MicOff className="w-8 h-8 text-white" />
                        ) : (
                          <Mic className="w-8 h-8 text-white" />
                        )}
                      </button>

                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={!transcript.trim()}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 hover:from-green-600 hover:to-emerald-600"
                      >
                        <Send className="w-5 h-5 mr-2" />
                        Submit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Type your answer here..."
                      className="min-h-[150px] bg-white/5 border-white/20 text-white placeholder:text-white/30 focus:border-purple-500"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={!textInput.trim()}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 hover:from-green-600 hover:to-emerald-600"
                      >
                        <Send className="w-5 h-5 mr-2" />
                        Submit Answer
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Thinking State */}
          {phase === 'thinking' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-purple-200">Analyzing your answer...</p>
            </div>
          )}

        </div>
      </main>

      {/* Bottom Action Bar */}
      {phase === 'feedback' && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/20 backdrop-blur-lg border-t border-white/10 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <span className="text-white/70">
              {questionNumber < totalQuestions 
                ? `${totalQuestions - questionNumber} questions remaining`
                : 'Final question completed!'
              }
            </span>
            <Button
              onClick={handleNextQuestion}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600 px-8 group"
            >
              {questionNumber < totalQuestions ? (
                <>
                  Next Question
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              ) : (
                <>
                  View Results
                  <CheckCircle className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
