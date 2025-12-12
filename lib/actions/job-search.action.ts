'use server'

import { jobSearchService } from '@/lib/services/job-search'
import type { JobSearchParams, JobSearchResponse } from '@/lib/services/job-search/types'

export async function searchJobsAction(params: JobSearchParams): Promise<{
  data: JobSearchResponse | null
  error: string | null
}> {
  try {
    const result = await jobSearchService.searchAll(params)
    return { data: result, error: null }
  } catch (error) {
    console.error('Job search action error:', error)
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Failed to search jobs' 
    }
  }
}
