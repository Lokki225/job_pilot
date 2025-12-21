'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/server'
import { aiService } from '@/lib/services/ai'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { emitEvent } from '@/lib/services/event-dispatcher'
import { AppEvent } from '@/lib/types/app-events'
import { getCurrentUserRole, hasAtLeastRole, requireUserAtLeastRole } from '@/lib/auth/rbac'

// ===========================================================
// SCHEMAS
// ===========================================================

const GenerateCoverLetterSchema = z.object({
  jobApplicationId: z.string().trim().min(1).max(128),
  tone: z.enum(['professional', 'friendly', 'formal', 'enthusiastic']).optional(),
  customInstructions: z.string().trim().max(2000).optional(),
  templateId: z.string().trim().min(1).max(128).optional(),
})

const UpdateCoverLetterSchema = z.object({
  content: z.string().min(1).max(25000),
  subject: z.string().trim().max(200).optional(),
})

const ImproveCoverLetterSchema = z.object({
  coverLetterId: z.string().trim().min(1).max(128),
  feedback: z.string().trim().min(1).max(2000),
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

    const rate = checkRateLimit(`cover-letter:generate:${user.id}`, 10, 60_000)
    if (!rate.allowed) {
      return { data: null, error: 'Too many requests' }
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

    let templateToUse: { name: string; content: string } | undefined
    if (parsed.data.templateId) {
      const { data: templates, error: tplError } = await adminSupabase
        .from('cover_letter_templates')
        .select('id,name,content,isSystem,userId,isActive')
        .eq('id', parsed.data.templateId)
        .limit(1)

      const template = templates?.[0]

      if (tplError) {
        return { data: null, error: tplError.message }
      }

      if (!template || !template.isActive) {
        return { data: null, error: 'Template not found' }
      }

      if (!template.isSystem && template.userId !== user.id) {
        return { data: null, error: 'Not authorized to use this template' }
      }

      templateToUse = { name: template.name, content: template.content }
      await incrementTemplateUsage(template.id)
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
      template: templateToUse,
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

    await emitEvent({
      event: AppEvent.COVER_LETTER_GENERATED,
      userId: user.id,
      message: `Cover letter generated for ${jobApp.jobTitle} at ${jobApp.company}.`,
      link: `/dashboard/jobs/${parsed.data.jobApplicationId}`,
      metadata: {
        jobApplicationId: parsed.data.jobApplicationId,
        coverLetterId: coverLetter.id,
        jobTitle: jobApp.jobTitle,
        company: jobApp.company,
        templateId: parsed.data.templateId || null,
      },
    })

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
// GET ALL COVER LETTERS
// ===========================================================

export async function getAllCoverLetters() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    // Get cover letters
    const { data: coverLetters, error } = await adminSupabase
      .from('cover_letters')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })

    if (error) {
      return { data: null, error: error.message }
    }

    // Get job applications for the cover letters that have jobApplicationId
    const jobAppIds = coverLetters
      ?.filter(cl => cl.jobApplicationId)
      .map(cl => cl.jobApplicationId) || []

    let jobAppsMap: Record<string, any> = {}
    
    if (jobAppIds.length > 0) {
      const { data: jobApps } = await adminSupabase
        .from('job_applications')
        .select('id, jobTitle, company, status')
        .in('id', jobAppIds)

      if (jobApps) {
        jobAppsMap = jobApps.reduce((acc, app) => {
          acc[app.id] = app
          return acc
        }, {} as Record<string, any>)
      }
    }

    // Combine the data
    const enrichedLetters = coverLetters?.map(letter => ({
      ...letter,
      job_applications: letter.jobApplicationId ? jobAppsMap[letter.jobApplicationId] || null : null
    })) || []

    return { data: enrichedLetters, error: null }
  } catch (err) {
    console.error('Get all cover letters error:', err)
    return { data: null, error: 'Failed to get cover letters' }
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

    const rate = checkRateLimit(`cover-letter:improve:${user.id}`, 10, 60_000)
    if (!rate.allowed) {
      return { data: null, error: 'Too many requests' }
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

    await emitEvent({
      event: AppEvent.COVER_LETTER_IMPROVED,
      userId: user.id,
      message: `Your cover letter was improved for ${jobTitle} at ${company}.`,
      link: coverLetter.jobApplicationId
        ? `/dashboard/jobs/${coverLetter.jobApplicationId}`
        : '/dashboard',
      metadata: {
        coverLetterId: parsed.data.coverLetterId,
        jobApplicationId: coverLetter.jobApplicationId || null,
        jobTitle,
        company,
      },
    })

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

// ===========================================================
// COVER LETTER TEMPLATES
// ===========================================================

export interface CoverLetterTemplateData {
  id: string;
  name: string;
  description: string | null;
  content: string;
  tone: string;
  category: string | null;
  isSystem: boolean;
  isActive: boolean;
  userId: string | null;
  usageCount: number;
  createdAt: string;
}

// Predefined system templates
const PREDEFINED_TEMPLATES = [
  {
    name: "Professional Standard",
    description: "A classic, formal cover letter suitable for corporate and traditional industries",
    content: `Dear Hiring Manager,

I am writing to express my strong interest in the [JOB_TITLE] position at [COMPANY]. With my background in [FIELD/INDUSTRY] and proven track record of [KEY_ACHIEVEMENT], I am confident in my ability to contribute meaningfully to your team.

In my current/previous role at [CURRENT_COMPANY], I have [SPECIFIC_ACCOMPLISHMENT]. This experience has equipped me with [RELEVANT_SKILLS] that directly align with the requirements outlined in your job posting.

What particularly excites me about [COMPANY] is [SPECIFIC_REASON]. I am drawn to your commitment to [COMPANY_VALUE/MISSION], and I believe my skills in [SKILL_AREA] would allow me to make an immediate impact.

I would welcome the opportunity to discuss how my experience and enthusiasm can benefit your organization. Thank you for considering my application.

Sincerely,
[YOUR_NAME]`,
    tone: "professional",
    category: "General",
  },
  {
    name: "Tech Industry",
    description: "Modern, results-driven template for software engineering and tech roles",
    content: `Hi [HIRING_MANAGER_NAME],

I'm excited to apply for the [JOB_TITLE] role at [COMPANY]. As a [YOUR_TITLE] with [X] years of experience building [TYPE_OF_PRODUCTS/SYSTEMS], I've been following [COMPANY]'s work on [SPECIFIC_PROJECT/PRODUCT] and would love to contribute to your mission.

Key highlights from my background:
• [TECHNICAL_ACHIEVEMENT_1] - resulted in [MEASURABLE_OUTCOME]
• [TECHNICAL_ACHIEVEMENT_2] - improved [METRIC] by [PERCENTAGE]
• [TECHNICAL_ACHIEVEMENT_3] - led team of [X] engineers

My tech stack includes [RELEVANT_TECHNOLOGIES], and I'm particularly passionate about [TECHNICAL_INTEREST]. I noticed your team is working on [SPECIFIC_CHALLENGE], and I'd love to bring my experience with [RELEVANT_EXPERIENCE] to help solve it.

I'd be thrilled to chat more about how I can contribute to [COMPANY]. Looking forward to connecting!

Best,
[YOUR_NAME]`,
    tone: "friendly",
    category: "Technology",
  },
  {
    name: "Career Changer",
    description: "Emphasizes transferable skills for those transitioning to a new field",
    content: `Dear [HIRING_MANAGER_NAME],

I am writing to express my enthusiasm for the [JOB_TITLE] position at [COMPANY]. While my background is in [PREVIOUS_FIELD], I am eager to transition into [NEW_FIELD] and believe my transferable skills make me a strong candidate.

Throughout my career in [PREVIOUS_FIELD], I developed expertise in:
• [TRANSFERABLE_SKILL_1] - which translates to [HOW_IT_APPLIES]
• [TRANSFERABLE_SKILL_2] - demonstrated through [EXAMPLE]
• [TRANSFERABLE_SKILL_3] - resulting in [OUTCOME]

To prepare for this transition, I have [STEPS_TAKEN: courses, certifications, projects, etc.]. My unique perspective from [PREVIOUS_INDUSTRY] combined with my newly acquired skills in [NEW_SKILLS] positions me to bring fresh insights to your team.

I am particularly drawn to [COMPANY] because [SPECIFIC_REASON]. I am confident that my diverse background and genuine passion for [FIELD] will allow me to contribute meaningfully to your organization.

Thank you for considering my application. I look forward to discussing how my unique journey can benefit your team.

Sincerely,
[YOUR_NAME]`,
    tone: "professional",
    category: "Career Change",
  },
  {
    name: "Creative Industry",
    description: "Showcases personality and creative flair for design, marketing, and media roles",
    content: `Hello [HIRING_MANAGER_NAME],

When I saw the [JOB_TITLE] opening at [COMPANY], I knew I had to reach out. Your recent [CAMPAIGN/PROJECT/WORK] caught my attention because [SPECIFIC_OBSERVATION], and I'd love to bring my creative energy to your team.

A bit about me: I'm a [YOUR_TITLE] who believes that great [CREATIVE_WORK] happens at the intersection of [CONCEPT_1] and [CONCEPT_2]. Over the past [X] years, I've had the opportunity to:

→ [CREATIVE_ACHIEVEMENT_1]
→ [CREATIVE_ACHIEVEMENT_2]
→ [CREATIVE_ACHIEVEMENT_3]

What sets me apart is my ability to [UNIQUE_SKILL/APPROACH]. I don't just [CREATE/DESIGN/WRITE] – I [YOUR_PHILOSOPHY].

I've attached my portfolio showcasing [RELEVANT_WORK]. I'd love to grab coffee (virtual or otherwise!) and chat about how we might collaborate.

Creatively yours,
[YOUR_NAME]`,
    tone: "enthusiastic",
    category: "Creative",
  },
  {
    name: "Entry Level / Graduate",
    description: "Perfect for recent graduates or those with limited work experience",
    content: `Dear Hiring Manager,

I am writing to apply for the [JOB_TITLE] position at [COMPANY]. As a recent graduate from [UNIVERSITY] with a degree in [FIELD], I am eager to begin my career in [INDUSTRY] and believe [COMPANY] would be the ideal place to grow.

During my studies, I developed a strong foundation in [RELEVANT_SUBJECTS]. I also gained practical experience through:

• [INTERNSHIP/PROJECT_1]: [BRIEF_DESCRIPTION_AND_OUTCOME]
• [INTERNSHIP/PROJECT_2]: [BRIEF_DESCRIPTION_AND_OUTCOME]
• [EXTRACURRICULAR/VOLUNTEER]: [SKILLS_DEVELOPED]

What I lack in years of experience, I make up for with [QUALITIES: enthusiasm, quick learning ability, fresh perspective, etc.]. I am particularly excited about [COMPANY] because [SPECIFIC_REASON], and I am committed to [CONTRIBUTION_YOU'LL_MAKE].

I would be grateful for the opportunity to discuss how my academic background and eagerness to learn can contribute to your team. Thank you for your consideration.

Sincerely,
[YOUR_NAME]`,
    tone: "formal",
    category: "Entry Level",
  },
  {
    name: "Executive / Leadership",
    description: "Strategic, results-focused template for senior and executive positions",
    content: `Dear [BOARD/COMMITTEE/HIRING_MANAGER],

I am writing to express my interest in the [EXECUTIVE_TITLE] position at [COMPANY]. With over [X] years of leadership experience driving [TYPE_OF_RESULTS] across [INDUSTRIES/FUNCTIONS], I am prepared to lead [COMPANY] through its next phase of growth.

Throughout my career, I have consistently delivered transformational results:

• At [COMPANY_1], I [ACHIEVEMENT] resulting in [QUANTIFIED_OUTCOME]
• Led [COMPANY_2] through [CHALLENGE], achieving [RESULT]
• Built and scaled teams from [X] to [Y], while maintaining [METRIC]

My leadership philosophy centers on [CORE_PRINCIPLE]. I believe that [LEADERSHIP_INSIGHT], and this approach has enabled me to [OUTCOME].

[COMPANY]'s position in [MARKET/INDUSTRY] presents a compelling opportunity. I see potential to [STRATEGIC_VISION], and I am confident my experience in [RELEVANT_AREA] positions me to deliver meaningful impact.

I welcome the opportunity to discuss how my strategic vision and operational expertise can advance [COMPANY]'s objectives.

Respectfully,
[YOUR_NAME]`,
    tone: "formal",
    category: "Executive",
  },
];

export async function getCoverLetterTemplates(): Promise<{
  data: CoverLetterTemplateData[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get system templates (available to all)
    const { data: systemTemplates, error: sysError } = await adminSupabase
      .from("cover_letter_templates")
      .select("*")
      .eq("isSystem", true)
      .eq("isActive", true)
      .order("usageCount", { ascending: false });

    if (sysError) {
      console.error("Error fetching system templates:", sysError);
    }

    // Get user's custom templates if logged in
    let userTemplates: any[] = [];
    if (user) {
      const { data: uTemplates } = await adminSupabase
        .from("cover_letter_templates")
        .select("*")
        .eq("userId", user.id)
        .eq("isActive", true)
        .order("createdAt", { ascending: false });

      userTemplates = uTemplates || [];
    }

    const allTemplates = [...(systemTemplates || []), ...userTemplates];

    return { data: allTemplates, error: null };
  } catch (err) {
    console.error("Error getting cover letter templates:", err);
    return { data: null, error: "Failed to get templates" };
  }
}

export async function createCoverLetterTemplate(input: {
  name: string;
  description?: string;
  content: string;
  tone?: string;
  category?: string;
  isSystem?: boolean;
}): Promise<{ data: CoverLetterTemplateData | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Only admins can create system templates
    if (input.isSystem) {
      try {
        await requireUserAtLeastRole(user.id, 'ADMIN')
      } catch {
        return { data: null, error: "Only admins can create system templates" };
      }
    }

    const { data: template, error } = await adminSupabase
      .from("cover_letter_templates")
      .insert({
        name: input.name,
        description: input.description || null,
        content: input.content,
        tone: input.tone || "professional",
        category: input.category || null,
        isSystem: input.isSystem || false,
        userId: input.isSystem ? null : user.id,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: template, error: null };
  } catch (err) {
    console.error("Error creating cover letter template:", err);
    return { data: null, error: "Failed to create template" };
  }
}

export async function updateCoverLetterTemplate(
  id: string,
  input: {
    name?: string;
    description?: string;
    content?: string;
    tone?: string;
    category?: string;
    isActive?: boolean;
  }
): Promise<{ data: CoverLetterTemplateData | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Check if template exists and user has permission
    const { data: existing } = await adminSupabase
      .from("cover_letter_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (!existing) {
      return { data: null, error: "Template not found" };
    }

    // System templates can only be edited by admins
    if (existing.isSystem) {
      try {
        await requireUserAtLeastRole(user.id, 'ADMIN')
      } catch {
        return { data: null, error: "Only admins can edit system templates" };
      }
    }

    // User templates can only be edited by their owner
    if (!existing.isSystem && existing.userId !== user.id) {
      return { data: null, error: "You can only edit your own templates" };
    }

    const { data: template, error } = await adminSupabase
      .from("cover_letter_templates")
      .update({
        name: input.name,
        description: input.description,
        content: input.content,
        tone: input.tone,
        category: input.category,
        isActive: input.isActive,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: template, error: null };
  } catch (err) {
    console.error("Error updating cover letter template:", err);
    return { data: null, error: "Failed to update template" };
  }
}

export async function deleteCoverLetterTemplate(id: string): Promise<{
  data: { success: true } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Check if template exists and user has permission
    const { data: existing } = await adminSupabase
      .from("cover_letter_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (!existing) {
      return { data: null, error: "Template not found" };
    }

    // System templates can only be deleted by admins
    if (existing.isSystem) {
      try {
        await requireUserAtLeastRole(user.id, 'ADMIN')
      } catch {
        return { data: null, error: "Only admins can delete system templates" };
      }
    }

    // User templates can only be deleted by their owner
    if (!existing.isSystem && existing.userId !== user.id) {
      return { data: null, error: "You can only delete your own templates" };
    }

    const { error } = await adminSupabase
      .from("cover_letter_templates")
      .delete()
      .eq("id", id);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("Error deleting cover letter template:", err);
    return { data: null, error: "Failed to delete template" };
  }
}

export async function incrementTemplateUsage(id: string): Promise<void> {
  try {
    const { data: template } = await adminSupabase
      .from("cover_letter_templates")
      .select("usageCount")
      .eq("id", id)
      .single();

    if (template) {
      await adminSupabase
        .from("cover_letter_templates")
        .update({ usageCount: (template.usageCount || 0) + 1 })
        .eq("id", id);
    }
  } catch (err) {
    console.error("Error incrementing template usage:", err);
  }
}

export async function seedSystemTemplates(): Promise<{
  data: { created: number } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Only admins can seed system templates" };
    }

    try {
      await requireUserAtLeastRole(user.id, 'ADMIN')
    } catch {
      return { data: null, error: "Only admins can seed system templates" };
    }

    // Check which templates already exist
    const { data: existing } = await adminSupabase
      .from("cover_letter_templates")
      .select("name")
      .eq("isSystem", true);

    const existingNames = new Set((existing || []).map((t: any) => t.name));

    // Insert only new templates
    const newTemplates = PREDEFINED_TEMPLATES.filter(t => !existingNames.has(t.name));

    if (newTemplates.length === 0) {
      return { data: { created: 0 }, error: null };
    }

    const { error } = await adminSupabase
      .from("cover_letter_templates")
      .insert(newTemplates.map(t => ({ ...t, isSystem: true })));

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { created: newTemplates.length }, error: null };
  } catch (err) {
    console.error("Error seeding system templates:", err);
    return { data: null, error: "Failed to seed templates" };
  }
}

export async function checkIsAdmin(): Promise<{ isAdmin: boolean }> {
  try {
    const current = await getCurrentUserRole()
    if (!current) return { isAdmin: false }
    return { isAdmin: hasAtLeastRole(current.role, 'ADMIN') }
  } catch {
    return { isAdmin: false };
  }
}
