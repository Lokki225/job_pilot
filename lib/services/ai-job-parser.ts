'use server'

import { aiService } from './ai'

export interface AIParsedjob {
  jobTitle: string
  company: string
  location: string | null
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Freelance' | 'Internship' | null
  workMode: 'Remote' | 'Hybrid' | 'On-site' | null
  salary: string | null
  salaryMin: number | null
  salaryMax: number | null
  currency: string | null
  description: string | null
  requirements: string[] | null
  responsibilities: string[] | null
  benefits: string[] | null
  skills: string[] | null
  experienceLevel: 'Entry' | 'Mid' | 'Senior' | 'Lead' | 'Executive' | null
  yearsExperience: string | null
  education: string | null
  industry: string | null
  applicationDeadline: string | null
  jobPostUrl: string | null
  source: string
  isPasted: boolean
  confidence: number
}

export async function parseJobWithAI(text: string): Promise<{ data: AIParsedjob | null; error: string | null }> {
  try {
    if (!aiService.isConfigured()) {
      return {
        data: null,
        error: 'No AI provider configured. Please add an API key for Groq, Together AI, Google AI, or OpenAI.'
      }
    }

    const parsed = await aiService.parseJobPosting(text)
    
    if (!parsed) {
      return { data: null, error: 'Failed to parse job posting' }
    }
    
    return {
      data: {
        ...parsed,
        source: 'PASTED',
        isPasted: true,
        confidence: parsed.confidence || 0.5
      },
      error: null
    }
  } catch (error: any) {
    console.error('AI parsing error:', error)
    return {
      data: null,
      error: error.message || 'Failed to parse job posting with AI'
    }
  }
}
