import { SearchParams } from "next/dist/server/request/search-params";

import type { 
  JobSearchParams, 
  JobSearchResponse, 
  NormalizedJob, 
  AdzunaResponse,
  AdzunaJob,
  JobSearchProvider 
} from '../types'

// ===========================================================
// ADZUNA API PROVIDER
// ===========================================================
// Docs: https://developer.adzuna.com/
// Free tier: 250 calls/month
// Requires: ADZUNA_APP_ID and ADZUNA_API_KEY

const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api/jobs'
const DEFAULT_COUNTRY = 'us' // Can be: us, gb, de, fr, ca, au, etc.

class AdzunaProvider implements JobSearchProvider {
  name = 'Adzuna'
  private appId: string
  private apiKey: string
  private country: string

  constructor() {
    this.appId = process.env.ADZUNA_APP_ID || ''
    this.apiKey = process.env.ADZUNA_API_KEY || ''
    this.country = process.env.ADZUNA_COUNTRY || DEFAULT_COUNTRY
  }

  isConfigured(): boolean {
    return !!(this.appId && this.apiKey)
  }

  async search(params: JobSearchParams): Promise<JobSearchResponse> {
    if (!this.isConfigured()) {
      throw new Error('Adzuna API credentials not configured. Set ADZUNA_APP_ID and ADZUNA_API_KEY in .env')
    }

    try {
      const url = this.buildSearchUrl(params)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Adzuna API error: ${response.status} ${response.statusText}`)
      }

      const data: AdzunaResponse = await response.json()
      
      return this.normalizeResponse(data, params)
    } catch (error) {
      console.error('Adzuna search error:', error)
      throw error
    }
  }

  private buildSearchUrl(params: JobSearchParams): string {
    const page = params.page || 1
    const resultsPerPage = Math.min(params.resultsPerPage || 20, 50) // Max 50 per page
    
    // Build query string
    const queryParts: string[] = []
    
    if (params.query) {
      queryParts.push(params.query)
    }
    
    if (params.keywords && params.keywords.length > 0) {
      queryParts.push(params.keywords.join(' '))
    }
    
    const what = queryParts.length > 0 ? queryParts.join(' ') : 'developer'
    const where = params.location || ''
    
    // Build URL
    const url = new URL(`${ADZUNA_BASE_URL}/${this.country}/search/${page}`)
    url.searchParams.append('app_id', this.appId)
    url.searchParams.append('app_key', this.apiKey)
    url.searchParams.append('results_per_page', resultsPerPage.toString())
    url.searchParams.append('what', what)
    
    if (where) {
      url.searchParams.append('where', where)
    }
    
    // Filters
    if (params.minSalary) {
      url.searchParams.append('salary_min', params.minSalary.toString())
    }
    
    if (params.maxSalary) {
      url.searchParams.append('salary_max', params.maxSalary.toString())
    }
    
    if (params.jobType) {
      url.searchParams.append('full_time', params.jobType === 'full-time' ? '1' : '0')
      url.searchParams.append('part_time', params.jobType === 'part-time' ? '1' : '0')
      url.searchParams.append('contract', params.jobType === 'contract' ? '1' : '0')
    }
    
    // Sort
    if (params.sortBy === 'date') {
      url.searchParams.append('sort_by', 'date')
    } else if (params.sortBy === 'salary') {
      url.searchParams.append('sort_by', 'salary')
    } else {
      url.searchParams.append('sort_by', 'relevance')
    }
    
    // Date posted filter
    if (params.datePosted) {
      const daysMap = {
        'today': 1,
        'week': 7,
        'month': 30,
        'any': 365
      }
      const maxDays = daysMap[params.datePosted] || 30
      url.searchParams.append('max_days_old', maxDays.toString())
    }
    
    return url.toString()
  }

  private normalizeResponse(data: AdzunaResponse, params: JobSearchParams): JobSearchResponse {
    const resultsPerPage = params.resultsPerPage || 20
    const currentPage = params.page || 1
    const totalResults = data.count || 0
    const totalPages = Math.ceil(totalResults / resultsPerPage)
    
    const jobs: NormalizedJob[] = data.results.map(job => this.normalizeJob(job))
    
    return {
      jobs,
      total: totalResults,
      page: currentPage,
      totalPages,
      hasMore: currentPage < totalPages,
    }
  }

  private normalizeJob(job: AdzunaJob): NormalizedJob {
    // Format salary
    let salary: string | undefined
    if (job.salary_min && job.salary_max) {
      salary = `$${this.formatNumber(job.salary_min)} - $${this.formatNumber(job.salary_max)}`
      if (job.salary_is_predicted === '1') {
        salary += ' (estimated)'
      }
    } else if (job.salary_min) {
      salary = `$${this.formatNumber(job.salary_min)}+`
    }
    
    // Format job type
    let jobType: string | undefined
    if (job.contract_time) {
      jobType = job.contract_time.charAt(0).toUpperCase() + job.contract_time.slice(1)
    }
    if (job.contract_type && job.contract_type !== job.contract_time) {
      jobType = jobType ? `${jobType}, ${job.contract_type}` : job.contract_type
    }
    
    // Format location
    const location = job.location.display_name || job.location.area.join(', ')
    
    // Parse posted date
    let postedDate: Date | undefined
    if (job.created) {
      postedDate = new Date(job.created)
    }
    
    return {
      id: job.id || job.adref || `adzuna-${Date.now()}`,
      title: job.title,
      company: job.company.display_name,
      location,
      description: this.cleanDescription(job.description),
      salary,
      jobType,
      postedDate,
      applyUrl: job.redirect_url,
      source: 'ADZUNA',
      tags: job.category ? [job.category.label] : undefined,
      rawData: job,
    }
  }

  private cleanDescription(html: string): string {
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, ' ')
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ')
    text = text.replace(/&amp;/g, '&')
    text = text.replace(/&lt;/g, '<')
    text = text.replace(/&gt;/g, '>')
    text = text.replace(/&quot;/g, '"')
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim()
    return text
  }

  private formatNumber(num: number): string {
    return num.toLocaleString('en-US')
  }
}

// Export singleton instance
export const adzunaProvider = new AdzunaProvider()

// Export search function for convenience
export async function searchAdzuna(params: JobSearchParams): Promise<JobSearchResponse> {
  return adzunaProvider.search(params)
}