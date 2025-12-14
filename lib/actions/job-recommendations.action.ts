'use server'

import { createClient } from '@/lib/supabase/server'
import { jobRecommendationService } from '@/lib/services/job-recommendations'
import type { NormalizedJob } from '@/lib/services/job-search/types'

export interface RecommendationsResult {
  jobs: NormalizedJob[]
  topPicks: NormalizedJob[]
  fromCache: boolean
  lastRefreshed: string | null
  savedCount: number
  dailyLimit: number
}

/**
 * Get job recommendations for the current user
 * Returns cached results if available and not expired (24h)
 * Limits to 5 recommendations per day
 */
export async function getJobRecommendations(): Promise<{
  data: RecommendationsResult | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const result = await jobRecommendationService.getRecommendations(user.id)
    
    return {
      data: {
        jobs: result.jobs,
        topPicks: result.topPicks,
        fromCache: result.fromCache,
        lastRefreshed: result.lastRefreshed?.toISOString() || null,
        savedCount: result.savedCount,
        dailyLimit: result.dailyLimit,
      },
      error: null,
    }
  } catch (error) {
    console.error('Get recommendations error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get recommendations',
    }
  }
}

/**
 * Force refresh job recommendations (ignores cache)
 */
export async function refreshJobRecommendations(): Promise<{
  data: RecommendationsResult | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const result = await jobRecommendationService.refreshRecommendations(user.id)
    
    return {
      data: {
        jobs: result.jobs,
        topPicks: result.topPicks,
        fromCache: result.fromCache,
        lastRefreshed: result.lastRefreshed?.toISOString() || null,
        savedCount: result.savedCount,
        dailyLimit: result.dailyLimit,
      },
      error: null,
    }
  } catch (error) {
    console.error('Refresh recommendations error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to refresh recommendations',
    }
  }
}

/**
 * Mark a recommended job as saved (reduces daily picks count)
 */
export async function markRecommendedJobSaved(jobId: string): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    await jobRecommendationService.markJobAsSaved(user.id, jobId)
    
    return { success: true, error: null }
  } catch (error) {
    console.error('Mark job saved error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark job as saved',
    }
  }
}

/**
 * Get similar jobs based on a reference job
 */
export async function getSimilarJobs(referenceJob: NormalizedJob): Promise<{
  data: NormalizedJob[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // User is optional for similar jobs
    const userId = user?.id

    const similarJobs = await jobRecommendationService.getSimilarJobs(referenceJob, userId)
    
    return { data: similarJobs, error: null }
  } catch (error) {
    console.error('Get similar jobs error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get similar jobs',
    }
  }
}
