// ===========================================================
// SHARED TYPES FOR JOB SEARCH PROVIDERS
// ===========================================================

export interface JobSearchParams {
  query?: string
  keywords?: string[]
  location?: string
  radius?: number
  jobType?: string
  experienceLevel?: string
  minSalary?: number
  maxSalary?: number
  remote?: boolean
  page?: number
  resultsPerPage?: number
  sortBy?: 'relevance' | 'date' | 'salary'
  datePosted?: 'today' | 'week' | 'month' | 'any'
}

export interface NormalizedJob {
  // Core fields
  id: string
  title: string
  company: string
  location: string
  
  // Details
  description: string
  requirements?: string
  salary?: string
  jobType?: string
  
  // Metadata
  postedDate?: Date
  applyUrl: string
  source: 'ADZUNA' | 'JSEARCH' | 'OTHER'
  
  // Additional data
  logoUrl?: string
  companyUrl?: string
  tags?: string[]
  remote?: boolean
  
  // Raw data for reference
  rawData?: any
}

export interface JobSearchResponse {
  jobs: NormalizedJob[]
  total: number
  page: number
  totalPages: number
  hasMore: boolean
}

export interface JobSearchProvider {
  name: string
  search(params: JobSearchParams): Promise<JobSearchResponse>
  isConfigured(): boolean
}

// ===========================================================
// ADZUNA SPECIFIC TYPES
// ===========================================================

export interface AdzunaJob {
  id: string
  title: string
  location: {
    display_name: string
    area: string[]
  }
  company: {
    display_name: string
  }
  description: string
  created: string
  redirect_url: string
  salary_min?: number
  salary_max?: number
  salary_is_predicted?: string
  contract_time?: string
  contract_type?: string
  category: {
    label: string
    tag: string
  }
  adref?: string
}

export interface AdzunaResponse {
  results: AdzunaJob[]
  count: number
  mean?: number
  __CLASS__?: string
}

// ===========================================================
// JSEARCH SPECIFIC TYPES
// ===========================================================

export interface JSearchJob {
  job_id: string
  employer_name: string
  employer_logo?: string
  employer_website?: string
  job_title: string
  job_description: string
  job_apply_link: string
  job_city?: string
  job_state?: string
  job_country?: string
  job_posted_at_timestamp?: number
  job_posted_at_datetime_utc?: string
  job_employment_type?: string
  job_is_remote?: boolean
  job_min_salary?: number
  job_max_salary?: number
  job_salary_currency?: string
  job_required_skills?: string[]
  job_required_experience?: {
    no_experience_required?: boolean
    required_experience_in_months?: number
  }
}

export interface JSearchResponse {
  status: string
  request_id: string
  parameters: {
    query: string
    page: number
    num_pages: number
  }
  data: JSearchJob[]
  num_pages?: number
}
