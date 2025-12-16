import { NextRequest, NextResponse } from "next/server"
import { adminSupabase, createClient } from "@/lib/supabase/server"

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatIcsDateUtc(date: Date): string {
  const y = date.getUTCFullYear()
  const m = pad2(date.getUTCMonth() + 1)
  const d = pad2(date.getUTCDate())
  const hh = pad2(date.getUTCHours())
  const mm = pad2(date.getUTCMinutes())
  const ss = pad2(date.getUTCSeconds())
  return `${y}${m}${d}T${hh}${mm}${ss}Z`
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function toEventLines(params: {
  uid: string
  dtstart: Date
  dtend: Date
  summary: string
  description: string
  url: string
  dtstamp: Date
}): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(params.uid)}`,
    `DTSTAMP:${formatIcsDateUtc(params.dtstamp)}`,
    `DTSTART:${formatIcsDateUtc(params.dtstart)}`,
    `DTEND:${formatIcsDateUtc(params.dtend)}`,
    `SUMMARY:${escapeIcsText(params.summary)}`,
    `DESCRIPTION:${escapeIcsText(params.description)}`,
    `URL:${escapeIcsText(params.url)}`,
    "END:VEVENT",
  ]
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { data: apps, error } = await adminSupabase
      .from("job_applications")
      .select("id,jobTitle,company,status,interviewDate,reminderDate")
      .eq("userId", user.id)

    if (error) {
      return new NextResponse("Failed to load applications", { status: 500 })
    }

    const { data: calendarEvents, error: calendarError } = await adminSupabase
      .from("calendar_events")
      .select("id,title,description,location,type,startAt,endAt")
      .eq("userId", user.id)

    if (calendarError) {
      return new NextResponse("Failed to load calendar events", { status: 500 })
    }

    const now = new Date()
    const origin = request.nextUrl.origin

    const events: string[] = []

    for (const app of apps || []) {
      const appUrl = `${origin}/dashboard/jobs/${app.id}`

      if (app.interviewDate) {
        const start = new Date(app.interviewDate)
        if (!Number.isNaN(start.getTime())) {
          events.push(
            ...toEventLines({
              uid: `jobpilot-interview-${app.id}@jobpilot`,
              dtstamp: now,
              dtstart: start,
              dtend: addMinutes(start, 60),
              summary: `Interview: ${app.jobTitle} @ ${app.company}`,
              description: `Interview for ${app.jobTitle} at ${app.company}.`,
              url: appUrl,
            })
          )
        }
      }

      if (app.reminderDate && app.status === "APPLIED") {
        const start = new Date(app.reminderDate)
        if (!Number.isNaN(start.getTime())) {
          events.push(
            ...toEventLines({
              uid: `jobpilot-reminder-${app.id}@jobpilot`,
              dtstamp: now,
              dtstart: start,
              dtend: addMinutes(start, 15),
              summary: `Follow-up: ${app.jobTitle} @ ${app.company}`,
              description: `Reminder to follow up on ${app.jobTitle} at ${app.company}.`,
              url: appUrl,
            })
          )
        }
      }
    }

    for (const ev of calendarEvents || []) {
      if (!ev.startAt || !ev.endAt) continue
      const start = new Date(ev.startAt)
      const end = new Date(ev.endAt)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue

      const url = `${origin}/dashboard/calendar`
      const summaryPrefix = ev.type === "REMINDER" ? "Reminder" : ev.type === "INTERVIEW_SESSION" ? "Interview" : "Event"
      const summary = ev.title ? `${summaryPrefix}: ${ev.title}` : summaryPrefix
      const descriptionParts = [ev.description, ev.location].filter(Boolean)
      const description = descriptionParts.length > 0 ? descriptionParts.join("\n") : summary

      events.push(
        ...toEventLines({
          uid: `jobpilot-calendar-${ev.id}@jobpilot`,
          dtstamp: now,
          dtstart: start,
          dtend: end,
          summary,
          description,
          url,
        })
      )
    }

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Job Pilot//Calendar Export//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n")

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="job-pilot.ics"',
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("ICS export error:", err)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
