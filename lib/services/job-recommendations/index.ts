import { jobSearchService } from '@/lib/services/job-search'
import type { NormalizedJob, JobSearchParams } from '@/lib/services/job-search/types'
import { adminSupabase } from '@/lib/supabase/server'

// ===========================================================
// JOB RECOMMENDATION SERVICE
// ===========================================================
// Smart job matching based on user preferences and profile
// Caches results daily to minimize API calls
// Limits to 5 recommendations per day

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
  currency?: string | null
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
  savedJobIds?: string[]
}

export class JobRecommendationService {
  private readonly CACHE_DURATION_HOURS = 24
  private readonly MAX_RECOMMENDATIONS = 20 // Fetch more for better filtering
  private readonly DAILY_PICKS_LIMIT = 5 // User sees max 5 per day
  private readonly MAX_SEARCH_QUERIES = 3 // Multiple queries for variety

  /**
   * Get cached recommendations or fetch new ones if expired
   * Filters out already-saved jobs and limits to daily picks
   */
  async getRecommendations(userId: string): Promise<{
    jobs: NormalizedJob[]
    topPicks: NormalizedJob[]
    fromCache: boolean
    lastRefreshed: Date | null
    savedCount: number
    dailyLimit: number
  }> {
    // Check cache first
    const cached = await this.getCachedRecommendations(userId)
    
    if (cached && new Date(cached.expiresAt) > new Date()) {
      // Cache is valid - filter out saved jobs
      const allJobs = cached.jobs as NormalizedJob[]
      const savedIds = new Set(cached.savedJobIds || [])
      const availableJobs = allJobs.filter(j => !savedIds.has(j.id))
      
      // Limit top picks to daily limit minus saved count
      const remainingPicks = Math.max(0, this.DAILY_PICKS_LIMIT - savedIds.size)
      
      return {
        jobs: availableJobs,
        topPicks: availableJobs.slice(0, remainingPicks),
        fromCache: true,
        lastRefreshed: new Date(cached.lastRefreshedAt),
        savedCount: savedIds.size,
        dailyLimit: this.DAILY_PICKS_LIMIT,
      }
    }

    // Cache expired or doesn't exist - fetch new recommendations
    return this.refreshRecommendations(userId)
  }

  /**
   * Mark a job as saved (reduces daily picks count)
   */
  async markJobAsSaved(userId: string, jobId: string): Promise<void> {
    try {
      const cached = await this.getCachedRecommendations(userId)
      if (!cached) return

      const savedIds = new Set(cached.savedJobIds || [])
      savedIds.add(jobId)

      await adminSupabase
        .from('cached_job_recommendations')
        .update({ savedJobIds: Array.from(savedIds) })
        .eq('userId', userId)
    } catch (error) {
      console.error('Failed to mark job as saved:', error)
    }
  }

  /**
   * Force refresh recommendations (ignores cache)
   * Uses multi-query exploration for better variety
   */
  async refreshRecommendations(userId: string): Promise<{
    jobs: NormalizedJob[]
    topPicks: NormalizedJob[]
    fromCache: boolean
    lastRefreshed: Date | null
    savedCount: number
    dailyLimit: number
  }> {
    try {
      // Get user preferences and profile
      const [preferences, profile] = await Promise.all([
        this.getUserPreferences(userId),
        this.getUserProfile(userId),
      ])

      // Build multiple search queries for variety
      const searchQueries = this.buildMultipleQueries(preferences, profile)
      const locations = this.getSearchLocations(preferences, profile)
      const wantsRemote = preferences?.remoteOptions?.includes('remote') || false
      
      // Execute multiple searches in parallel for variety
      const allJobs: NormalizedJob[] = []
      const searchPromises: Promise<void>[] = []

      for (const query of searchQueries.slice(0, this.MAX_SEARCH_QUERIES)) {
        for (const location of locations.slice(0, 2)) {
          searchPromises.push(
            (async () => {
              try {
                const result = await jobSearchService.searchAll({
                  query,
                  location,
                  remote: wantsRemote,
                  resultsPerPage: 15,
                  page: 1,
                })
                allJobs.push(...result.jobs)
              } catch (err) {
                console.error(`Search failed for "${query}" in "${location}":`, err)
              }
            })()
          )
        }
      }

      // Also do a remote-only search if user prefers remote
      if (wantsRemote && searchQueries.length > 0) {
        searchPromises.push(
          (async () => {
            try {
              const result = await jobSearchService.searchAll({
                query: searchQueries[0],
                remote: true,
                resultsPerPage: 10,
                page: 1,
              })
              allJobs.push(...result.jobs)
            } catch (err) {
              console.error('Remote search failed:', err)
            }
          })()
        )
      }

      await Promise.all(searchPromises)

      // Deduplicate jobs
      const uniqueJobs = this.deduplicateJobs(allJobs)
      
      // Score and rank jobs with improved scoring
      let scoredJobs = this.scoreJobs(uniqueJobs, preferences, profile)
      
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
      const queryUsed = searchQueries.join(' | ')

      // Cache the results (reset saved jobs on refresh)
      await this.cacheRecommendations(userId, topJobs, queryUsed)

      return {
        jobs: topJobs,
        topPicks: topJobs.slice(0, this.DAILY_PICKS_LIMIT),
        fromCache: false,
        lastRefreshed: new Date(),
        savedCount: 0,
        dailyLimit: this.DAILY_PICKS_LIMIT,
      }
    } catch (error) {
      console.error('Failed to refresh recommendations:', error)
      
      // Return cached data if available, even if expired
      const cached = await this.getCachedRecommendations(userId)
      if (cached) {
        const jobs = cached.jobs as NormalizedJob[]
        const savedIds = new Set(cached.savedJobIds || [])
        const availableJobs = jobs.filter(j => !savedIds.has(j.id))
        const remainingPicks = Math.max(0, this.DAILY_PICKS_LIMIT - savedIds.size)
        
        return {
          jobs: availableJobs,
          topPicks: availableJobs.slice(0, remainingPicks),
          fromCache: true,
          lastRefreshed: new Date(cached.lastRefreshedAt),
          savedCount: savedIds.size,
          dailyLimit: this.DAILY_PICKS_LIMIT,
        }
      }

      return {
        jobs: [],
        topPicks: [],
        fromCache: false,
        lastRefreshed: null,
        savedCount: 0,
        dailyLimit: this.DAILY_PICKS_LIMIT,
      }
    }
  }

  /**
   * Get similar jobs based on a reference job
   */
  async getSimilarJobs(referenceJob: NormalizedJob, userId?: string): Promise<NormalizedJob[]> {
    try {
      // Extract key terms from the reference job
      const titleWords = referenceJob.title.split(/\s+/).filter(w => w.length > 2)
      const query = titleWords.slice(0, 3).join(' ')
      
      // Get user preferences for better scoring if available
      let preferences: UserPreferences | null = null
      let profile: UserProfile | null = null
      
      if (userId) {
        [preferences, profile] = await Promise.all([
          this.getUserPreferences(userId),
          this.getUserProfile(userId),
        ])
      }

      // Search for similar jobs
      const result = await jobSearchService.searchAll({
        query,
        location: referenceJob.location,
        remote: referenceJob.remote,
        resultsPerPage: 15,
        page: 1,
      })

      // Filter out the reference job itself
      let similarJobs = result.jobs.filter(j => j.id !== referenceJob.id)

      // Score based on similarity to reference job + user preferences
      similarJobs = this.scoreSimilarJobs(similarJobs, referenceJob, preferences, profile)

      return similarJobs.slice(0, 5)
    } catch (error) {
      console.error('Failed to get similar jobs:', error)
      return []
    }
  }

  /**
   * Score jobs based on similarity to a reference job
   */
  private scoreSimilarJobs(
    jobs: NormalizedJob[],
    referenceJob: NormalizedJob,
    preferences: UserPreferences | null,
    profile: UserProfile | null
  ): NormalizedJob[] {
    const refTitleWords = new Set(
      referenceJob.title.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    )
    const refTags = new Set((referenceJob.tags || []).map(t => t.toLowerCase()))

    return jobs
      .map(job => {
        let score = 0
        const jobTitleWords = job.title.toLowerCase().split(/\s+/)

        // Title word overlap
        for (const word of jobTitleWords) {
          if (refTitleWords.has(word)) score += 15
        }

        // Tag/skill overlap
        for (const tag of (job.tags || [])) {
          if (refTags.has(tag.toLowerCase())) score += 10
        }

        // Same job type
        if (job.jobType === referenceJob.jobType) score += 10

        // Remote match
        if (job.remote === referenceJob.remote) score += 5

        // Location similarity
        if (job.location.toLowerCase().includes(referenceJob.location.toLowerCase().split(',')[0])) {
          score += 5
        }

        // Also consider user preferences if available
        if (preferences || profile) {
          const userSkills = new Set([
            ...(preferences?.skills || []).map(s => s.toLowerCase()),
            ...(profile?.skills?.map(s => s.name.toLowerCase()) || []),
          ])
          const jobText = `${job.title} ${job.description}`.toLowerCase()
          
          for (const skill of userSkills) {
            if (jobText.includes(skill)) score += 5
          }
        }

        return { ...job, _score: score }
      })
      .sort((a, b) => (b as any)._score - (a as any)._score)
      .map(({ _score, ...job }) => job as NormalizedJob)
  }

  /**
   * Deduplicate jobs using improved key (title + company + location)
   */
  private deduplicateJobs(jobs: NormalizedJob[]): NormalizedJob[] {
    const seen = new Set<string>()
    const unique: NormalizedJob[] = []

    for (const job of jobs) {
      // Normalize title (remove common variations)
      const normalizedTitle = job.title
        .toLowerCase()
        .replace(/\s+(i|ii|iii|iv|v|1|2|3|4|5)\s*$/i, '') // Remove level suffixes
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
      
      const normalizedCompany = job.company.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
      const locationCity = job.location.split(',')[0].toLowerCase().trim()
      
      const key = `${normalizedTitle}-${normalizedCompany}-${locationCity}`
      
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(job)
      }
    }

    return unique
  }

  /**
   * Build multiple search queries for variety
   */
  private buildMultipleQueries(
    preferences: UserPreferences | null,
    profile: UserProfile | null
  ): string[] {
    const queries: string[] = []

    // Add preferred job titles (up to 3)
    if (preferences?.jobTitles?.length) {
      queries.push(...preferences.jobTitles.slice(0, 3))
    }

    // Add profile headline if different
    if (profile?.headline && !queries.some(q => q.toLowerCase() === profile.headline?.toLowerCase())) {
      queries.push(profile.headline)
    }

    // Add most recent experience title if different
    if (profile?.experiences?.length) {
      const expTitle = profile.experiences[0].title
      if (!queries.some(q => q.toLowerCase() === expTitle.toLowerCase())) {
        queries.push(expTitle)
      }
    }

    // Build skill-based query as fallback
    if (queries.length === 0) {
      const skills = [
        ...(preferences?.skills || []),
        ...(profile?.skills?.map(s => s.name) || []),
      ].slice(0, 3)
      
      if (skills.length > 0) {
        queries.push(skills.join(' '))
      } else {
        queries.push('software developer') // Ultimate fallback
      }
    }

    return queries
  }

  /**
   * Get search locations from preferences and profile
   */
  private getSearchLocations(
    preferences: UserPreferences | null,
    profile: UserProfile | null
  ): string[] {
    const locations: string[] = []

    if (preferences?.locations?.length) {
      locations.push(...preferences.locations.slice(0, 3))
    }

    if (profile?.location && !locations.includes(profile.location)) {
      locations.push(profile.location)
    }

    // Return at least one undefined for "any location" search
    return locations.length > 0 ? locations : ['']
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
   * Uses word-based matching and includes penalties for mismatches
   */
  private scoreJobs(
    jobs: NormalizedJob[],
    preferences: UserPreferences | null,
    profile: UserProfile | null
  ): NormalizedJob[] {
    if (!preferences && !profile) {
      return jobs
    }

    // Tokenize user data for word-based matching
    const userSkills = new Set([
      ...(preferences?.skills || []).map(s => s.toLowerCase()),
      ...(profile?.skills?.map(s => s.name.toLowerCase()) || []),
    ])

    const userTitles = (preferences?.jobTitles || []).map(t => t.toLowerCase())
    const userTitleWords = new Set(
      userTitles.flatMap(t => t.split(/\s+/).filter(w => w.length > 2))
    )

    const userKeywords = new Set(
      (preferences?.keywords || []).map(k => k.toLowerCase())
    )

    const userLevel = preferences?.experienceLevel?.toLowerCase() || null
    const wantsRemote = preferences?.remoteOptions?.includes('remote') || false
    const minSalary = preferences?.minSalary || null

    return jobs
      .map(job => {
        let score = 0
        const jobTitle = job.title.toLowerCase()
        const jobTitleWords = new Set(jobTitle.split(/\s+/).filter(w => w.length > 2))
        const jobText = `${job.title} ${job.description} ${job.requirements || ''}`.toLowerCase()
        const jobTextWords = new Set(jobText.split(/\s+/).filter(w => w.length > 2))

        // === TITLE MATCHING (highest weight) ===
        // Exact title match
        for (const title of userTitles) {
          if (jobTitle.includes(title)) {
            score += 40
            break
          }
        }
        
        // Word overlap in title
        let titleWordMatches = 0
        for (const word of userTitleWords) {
          if (jobTitleWords.has(word)) {
            titleWordMatches++
            score += 10
          }
        }

        // === SKILL MATCHING ===
        let skillMatches = 0
        for (const skill of userSkills) {
          // Word boundary matching for skills (avoid substring false positives)
          const skillWords = skill.split(/\s+/)
          const allWordsMatch = skillWords.every(sw => 
            sw.length <= 2 || jobTextWords.has(sw) || jobText.includes(sw)
          )
          if (allWordsMatch) {
            // Higher score for title matches
            if (jobTitle.includes(skill)) {
              score += 15
            } else {
              score += 8
            }
            skillMatches++
          }
        }

        // === KEYWORD MATCHING ===
        for (const keyword of userKeywords) {
          if (jobText.includes(keyword)) {
            score += 5
          }
        }

        // === REMOTE PREFERENCE ===
        if (wantsRemote) {
          if (job.remote) {
            score += 20
          } else {
            score -= 5 // Slight penalty for non-remote when user wants remote
          }
        }

        // === SALARY MATCHING ===
        if (minSalary && job.salary) {
          const parsedSalary = this.parseSalaryRange(job.salary)
          if (parsedSalary) {
            if (parsedSalary.min >= minSalary) {
              score += 15 // Meets salary requirement
            } else if (parsedSalary.max >= minSalary) {
              score += 8 // Range includes desired salary
            } else {
              score -= 10 // Below salary requirement
            }
          } else {
            score += 5 // Has salary info but couldn't parse
          }
        }

        // === EXPERIENCE LEVEL MATCHING ===
        if (userLevel) {
          const isSeniorJob = /\b(senior|sr\.?|lead|principal|staff)\b/i.test(jobTitle)
          const isJuniorJob = /\b(junior|jr\.?|entry|associate|graduate)\b/i.test(jobTitle)
          
          if (userLevel === 'senior') {
            if (isSeniorJob) score += 15
            else if (isJuniorJob) score -= 15 // Penalty for junior jobs
          } else if (userLevel === 'junior' || userLevel === 'entry') {
            if (isJuniorJob) score += 15
            else if (isSeniorJob) score -= 20 // Strong penalty for senior jobs
          } else if (userLevel === 'mid') {
            if (!isSeniorJob && !isJuniorJob) score += 10
            else if (isSeniorJob) score -= 5
          }
        }

        // === FRESHNESS BONUS ===
        if (job.postedDate) {
          const daysOld = Math.floor((Date.now() - job.postedDate.getTime()) / (1000 * 60 * 60 * 24))
          if (daysOld <= 1) score += 10
          else if (daysOld <= 3) score += 5
          else if (daysOld <= 7) score += 2
        }

        // === QUALITY SIGNALS ===
        if (job.tags && job.tags.length > 0) score += 3 // Has skill tags
        if (job.logoUrl) score += 2 // Has company logo

        return { ...job, _score: score }
      })
      .sort((a, b) => (b as any)._score - (a as any)._score)
      .map(({ _score, ...job }) => job as NormalizedJob)
  }

  /**
   * Parse salary string into numeric range
   */
  private parseSalaryRange(salary: string): { min: number; max: number } | null {
    try {
      // Remove currency symbols and normalize
      const cleaned = salary.replace(/[£€$,]/g, '').toLowerCase()
      
      // Match patterns like "50k-70k", "50000-70000", "50k", etc.
      const rangeMatch = cleaned.match(/(\d+\.?\d*)\s*k?\s*[-–to]+\s*(\d+\.?\d*)\s*k?/i)
      if (rangeMatch) {
        let min = parseFloat(rangeMatch[1])
        let max = parseFloat(rangeMatch[2])
        
        // Convert k notation
        if (min < 1000 && cleaned.includes('k')) min *= 1000
        if (max < 1000 && cleaned.includes('k')) max *= 1000
        
        return { min, max }
      }
      
      // Single value
      const singleMatch = cleaned.match(/(\d+\.?\d*)\s*k?/i)
      if (singleMatch) {
        let value = parseFloat(singleMatch[1])
        if (value < 1000 && cleaned.includes('k')) value *= 1000
        return { min: value, max: value }
      }
      
      return null
    } catch {
      return null
    }
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
