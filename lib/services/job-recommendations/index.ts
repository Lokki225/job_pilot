import { jobSearchService } from '@/lib/services/job-search'
import type { NormalizedJob, JobSearchParams } from '@/lib/services/job-search/types'
import { adminSupabase } from '@/lib/supabase/server'

// ===========================================================
// JOB RECOMMENDATION SERVICE
// ===========================================================
// Smart job matching based on user preferences and profile
// Caches results daily to minimize API calls

interface UserPreferences {
  jobTitles: string[]
  keywords: string[]
  locations: string[]
  minSalary?: number | null
  maxSalary?: number | null
  experienceLevel?: string | null
  workTypes: string[]
  remoteOptions: string[]
  skills: string[]
  industries: string[]
  excludeCompanies: string[]
}

interface UserProfile {
  headline?: string | null
  location?: string | null
  skills: { name: string; level?: string }[]
  experiences: { title: string; company: string }[]
}

interface CachedRecommendation {
  id: string
  userId: string
  jobs: NormalizedJob[]
  matchScore: number | null
  searchQuery: string | null
  sources: string[]
  expiresAt: Date
  lastRefreshedAt: Date
}

export class JobRecommendationService {
  private readonly CACHE_DURATION_HOURS = 24
  private readonly MAX_RECOMMENDATIONS = 10
  private readonly TOP_PICKS_COUNT = 5

  /**
   * Get cached recommendations or fetch new ones if expired
   */
  async getRecommendations(userId: string): Promise<{
    jobs: NormalizedJob[]
    topPicks: NormalizedJob[]
    fromCache: boolean
    lastRefreshed: Date | null
  }> {
    // Check cache first
    const cached = await this.getCachedRecommendations(userId)
    
    if (cached && new Date(cached.expiresAt) > new Date()) {
      // Cache is valid
      const jobs = cached.jobs as NormalizedJob[]
      return {
        jobs,
        topPicks: jobs.slice(0, this.TOP_PICKS_COUNT),
        fromCache: true,
        lastRefreshed: new Date(cached.lastRefreshedAt),
      }
    }

    // Cache expired or doesn't exist - fetch new recommendations
    return this.refreshRecommendations(userId)
  }

  /**
   * Force refresh recommendations (ignores cache)
   */
  async refreshRecommendations(userId: string): Promise<{
    jobs: NormalizedJob[]
    topPicks: NormalizedJob[]
    fromCache: boolean
    lastRefreshed: Date | null
  }> {
    try {
      // Get user preferences and profile
      const [preferences, profile] = await Promise.all([
        this.getUserPreferences(userId),
        this.getUserProfile(userId),
      ])

      // Build smart search query from preferences + profile
      const searchQuery = this.buildSmartQuery(preferences, profile)
      
      // Search for jobs
      const searchParams: JobSearchParams = {
        query: searchQuery,
        location: this.getPrimaryLocation(preferences, profile),
        remote: preferences?.remoteOptions?.includes('remote') || false,
        resultsPerPage: this.MAX_RECOMMENDATIONS * 2, // Fetch extra for filtering
        page: 1,
      }

      const result = await jobSearchService.searchAll(searchParams)
      
      // Score and rank jobs
      let scoredJobs = this.scoreJobs(result.jobs, preferences, profile)
      
      // Filter out excluded companies
      if (preferences?.excludeCompanies?.length) {
        scoredJobs = scoredJobs.filter(
          job => !preferences.excludeCompanies.some(
            exc => job.company.toLowerCase().includes(exc.toLowerCase())
          )
        )
      }

      // Take top recommendations
      const topJobs = scoredJobs.slice(0, this.MAX_RECOMMENDATIONS)

      // Cache the results
      await this.cacheRecommendations(userId, topJobs, searchQuery)

      return {
        jobs: topJobs,
        topPicks: topJobs.slice(0, this.TOP_PICKS_COUNT),
        fromCache: false,
        lastRefreshed: new Date(),
      }
    } catch (error) {
      console.error('Failed to refresh recommendations:', error)
      
      // Return cached data if available, even if expired
      const cached = await this.getCachedRecommendations(userId)
      if (cached) {
        const jobs = cached.jobs as NormalizedJob[]
        return {
          jobs,
          topPicks: jobs.slice(0, this.TOP_PICKS_COUNT),
          fromCache: true,
          lastRefreshed: new Date(cached.lastRefreshedAt),
        }
      }

      return {
        jobs: [],
        topPicks: [],
        fromCache: false,
        lastRefreshed: null,
      }
    }
  }

  /**
   * Build a smart search query from user data
   */
  private buildSmartQuery(
    preferences: UserPreferences | null,
    profile: UserProfile | null
  ): string {
    const queryParts: string[] = []

    // Priority 1: Preferred job titles
    if (preferences?.jobTitles?.length) {
      queryParts.push(preferences.jobTitles[0])
    } else if (profile?.headline) {
      // Fall back to profile headline
      queryParts.push(profile.headline)
    } else if (profile?.experiences?.length) {
      // Fall back to most recent job title
      queryParts.push(profile.experiences[0].title)
    }

    // Priority 2: Key skills (top 3)
    const skills = [
      ...(preferences?.skills || []),
      ...(profile?.skills?.map(s => s.name) || []),
    ].slice(0, 3)
    
    if (skills.length && !queryParts.length) {
      queryParts.push(skills.join(' '))
    }

    // Priority 3: Keywords
    if (preferences?.keywords?.length) {
      queryParts.push(...preferences.keywords.slice(0, 2))
    }

    // Default fallback
    if (!queryParts.length) {
      return 'software developer'
    }

    return queryParts.join(' ')
  }

  /**
   * Get primary location for search
   */
  private getPrimaryLocation(
    preferences: UserPreferences | null,
    profile: UserProfile | null
  ): string | undefined {
    if (preferences?.locations?.length) {
      return preferences.locations[0]
    }
    if (profile?.location) {
      return profile.location
    }
    return undefined
  }

  /**
   * Score jobs based on match with user preferences
   */
  private scoreJobs(
    jobs: NormalizedJob[],
    preferences: UserPreferences | null,
    profile: UserProfile | null
  ): NormalizedJob[] {
    if (!preferences && !profile) {
      return jobs
    }

    const userSkills = new Set([
      ...(preferences?.skills || []).map(s => s.toLowerCase()),
      ...(profile?.skills?.map(s => s.name.toLowerCase()) || []),
    ])

    const userTitles = new Set(
      (preferences?.jobTitles || []).map(t => t.toLowerCase())
    )

    const userKeywords = new Set(
      (preferences?.keywords || []).map(k => k.toLowerCase())
    )

    return jobs
      .map(job => {
        let score = 0
        const jobText = `${job.title} ${job.description} ${job.requirements || ''}`.toLowerCase()

        // Title match (highest weight)
        for (const title of userTitles) {
          if (job.title.toLowerCase().includes(title)) {
            score += 30
            break
          }
        }

        // Skill matches
        for (const skill of userSkills) {
          if (jobText.includes(skill)) {
            score += 10
          }
        }

        // Keyword matches
        for (const keyword of userKeywords) {
          if (jobText.includes(keyword)) {
            score += 5
          }
        }

        // Remote preference match
        if (preferences?.remoteOptions?.includes('remote') && job.remote) {
          score += 15
        }

        // Salary in description bonus (if user has salary preference)
        if (preferences?.minSalary && job.salary) {
          // Job has salary info - give it a bonus
          score += 10
        }

        // Experience level match
        if (preferences?.experienceLevel && job.title.toLowerCase()) {
          const level = preferences.experienceLevel.toLowerCase()
          if (
            (level === 'senior' && job.title.toLowerCase().includes('senior')) ||
            (level === 'junior' && (job.title.toLowerCase().includes('junior') || job.title.toLowerCase().includes('entry'))) ||
            (level === 'mid' && !job.title.toLowerCase().includes('senior') && !job.title.toLowerCase().includes('junior'))
          ) {
            score += 10
          }
        }

        return { ...job, _score: score }
      })
      .sort((a, b) => (b as any)._score - (a as any)._score)
      .map(({ _score, ...job }) => job as NormalizedJob)
  }

  /**
   * Get cached recommendations from database
   */
  private async getCachedRecommendations(userId: string): Promise<CachedRecommendation | null> {
    try {
      const { data, error } = await adminSupabase
        .from('cached_job_recommendations')
        .select('*')
        .eq('userId', userId)
        .single()

      if (error || !data) {
        return null
      }

      return data as CachedRecommendation
    } catch {
      return null
    }
  }

  /**
   * Cache recommendations in database
   */
  private async cacheRecommendations(
    userId: string,
    jobs: NormalizedJob[],
    searchQuery: string
  ): Promise<void> {
    try {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + this.CACHE_DURATION_HOURS)

      await adminSupabase
        .from('cached_job_recommendations')
        .upsert({
          userId,
          jobs,
          searchQuery,
          sources: [...new Set(jobs.map(j => j.source))],
          expiresAt: expiresAt.toISOString(),
          lastRefreshedAt: new Date().toISOString(),
        })
    } catch (error) {
      console.error('Failed to cache recommendations:', error)
    }
  }

  /**
   * Get user preferences from database
   */
  private async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await adminSupabase
        .from('job_search_preferences')
        .select('*')
        .eq('userId', userId)
        .single()

      if (error || !data) {
        return null
      }

      return data as UserPreferences
    } catch {
      return null
    }
  }

  /**
   * Get user profile from database
   */
  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data: profile, error } = await adminSupabase
        .from('profiles')
        .select(`
          headline,
          location,
          skills (name, level),
          experiences (title, company)
        `)
        .eq('userId', userId)
        .single()

      if (error || !profile) {
        return null
      }

      return profile as UserProfile
    } catch {
      return null
    }
  }
}

// Export singleton
export const jobRecommendationService = new JobRecommendationService()
