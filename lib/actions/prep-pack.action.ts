'use server'

import { adminSupabase } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { 
  createFullPrepPack, 
  extractJobPostData, 
  generatePrepPlan,
  type ExtractedJobData,
  type GeneratedPrepPlan 
} from '@/lib/services/training/prep-pack-ai.service'

// ===========================================================
// TYPES
// ===========================================================

export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface PrepPackSummary {
  id: string
  companyName: string
  jobTitle: string
  status: string
  progressPercent: number
  totalSteps: number
  createdAt: string
}

export interface PrepPackDetail {
  id: string
  companyName: string
  jobTitle: string
  jobPostText: string | null
  jobPostUrl: string | null
  companyWebsite: string | null
  extractedData: ExtractedJobData | null
  prepPlan: GeneratedPrepPlan | null
  status: string
  completedSteps: string[]
  totalSteps: number
  progressPercent: number
  createdAt: string
  updatedAt: string
}

interface CreatePrepPackInput {
  companyName: string
  jobTitle: string
  jobPostText?: string
  jobPostUrl?: string
  companyWebsite?: string
  jobApplicationId?: string
}

// ===========================================================
// GET ALL PREP PACKS
// ===========================================================

export async function getPrepPacks(): Promise<ActionResult<PrepPackSummary[]>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await adminSupabase
      .from('interview_prep_packs')
      .select('id, companyName, jobTitle, status, progressPercent, totalSteps, createdAt')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('Error fetching prep packs:', error)
      return { success: false, error: 'Failed to fetch prep packs' }
    }

    return { success: true, data: data as PrepPackSummary[] }
  } catch (err) {
    console.error('Error in getPrepPacks:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ===========================================================
// GET SINGLE PREP PACK
// ===========================================================

export async function getPrepPack(prepPackId: string): Promise<ActionResult<PrepPackDetail>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await adminSupabase
      .from('interview_prep_packs')
      .select('*')
      .eq('id', prepPackId)
      .eq('userId', user.id)
      .single()

    if (error || !data) {
      return { success: false, error: 'Prep pack not found' }
    }

    return { 
      success: true, 
      data: {
        ...data,
        completedSteps: data.completedSteps || [],
      } as PrepPackDetail 
    }
  } catch (err) {
    console.error('Error in getPrepPack:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ===========================================================
// CREATE PREP PACK (DRAFT)
// ===========================================================

export async function createPrepPack(
  input: CreatePrepPackInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await adminSupabase
      .from('interview_prep_packs')
      .insert({
        userId: user.id,
        companyName: input.companyName,
        jobTitle: input.jobTitle,
        jobPostText: input.jobPostText || null,
        jobPostUrl: input.jobPostUrl || null,
        companyWebsite: input.companyWebsite || null,
        jobApplicationId: input.jobApplicationId || null,
        status: 'DRAFT',
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error('Error creating prep pack:', error)
      return { success: false, error: 'Failed to create prep pack' }
    }

    return { success: true, data: { id: data.id } }
  } catch (err) {
    console.error('Error in createPrepPack:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ===========================================================
// GENERATE PREP PACK (AI EXTRACTION + PLAN)
// ===========================================================

export async function generatePrepPackPlan(
  prepPackId: string
): Promise<ActionResult<{ extractedData: ExtractedJobData; prepPlan: GeneratedPrepPlan }>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get the prep pack
    const { data: prepPack, error: fetchError } = await adminSupabase
      .from('interview_prep_packs')
      .select('*')
      .eq('id', prepPackId)
      .eq('userId', user.id)
      .single()

    if (fetchError || !prepPack) {
      return { success: false, error: 'Prep pack not found' }
    }

    // Update status to GENERATING
    await adminSupabase
      .from('interview_prep_packs')
      .update({ status: 'GENERATING' })
      .eq('id', prepPackId)

    try {
      // Run AI extraction and plan generation
      const { extractedData, prepPlan } = await createFullPrepPack({
        companyName: prepPack.companyName,
        jobTitle: prepPack.jobTitle,
        jobPostText: prepPack.jobPostText,
        jobPostUrl: prepPack.jobPostUrl,
        companyWebsite: prepPack.companyWebsite,
      })

      // Save results
      const { error: updateError } = await adminSupabase
        .from('interview_prep_packs')
        .update({
          extractedData,
          prepPlan,
          totalSteps: prepPlan.overview.totalSteps,
          status: 'READY',
        })
        .eq('id', prepPackId)

      if (updateError) {
        console.error('Error saving prep pack results:', updateError)
        return { success: false, error: 'Failed to save prep pack' }
      }

      return { success: true, data: { extractedData, prepPlan } }
    } catch (aiError) {
      // Reset status on AI error
      await adminSupabase
        .from('interview_prep_packs')
        .update({ status: 'DRAFT' })
        .eq('id', prepPackId)

      console.error('AI generation error:', aiError)
      return { success: false, error: 'Failed to generate prep plan. Please try again.' }
    }
  } catch (err) {
    console.error('Error in generatePrepPackPlan:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ===========================================================
// UPDATE PREP PACK
// ===========================================================

export async function updatePrepPack(
  prepPackId: string,
  updates: Partial<CreatePrepPackInput>
): Promise<ActionResult<void>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await adminSupabase
      .from('interview_prep_packs')
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', prepPackId)
      .eq('userId', user.id)

    if (error) {
      console.error('Error updating prep pack:', error)
      return { success: false, error: 'Failed to update prep pack' }
    }

    return { success: true }
  } catch (err) {
    console.error('Error in updatePrepPack:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ===========================================================
// MARK STEP COMPLETE
// ===========================================================

export async function markStepComplete(
  prepPackId: string,
  stepId: string
): Promise<ActionResult<{ progressPercent: number }>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get current prep pack
    const { data: prepPack, error: fetchError } = await adminSupabase
      .from('interview_prep_packs')
      .select('completedSteps, totalSteps')
      .eq('id', prepPackId)
      .eq('userId', user.id)
      .single()

    if (fetchError || !prepPack) {
      return { success: false, error: 'Prep pack not found' }
    }

    const completedSteps = prepPack.completedSteps || []
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId)
    }

    const progressPercent = Math.round((completedSteps.length / prepPack.totalSteps) * 100)

    const { error: updateError } = await adminSupabase
      .from('interview_prep_packs')
      .update({
        completedSteps,
        progressPercent,
      })
      .eq('id', prepPackId)

    if (updateError) {
      console.error('Error marking step complete:', updateError)
      return { success: false, error: 'Failed to update progress' }
    }

    return { success: true, data: { progressPercent } }
  } catch (err) {
    console.error('Error in markStepComplete:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ===========================================================
// DELETE PREP PACK
// ===========================================================

export async function deletePrepPack(prepPackId: string): Promise<ActionResult<void>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await adminSupabase
      .from('interview_prep_packs')
      .delete()
      .eq('id', prepPackId)
      .eq('userId', user.id)

    if (error) {
      console.error('Error deleting prep pack:', error)
      return { success: false, error: 'Failed to delete prep pack' }
    }

    return { success: true }
  } catch (err) {
    console.error('Error in deletePrepPack:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ===========================================================
// GET JOB APPLICATIONS (for selection)
// ===========================================================

export async function getJobApplicationsForPrepPack(): Promise<ActionResult<{
  id: string
  jobTitle: string
  company: string
  description: string | null
}[]>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await adminSupabase
      .from('job_applications')
      .select('id, jobTitle, company, description')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching job applications:', error)
      return { success: false, error: 'Failed to fetch job applications' }
    }

    return { success: true, data: data || [] }
  } catch (err) {
    console.error('Error in getJobApplicationsForPrepPack:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ===========================================================
// CREATE PREP PACK FROM JOB APPLICATION
// ===========================================================

export async function createPrepPackFromJobApplication(
  jobApplicationId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get the job application
    const { data: jobApp, error: fetchError } = await adminSupabase
      .from('job_applications')
      .select('id, jobTitle, company, description, requirements, jobPostUrl')
      .eq('id', jobApplicationId)
      .eq('userId', user.id)
      .single()

    if (fetchError || !jobApp) {
      return { success: false, error: 'Job application not found' }
    }

    // Combine description and requirements
    const jobPostText = [jobApp.description, jobApp.requirements]
      .filter(Boolean)
      .join('\n\n---\n\n')

    // Create prep pack
    return await createPrepPack({
      companyName: jobApp.company,
      jobTitle: jobApp.jobTitle,
      jobPostText: jobPostText || undefined,
      jobPostUrl: jobApp.jobPostUrl || undefined,
      jobApplicationId: jobApp.id,
    })
  } catch (err) {
    console.error('Error in createPrepPackFromJobApplication:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
