import { NextRequest, NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/server"
import { emitEvent } from "@/lib/services/event-dispatcher"
import { AppEvent } from "@/lib/types/app-events"
import { ApplicationStatus } from "@/prisma/generated/client/enums"

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function diffDaysRounded(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

async function hasRecentFollowUp(params: {
  userId: string
  applicationId: string
  event: AppEvent
  cutoffIso: string
}): Promise<boolean> {
  const { data } = await adminSupabase
    .from("notifications")
    .select("id")
    .eq("userId", params.userId)
    .eq("type", params.event)
    .ilike("link", `%${params.applicationId}%`)
    .gte("createdAt", params.cutoffIso)
    .limit(1)

  return (data?.length || 0) > 0
}

function stepToEvent(step: number): AppEvent | null {
  if (step === 3) return AppEvent.APPLICATION_FOLLOW_UP_3D
  if (step === 7) return AppEvent.APPLICATION_FOLLOW_UP_7D
  if (step === 14) return AppEvent.APPLICATION_FOLLOW_UP_14D
  return null
}

function nextStep(step: number): number | null {
  if (step === 3) return 7
  if (step === 7) return 14
  if (step === 14) return null
  return null
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const cutoff = new Date(now.getTime() - 36 * 60 * 60 * 1000)

  const results = {
    checked: 0,
    due: 0,
    notified: 0,
    advanced: 0,
    cleared: 0,
    skippedDuplicates: 0,
    skippedInvalid: 0,
    errors: 0,
  }

  try {
    const { data: dueApps, error } = await adminSupabase
      .from("job_applications")
      .select("id,userId,jobTitle,company,status,appliedDate,reminderDate")
      .eq("status", ApplicationStatus.APPLIED)
      .not("reminderDate", "is", null)
      .gte("reminderDate", windowStart.toISOString())
      .lte("reminderDate", now.toISOString())
      .limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    results.due = dueApps?.length || 0

    for (const app of dueApps || []) {
      results.checked++

      try {
        if (!app.appliedDate || !app.reminderDate) {
          results.skippedInvalid++
          continue
        }

        const appliedDate = new Date(app.appliedDate)
        const reminderDate = new Date(app.reminderDate)

        if (Number.isNaN(appliedDate.getTime()) || Number.isNaN(reminderDate.getTime())) {
          results.skippedInvalid++
          continue
        }

        const step = diffDaysRounded(appliedDate, reminderDate)
        const event = stepToEvent(step)

        if (!event) {
          results.skippedInvalid++
          continue
        }

        const alreadySent = await hasRecentFollowUp({
          userId: app.userId,
          applicationId: app.id,
          event,
          cutoffIso: cutoff.toISOString(),
        })

        if (alreadySent) {
          results.skippedDuplicates++
          const next = nextStep(step)
          const nextReminderDate = next ? addDays(appliedDate, next) : null
          await adminSupabase
            .from("job_applications")
            .update({ reminderDate: nextReminderDate ? nextReminderDate.toISOString() : null })
            .eq("id", app.id)
            .eq("userId", app.userId)
          results.advanced++
          continue
        }

        await emitEvent({
          event,
          userId: app.userId,
          titleOverride: `Follow up (Day ${step})`,
          message: `It's been ${Math.max(0, diffDaysRounded(appliedDate, now))} days since you applied to ${app.jobTitle} at ${app.company}. Consider sending a follow-up.`,
          link: `/dashboard/jobs/${app.id}`,
          metadata: {
            jobApplicationId: app.id,
            jobTitle: app.jobTitle,
            company: app.company,
            followUpDay: step,
            appliedDate: appliedDate.toISOString(),
          },
        })

        results.notified++

        const next = nextStep(step)
        const nextReminderDate = next ? addDays(appliedDate, next) : null

        await adminSupabase
          .from("job_applications")
          .update({ reminderDate: nextReminderDate ? nextReminderDate.toISOString() : null })
          .eq("id", app.id)
          .eq("userId", app.userId)

        if (nextReminderDate) {
          results.advanced++
        } else {
          results.cleared++
        }
      } catch (err) {
        console.error("Follow-up reminders runner error:", err)
        results.errors++
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    })
  } catch (err) {
    console.error("Follow-up reminders cron error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
