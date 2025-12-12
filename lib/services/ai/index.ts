import {
  BaseAIProvider,
  AIProviderType,
  ChatMessage,
  ChatCompletionOptions,
} from './providers'
import { OpenAIProvider } from './providers/openai'
import { GroqProvider } from './providers/groq'
import { TogetherProvider } from './providers/together'
import { GoogleProvider } from './providers/google'
import { OpenRouterProvider } from './providers/openrouter'

// ===========================================================
// MULTI-PROVIDER AI SERVICE
// ===========================================================

export interface CoverLetterInput {
  jobTitle: string
  company: string
  jobDescription: string
  requirements?: string
  userProfile: {
    fullName: string
    email: string
    phone?: string
    headline?: string
    summary?: string
    skills: string[]
    experiences: {
      title: string
      company: string
      description?: string
      startDate: string
      endDate?: string
    }[]
  }
  tone?: 'professional' | 'friendly' | 'formal' | 'enthusiastic'
  customInstructions?: string
}

export interface CoverLetterOutput {
  content: string
  subject: string
  model: string
  provider: string
  promptUsed: string
}

export interface AIServiceConfig {
  provider?: AIProviderType
  model?: string
}

class AIService {
  private providers: Map<AIProviderType, BaseAIProvider> = new Map()
  private currentProvider: AIProviderType = 'groq'
  private currentModel?: string

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    // Initialize all available providers based on env vars
    const openaiKey = process.env.OPENAI_API_KEY
    const groqKey = process.env.GROQ_API_KEY
    const togetherKey = process.env.TOGETHER_API_KEY
    const googleKey = process.env.GOOGLE_AI_API_KEY
    const openrouterKey = process.env.OPENROUTER_API_KEY

    if (openaiKey && openaiKey !== 'your_openai_key') {
      this.providers.set('openai', new OpenAIProvider({ apiKey: openaiKey }))
    }

    if (groqKey) {
      this.providers.set('groq', new GroqProvider({ apiKey: groqKey }))
    }

    if (togetherKey) {
      this.providers.set('together', new TogetherProvider({ apiKey: togetherKey }))
    }

    if (googleKey) {
      this.providers.set('google', new GoogleProvider({ apiKey: googleKey }))
    }

    if (openrouterKey) {
      this.providers.set('openrouter', new OpenRouterProvider({ apiKey: openrouterKey }))
    }

    // Set default provider (prefer OpenRouter for best free tier)
    if (this.providers.has('openrouter')) {
      this.currentProvider = 'openrouter'
    } else if (this.providers.has('groq')) {
      this.currentProvider = 'groq'
    } else if (this.providers.has('together')) {
      this.currentProvider = 'together'
    } else if (this.providers.has('google')) {
      this.currentProvider = 'google'
    } else if (this.providers.has('openai')) {
      this.currentProvider = 'openai'
    }
  }

  /**
   * Get the current active provider
   */
  getProvider(): BaseAIProvider | null {
    return this.providers.get(this.currentProvider) || null
  }

  /**
   * Set the active provider
   */
  setProvider(provider: AIProviderType): boolean {
    if (this.providers.has(provider)) {
      this.currentProvider = provider
      return true
    }
    return false
  }

  /**
   * Set the model for the current provider
   */
  setModel(model: string): void {
    const provider = this.getProvider()
    if (provider) {
      provider.setModel(model)
      this.currentModel = model
    }
  }

  /**
   * Get list of configured providers
   */
  getConfiguredProviders(): { type: AIProviderType; name: string; models: string[] }[] {
    const result: { type: AIProviderType; name: string; models: string[] }[] = []
    this.providers.forEach((provider, type) => {
      result.push({
        type,
        name: provider.getName(),
        models: provider.getAvailableModels(),
      })
    })
    return result
  }

  /**
   * Check if any provider is configured
   */
  isConfigured(): boolean {
    return this.providers.size > 0
  }

  /**
   * Get current provider info
   */
  getCurrentProviderInfo(): { provider: string; model: string } | null {
    const provider = this.getProvider()
    if (!provider) return null
    return {
      provider: provider.getName(),
      model: provider.getCurrentModel(),
    }
  }

  /**
   * Core chat completion method
   */
  async chat(options: ChatCompletionOptions): Promise<{ content: string; model: string; provider: string }> {
    const provider = this.getProvider()
    if (!provider) {
      throw new Error('No AI provider configured. Please add an API key for Groq, Together AI, Google AI, or OpenAI.')
    }

    const response = await provider.chat(options)
    return {
      content: response.content,
      model: response.model,
      provider: provider.getName(),
    }
  }

  /**
   * Generate a personalized cover letter for a job application
   */
  async generateCoverLetter(input: CoverLetterInput): Promise<CoverLetterOutput> {
    const provider = this.getProvider()
    if (!provider) {
      throw new Error('No AI provider configured')
    }

    const tone = input.tone || 'professional'
    const toneInstructions = {
      professional: 'Use a professional and polished tone. Be confident but not arrogant.',
      friendly: 'Use a warm and approachable tone while maintaining professionalism.',
      formal: 'Use a formal and traditional business tone.',
      enthusiastic: 'Show genuine excitement and passion while remaining professional.',
    }

    const experienceText = input.userProfile.experiences
      .map(exp => `- ${exp.title} at ${exp.company}${exp.description ? `: ${exp.description}` : ''}`)
      .join('\n')

    const skillsText = input.userProfile.skills.join(', ')

    const prompt = `You are an expert career coach and professional writer. Generate a compelling cover letter for a job application.

JOB DETAILS:
- Position: ${input.jobTitle}
- Company: ${input.company}
- Job Description: ${input.jobDescription}
${input.requirements ? `- Requirements: ${input.requirements}` : ''}

APPLICANT PROFILE:
- Name: ${input.userProfile.fullName}
- Email: ${input.userProfile.email}
${input.userProfile.phone ? `- Phone: ${input.userProfile.phone}` : ''}
${input.userProfile.headline ? `- Professional Headline: ${input.userProfile.headline}` : ''}
${input.userProfile.summary ? `- Summary: ${input.userProfile.summary}` : ''}
- Skills: ${skillsText}
- Experience:
${experienceText}

TONE: ${toneInstructions[tone]}

${input.customInstructions ? `ADDITIONAL INSTRUCTIONS: ${input.customInstructions}` : ''}

REQUIREMENTS:
1. Write a compelling cover letter (300-400 words)
2. Highlight relevant skills and experiences that match the job requirements
3. Show genuine interest in the company and role
4. Include a strong opening that grabs attention
5. End with a clear call to action
6. Do NOT include placeholder text like [Your Name] - use the actual applicant details
7. Format properly with paragraphs

OUTPUT FORMAT:
Return ONLY the cover letter content, starting with "Dear Hiring Manager," or similar greeting.
Do not include any meta-commentary or explanations.`

    const response = await provider.chat({
      messages: [
        {
          role: 'system',
          content: 'You are an expert career coach who writes compelling, personalized cover letters that help candidates stand out.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      maxTokens: 1000,
    })

    const subject = `Application for ${input.jobTitle} Position - ${input.userProfile.fullName}`

    return {
      content: response.content.trim(),
      subject,
      model: response.model,
      provider: provider.getName(),
      promptUsed: prompt,
    }
  }

  /**
   * Improve/rewrite an existing cover letter
   */
  async improveCoverLetter(
    currentContent: string,
    feedback: string,
    jobTitle: string,
    company: string
  ): Promise<{ content: string; model: string; provider: string }> {
    const provider = this.getProvider()
    if (!provider) {
      throw new Error('No AI provider configured')
    }

    const prompt = `You are an expert career coach. Improve the following cover letter based on the feedback provided.

CURRENT COVER LETTER:
${currentContent}

FEEDBACK/INSTRUCTIONS:
${feedback}

JOB: ${jobTitle} at ${company}

Rewrite the cover letter incorporating the feedback. Return ONLY the improved cover letter content.`

    const response = await provider.chat({
      messages: [
        {
          role: 'system',
          content: 'You are an expert career coach who improves cover letters based on feedback.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      maxTokens: 1000,
    })

    return {
      content: response.content.trim() || currentContent,
      model: response.model,
      provider: provider.getName(),
    }
  }

  /**
   * Generate email body for job application
   */
  async generateApplicationEmail(
    coverLetter: string,
    jobTitle: string,
    company: string,
    applicantName: string,
    hasResume: boolean
  ): Promise<{ subject: string; body: string }> {
    const provider = this.getProvider()
    if (!provider) {
      throw new Error('No AI provider configured')
    }

    const prompt = `Generate a brief, professional email to accompany a job application.

JOB: ${jobTitle} at ${company}
APPLICANT: ${applicantName}
HAS RESUME ATTACHED: ${hasResume ? 'Yes' : 'No'}

The cover letter is already written and will be included in the email body or as an attachment.

Generate:
1. A professional email subject line
2. A brief email body (2-3 sentences) that introduces the application

Format your response as JSON:
{
  "subject": "...",
  "body": "..."
}`

    try {
      const response = await provider.chat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        maxTokens: 300,
        responseFormat: 'json',
      })

      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch {
      // Fallback
    }

    return {
      subject: `Application for ${jobTitle} Position - ${applicantName}`,
      body: `Dear Hiring Team,\n\nPlease find attached my application for the ${jobTitle} position at ${company}. I am excited about this opportunity and believe my skills and experience make me a strong candidate.\n\nThank you for your consideration.\n\nBest regards,\n${applicantName}`,
    }
  }

  /**
   * Parse job posting text using AI
   */
  async parseJobPosting(text: string): Promise<any> {
    const provider = this.getProvider()
    if (!provider) {
      throw new Error('No AI provider configured')
    }

    const prompt = `Parse this job posting and extract structured information. Return valid JSON with these fields:
{
  "jobTitle": "The exact job title",
  "company": "Company name",
  "location": "Location or null",
  "jobType": "Full-time" | "Part-time" | "Contract" | "Freelance" | "Internship" | null,
  "workMode": "Remote" | "Hybrid" | "On-site" | null,
  "salary": "Salary range as displayed" or null,
  "salaryMin": number or null,
  "salaryMax": number or null,
  "currency": "USD" | "EUR" | "XOF" | etc. or null,
  "description": "Job description summary (max 500 chars)",
  "requirements": ["requirement 1", ...] or null,
  "responsibilities": ["responsibility 1", ...] or null,
  "benefits": ["benefit 1", ...] or null,
  "skills": ["skill 1", ...],
  "experienceLevel": "Entry" | "Mid" | "Senior" | "Lead" | "Executive" | null,
  "yearsExperience": "e.g., 3-5 years" or null,
  "education": "Required education" or null,
  "industry": "Industry/sector" or null,
  "confidence": 0.0-1.0
}

Job posting:
${text}`

    const response = await provider.chat({
      messages: [
        {
          role: 'system',
          content: 'You are an expert job posting parser. Extract structured data from job postings. Always return valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      maxTokens: 2000,
      responseFormat: 'json',
    })

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.error('Failed to parse job posting response:', e)
    }

    return null
  }

  /**
   * Parse resume data from Affinda or similar services into structured profile data
   * This function takes raw parsed resume data and transforms it into our expected schema
   */
  async parseResumeData(rawData: any): Promise<ParsedResumeData> {
    const provider = this.getProvider()
    
    // If no AI provider, use fallback parsing
    if (!provider) {
      return this.fallbackResumeParser(rawData)
    }

    const prompt = `You are an expert resume data parser. Parse the following raw resume data and extract structured information that matches our database schema.

      RAW RESUME DATA:
      ${JSON.stringify(rawData, null, 2)}

      Extract and return a JSON object with the following structure. Be thorough and extract ALL available information. Use null for missing fields, not empty strings.

      {
        "profile": {
          "firstName": "First name",
          "lastName": "Last name", 
          "phone": "Phone number with country code if available",
          "location": "City, Country or full address",
          "bio": "Professional summary/objective (max 500 chars)",
          "headline": "Professional headline/title (e.g., 'Senior Software Engineer')",
          "website": "Personal website URL",
          "linkedinUrl": "LinkedIn profile URL",
          "githubUrl": "GitHub profile URL",
          "twitterUrl": "Twitter/X profile URL",
          "languages": ["Language 1", "Language 2"]
        },
        "skills": [
          {
            "name": "Skill name",
            "level": 1-5 (estimate based on context, 3 if unknown),
            "category": "Category like 'Programming', 'Framework', 'Database', 'Cloud', 'Soft Skills', 'Tools', 'Languages'"
          }
        ],
        "experiences": [
          {
            "title": "Job title",
            "company": "Company name",
            "location": "City, Country",
            "startDate": "YYYY-MM-DD",
            "endDate": "YYYY-MM-DD or null if current",
            "isCurrent": true/false,
            "description": "Job description/responsibilities (bullet points as text)"
          }
        ],
        "educations": [
          {
            "institution": "School/University name",
            "degree": "Degree type (e.g., Bachelor's, Master's, PhD)",
            "field": "Field of study",
            "startDate": "YYYY-MM-DD",
            "endDate": "YYYY-MM-DD or null if current",
            "isCurrent": true/false,
            "description": "Additional details, GPA, honors, etc."
          }
        ],
        "certifications": [
          {
            "name": "Certification name",
            "issuer": "Issuing organization",
            "issueDate": "YYYY-MM-DD",
            "expiryDate": "YYYY-MM-DD or null",
            "credentialUrl": "URL to verify credential"
          }
        ],
        "projects": [
          {
            "name": "Project name",
            "description": "Project description",
            "url": "Project URL if available",
            "startDate": "YYYY-MM-DD",
            "endDate": "YYYY-MM-DD or null",
            "isCurrent": true/false
          }
        ]
      }

      IMPORTANT RULES:
      1. For dates, use YYYY-MM-DD format. If only year is available, use YYYY-01-01. If only month/year, use YYYY-MM-01.
      2. For skill levels: 1=Beginner, 2=Elementary, 3=Intermediate, 4=Advanced, 5=Expert
      3. Categorize skills appropriately (Programming, Framework, Database, Cloud, DevOps, Design, Soft Skills, etc.)
      4. Extract ALL skills mentioned anywhere in the resume
      5. If a job is marked as "Present" or "Current", set isCurrent to true and endDate to null
      6. Clean and normalize data (remove extra whitespace, fix capitalization)
      7. For the headline, create a professional title if not explicitly stated
      8. Return ONLY valid JSON, no explanations`

    try {
      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume parser. Extract structured data from resume information. Always return valid JSON matching the exact schema requested.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        maxTokens: 4000,
        responseFormat: 'json',
      })

      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return this.validateAndCleanResumeData(parsed)
      }
    } catch (e) {
      console.error('AI resume parsing failed, using fallback:', e)
    }

    return this.fallbackResumeParser(rawData)
  }

  /**
   * Fallback parser when AI is not available
   */
  private fallbackResumeParser(rawData: any): ParsedResumeData {
    const result: ParsedResumeData = {
      profile: {
        firstName: null,
        lastName: null,
        phone: null,
        location: null,
        bio: null,
        headline: null,
        website: null,
        linkedinUrl: null,
        githubUrl: null,
        twitterUrl: null,
        languages: [],
      },
      skills: [],
      experiences: [],
      educations: [],
      certifications: [],
      projects: [],
    }

    if (!rawData) return result

    // Try to extract from common Affinda fields
    try {
      // Personal info
      if (rawData.name) {
        const nameParts = (rawData.name.raw || rawData.name || '').split(' ')
        result.profile.firstName = nameParts[0] || null
        result.profile.lastName = nameParts.slice(1).join(' ') || null
      }
      
      if (rawData.phoneNumbers?.[0]) {
        result.profile.phone = rawData.phoneNumbers[0].raw || rawData.phoneNumbers[0] || null
      }
      
      if (rawData.location) {
        result.profile.location = rawData.location.raw || rawData.location.formatted || rawData.location || null
      }
      
      if (rawData.summary || rawData.objective) {
        result.profile.bio = rawData.summary || rawData.objective || null
      }
      
      if (rawData.profession || rawData.jobTitle) {
        result.profile.headline = rawData.profession || rawData.jobTitle || null
      }

      // LinkedIn
      if (rawData.linkedin || rawData.websites?.find((w: any) => w.url?.includes('linkedin'))) {
        result.profile.linkedinUrl = rawData.linkedin || rawData.websites?.find((w: any) => w.url?.includes('linkedin'))?.url || null
      }

      // GitHub
      if (rawData.github || rawData.websites?.find((w: any) => w.url?.includes('github'))) {
        result.profile.githubUrl = rawData.github || rawData.websites?.find((w: any) => w.url?.includes('github'))?.url || null
      }

      // Website
      if (rawData.websites?.[0]) {
        const nonSocialSite = rawData.websites.find((w: any) => 
          !w.url?.includes('linkedin') && !w.url?.includes('github') && !w.url?.includes('twitter')
        )
        result.profile.website = nonSocialSite?.url || null
      }

      // Languages
      if (rawData.languages) {
        result.profile.languages = rawData.languages.map((l: any) => l.name || l.raw || l).filter(Boolean)
      }

      // Skills
      if (rawData.skills) {
        result.skills = rawData.skills.map((skill: any) => ({
          name: skill.name || skill.raw || skill,
          level: skill.level || 3,
          category: skill.type || skill.category || 'General',
        })).filter((s: any) => s.name)
      }

      // Work Experience
      if (rawData.workExperience || rawData.experience) {
        const experiences = rawData.workExperience || rawData.experience || []
        result.experiences = experiences.map((exp: any) => ({
          title: exp.jobTitle || exp.title || exp.role || 'Unknown Position',
          company: exp.organization || exp.company || exp.employer || 'Unknown Company',
          location: exp.location?.raw || exp.location || null,
          startDate: this.parseDate(exp.dates?.startDate || exp.startDate),
          endDate: exp.dates?.isCurrent ? null : this.parseDate(exp.dates?.endDate || exp.endDate),
          isCurrent: exp.dates?.isCurrent || exp.isCurrent || false,
          description: exp.jobDescription || exp.description || null,
        }))
      }

      // Education
      if (rawData.education) {
        result.educations = rawData.education.map((edu: any) => ({
          institution: edu.organization || edu.institution || edu.school || 'Unknown Institution',
          degree: edu.accreditation?.education || edu.degree || 'Degree',
          field: edu.accreditation?.inputStr || edu.field || edu.major || 'Field of Study',
          startDate: this.parseDate(edu.dates?.startDate || edu.startDate),
          endDate: edu.dates?.isCurrent ? null : this.parseDate(edu.dates?.endDate || edu.endDate),
          isCurrent: edu.dates?.isCurrent || edu.isCurrent || false,
          description: edu.grade || edu.description || null,
        }))
      }

      // Certifications
      if (rawData.certifications) {
        result.certifications = rawData.certifications.map((cert: any) => ({
          name: cert.name || cert.title || 'Certification',
          issuer: cert.issuer || cert.organization || 'Unknown Issuer',
          issueDate: this.parseDate(cert.dateObtained || cert.issueDate),
          expiryDate: this.parseDate(cert.expiryDate),
          credentialUrl: cert.url || cert.credentialUrl || null,
        }))
      }

    } catch (e) {
      console.error('Fallback resume parsing error:', e)
    }

    return result
  }

  /**
   * Parse date string to ISO format
   */
  private parseDate(dateStr: any): string | null {
    if (!dateStr) return null
    
    try {
      // If already a date object or ISO string
      if (dateStr instanceof Date) {
        return dateStr.toISOString().split('T')[0]
      }
      
      // If it's an object with year/month/day
      if (typeof dateStr === 'object') {
        const year = dateStr.year || new Date().getFullYear()
        const month = dateStr.month || 1
        const day = dateStr.day || 1
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
      
      // Try parsing string
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
      
      // Handle "YYYY" format
      if (/^\d{4}$/.test(dateStr)) {
        return `${dateStr}-01-01`
      }
      
      // Handle "MM/YYYY" or "YYYY/MM" formats
      const monthYearMatch = dateStr.match(/(\d{1,2})[\/\-](\d{4})/)
      if (monthYearMatch) {
        return `${monthYearMatch[2]}-${String(monthYearMatch[1]).padStart(2, '0')}-01`
      }
      
    } catch (e) {
      console.error('Date parsing error:', e)
    }
    
    return null
  }

  /**
   * Validate and clean parsed resume data
   */
  private validateAndCleanResumeData(data: any): ParsedResumeData {
    const result: ParsedResumeData = {
      profile: {
        firstName: data.profile?.firstName || null,
        lastName: data.profile?.lastName || null,
        phone: data.profile?.phone || null,
        location: data.profile?.location || null,
        bio: data.profile?.bio?.substring(0, 500) || null,
        headline: data.profile?.headline || null,
        website: data.profile?.website || null,
        linkedinUrl: data.profile?.linkedinUrl || null,
        githubUrl: data.profile?.githubUrl || null,
        twitterUrl: data.profile?.twitterUrl || null,
        languages: Array.isArray(data.profile?.languages) ? data.profile.languages : [],
      },
      skills: [],
      experiences: [],
      educations: [],
      certifications: [],
      projects: [],
    }

    // Validate skills
    if (Array.isArray(data.skills)) {
      result.skills = data.skills
        .filter((s: any) => s && s.name)
        .map((s: any) => ({
          name: String(s.name).trim(),
          level: Math.min(5, Math.max(1, parseInt(s.level) || 3)),
          category: s.category || 'General',
        }))
    }

    // Validate experiences
    if (Array.isArray(data.experiences)) {
      result.experiences = data.experiences
        .filter((e: any) => e && (e.title || e.company))
        .map((e: any) => ({
          title: e.title || 'Unknown Position',
          company: e.company || 'Unknown Company',
          location: e.location || null,
          startDate: this.parseDate(e.startDate) || new Date().toISOString().split('T')[0],
          endDate: e.isCurrent ? null : this.parseDate(e.endDate),
          isCurrent: Boolean(e.isCurrent),
          description: e.description || null,
        }))
    }

    // Validate educations
    if (Array.isArray(data.educations)) {
      result.educations = data.educations
        .filter((e: any) => e && (e.institution || e.degree))
        .map((e: any) => ({
          institution: e.institution || 'Unknown Institution',
          degree: e.degree || 'Degree',
          field: e.field || 'Field of Study',
          startDate: this.parseDate(e.startDate) || new Date().toISOString().split('T')[0],
          endDate: e.isCurrent ? null : this.parseDate(e.endDate),
          isCurrent: Boolean(e.isCurrent),
          description: e.description || null,
        }))
    }

    // Validate certifications
    if (Array.isArray(data.certifications)) {
      result.certifications = data.certifications
        .filter((c: any) => c && c.name)
        .map((c: any) => ({
          name: c.name,
          issuer: c.issuer || 'Unknown Issuer',
          issueDate: this.parseDate(c.issueDate) || new Date().toISOString().split('T')[0],
          expiryDate: this.parseDate(c.expiryDate),
          credentialUrl: c.credentialUrl || null,
        }))
    }

    // Validate projects
    if (Array.isArray(data.projects)) {
      result.projects = data.projects
        .filter((p: any) => p && p.name)
        .map((p: any) => ({
          name: p.name,
          description: p.description || '',
          url: p.url || null,
          startDate: this.parseDate(p.startDate) || new Date().toISOString().split('T')[0],
          endDate: p.isCurrent ? null : this.parseDate(p.endDate),
          isCurrent: Boolean(p.isCurrent),
        }))
    }

    return result
  }
}

// ===========================================================
// TYPES
// ===========================================================

export interface ParsedResumeData {
  profile: {
    firstName: string | null
    lastName: string | null
    phone: string | null
    location: string | null
    bio: string | null
    headline: string | null
    website: string | null
    linkedinUrl: string | null
    githubUrl: string | null
    twitterUrl: string | null
    languages: string[]
  }
  skills: {
    name: string
    level: number
    category: string
  }[]
  experiences: {
    title: string
    company: string
    location: string | null
    startDate: string
    endDate: string | null
    isCurrent: boolean
    description: string | null
  }[]
  educations: {
    institution: string
    degree: string
    field: string
    startDate: string
    endDate: string | null
    isCurrent: boolean
    description: string | null
  }[]
  certifications: {
    name: string
    issuer: string
    issueDate: string
    expiryDate: string | null
    credentialUrl: string | null
  }[]
  projects: {
    name: string
    description: string
    url: string | null
    startDate: string
    endDate: string | null
    isCurrent: boolean
  }[]
}

// Export singleton instance
export const aiService = new AIService()

// Export types
export type { AIProviderType, ChatMessage, ChatCompletionOptions }
