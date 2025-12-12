'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/server'
import { aiService } from '@/lib/services/ai'

// ===========================================================
// SCHEMAS
// ===========================================================

const GenerateCoverLetterSchema = z.object({
  jobApplicationId: z.string(),
  tone: z.enum(['professional', 'friendly', 'formal', 'enthusiastic']).optional(),
  customInstructions: z.string().optional(),
})

const UpdateCoverLetterSchema = z.object({
  content: z.string().min(1),
  subject: z.string().optional(),
})

const ImproveCoverLetterSchema = z.object({
  coverLetterId: z.string(),
  feedback: z.string().min(1),
})

// ===========================================================
// GENERATE COVER LETTER
// ===========================================================

export async function generateCoverLetter(values: z.infer<typeof GenerateCoverLetterSchema>) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const parsed = GenerateCoverLetterSchema.safeParse(values)
    if (!parsed.success) {
      return { data: null, error: 'Invalid input' }
    }

    // Check if AI service is configured
    if (!aiService.isConfigured()) {
      return { data: null, error: 'AI service not configured. Please add OPENAI_API_KEY to environment.' }
    }

    // Get job application details
    const { data: jobApp, error: jobError } = await adminSupabase
      .from('job_applications')
      .select('*')
      .eq('id', parsed.data.jobApplicationId)
      .eq('userId', user.id)
      .single()

    if (jobError || !jobApp) {
      return { data: null, error: 'Job application not found' }
    }

    // Get user profile
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select(`
        *,
        skills (name, level),
        experiences (title, company, description, startDate, endDate, isCurrent)
      `)
      .eq('userId', user.id)
      .single()

    // Build user profile for AI
    const userProfile = {
      fullName: profile?.fullName || user.email?.split('@')[0] || 'Applicant',
      email: user.email || '',
      phone: profile?.phone || undefined,
      headline: profile?.headline || undefined,
      summary: profile?.summary || undefined,
      skills: profile?.skills?.map((s: any) => s.name) || [],
      experiences: profile?.experiences?.map((e: any) => ({
        title: e.title,
        company: e.company,
        description: e.description,
        startDate: e.startDate,
        endDate: e.endDate,
      })) || [],
    }

    // Generate cover letter
    const result = await aiService.generateCoverLetter({
      jobTitle: jobApp.jobTitle,
      company: jobApp.company,
      jobDescription: jobApp.description || `${jobApp.jobTitle} position at ${jobApp.company}`,
      requirements: jobApp.requirements || undefined,
      userProfile,
      tone: parsed.data.tone,
      customInstructions: parsed.data.customInstructions,
    })

    // Save to database
    const { data: coverLetter, error: saveError } = await adminSupabase
      .from('cover_letters')
      .insert({
        userId: user.id,
        jobApplicationId: parsed.data.jobApplicationId,
        content: result.content,
        subject: result.subject,
        aiModel: result.model,
        promptUsed: result.promptUsed,
        tone: parsed.data.tone || 'professional',
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save cover letter:', saveError)
      // Still return the generated content even if save fails
      return { 
        data: { 
          id: null,
          content: result.content, 
          subject: result.subject,
          saved: false 
        }, 
        error: null 
      }
    }

    return { 
      data: { 
        ...coverLetter, 
        saved: true 
      }, 
      error: null 
    }
  } catch (err) {
    console.error('Generate cover letter error:', err)
    return { 
      data: null, 
      error: err instanceof Error ? err.message : 'Failed to generate cover letter' 
    }
  }
}

// ===========================================================
// GET COVER LETTERS FOR JOB APPLICATION
// ===========================================================

export async function getCoverLettersForJob(jobApplicationId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const { data, error } = await adminSupabase
      .from('cover_letters')
      .select('*')
      .eq('userId', user.id)
      .eq('jobApplicationId', jobApplicationId)
      .order('createdAt', { ascending: false })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Get cover letters error:', err)
    return { data: null, error: 'Failed to get cover letters' }
  }
}

// ===========================================================
// GET SINGLE COVER LETTER
// ===========================================================

export async function getCoverLetter(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const { data, error } = await adminSupabase
      .from('cover_letters')
      .select('*')
      .eq('id', id)
      .eq('userId', user.id)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Get cover letter error:', err)
    return { data: null, error: 'Failed to get cover letter' }
  }
}

// ===========================================================
// UPDATE COVER LETTER
// ===========================================================

export async function updateCoverLetter(id: string, values: z.infer<typeof UpdateCoverLetterSchema>) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const parsed = UpdateCoverLetterSchema.safeParse(values)
    if (!parsed.success) {
      return { data: null, error: 'Invalid input' }
    }

    const { data, error } = await adminSupabase
      .from('cover_letters')
      .update({
        content: parsed.data.content,
        subject: parsed.data.subject,
      })
      .eq('id', id)
      .eq('userId', user.id)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Update cover letter error:', err)
    return { data: null, error: 'Failed to update cover letter' }
  }
}

// ===========================================================
// IMPROVE COVER LETTER WITH AI
// ===========================================================

export async function improveCoverLetter(values: z.infer<typeof ImproveCoverLetterSchema>) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const parsed = ImproveCoverLetterSchema.safeParse(values)
    if (!parsed.success) {
      return { data: null, error: 'Invalid input' }
    }

    if (!aiService.isConfigured()) {
      return { data: null, error: 'AI service not configured' }
    }

    // Get existing cover letter
    const { data: coverLetter, error: getError } = await adminSupabase
      .from('cover_letters')
      .select('*')
      .eq('id', parsed.data.coverLetterId)
      .eq('userId', user.id)
      .single()

    if (getError || !coverLetter) {
      return { data: null, error: 'Cover letter not found' }
    }

    // Get job application details if linked
    let jobTitle = 'Position'
    let company = 'Company'
    
    if (coverLetter.jobApplicationId) {
      const { data: jobApp } = await adminSupabase
        .from('job_applications')
        .select('jobTitle, company')
        .eq('id', coverLetter.jobApplicationId)
        .single()
      
      if (jobApp) {
        jobTitle = jobApp.jobTitle || jobTitle
        company = jobApp.company || company
      }
    }

    // Improve with AI
    const result = await aiService.improveCoverLetter(
      coverLetter.content,
      parsed.data.feedback,
      jobTitle,
      company
    )

    // Update in database
    const { data: updated, error: updateError } = await adminSupabase
      .from('cover_letters')
      .update({
        content: result.content,
        aiModel: result.model,
      })
      .eq('id', parsed.data.coverLetterId)
      .eq('userId', user.id)
      .select()
      .single()

    if (updateError) {
      return { data: null, error: updateError.message }
    }

    return { data: updated, error: null }
  } catch (err) {
    console.error('Improve cover letter error:', err)
    return { data: null, error: 'Failed to improve cover letter' }
  }
}

// ===========================================================
// DELETE COVER LETTER
// ===========================================================

export async function deleteCoverLetter(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const { error } = await adminSupabase
      .from('cover_letters')
      .delete()
      .eq('id', id)
      .eq('userId', user.id)

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: { success: true }, error: null }
  } catch (err) {
    console.error('Delete cover letter error:', err)
    return { data: null, error: 'Failed to delete cover letter' }
  }
}
