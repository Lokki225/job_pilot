"use client"

import { 
  ArrowRight, 
  ArrowUpRight,
  Award, 
  Briefcase, 
  Calendar,
  CheckCircle, 
  Clock,
  FileText, 
  Heart,
  Loader2,
  MapPin,
  Plus,
  Search, 
  Sparkles, 
  Star,
  Target, 
  TrendingUp, 
  User, 
  X,
  Zap,
  Building2,
  Send,
  Eye,
  ThumbsUp,
  AlertCircle,
  ChevronRight,
  BarChart3,
  Rocket
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { getProfile, getProfileDetails } from "@/lib/actions/profile.action"
import { getJobApplicationStats, getRecentApplications, getUpcomingInterviews } from "@/lib/actions/job-applications.action"
import { getJobPreferences } from "@/lib/actions/job-preferences.action"
import { getCurrentUser } from "@/lib/auth"

// Helper function for relative time
const getRelativeTime = (date: string) => {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

// Status badge helper
const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { label: string; className: string }> = {
    WISHLIST: { label: 'Wishlist', className: 'bg-slate-100 text-slate-700' },
    APPLIED: { label: 'Applied', className: 'bg-blue-100 text-blue-700' },
    INTERVIEWING: { label: 'Interview', className: 'bg-purple-100 text-purple-700' },
    OFFER: { label: 'Offer', className: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
    ACCEPTED: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-700' },
  }
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' }
  return <Badge className={config.className}>{config.label}</Badge>
}

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const onboardingComplete = searchParams.get('onboarding_complete') === 'true'

  const [showOnboardingHero, setShowOnboardingHero] = useState(false)
  const [profileCompleteness, setProfileCompleteness] = useState(0)
  const [completionItems, setCompletionItems] = useState([
    { label: 'Basic Info', completed: false, icon: User, link: '/dashboard/profile' },
    { label: 'Resume Uploaded', completed: false, icon: FileText, link: '/dashboard/profile' },
    { label: 'Job Preferences', completed: false, icon: Target, link: '/dashboard/onboarding/preferences' },
    { label: 'Skills & Experience', completed: false, icon: Award, link: '/dashboard/profile' },
  ])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    sent: 0,
    replied: 0,
    rejected: 0,
    accepted: 0,
  })
  const [recentApplications, setRecentApplications] = useState<any[]>([])
  const [upcomingInterviews, setUpcomingInterviews] = useState<any[]>([])
  const [userName, setUserName] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, []) 

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setProfileError(null)

      const { user, error: userError } = await getCurrentUser()
      
      if (!user || userError) {
        console.error('No authenticated user:', userError)
        router.push('/login')
        return
      }

      // Check if should show onboarding hero
      const dismissed = typeof window !== 'undefined' ? localStorage.getItem('onboarding_hero_dismissed') : null
      if (onboardingComplete && !dismissed) {
        setShowOnboardingHero(true)
      }

      // Load profile and related data
      try {
        const [profileResult, profileDetailsResult, preferencesResult] = await Promise.all([
          getProfile(user.id),
          getProfileDetails(user.id),
          getJobPreferences()
        ])
        
        const profile = profileResult.data
        const profileDetails = profileDetailsResult.data
        const preferences = preferencesResult.data
        
        if (profile) {
          setUserName(profile.firstName || 'there')
          const completeness = calculateCompleteness(profile, profileDetails, preferences)
          setProfileCompleteness(completeness.percentage)
          setCompletionItems(completeness.items)
        } else {
          setProfileError('Please complete your profile to get started')
          setProfileCompleteness(0)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        setProfileError('Failed to load profile. Please try refreshing the page.')
      }

      // Load stats
      const { data: applicationStats } = await getJobApplicationStats()
      if (applicationStats) {
        setStats(applicationStats)
      }

      // Load recent applications
      const { data: recent } = await getRecentApplications(5)
      if (recent) {
        setRecentApplications(recent)
      }

      // Load upcoming interviews
      const { data: interviews } = await getUpcomingInterviews()
      if (interviews) {
        setUpcomingInterviews(interviews)
      }
    } catch (error) {
      console.error('Dashboard loading error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateCompleteness = (profile: any, profileDetails: any, preferences: any) => {
    // Check if job preferences exist and have at least some data
    const hasJobPreferences = preferences && (
      (preferences.jobTitles && preferences.jobTitles.length > 0) ||
      (preferences.locations && preferences.locations.length > 0) ||
      (preferences.workTypes && preferences.workTypes.length > 0) ||
      preferences.experienceLevel
    )
    
    // Check if skills exist (from profileDetails or profile)
    const hasSkills = (profileDetails?.skills && profileDetails.skills.length > 0) ||
                      (profile.skills && profile.skills.length > 0)
    
    // Check if has experience
    const hasExperience = profileDetails?.experiences && profileDetails.experiences.length > 0

    const items = [
      { 
        label: 'Basic Info', 
        completed: !!(profile.firstName && profile.lastName && profile.location),
        icon: User,
        link: '/dashboard/profile'
      },
      { 
        label: 'Resume Uploaded', 
        completed: !!profile.resumeUrl,
        icon: FileText,
        link: '/dashboard/profile'
      },
      { 
        label: 'Job Preferences', 
        completed: hasJobPreferences,
        icon: Target,
        link: '/dashboard/onboarding/preferences'
      },
      { 
        label: 'Skills & Experience', 
        completed: hasSkills || hasExperience,
        icon: Award,
        link: '/dashboard/profile'
      },
    ]

    const completed = items.filter(item => item.completed).length
    const percentage = Math.round((completed / items.length) * 100)

    return { percentage, items }
  }

  const handleDismissHero = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setShowOnboardingHero(false)
      localStorage.setItem('onboarding_hero_dismissed', 'true')
      router.replace('/dashboard', { scroll: false })
    }, 300)
  }

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        <p className="text-slate-500">Loading your dashboard...</p>
      </div>
    )
  }

  if (profileError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-slate-900">Profile Incomplete</h2>
          <p className="text-slate-600 mb-4">{profileError}</p>
          <Button 
            onClick={() => router.push('/dashboard/profile')}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            Complete Your Profile
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="text-indigo-200 text-sm font-medium">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {getGreeting()}, {userName}! 👋
            </h1>
            <p className="text-indigo-100 text-lg">
              {stats.total === 0 
                ? "Ready to start your job search journey?"
                : `You have ${stats.total} application${stats.total !== 1 ? 's' : ''} in progress`
              }
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => router.push('/dashboard/jobs')}
              className="bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg"
            >
              <Search className="w-4 h-4 mr-2" />
              Find Jobs
            </Button>
            <Button 
              onClick={() => router.push('/dashboard/jobs/applications')}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              My Applications
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Completion Banner (if not complete) */}
      {profileCompleteness < 100 && !showOnboardingHero && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-slate-900">Complete Your Profile</h3>
                </div>
                <p className="text-slate-600 text-sm mb-3">
                  A complete profile helps you get better job matches and increases your chances of getting hired.
                </p>
                <div className="flex items-center gap-3">
                  <Progress value={profileCompleteness} className="flex-1 h-2" />
                  <span className="text-sm font-medium text-amber-700">{profileCompleteness}%</span>
                </div>
              </div>
              <Button 
                onClick={() => router.push('/dashboard/profile')}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Complete Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => router.push('/dashboard/jobs/applications')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Briefcase className="w-6 h-6 text-indigo-600" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.total}</div>
            <p className="text-slate-500 text-sm">Total Applications</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => router.push('/dashboard/jobs/applications?status=APPLIED')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Send className="w-6 h-6 text-blue-600" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.sent}</div>
            <p className="text-slate-500 text-sm">Applications Sent</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => router.push('/dashboard/jobs/applications?status=INTERVIEWING')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.replied}</div>
            <p className="text-slate-500 text-sm">Interviews</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => router.push('/dashboard/jobs/applications?status=OFFER')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ThumbsUp className="w-6 h-6 text-green-600" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-green-600 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.accepted}</div>
            <p className="text-slate-500 text-sm">Offers Received</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Recent Applications
                </CardTitle>
                <CardDescription>Your latest job applications</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/jobs/applications')}
                className="text-indigo-600"
              >
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentApplications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">No applications yet</h3>
                  <p className="text-slate-500 mb-4">Start your job search and track your applications here</p>
                  <Button onClick={() => router.push('/dashboard/jobs')}>
                    <Search className="w-4 h-4 mr-2" />
                    Browse Jobs
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentApplications.map((app) => (
                    <div 
                      key={app.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all cursor-pointer"
                      onClick={() => router.push(`/dashboard/jobs/${app.id}`)}
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {app.company?.charAt(0) || 'J'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">{app.jobTitle}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Building2 className="w-3 h-3" />
                          <span className="truncate">{app.company}</span>
                          {app.location && (
                            <>
                              <span>•</span>
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{app.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(app.status)}
                        <span className="text-xs text-slate-400">{getRelativeTime(app.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-12"
                onClick={() => router.push('/dashboard/jobs')}
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Search className="w-4 h-4 text-indigo-600" />
                </div>
                <span>Search Jobs</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-12"
                onClick={() => router.push('/dashboard/jobs/applications')}
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                </div>
                <span>View Applications</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-12"
                onClick={() => router.push('/dashboard/profile')}
              >
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-green-600" />
                </div>
                <span>Edit Profile</span>
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Interviews */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Upcoming Interviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingInterviews.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No upcoming interviews</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingInterviews.map((interview) => (
                    <div 
                      key={interview.id}
                      className="p-3 rounded-lg bg-purple-50 border border-purple-100"
                    >
                      <h4 className="font-medium text-slate-900 text-sm">{interview.jobTitle}</h4>
                      <p className="text-xs text-slate-500">{interview.company}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-purple-600">
                        <Clock className="w-3 h-3" />
                        {new Date(interview.interviewDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Checklist */}
          {profileCompleteness < 100 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Profile Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {completionItems.map((item, index) => (
                    <div 
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        item.completed 
                          ? 'bg-green-50 border border-green-100' 
                          : 'bg-slate-50 border border-slate-100 hover:border-indigo-200 cursor-pointer'
                      }`}
                      onClick={() => !item.completed && router.push(item.link)}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.completed ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {item.completed ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <item.icon className="w-4 h-4" />
                        )}
                      </div>
                      <span className={`text-sm ${item.completed ? 'text-green-700' : 'text-slate-700'}`}>
                        {item.label}
                      </span>
                      {!item.completed && (
                        <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tips Card */}
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <Rocket className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Pro Tip</h4>
                  <p className="text-sm text-slate-600">
                    {stats.total === 0 
                      ? "Start by browsing our job recommendations tailored to your profile!"
                      : stats.replied === 0 
                        ? "Follow up on your applications after a week to show your interest."
                        : "Keep your profile updated to get better job matches."
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
