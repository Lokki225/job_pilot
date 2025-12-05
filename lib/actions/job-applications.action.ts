// lib/actions/job-applications.ts
"use server"

import { z } from "zod"
import { supabase } from "../supabase/client"

const JobApplicationSchema = z.object({
  jobTitle: z.string().min(1),
  company: z.string().min(1),
  status: z.enum(["PENDING", "SENT", "VIEWED", "REPLIED", "REJECTED", "ACCEPTED"]).default("PENDING"),
  source: z.enum(["LINKEDIN", "FIVERR", "UPWORK", "INDEED", "OTHER"]).optional(),
  jobPostUrl: z.string().optional(),
  notes: z.string().optional(),
})

export async function createJobApplication(values: z.infer<typeof JobApplicationSchema>) {
  try {
    
    const parsed = JobApplicationSchema.safeParse(values)
    if (!parsed.success) return { data: null, error: "Invalid input format" }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("job_applications")
      .insert({
        userId: user.id,
        ...parsed.data,
      })
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error creating application" }
  }
}

export async function listJobApplications(status?: string) {
  try {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    let query = supabase
      .from("job_applications")
      .select("*")
      .eq("userId", user.id)
      .order("appliedAt", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error listing applications" }
  }
}

export async function updateJobApplication(id: string, values: Partial<z.infer<typeof JobApplicationSchema>>) {
  try {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("job_applications")
      .update(values)
      .eq("id", id)
      .eq("userId", user.id)
      .select("*")
      .single()

    if (error) return { data: null, error: error.message }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error updating application" }
  }
}

export async function deleteJobApplication(id: string) {
  try {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { error } = await supabase
      .from("job_applications")
      .delete()
      .eq("id", id)
      .eq("userId", user.id)

    if (error) return { data: null, error: error.message }

    return { data: true, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error deleting application" }
  }
}

export async function getJobApplicationStats() {
  try {
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: "Unauthorized" }

    const { data, error } = await supabase
      .from("job_applications")
      .select("status")
      .eq("userId", user.id)

    if (error) return { data: null, error: error.message }

    const stats = {
      total: data.length,
      pending: data.filter(app => app.status === "PENDING").length,
      sent: data.filter(app => app.status === "SENT").length,
      replied: data.filter(app => app.status === "REPLIED").length,
      rejected: data.filter(app => app.status === "REJECTED").length,
      accepted: data.filter(app => app.status === "ACCEPTED").length,
    }

    return { data: stats, error: null }
  } catch (err) {
    return { data: null, error: "Unexpected error calculating stats" }
  }
}