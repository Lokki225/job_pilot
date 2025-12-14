'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { jobSearchService } from '@/lib/services/job-search'
import type { JobSearchParams, JobSearchResponse } from '@/lib/services/job-search/types'

const JobSearchParamsSchema = z
  .object({
    query: z.string().trim().min(1).max(120).optional(),
    keywords: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    location: z.string().trim().min(1).max(120).optional(),
    radius: z.number().int().min(0).max(200).optional(),
    jobType: z.string().trim().min(1).max(50).optional(),
    experienceLevel: z.string().trim().min(1).max(50).optional(),
    minSalary: z.number().int().min(0).max(1_000_000).optional(),
    maxSalary: z.number().int().min(0).max(1_000_000).optional(),
    remote: z.boolean().optional(),
    page: z.number().int().min(1).max(50).optional(),
    resultsPerPage: z.number().int().min(1).max(50).optional(),
    sortBy: z.enum(['relevance', 'date', 'salary']).optional(),
    datePosted: z.enum(['today', 'week', 'month', 'any']).optional(),
  })
  .strict()

export async function searchJobsAction(params: JobSearchParams): Promise<{
  data: JobSearchResponse | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const parsed = JobSearchParamsSchema.safeParse(params)
    if (!parsed.success) {
      return { data: null, error: 'Invalid search params' }
    }

    const rate = checkRateLimit(`job-search:${user.id}`, 25, 60_000)
    if (!rate.allowed) {
      return { data: null, error: 'Too many requests. Please try again shortly.' }
    }

    const result = await jobSearchService.searchAll(parsed.data)
    return { data: result, error: null }
  } catch (error) {
    console.error('Job search action error:', error)
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Failed to search jobs' 
    }
  }
}
