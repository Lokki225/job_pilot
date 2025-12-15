import { NextRequest, NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/server"
import { jobSearchService } from "@/lib/services/job-search"
import type { JobSearchParams } from "@/lib/services/job-search/types"
import { AppEvent } from "@/lib/types/app-events"
import { emitEvent } from "@/lib/services/event-dispatcher"

function getFrequencyMs(frequency: unknown): number {
  const value = typeof frequency === "string" ? frequency.trim().toLowerCase() : "daily"
  if (value === "hourly") return 60 * 60 * 1000
  if (value === "daily") return 24 * 60 * 60 * 1000
  if (value === "weekly") return 7 * 24 * 60 * 60 * 1000
  return 24 * 60 * 60 * 1000
}

function isDueRun(frequency: unknown, lastRunAt: unknown, now: Date): boolean {
  if (!lastRunAt) return true
  const last = new Date(String(lastRunAt))
  if (Number.isNaN(last.getTime())) return true
  const nextAt = last.getTime() + getFrequencyMs(frequency)
  return now.getTime() >= nextAt
}

function toJobKey(job: { id: string; source?: string | null }) {
  return `${job.source || "unknown"}:${job.id}`
}

function toSearchParams(filters: any): JobSearchParams {
  return {
    query: (filters?.query || "developer").toString(),
    location: filters?.location ? filters.location.toString() : undefined,
    jobType:
      filters?.jobType && filters.jobType !== "all" ? filters.jobType.toString() : undefined,
    datePosted: filters?.datePosted,
    remote: Boolean(filters?.remote),
    sortBy: filters?.sortBy,
    page: 1,
    resultsPerPage: 20,
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const force = url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true"

  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const results = {
    checked: 0,
    skipped: 0,
    notified: 0,
    totalNewMatches: 0,
    errors: 0,
  }

  try {
    const { data: searches, error } = await adminSupabase
      .from("saved_job_searches")
      .select("*")
      .eq("isEnabled", true)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    for (const search of searches || []) {
      results.checked++

      try {
        if (!force && !isDueRun(search.frequency, search.lastRunAt, now)) {
          results.skipped++
          continue
        }

        if (!search.notifyOnMatch) {
          await adminSupabase
            .from("saved_job_searches")
            .update({ lastRunAt: now.toISOString(), updatedAt: now.toISOString() })
            .eq("id", search.id)
          continue
        }

        const params = toSearchParams(search.filters)
        const response = await jobSearchService.searchAll(params)

        const jobKeys = (response.jobs || []).map((j: any) => toJobKey(j))
        const seen = new Set<string>(search.lastSeenJobKeys || [])
        const newKeys = jobKeys.filter((k: string) => !seen.has(k))

        const merged = [...newKeys, ...(search.lastSeenJobKeys || [])]
        const capped = merged.slice(0, 500)

        await adminSupabase
          .from("saved_job_searches")
          .update({
            lastRunAt: now.toISOString(),
            lastSeenJobKeys: capped,
            updatedAt: now.toISOString(),
          })
          .eq("id", search.id)

        if (newKeys.length > 0) {
          results.totalNewMatches += newKeys.length

          await emitEvent({
            event: AppEvent.JOB_ALERT_NEW_MATCHES,
            userId: search.userId,
            titleOverride: `New matches: ${search.name}`,
            message: `${newKeys.length} new job${newKeys.length === 1 ? "" : "s"} found for your saved search "${search.name}".`,
            link: "/dashboard/jobs",
            metadata: {
              savedSearchId: search.id,
              savedSearchName: search.name,
              newCount: newKeys.length,
            },
          })

          results.notified++
        }
      } catch (err) {
        console.error("Job alerts runner error:", err)
        results.errors++
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    })
  } catch (err) {
    console.error("Job alerts cron error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
