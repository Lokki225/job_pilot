// app/(dashboard)/dashboard/page.tsx
"use client"

import { ArrowRight, Award, Briefcase, CheckCircle, FileText, Search, Sparkles, Target, TrendingUp, User, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { getProfile } from "@/lib/actions/profile.action"
import { getJobApplicationStats } from "@/lib/actions/job-applications.action"
import { getCurrentUser } from "@/lib/auth"

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const onboardingComplete = searchParams.get('onboarding_complete') === 'true'

  const [showOnboardingHero, setShowOnboardingHero] = useState(false)
  const [profileCompleteness, setProfileCompleteness] = useState(0)
  const [completionItems, setCompletionItems] = useState([
    { label: 'Basic Info', completed: false, icon: User, link: '/dashboard/profile' },
    { label: 'Resume Uploaded', completed: false, icon: Briefcase, link: '/dashboard/profile' },
    { label: 'Job Preferences', completed: false, icon: Target, link: '/dashboard/profile' },
    { label: 'Skills & Experience', completed: false, icon: Award, link: '/dashboard/profile' },
  ])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    sent: 0,
    replied: 0,
  })
  const [isAnimating, setIsAnimating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, []) 

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)

      // Get authenticated user from server action
      const { user, error: userError } = await getCurrentUser()
      
      if (!user || userError) {
        router.push('/login')
        return
      }

      console.log('User:', user.id);

      // Check if should show onboarding hero
      const dismissed = localStorage.getItem('onboarding_hero_dismissed')
      if (onboardingComplete && !dismissed) {
        setShowOnboardingHero(true)
      }

      // Load profile completeness with user ID
      const { data: profile, error: profileError } = await getProfile(user.id)
      
      if (profile) {
        const completeness = calculateCompleteness(profile)
        setProfileCompleteness(completeness.percentage)
        setCompletionItems(completeness.items)
      } else {
        console.warn('Profile not found:', profileError)
        // Set default empty state
        setProfileCompleteness(0)
      }

      // Load application stats
      const { data: applicationStats, error: statsError } = await getJobApplicationStats()
      
      if (applicationStats) {
        setStats(applicationStats)
      } else {
        console.warn('Stats error:', statsError)
      }
    } catch (error) {
      console.error('Dashboard loading error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateCompleteness = (profile: any) => {
    const items = [
      { 
        label: 'Basic Info', 
        completed: !!(profile.firstName && profile.lastName && profile.location), // ✅ Vérifiez les vrais noms de colonnes
        icon: User,
        link: '/dashboard/profile'
      },
      { 
        label: 'Resume Uploaded', 
        completed: !!profile.resumeUrl, // ✅ lowercase
        icon: Briefcase,
        link: '/dashboard/profile'
      },
      { 
        label: 'Job Preferences', 
        completed: profile.completionScore >= 50, // ✅ Utilisez le score de complétion
        icon: Target,
        link: '/dashboard/onboarding/preferences'
      },
      { 
        label: 'Skills & Experience', 
        completed: profile.completionScore >= 75,
        icon: Award,
        link: '/dashboard/profile#skills'
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
      router.replace('/dashboard', { scroll: false }) // ✅ Évite le scroll en haut
    }, 300)
  }

  const handleCompleteProfile = () => {
    router.push('/dashboard/profile')
  }

  // ✅ Skeleton loader pendant le chargement
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4"> {/* ✅ Ajoutez un container */}
      {/* Onboarding Hero */}
      {showOnboardingHero && (
        <div 
          className={`mb-8 transition-all duration-300 ${
            isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
          }`}
        >
          {/* Main Hero Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl shadow-2xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-10 left-10 w-2 h-2 bg-white rounded-full animate-ping opacity-75"></div>
              <div className="absolute top-20 right-32 w-3 h-3 bg-yellow-300 rounded-full animate-pulse"></div>
              <div className="absolute bottom-16 left-1/4 w-2 h-2 bg-pink-300 rounded-full animate-bounce"></div>
            </div>

            {/* Close Button */}
            <button
              onClick={handleDismissHero}
              className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
              aria-label="Dismiss hero"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative px-8 py-10 md:px-12 md:py-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                
                {/* Left Side - Content */}
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                    <CheckCircle className="w-5 h-5 text-green-300" />
                    <span className="text-sm font-semibold text-white">
                      Onboarding Complete! 🎉
                    </span>
                  </div>

                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                      You're Almost Ready!
                    </h1>
                    <p className="text-lg text-blue-100">
                      Your profile is <span className="font-bold text-white">{profileCompleteness}% complete</span>.
                      Complete the remaining steps to unlock all features and get better job matches.
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-blue-100">
                      <span>Profile Completion</span>
                      <span className="font-semibold text-white">{profileCompleteness}%</span>
                    </div>
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-lg"
                        style={{ width: `${profileCompleteness}%` }}
                      >
                        <div className="h-full w-full bg-gradient-to-r from-white/30 to-transparent animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-4 pt-2">
                    <Button 
                      onClick={handleCompleteProfile}
                      className="group px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    >
                      <span>Complete Your Profile</span>
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button 
                      onClick={handleDismissHero}
                      variant="ghost"
                      className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20"
                    >
                      I'll Check Later
                    </Button>
                  </div>
                </div>

                {/* Right Side - Checklist */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                    <h3 className="text-lg font-semibold text-white">
                      Profile Checklist
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {completionItems.map((item, index) => (
                      <div 
                        key={index}
                        className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                          item.completed 
                            ? 'bg-green-500/20 border border-green-400/30' 
                            : 'bg-white/5 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                          item.completed 
                            ? 'bg-green-400 text-white' 
                            : 'bg-white/20 text-white/60'
                        }`}>
                          {item.completed ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <item.icon className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${
                            item.completed ? 'text-white' : 'text-blue-100'
                          }`}>
                            {item.label}
                          </p>
                          <p className="text-xs text-blue-200">
                            {item.completed ? 'Completed' : 'Pending'}
                          </p>
                        </div>
                        {!item.completed && (
                          <Button
                            onClick={() => router.push(item.link)}
                            size="sm"
                            className="bg-white/20 hover:bg-white/30 text-white"
                          >
                            Add
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/20">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {completionItems.filter(i => i.completed).length}/{completionItems.length}
                      </div>
                      <div className="text-xs text-blue-200">Sections Done</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-300">
                        {completionItems.filter(i => !i.completed).length}
                      </div>
                      <div className="text-xs text-blue-200">Left to Complete</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Quick Actions Cards Below */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/jobs')}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-base">Browse Jobs</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-3">
                  Start exploring job opportunities matched to your profile
                </CardDescription>
                <Button variant="link" className="p-0 h-auto text-blue-600">
                  View Jobs <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/profile')}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-base">Complete Profile</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-3">
                  Add more details to get better job recommendations
                </CardDescription>
                <Button variant="link" className="p-0 h-auto text-purple-600">
                  Go to Profile <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/letters')}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Award className="w-5 h-5 text-green-600" />
                  </div>
                  <CardTitle className="text-base">AI Cover Letter</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-3">
                  Generate personalized cover letters with AI
                </CardDescription>
                <Button variant="link" className="p-0 h-auto text-green-600">
                  Try AI <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Regular Dashboard Content */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between space-y-2 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's what's happening with your job search.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => router.push('/dashboard/jobs')}>
              <Search className="mr-2 h-4 w-4" />
              Find Jobs
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? `${stats.pending} pending` : 'No applications yet'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cover Letters</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent}</div>
              <p className="text-xs text-muted-foreground">
                {stats.sent > 0 ? 'Applications sent' : 'Generate your first letter'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Responses</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.replied}</div>
              <p className="text-xs text-muted-foreground">
                {stats.replied > 0 ? 'Companies replied' : 'Waiting for responses'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0 ? `${Math.round((stats.replied / stats.total) * 100)}%` : '0%'}
              </div>
              <p className="text-xs text-muted-foreground">
                Reply rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Applications & Next Steps */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
              <CardDescription>Your most recent job applications</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.total === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No applications yet</p>
                  <Button 
                    variant="link" 
                    onClick={() => router.push('/dashboard/jobs')}
                    className="mt-2"
                  >
                    Browse jobs to get started
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {/* ✅ TODO: Map real applications data */}
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between border-b pb-3">
                        <div>
                          <p className="font-medium">Frontend Developer</p>
                          <p className="text-sm text-muted-foreground">Acme Inc. • Remote</p>
                        </div>
                        <div className="text-sm text-muted-foreground">2 days ago</div>
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="ghost" 
                    className="mt-4 w-full"
                    onClick={() => router.push('/dashboard/applications')}
                  >
                    View all applications
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>Your action items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profileCompleteness < 100 && (
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-yellow-500" />
                    <div>
                      <p className="font-medium">Complete your profile</p>
                      <p className="text-sm text-muted-foreground">
                        {100 - profileCompleteness}% remaining
                      </p>
                    </div>
                  </div>
                )}
                
                {stats.pending > 0 && (
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="font-medium">Follow up on applications</p>
                      <p className="text-sm text-muted-foreground">
                        {stats.pending} pending responses
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                  <div>
                    <p className="font-medium">Browse new opportunities</p>
                    <p className="text-sm text-muted-foreground">
                      Fresh jobs matched to your profile
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}