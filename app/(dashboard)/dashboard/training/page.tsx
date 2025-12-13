"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Zap,
  Target,
  Building2,
  Trophy,
  Clock,
  TrendingUp,
  Flame,
  Award,
  Calendar,
  Mic,
  MessageSquare,
  Sparkles,
  ArrowRight,
  BarChart3,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getInterviewStats } from '@/lib/actions/training.action'

const SESSION_TYPES = [
  {
    id: 'QUICK',
    icon: Zap,
    title: 'Quick Practice',
    description: 'Perfect for daily warm-up',
    duration: '15 min',
    questions: 5,
    gradient: 'from-yellow-500 via-orange-500 to-red-500',
    bgGradient: 'from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  {
    id: 'FULL_MOCK',
    icon: Trophy,
    title: 'Full Mock Interview',
    description: 'Complete interview simulation',
    duration: '45-60 min',
    questions: 15,
    gradient: 'from-purple-500 via-pink-500 to-rose-500',
    bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  {
    id: 'TARGETED',
    icon: Target,
    title: 'Targeted Practice',
    description: 'Focus on specific skills',
    duration: '20-30 min',
    questions: 8,
    gradient: 'from-blue-500 via-cyan-500 to-teal-500',
    bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  {
    id: 'COMPANY_PREP',
    icon: Building2,
    title: 'Company Prep',
    description: 'Company-specific preparation',
    duration: '30-45 min',
    questions: 10,
    gradient: 'from-emerald-500 via-green-500 to-lime-500',
    bgGradient: 'from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
]

export default function TrainingRoomPage() {
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setIsLoading(true)
    const result = await getInterviewStats()
    if (result.success) {
      setStats(result.data)
    }
    setIsLoading(false)
  }

  const handleStartSession = (sessionType: string) => {
    router.push(`/dashboard/training/session/new?type=${sessionType}`)
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header with Gradient */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 md:p-12 text-white shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Mic className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold">Training Room</h1>
            </div>
            <p className="text-xl text-white/90 max-w-2xl">
              Practice with AI-powered voice interviews. Get instant feedback and improve your skills.
            </p>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl" />
        </div>

        {/* Stats Cards */}
        {!isLoading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg bg-linear-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total Sessions</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {stats.totalSessions || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-linear-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Avg Score</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {stats.avgSessionScore ? Math.round(stats.avgSessionScore) : 0}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-linear-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Current Streak</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {stats.currentStreakDays || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                    <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-linear-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Best Score</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {stats.highestScore || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Session Types */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Choose Your Session
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SESSION_TYPES.map((session) => {
              const Icon = session.icon
              const isSelected = selectedType === session.id

              return (
                <Card
                  key={session.id}
                  className={`group relative overflow-hidden border-2 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:scale-[1.02] ${
                    isSelected
                      ? `${session.borderColor} shadow-xl scale-[1.02]`
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  onClick={() => setSelectedType(session.id)}
                >
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-linear-to-br ${session.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  
                  <CardContent className="relative z-10 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-4 bg-linear-to-br ${session.gradient} rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      {isSelected && (
                        <Badge className="bg-green-500 text-white border-0">
                          Selected
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      {session.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      {session.description}
                    </p>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className={`w-4 h-4 ${session.iconColor}`} />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {session.duration}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className={`w-4 h-4 ${session.iconColor}`} />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {session.questions} questions
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartSession(session.id)
                        }}
                        className={`w-full mt-6 bg-linear-to-r ${session.gradient} text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 group`}
                      >
                        Start Session
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    )}
                  </CardContent>

                  {/* Shine Effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Interview Prep Packs - Feature Highlight */}
        <Card className="border-2 border-indigo-200 dark:border-indigo-800 shadow-xl bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-indigo-500 text-white border-0">New Feature</Badge>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Interview Prep Packs
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Paste a job description and get an AI-generated preparation plan with custom interview questions, study topics, and STAR stories tailored to the role.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">AI Job Analysis</Badge>
                  <Badge variant="outline">Custom Questions</Badge>
                  <Badge variant="outline">Study Plan</Badge>
                  <Badge variant="outline">STAR Stories</Badge>
                </div>
                <Button asChild className="bg-linear-to-r from-indigo-600 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl">
                  <Link href="/dashboard/training/prep">
                    <FileText className="w-4 h-4 mr-2" />
                    Create Prep Pack
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
              <div className="hidden md:flex p-8 bg-white/50 dark:bg-slate-800/50 rounded-2xl">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-center">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Job Post</span>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-center">
                    <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">AI Analysis</span>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                    <Target className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-1" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">Practice</span>
                  </div>
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-center">
                    <Trophy className="w-6 h-6 text-orange-600 dark:text-orange-400 mx-auto mb-1" />
                    <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Success</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/dashboard/training/prep">
            <Card className="border-0 shadow-lg bg-linear-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 hover:shadow-xl transition-shadow cursor-pointer group h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-linear-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                      My Prep Packs
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Job-specific interview plans
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/training/history">
            <Card className="border-0 shadow-lg bg-linear-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 hover:shadow-xl transition-shadow cursor-pointer group h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-linear-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                      View History
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Past sessions & progress
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="border-0 shadow-lg bg-linear-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 hover:shadow-xl transition-shadow cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-linear-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    Analytics
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Performance metrics
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
