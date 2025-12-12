'use server'

import { createClient } from '@/lib/supabase/server'
import { jobRecommendationService } from '@/lib/services/job-recommendations'
import type { NormalizedJob } from '@/lib/services/job-search/types'

export interface RecommendationsResult {
  jobs: NormalizedJob[]
  topPicks: NormalizedJob[]
  fromCache: boolean
  lastRefreshed: string | null
}

/**
 * Get job recommendations for the current user
 * Returns cached results if available and not expired (24h)
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
