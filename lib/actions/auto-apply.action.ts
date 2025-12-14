'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/server'
import { emailService } from '@/lib/services/email'
import { emitEvent } from '@/lib/services/event-dispatcher'
import { AppEvent } from '@/lib/types/app-events'

// ===========================================================
// SCHEMAS
// ===========================================================

const SendApplicationSchema = z.object({
  jobApplicationId: z.string(),
  coverLetterId: z.string(),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  subject: z.string().min(1),
  customBody: z.string().optional(),
})

// ===========================================================
// SEND JOB APPLICATION EMAIL
// ===========================================================

export async function sendJobApplication(values: z.infer<typeof SendApplicationSchema>) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const parsed = SendApplicationSchema.safeParse(values)
    if (!parsed.success) {
      return { data: null, error: 'Invalid input: ' + parsed.error.issues.map(i => i.message).join(', ') }
    }

    // Check if email service is configured
    if (!emailService.isConfigured()) {
      return { data: null, error: 'Email service not configured. Please add RESEND_API_KEY to environment.' }
    }

    // Get job application
    const { data: jobApp, error: jobError } = await adminSupabase
      .from('job_applications')
      .select('*')
      .eq('id', parsed.data.jobApplicationId)
      .eq('userId', user.id)
      .single()

    if (jobError || !jobApp) {
      return { data: null, error: 'Job application not found' }
    }

    // Get cover letter
    const { data: coverLetter, error: clError } = await adminSupabase
      .from('cover_letters')
      .select('*')
      .eq('id', parsed.data.coverLetterId)
      .eq('userId', user.id)
      .single()

    if (clError || !coverLetter) {
      return { data: null, error: 'Cover letter not found' }
    }

    // Get user profile for applicant info
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('fullName, phone')
      .eq('userId', user.id)
      .single()

    const applicantName = profile?.fullName || user.email?.split('@')[0] || 'Applicant'
    const applicantEmail = user.email || ''

    // Send the email
    const emailResult = await emailService.sendJobApplication({
      recipientEmail: parsed.data.recipientEmail,
      recipientName: parsed.data.recipientName,
      applicantName,
      applicantEmail,
      jobTitle: jobApp.jobTitle,
      company: jobApp.company,
      subject: parsed.data.subject,
      coverLetter: parsed.data.customBody || coverLetter.content,
    })

    if (!emailResult.success) {
      // Save failed attempt
      await adminSupabase
        .from('email_applications')
        .insert({
          userId: user.id,
          jobApplicationId: parsed.data.jobApplicationId,
          coverLetterId: parsed.data.coverLetterId,
          recipientEmail: parsed.data.recipientEmail,
          recipientName: parsed.data.recipientName,
          companyName: jobApp.company,
          subject: parsed.data.subject,
          body: parsed.data.customBody || coverLetter.content,
          status: 'failed',
          failureReason: emailResult.error,
        })

      return { data: null, error: emailResult.error }
    }

    // Save successful email application
    const { data: emailApp, error: saveError } = await adminSupabase
      .from('email_applications')
      .insert({
        userId: user.id,
        jobApplicationId: parsed.data.jobApplicationId,
        coverLetterId: parsed.data.coverLetterId,
        recipientEmail: parsed.data.recipientEmail,
        recipientName: parsed.data.recipientName,
        companyName: jobApp.company,
        subject: parsed.data.subject,
        body: parsed.data.customBody || coverLetter.content,
        status: 'sent',
        sentAt: new Date().toISOString(),
        emailServiceId: emailResult.messageId,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save email application record:', saveError)
    }

    // Update cover letter as sent
    await adminSupabase
      .from('cover_letters')
      .update({ isSent: true })
      .eq('id', parsed.data.coverLetterId)

    await emitEvent({
      event: AppEvent.COVER_LETTER_SENT,
      userId: user.id,
      message: `Application sent to ${jobApp.company} for ${jobApp.jobTitle}.`,
      link: `/dashboard/jobs/${jobApp.id}`,
      metadata: {
        jobApplicationId: jobApp.id,
        coverLetterId: parsed.data.coverLetterId,
        emailApplicationId: emailApp?.id || null,
        recipientEmail: parsed.data.recipientEmail,
      },
    })

    // Update job application status to APPLIED if it was WISHLIST
    if (jobApp.status === 'WISHLIST') {
      await adminSupabase
        .from('job_applications')
        .update({ 
          status: 'APPLIED',
          appliedDate: new Date().toISOString(),
          contactEmail: parsed.data.recipientEmail,
          contactName: parsed.data.recipientName,
        })
        .eq('id', parsed.data.jobApplicationId)

      await emitEvent({
        event: AppEvent.APPLICATION_STATUS_CHANGED,
        userId: user.id,
        message: `Status changed from WISHLIST to APPLIED for ${jobApp.jobTitle} at ${jobApp.company}.`,
        link: `/dashboard/jobs/${jobApp.id}`,
        metadata: {
          jobApplicationId: jobApp.id,
          jobTitle: jobApp.jobTitle,
          company: jobApp.company,
          oldStatus: 'WISHLIST',
          newStatus: 'APPLIED',
        },
      })
    }

    return { 
      data: { 
        success: true, 
        messageId: emailResult.messageId,
        emailApplicationId: emailApp?.id 
      }, 
      error: null 
    }
  } catch (err) {
    console.error('Send application error:', err)
    return { 
      data: null, 
      error: err instanceof Error ? err.message : 'Failed to send application' 
    }
  }
}

// ===========================================================
// GET EMAIL APPLICATIONS FOR JOB
// ===========================================================

export async function getEmailApplicationsForJob(jobApplicationId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const { data, error } = await adminSupabase
      .from('email_applications')
      .select('*')
      .eq('userId', user.id)
      .eq('jobApplicationId', jobApplicationId)
      .order('createdAt', { ascending: false })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Get email applications error:', err)
    return { data: null, error: 'Failed to get email applications' }
  }
}

// ===========================================================
// GET ALL EMAIL APPLICATIONS
// ===========================================================

export async function getAllEmailApplications() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const { data, error } = await adminSupabase
      .from('email_applications')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Get all email applications error:', err)
    return { data: null, error: 'Failed to get email applications' }
  }
}

// ===========================================================
// CHECK SERVICE STATUS
// ===========================================================

export async function checkAutoApplyStatus() {
  return {
    emailConfigured: emailService.isConfigured(),
  }
}
