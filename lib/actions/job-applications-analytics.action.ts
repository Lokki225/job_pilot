"use server"

import { z } from "zod"
import { adminSupabase, createClient } from "@/lib/supabase/server"
import { ApplicationStatus } from "@/prisma/generated/client/enums"

export interface JobApplicationsAnalytics {
  funnel: {
    wishlist: number
    applied: number
    interviewing: number
    offered: number
  }
  timeToNextStageDaysAvg: {
    wishlistToApplied: number | null
    appliedToInterview: number | null
    interviewToOffer: number | null
  }
  topSources: { source: string; count: number }[]
}

const AnalyticsFiltersSchema = z
  .object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .optional()

function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
}

function safeDate(value: unknown): Date | null {
  if (!value) return null
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return null
  return d
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export async function getJobApplicationsAnalytics(filters?: z.infer<typeof AnalyticsFiltersSchema>): Promise<{
  data: JobApplicationsAnalytics | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    let query = adminSupabase
      .from("job_applications")
      .select(
        "id,userId,status,createdAt,updatedAt,appliedDate,interviewDate,source,externalSource"
      )
      .eq("userId", user.id)

    if (filters?.dateFrom) {
      query = query.gte("createdAt", filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte("createdAt", filters.dateTo)
    }

    const { data, error } = await query
    if (error) return { data: null, error: error.message }

    const rows = data || []

    const funnel = {
      wishlist: rows.filter((r: any) => r.status === ApplicationStatus.WISHLIST).length,
      applied: rows.filter((r: any) => r.status === ApplicationStatus.APPLIED).length,
      interviewing: rows.filter((r: any) => r.status === ApplicationStatus.INTERVIEWING).length,
      offered: rows.filter(
        (r: any) => r.status === ApplicationStatus.OFFERED || r.status === ApplicationStatus.ACCEPTED
      ).length,
    }

    const wishlistToApplied: number[] = []
    const appliedToInterview: number[] = []
    const interviewToOffer: number[] = []

    for (const r of rows) {
      const createdAt = safeDate(r.createdAt)
      const appliedDate = safeDate(r.appliedDate)
      const interviewDate = safeDate(r.interviewDate)
      const updatedAt = safeDate(r.updatedAt)

      if (createdAt && appliedDate) {
        const v = daysBetween(createdAt, appliedDate)
        if (v >= 0 && v < 3650) wishlistToApplied.push(v)
      }

      if (appliedDate && interviewDate) {
        const v = daysBetween(appliedDate, interviewDate)
        if (v >= 0 && v < 3650) appliedToInterview.push(v)
      }

      const isOffer = r.status === ApplicationStatus.OFFERED || r.status === ApplicationStatus.ACCEPTED
      if (interviewDate && updatedAt && isOffer) {
        const v = daysBetween(interviewDate, updatedAt)
        if (v >= 0 && v < 3650) interviewToOffer.push(v)
      }
    }

    const sourceCounts = new Map<string, number>()
    for (const r of rows) {
      const value = (r.source || r.externalSource || "unknown").toString()
      sourceCounts.set(value, (sourceCounts.get(value) || 0) + 1)
    }

    const topSources = Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    return {
      data: {
        funnel,
        timeToNextStageDaysAvg: {
          wishlistToApplied: avg(wishlistToApplied),
          appliedToInterview: avg(appliedToInterview),
          interviewToOffer: avg(interviewToOffer),
        },
        topSources,
      },
      error: null,
    }
  } catch (err) {
    console.error("Unexpected error getting job applications analytics:", err)
    return { data: null, error: "Failed to load analytics" }
  }
}
