"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Sparkles,
  Target,
  Briefcase,
  Building2,
  ChevronDown,
  Zap,
  Trophy,
  MessageSquare,
  Clock,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { startTrainingSession } from '@/lib/actions/training.action'
import { toast } from '@/components/ui/use-toast'

const FOCUS_AREAS = [
  { id: 'BEHAVIORAL', label: 'Behavioral', icon: '🎭', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { id: 'TECHNICAL', label: 'Technical', icon: '💻', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { id: 'SITUATIONAL', label: 'Situational', icon: '🎯', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { id: 'GENERAL', label: 'General', icon: '💬', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
]

const DIFFICULTY_LEVELS = [
  { 
    value: 'EASY', 
    label: 'Easy', 
    description: 'Great for beginners',
    icon: '🌱',
    gradient: 'from-green-500 to-emerald-500'
  },
  { 
    value: 'MEDIUM', 
    label: 'Medium', 
    description: 'Balanced challenge',
    icon: '⚡',
    gradient: 'from-yellow-500 to-orange-500'
  },
  { 
    value: 'HARD', 
    label: 'Hard', 
    description: 'Expert level',
    icon: '🔥',
    gradient: 'from-red-500 to-pink-500'
  },
]

const SESSION_INFO: Record<string, any> = {
  QUICK: {
    title: 'Quick Practice',
    icon: Zap,
    duration: '15 min',
    questions: 5,
    gradient: 'from-yellow-500 to-orange-500',
  },
  FULL_MOCK: {
    title: 'Full Mock Interview',
    icon: Trophy,
    duration: '45-60 min',
    questions: 15,
    gradient: 'from-purple-500 to-pink-500',
  },
  TARGETED: {
    title: 'Targeted Practice',
    icon: Target,
    duration: '20-30 min',
    questions: 8,
    gradient: 'from-blue-500 to-cyan-500',
  },
  COMPANY_PREP: {
    title: 'Company Prep',
    icon: Building2,
    duration: '30-45 min',
    questions: 10,
    gradient: 'from-emerald-500 to-green-500',
  },
}

export default function NewSessionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionType = searchParams.get('type') || 'QUICK'

  const [jobTitle, setJobTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM')
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>(['BEHAVIORAL'])
  const [isStarting, setIsStarting] = useState(false)

  const sessionInfo = SESSION_INFO[sessionType]
  const SessionIcon = sessionInfo?.icon || Sparkles

  const toggleFocusArea = (areaId: string) => {
    setSelectedFocusAreas(prev => {
      if (prev.includes(areaId)) {
        return prev.filter(id => id !== areaId)
      }
      if (prev.length >= 3) {
        toast({
          title: 'Maximum reached',
          description: 'You can select up to 3 focus areas',
          variant: 'destructive',
        })
        return prev
      }
      return [...prev, areaId]
    })
  }

  const handleStartSession = async () => {
    if (selectedFocusAreas.length === 0) {
      toast({
        title: 'Select focus areas',
        description: 'Please select at least one focus area',
        variant: 'destructive',
      })
      return
    }

    setIsStarting(true)
    try {
      const result = await startTrainingSession({
        sessionType: sessionType as any,
        jobTitle: jobTitle || undefined,
        companyName: companyName || undefined,
        difficulty,
        focusAreas: selectedFocusAreas,
      })

      if (result.success && result.data) {
        router.push(`/dashboard/training/session/${result.data.sessionId}`)
      } else {
        toast({
          title: 'Failed to start session',
          description: result.error || 'Please try again',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Training Room
        </Button>

        {/* Session Header */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className={`bg-gradient-to-r ${sessionInfo.gradient} p-8 text-white`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                <SessionIcon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{sessionInfo.title}</h1>
                <p className="text-white/90 mt-1">Configure your practice session</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{sessionInfo.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>{sessionInfo.questions} questions</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Configuration Form */}
        <div className="space-y-6">
          
          {/* Job Details */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Job Details (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="jobTitle" className="text-slate-700 dark:text-slate-300">
                  Target Role
                </Label>
                <Input
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g., Software Engineer, Product Manager"
                  className="mt-1.5 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400"
                />
              </div>
              
              {sessionType === 'COMPANY_PREP' && (
                <div>
                  <Label htmlFor="companyName" className="text-slate-700 dark:text-slate-300">
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., Google, Microsoft"
                    className="mt-1.5 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Difficulty Level */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Difficulty Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DIFFICULTY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setDifficulty(level.value as any)}
                    className={`relative p-6 rounded-xl border-2 transition-all duration-300 text-left group hover:shadow-lg ${
                      difficulty === level.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 shadow-lg scale-105'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="text-3xl mb-2">{level.icon}</div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                      {level.label}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {level.description}
                    </p>
                    {difficulty === level.value && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-green-500 text-white border-0">
                          Selected
                        </Badge>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Focus Areas */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Focus Areas
                <Badge variant="outline" className="ml-2">
                  Select up to 3
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {FOCUS_AREAS.map((area) => {
                  const isSelected = selectedFocusAreas.includes(area.id)
                  return (
                    <button
                      key={area.id}
                      onClick={() => toggleFocusArea(area.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 shadow-lg scale-105'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="text-3xl mb-2">{area.icon}</div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">
                        {area.label}
                      </div>
                      {isSelected && (
                        <Badge className="mt-2 bg-green-500 text-white border-0 text-xs">
                          ✓
                        </Badge>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Start Button */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                  Ready to start?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedFocusAreas.length} focus area{selectedFocusAreas.length !== 1 ? 's' : ''} selected • {difficulty.toLowerCase()} difficulty
                </p>
              </div>
              <Button
                onClick={handleStartSession}
                disabled={isStarting || selectedFocusAreas.length === 0}
                className={`bg-gradient-to-r ${sessionInfo.gradient} text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-lg group`}
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    Start Interview
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
