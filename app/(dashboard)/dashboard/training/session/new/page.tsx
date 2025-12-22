"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { startTrainingSession, getAvailableInterviewMasters, type InterviewMasterOption } from '@/lib/actions/training.action'
import { getPrepPack } from '@/lib/actions/prep-pack.action'
import { getMyInterviewKits, getPublicInterviewKits, type InterviewKitData, type PublicInterviewKitSummary } from '@/lib/actions/interview-kits.action'
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
  const sessionType = searchParams.get('type') || searchParams.get('sessionType') || 'QUICK'
  const prepPackId = searchParams.get('prepPackId')
  const prepStepId = searchParams.get('prepStepId')
  const prepFocusAreas = searchParams.get('focusAreas')
  const prepDifficulty = searchParams.get('difficulty')

  const [jobTitle, setJobTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>(
    (prepDifficulty as 'EASY' | 'MEDIUM' | 'HARD') || 'MEDIUM'
  )
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>(
    prepFocusAreas ? prepFocusAreas.split(',') : ['BEHAVIORAL']
  )
  const [masters, setMasters] = useState<InterviewMasterOption[]>([])
  const [selectedMasterId, setSelectedMasterId] = useState<string | undefined>(undefined)
  const [myKits, setMyKits] = useState<InterviewKitData[]>([])
  const [publicKits, setPublicKits] = useState<PublicInterviewKitSummary[]>([])
  const [selectedKitId, setSelectedKitId] = useState<string | undefined>(undefined)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [prepPackName, setPrepPackName] = useState<string | null>(null)

  // Load prep pack data if prepPackId is provided
  useEffect(() => {
    if (prepPackId) {
      loadPrepPackData()
    }
  }, [prepPackId])

  useEffect(() => {
    loadMastersAndKits()
  }, [])

  useEffect(() => {
    if (!selectedMasterId) return
    const master = masters.find((m) => m.id === selectedMasterId)
    if (!master?.defaultKitId) return
    setSelectedKitId((prev) => prev || master.defaultKitId || undefined)
  }, [selectedMasterId, masters])

  const loadPrepPackData = async () => {
    if (!prepPackId) return
    const result = await getPrepPack(prepPackId)
    if (result.success && result.data) {
      setJobTitle(result.data.jobTitle)
      setCompanyName(result.data.companyName)
      setPrepPackName(`${result.data.jobTitle} at ${result.data.companyName}`)
    }
  }

  const loadMastersAndKits = async () => {
    setIsLoadingOptions(true)
    try {
      const [mastersRes, myKitsRes, publicKitsRes] = await Promise.all([
        getAvailableInterviewMasters(),
        getMyInterviewKits(),
        getPublicInterviewKits(),
      ])

      if (mastersRes.success && mastersRes.data) setMasters(mastersRes.data)

      if (myKitsRes.data) setMyKits(myKitsRes.data)
      if (publicKitsRes.data) setPublicKits(publicKitsRes.data)

      setSelectedKitId((prev) => {
        if (prev) return prev
        const firstOwned = myKitsRes.data?.[0]?.id
        const firstPublic = publicKitsRes.data?.[0]?.id
        return firstOwned || firstPublic || undefined
      })
    } catch (err) {
      console.error('Error loading masters/kits:', err)
    } finally {
      setIsLoadingOptions(false)
    }
  }

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

    if (!selectedKitId) {
      toast({
        title: 'Select an interview kit',
        description: 'Please choose an interview kit to practice with',
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
        prepPackId: prepPackId || undefined,
        prepStepId: prepStepId || undefined,
        difficulty,
        focusAreas: selectedFocusAreas,
        kitId: selectedKitId,
        masterId: selectedMasterId,
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

          {/* Interview Master & Kit */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Interview Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <Label className="text-slate-700 dark:text-slate-300">AI Master (Interviewer)</Label>
                {isLoadingOptions ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[0, 1].map((idx) => (
                      <div key={idx} className="animate-pulse rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="mt-4 h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-900" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMasterId(undefined)}
                      className={`flex h-full flex-col rounded-2xl border-2 p-4 text-left transition-all ${
                        !selectedMasterId
                          ? 'border-indigo-500 bg-indigo-50 shadow-lg dark:bg-indigo-950/20'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold">
                          JP
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white">JobPilot Coach</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Balanced, encouraging guidance</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                        Let the AI adapt dynamically without a fixed persona.
                      </p>
                    </button>

                    {masters.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        No masters available yet. Admins can add them from the Masters configuration panel.
                      </div>
                    ) : (
                      masters.map((master) => {
                        const isSelected = selectedMasterId === master.id
                        const initials = (master.displayName || '')
                          .split(' ')
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join('')
                        return (
                          <button
                            type="button"
                            key={master.id}
                            onClick={() =>
                              setSelectedMasterId((prev) => (prev === master.id ? undefined : master.id))
                            }
                            className={`flex h-full flex-col rounded-2xl border-2 p-4 text-left transition-all ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-50 shadow-lg dark:bg-indigo-950/20'
                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12 border border-white/50 shadow">
                                <AvatarImage src={master.avatarUrl || undefined} />
                                <AvatarFallback>{initials || 'AI'}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 dark:text-white">{master.displayName}</p>
                                {master.tagline && (
                                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{master.tagline}</p>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                              {master.defaultKitId && (
                                <Badge variant="secondary" className="text-xs">
                                  Prefers linked kit
                                </Badge>
                              )}
                              <Badge variant={isSelected ? 'default' : 'outline'} className="text-xs">
                                {isSelected ? 'Selected' : 'Tap to select'}
                              </Badge>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-slate-700 dark:text-slate-300">Interview Kit</Label>
                <Select
                  value={selectedKitId}
                  onValueChange={(v) => setSelectedKitId(v)}
                  disabled={isLoadingOptions}
                >
                  <SelectTrigger className="mt-1.5 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Choose an interview kit" />
                  </SelectTrigger>
                  <SelectContent>
                    {myKits.length > 0 && (
                      <div className="px-2 py-1 text-xs font-semibold text-slate-500">Your kits</div>
                    )}
                    {myKits.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.title}
                      </SelectItem>
                    ))}

                    {publicKits.length > 0 && (
                      <div className="px-2 py-1 text-xs font-semibold text-slate-500">Marketplace kits</div>
                    )}
                    {publicKits.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
