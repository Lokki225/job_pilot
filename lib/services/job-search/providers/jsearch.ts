import { SearchParams } from "next/dist/server/request/search-params";
import type { 
  JobSearchParams, 
  JobSearchResponse, 
  NormalizedJob, 
  JSearchResponse,
  JSearchJob,
  JobSearchProvider 
} from '../types'

// ===========================================================
// JSEARCH API PROVIDER (RapidAPI)
// ===========================================================
// Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
// Free tier: 100 requests/month
// Requires: RAPIDAPI_KEY

const JSEARCH_BASE_URL = 'https://jsearch.p.rapidapi.com'

class JSearchProvider implements JobSearchProvider {
  name = 'JSearch'
  private apiKey: string

  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY || ''
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  async search(params: JobSearchParams): Promise<JobSearchResponse> {
    if (!this.isConfigured()) {
      throw new Error('RapidAPI key not configured. Set RAPIDAPI_KEY in .env')
    }

    try {
      const url = this.buildSearchUrl(params)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
      })

      if (!response.ok) {
        throw new Error(`JSearch API error: ${response.status} ${response.statusText}`)
      }

      const data: JSearchResponse = await response.json()
      
      if (data.status !== 'OK') {
        throw new Error(`JSearch API returned status: ${data.status}`)
      }
      
      return this.normalizeResponse(data, params)
    } catch (error) {
      console.error('JSearch search error:', error)
      throw error
    }
  }

  private buildSearchUrl(params: JobSearchParams): string {
    const page = params.page || 1
    const numPages = 1 // JSearch uses num_pages differently
    
    // Build query string
    const queryParts: string[] = []
    
    if (params.query) {
      queryParts.push(params.query)
    }
    
    if (params.keywords && params.keywords.length > 0) {
      queryParts.push(params.keywords.join(' '))
    }
    
    const query = queryParts.length > 0 ? queryParts.join(' ') : 'developer'
    
    // Build URL
    const url = new URL(`${JSEARCH_BASE_URL}/search`)
    url.searchParams.append('query', query)
    url.searchParams.append('page', page.toString())
    url.searchParams.append('num_pages', numPages.toString())
    
    // Location
    if (params.location) {
      url.searchParams.append('location', params.location)
    }
    
    // Remote filter
    if (params.remote) {
      url.searchParams.append('remote_jobs_only', 'true')
    }
    
    // Employment type
    if (params.jobType) {
      const typeMap: Record<string, string> = {
        'full-time': 'FULLTIME',
        'part-time': 'PARTTIME',
        'contract': 'CONTRACTOR',
        'internship': 'INTERN',
      }
      const employmentType = typeMap[params.jobType.toLowerCase()]
      if (employmentType) {
        url.searchParams.append('employment_types', employmentType)
      }
    }
    
    // Date posted
    if (params.datePosted) {
      const dateMap: Record<string, string> = {
        'today': 'today',
        'week': 'week',
        'month': 'month',
        'any': 'all',
      }
      const datePosted = dateMap[params.datePosted] || 'all'
      url.searchParams.append('date_posted', datePosted)
    }
    
    return url.toString()
  }

  private normalizeResponse(data: JSearchResponse, params: JobSearchParams): JobSearchResponse {
    const resultsPerPage = params.resultsPerPage || 10
    const currentPage = params.page || 1
    const totalResults = data.data?.length || 0
    const totalPages = data.num_pages || 1
    
    const jobs: NormalizedJob[] = (data.data || []).map(job => this.normalizeJob(job))
    
    return {
      jobs,
      total: totalResults,
      page: currentPage,
      totalPages,
      hasMore: currentPage < totalPages,
    }
  }

  private normalizeJob(job: JSearchJob): NormalizedJob {
    // Format salary
    let salary: string | undefined
    if (job.job_min_salary && job.job_max_salary) {
      const currency = job.job_salary_currency || 'USD'
      const symbol = currency === 'USD' ? '$' : currency
      salary = `${symbol}${this.formatNumber(job.job_min_salary)} - ${symbol}${this.formatNumber(job.job_max_salary)}`
    } else if (job.job_min_salary) {
      const currency = job.job_salary_currency || 'USD'
      const symbol = currency === 'USD' ? '$' : currency
      salary = `${symbol}${this.formatNumber(job.job_min_salary)}+`
    }
    
    // Format job type
    let jobType: string | undefined
    if (job.job_employment_type) {
      const typeMap: Record<string, string> = {
        'FULLTIME': 'Full-time',
        'PARTTIME': 'Part-time',
        'CONTRACTOR': 'Contract',
        'INTERN': 'Internship',
      }
      jobType = typeMap[job.job_employment_type] || job.job_employment_type
    }
    
    // Format location
    let location = 'Remote'
    if (job.job_city && job.job_state) {
      location = `${job.job_city}, ${job.job_state}`
      if (job.job_country && job.job_country !== 'US') {
        location += `, ${job.job_country}`
      }
    } else if (job.job_country) {
      location = job.job_country
    }
    
    if (job.job_is_remote) {
      location = `${location} (Remote)`
    }
    
    // Parse posted date
    let postedDate: Date | undefined
    if (job.job_posted_at_timestamp) {
      postedDate = new Date(job.job_posted_at_timestamp * 1000)
    } else if (job.job_posted_at_datetime_utc) {
      postedDate = new Date(job.job_posted_at_datetime_utc)
    }
    
    // Extract requirements from description or skills
    let requirements: string | undefined
    if (job.job_required_skills && job.job_required_skills.length > 0) {
      requirements = `Required skills: ${job.job_required_skills.join(', ')}`
    }
    
    return {
      id: job.job_id,
      title: job.job_title,
      company: job.employer_name,
      location,
      description: job.job_description,
      requirements,
      salary,
      jobType,
      postedDate,
      applyUrl: job.job_apply_link,
      source: 'JSEARCH',
      logoUrl: job.employer_logo,
      companyUrl: job.employer_website,
      remote: job.job_is_remote,
      tags: job.job_required_skills,
      rawData: job,
    }
  }

  private formatNumber(num: number): string {
    return num.toLocaleString('en-US')
  }
}

// Export singleton instance
export const jsearchProvider = new JSearchProvider()

// Export search function for convenience
export async function searchJSearch(params: JobSearchParams): Promise<JobSearchResponse> {
  return jsearchProvider.search(params)
}