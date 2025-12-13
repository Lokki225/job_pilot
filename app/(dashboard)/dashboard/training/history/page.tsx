"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Clock,
  Calendar,
  Trophy,
  Target,
  Zap,
  Building2,
  ArrowRight,
  TrendingUp,
  Flame,
  Award,
  BarChart3,
  Filter,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getTrainingHistory, getInterviewStats } from '@/lib/actions/training.action'

const SESSION_TYPE_INFO: Record<string, any> = {
  QUICK: { icon: Zap, label: 'Quick Practice', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  FULL_MOCK: { icon: Trophy, label: 'Full Mock', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  TARGETED: { icon: Target, label: 'Targeted', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  COMPANY_PREP: { icon: Building2, label: 'Company Prep', color: 'text-green-400', bg: 'bg-green-500/20' },
}

export default function TrainingHistoryPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [filter])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [historyResult, statsResult] = await Promise.all([
        getTrainingHistory({
          limit: 20,
          sessionType: filter !== 'all' ? filter : undefined,
        }),
        getInterviewStats(),
      ])

      if (historyResult.success) {
        setSessions(historyResult.data?.sessions || [])
      }
      if (statsResult.success) {
        setStats(statsResult.data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Training History
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Review your past practice sessions and track your progress
            </p>
          </div>
          <Link href="/dashboard/training">
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              New Session
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalSessions || 0}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Total Sessions</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.avgSessionScore ? Math.round(stats.avgSessionScore) : 0}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Avg Score</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
              <CardContent className="p-4 text-center">
                <Award className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.highestScore || 0}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Best Score</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
              <CardContent className="p-4 text-center">
                <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.currentStreakDays || 0}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Day Streak</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 text-cyan-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalPracticeTimeSeconds 
                    ? Math.round(stats.totalPracticeTimeSeconds / 60) 
                    : 0}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Total Minutes</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-slate-400" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              <SelectItem value="QUICK">Quick Practice</SelectItem>
              <SelectItem value="FULL_MOCK">Full Mock</SelectItem>
              <SelectItem value="TARGETED">Targeted</SelectItem>
              <SelectItem value="COMPANY_PREP">Company Prep</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Session List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border-0 shadow-lg animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Trophy className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                No sessions yet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Start practicing to see your history here
              </p>
              <Link href="/dashboard/training">
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                  Start Your First Session
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const typeInfo = SESSION_TYPE_INFO[session.sessionType] || SESSION_TYPE_INFO.QUICK
              const TypeIcon = typeInfo.icon

              return (
                <Card
                  key={session.id}
                  className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900"
                  onClick={() => router.push(`/dashboard/training/session/${session.id}/results`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Session Type Icon */}
                        <div className={`p-3 rounded-xl ${typeInfo.bg}`}>
                          <TypeIcon className={`w-6 h-6 ${typeInfo.color}`} />
                        </div>

                        {/* Session Info */}
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                              {typeInfo.label}
                            </h3>
                            <Badge 
                              variant="outline" 
                              className={`${
                                session.status === 'COMPLETED' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                              }`}
                            >
                              {session.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(session.startedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDuration(session.durationSeconds || 0)}
                            </span>
                            <span>
                              {session.completedQuestions || 0}/{session.totalQuestions} questions
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="flex items-center gap-4">
                        {session.overallScore !== null && (
                          <div className="text-right">
                            <p className={`text-3xl font-bold ${getScoreColor(session.overallScore)}`}>
                              {session.overallScore}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Score</p>
                          </div>
                        )}
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>

                    {/* Job/Company Info */}
                    {(session.jobTitle || session.companyName) && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {session.jobTitle && <span className="font-medium">{session.jobTitle}</span>}
                          {session.jobTitle && session.companyName && ' at '}
                          {session.companyName && <span>{session.companyName}</span>}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
