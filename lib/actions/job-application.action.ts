"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { adminSupabase } from "@/lib/supabase/server"
import { ApplicationStatus, JobPlatform } from "@/prisma/generated/client/enums"

// ===========================================================
// SCHEMAS
// ===========================================================

const JobApplicationSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  location: z.string().optional().nullable(),
  jobType: z.string().optional().nullable(),
  salary: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  requirements: z.string().optional().nullable(),
  jobPostUrl: z.string().url().optional().nullable().or(z.literal("")),
  
  status: z.nativeEnum(ApplicationStatus).default(ApplicationStatus.WISHLIST),
  appliedDate: z.string().optional().nullable(),
  source: z.nativeEnum(JobPlatform).optional().nullable(),
  notes: z.string().optional().nullable(),
  
  externalJobId: z.string().optional().nullable(),
  externalSource: z.string().optional().nullable(),
  externalData: z.any().optional().nullable(),
  
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
  contactPhone: z.string().optional().nullable(),
  
  interviewDate: z.string().optional().nullable(),
  interviewNotes: z.string().optional().nullable(),
  
  offerAmount: z.string().optional().nullable(),
  offerDeadline: z.string().optional().nullable(),
  
  isPasted: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
  reminderDate: z.string().optional().nullable(),
})

const JobApplicationUpdateSchema = JobApplicationSchema.partial()

const JobApplicationFilterSchema = z.object({
  status: z.nativeEnum(ApplicationStatus).optional(),
  source: z.nativeEnum(JobPlatform).optional(),
  isFavorite: z.boolean().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

// ===========================================================
// CREATE JOB APPLICATION
// ===========================================================

export async function createJobApplication(values: z.infer<typeof JobApplicationSchema>) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    const parsed = JobApplicationSchema.safeParse(values)
    if (!parsed.success) {
      console.error("Job application validation errors:", parsed.error.issues)
      return { 
        data: null, 
        error: `Invalid input: ${parsed.error.issues.map(e => e.message).join(", ")}` 
      }
    }

    // Convert date strings to Date objects
    const dataToInsert: any = {
      userId: user.id,
      ...parsed.data,
    }

    if (parsed.data.appliedDate) {
      dataToInsert.appliedDate = new Date(parsed.data.appliedDate)
    }
    if (parsed.data.interviewDate) {
      dataToInsert.interviewDate = new Date(parsed.data.interviewDate)
    }
    if (parsed.data.offerDeadline) {
      dataToInsert.offerDeadline = new Date(parsed.data.offerDeadline)
    }
    if (parsed.data.reminderDate) {
      dataToInsert.reminderDate = new Date(parsed.data.reminderDate)
    }

    const { data, error } = await adminSupabase
      .from("job_applications")
      .insert(dataToInsert)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error("Unexpected error creating job application:", err)
    return { data: null, error: "Failed to create job application" }
  }
}

// ===========================================================
// LIST JOB APPLICATIONS
// ===========================================================

export async function listJobApplications(filters?: z.infer<typeof JobApplicationFilterSchema>) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    let query = adminSupabase
      .from("job_applications")
      .select("*")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })

    // Apply filters
    if (filters?.status) {
      query = query.eq("status", filters.status)
    }
    if (filters?.source) {
      query = query.eq("source", filters.source)
    }
    if (filters?.isFavorite !== undefined) {
      query = query.eq("isFavorite", filters.isFavorite)
    }
    if (filters?.search) {
      query = query.or(`jobTitle.ilike.%${filters.search}%,company.ilike.%${filters.search}%`)
    }
    if (filters?.dateFrom) {
      query = query.gte("createdAt", filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte("createdAt", filters.dateTo)
    }

    const { data, error } = await query

    if (error) {
      console.error("Database error:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error("Unexpected error listing job applications:", err)
    return { data: null, error: "Failed to list job applications" }
  }
}

// ===========================================================
// GET JOB APPLICATION BY ID
// ===========================================================

export async function getJobApplication(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    const { data, error } = await adminSupabase
      .from("job_applications")
      .select("*")
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (error) {
      console.error("Database error:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error("Unexpected error getting job application:", err)
    return { data: null, error: "Failed to get job application" }
  }
}

// ===========================================================
// UPDATE JOB APPLICATION
// ===========================================================

export async function updateJobApplication(
  id: string, 
  values: z.infer<typeof JobApplicationUpdateSchema>
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    const parsed = JobApplicationUpdateSchema.safeParse(values)
    if (!parsed.success) {
      console.error("Job application validation errors:", parsed.error.issues)
      return { 
        data: null, 
        error: `Invalid input: ${parsed.error.issues.map(e => e.message).join(", ")}` 
      }
    }

    // Convert date strings to Date objects
    const dataToUpdate: any = { ...parsed.data }

    if (parsed.data.appliedDate) {
      dataToUpdate.appliedDate = new Date(parsed.data.appliedDate)
    }
    if (parsed.data.interviewDate) {
      dataToUpdate.interviewDate = new Date(parsed.data.interviewDate)
    }
    if (parsed.data.offerDeadline) {
      dataToUpdate.offerDeadline = new Date(parsed.data.offerDeadline)
    }
    if (parsed.data.reminderDate) {
      dataToUpdate.reminderDate = new Date(parsed.data.reminderDate)
    }

    const { data, error } = await adminSupabase
      .from("job_applications")
      .update(dataToUpdate)
      .eq("id", id)
      .eq("userId", user.id)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error("Unexpected error updating job application:", err)
    return { data: null, error: "Failed to update job application" }
  }
}

// ===========================================================
// DELETE JOB APPLICATION
// ===========================================================

export async function deleteJobApplication(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    const { error } = await adminSupabase
      .from("job_applications")
      .delete()
      .eq("id", id)
      .eq("userId", user.id)

    if (error) {
      console.error("Database error:", error)
      return { data: null, error: error.message }
    }

    return { data: true, error: null }
  } catch (err) {
    console.error("Unexpected error deleting job application:", err)
    return { data: null, error: "Failed to delete job application" }
  }
}

// ===========================================================
// UPDATE APPLICATION STATUS (for Kanban)
// ===========================================================

export async function updateApplicationStatus(id: string, status: ApplicationStatus) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    const updateData: any = { status }

    // Auto-set appliedDate when status changes to APPLIED
    if (status === ApplicationStatus.APPLIED) {
      const { data: existing } = await adminSupabase
        .from("job_applications")
        .select("appliedDate")
        .eq("id", id)
        .single()

      if (existing && !existing.appliedDate) {
        updateData.appliedDate = new Date()
      }
    }

    const { data, error } = await adminSupabase
      .from("job_applications")
      .update(updateData)
      .eq("id", id)
      .eq("userId", user.id)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error("Unexpected error updating status:", err)
    return { data: null, error: "Failed to update status" }
  }
}

// ===========================================================
// TOGGLE FAVORITE
// ===========================================================

export async function toggleFavorite(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    // Get current favorite status
    const { data: current } = await adminSupabase
      .from("job_applications")
      .select("isFavorite")
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (!current) {
      return { data: null, error: "Job application not found" }
    }

    const { data, error } = await adminSupabase
      .from("job_applications")
      .update({ isFavorite: !current.isFavorite })
      .eq("id", id)
      .eq("userId", user.id)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error("Unexpected error toggling favorite:", err)
    return { data: null, error: "Failed to toggle favorite" }
  }
}

// ===========================================================
// SET REMINDER
// ===========================================================

export async function setReminder(id: string, reminderDate: string | null) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    const { data, error } = await adminSupabase
      .from("job_applications")
      .update({ 
        reminderDate: reminderDate ? new Date(reminderDate) : null 
      })
      .eq("id", id)
      .eq("userId", user.id)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error("Unexpected error setting reminder:", err)
    return { data: null, error: "Failed to set reminder" }
  }
}

// ===========================================================
// GET APPLICATION STATS
// ===========================================================

export async function getApplicationStats() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    const { data: applications, error } = await adminSupabase
      .from("job_applications")
      .select("status, createdAt")
      .eq("userId", user.id)

    if (error) {
      console.error("Database error:", error)
      return { data: null, error: error.message }
    }

    // Calculate stats
    const stats = {
      total: applications?.length || 0,
      wishlist: applications?.filter(a => a.status === ApplicationStatus.WISHLIST).length || 0,
      applied: applications?.filter(a => a.status === ApplicationStatus.APPLIED).length || 0,
      interviewing: applications?.filter(a => a.status === ApplicationStatus.INTERVIEWING).length || 0,
      offered: applications?.filter(a => a.status === ApplicationStatus.OFFERED).length || 0,
      rejected: applications?.filter(a => a.status === ApplicationStatus.REJECTED).length || 0,
      accepted: applications?.filter(a => a.status === ApplicationStatus.ACCEPTED).length || 0,
    }

    return { data: stats, error: null }
  } catch (err) {
    console.error("Unexpected error getting stats:", err)
    return { data: null, error: "Failed to get stats" }
  }
}

// ===========================================================
// BULK IMPORT FROM PASTED TEXT
// ===========================================================

export async function bulkImportFromPaste(jobText: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    // Import the parser
    const { parseJobPosting, validateParsedJob } = await import("@/lib/utils/job-parser")
    
    // Parse the job text
    const parsed = parseJobPosting(jobText)
    const validated = validateParsedJob(parsed)
    
    // Create job application from parsed data
    const applicationData = {
      jobTitle: validated.jobTitle,
      company: validated.company,
      location: validated.location,
      jobType: validated.jobType,
      salary: validated.salary,
      description: validated.description,
      requirements: validated.requirements,
      jobPostUrl: validated.jobPostUrl,
      status: ApplicationStatus.WISHLIST,
      source: validated.source as any, // Will be 'PASTED' or detected source
      isPasted: true,
      isFavorite: false,
    }
    
    // Use createJobApplication to save
    return await createJobApplication(applicationData)
  } catch (err) {
    console.error("Unexpected error importing from paste:", err)
    return { data: null, error: "Failed to import job. Please check the format and try again." }
  }
}
