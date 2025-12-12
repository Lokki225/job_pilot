import type { JobSearchParams, JobSearchResponse, NormalizedJob } from './types'
import { adzunaProvider } from './providers/adzuna'
import { jsearchProvider } from './providers/jsearch'

// ===========================================================
// JOB SEARCH AGGREGATOR SERVICE
// ===========================================================
// Combines results from multiple job search providers

export class JobSearchService {
  private providers = [adzunaProvider, jsearchProvider]

  /**
   * Search jobs from all configured providers
   */
  async searchAll(params: JobSearchParams): Promise<JobSearchResponse> {
    const configuredProviders = this.providers.filter(p => p.isConfigured())
    
    if (configuredProviders.length === 0) {
      throw new Error('No job search providers configured. Please set API keys in .env')
    }

    try {
      // Search from all providers in parallel
      const results = await Promise.allSettled(
        configuredProviders.map(provider => provider.search(params))
      )

      // Combine successful results
      const allJobs: NormalizedJob[] = []
      let totalResults = 0

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allJobs.push(...result.value.jobs)
          totalResults += result.value.total
        } else {
          console.error(`Provider ${configuredProviders[index].name} failed:`, result.reason)
        }
      })

      // Remove duplicates based on job title + company
      const uniqueJobs = this.deduplicateJobs(allJobs)

      // Sort by relevance (newest first)
      uniqueJobs.sort((a, b) => {
        if (a.postedDate && b.postedDate) {
          return b.postedDate.getTime() - a.postedDate.getTime()
        }
        return 0
      })

      // Paginate
      const page = params.page || 1
      const resultsPerPage = params.resultsPerPage || 20
      const startIndex = (page - 1) * resultsPerPage
      const endIndex = startIndex + resultsPerPage
      const paginatedJobs = uniqueJobs.slice(startIndex, endIndex)

      return {
        jobs: paginatedJobs,
        total: uniqueJobs.length,
        page,
        totalPages: Math.ceil(uniqueJobs.length / resultsPerPage),
        hasMore: endIndex < uniqueJobs.length,
      }
    } catch (error) {
      console.error('Job search error:', error)
      throw error
    }
  }

  /**
   * Search from a specific provider
   */
  async searchProvider(providerName: string, params: JobSearchParams): Promise<JobSearchResponse> {
    const provider = this.providers.find(
      p => p.name.toLowerCase() === providerName.toLowerCase()
    )

    if (!provider) {
      throw new Error(`Provider ${providerName} not found`)
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${providerName} is not configured`)
    }

    return provider.search(params)
  }

  /**
   * Get list of configured providers
   */
  getConfiguredProviders(): string[] {
    return this.providers
      .filter(p => p.isConfigured())
      .map(p => p.name)
  }

  /**
   * Remove duplicate jobs based on title and company
   */
  private deduplicateJobs(jobs: NormalizedJob[]): NormalizedJob[] {
    const seen = new Set<string>()
    const unique: NormalizedJob[] = []

    for (const job of jobs) {
      const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(job)
      }
    }

    return unique
  }

  /**
   * Search jobs matching user preferences
   */
  async searchByPreferences(preferences: {
    jobTitles?: string[]
    keywords?: string[]
    locations?: string[]
    minSalary?: number
    maxSalary?: number
    workTypes?: string[]
    remoteOptions?: string[]
  }): Promise<JobSearchResponse> {
    // Build search params from preferences
    const params: JobSearchParams = {
      keywords: [
        ...(preferences.jobTitles || []),
        ...(preferences.keywords || []),
      ],
      minSalary: preferences.minSalary,
      maxSalary: preferences.maxSalary,
      resultsPerPage: 50, // Get more results for better matching
    }

    // If remote is preferred, search remote jobs
    if (preferences.remoteOptions?.includes('remote') || preferences.remoteOptions?.includes('hybrid')) {
      params.remote = true
    }

    // Search from all locations
    const allResults: NormalizedJob[] = []
    
    if (preferences.locations && preferences.locations.length > 0) {
      // Search each location
      for (const location of preferences.locations.slice(0, 3)) { // Limit to 3 locations
        try {
          const result = await this.searchAll({ ...params, location })
          allResults.push(...result.jobs)
        } catch (error) {
          console.error(`Search failed for location ${location}:`, error)
        }
      }
    } else {
      // Search without location filter
      const result = await this.searchAll(params)
      allResults.push(...result.jobs)
    }

    // Deduplicate and limit results
    const uniqueJobs = this.deduplicateJobs(allResults)
    const limitedJobs = uniqueJobs.slice(0, 50) // Return top 50 matches

    return {
      jobs: limitedJobs,
      total: limitedJobs.length,
      page: 1,
      totalPages: 1,
      hasMore: false,
    }
  }
}

// Export singleton instance
export const jobSearchService = new JobSearchService()

// Export convenience function
export async function searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
  return jobSearchService.searchAll(params)
}

// Export types
export * from './types'