import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/server";
import { emitEvent } from "@/lib/services/event-dispatcher";
import { AppEvent } from "@/lib/types/app-events";

function safeFormatDate(value: string, timeZone: string): string {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timeZone || "UTC",
    }).format(d);
  } catch {
    return value;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const nowIso = now.toISOString();

  const results = {
    scanned: 0,
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    const { data: due } = await adminSupabase
      .from("calendar_event_reminders")
      .select("id,userId,eventId,remindAt,channel,status")
      .eq("status", "PENDING")
      .eq("channel", "in_app")
      .lte("remindAt", nowIso)
      .order("remindAt", { ascending: true })
      .limit(200);

    results.scanned = due?.length || 0;

    const eventIds = Array.from(new Set((due || []).map((r: any) => r.eventId).filter(Boolean)));

    const { data: events } = await adminSupabase
      .from("calendar_events")
      .select("id,title,startAt,endAt,timezone")
      .in("id", eventIds.length > 0 ? eventIds : ["00000000-0000-0000-0000-000000000000"]);

    const eventMap = new Map((events || []).map((e: any) => [e.id, e]));

    for (const reminder of due || []) {
      results.processed++;

      try {
        const { data: claimed } = await adminSupabase
          .from("calendar_event_reminders")
          .update({ status: "PROCESSING", updatedAt: nowIso })
          .eq("id", reminder.id)
          .eq("status", "PENDING")
          .select("id")
          .maybeSingle();

        if (!claimed) {
          results.skipped++;
          continue;
        }

        const ev = eventMap.get(reminder.eventId);
        const eventTitle = ev?.title || "Calendar event";
        const formattedStart = ev?.startAt
          ? safeFormatDate(ev.startAt, ev?.timezone || "UTC")
          : null;

        const message = formattedStart
          ? `Reminder: ${eventTitle} at ${formattedStart}`
          : `Reminder: ${eventTitle}`;

        await emitEvent({
          event: AppEvent.CALENDAR_REMINDER_DUE,
          userId: reminder.userId,
          message,
          link: "/dashboard/calendar",
          metadata: {
            calendarReminderId: reminder.id,
            calendarEventId: reminder.eventId,
            remindAt: reminder.remindAt,
            eventStartAt: ev?.startAt || null,
          },
        });

        await adminSupabase
          .from("calendar_event_reminders")
          .update({ status: "SENT", sentAt: nowIso, updatedAt: nowIso })
          .eq("id", reminder.id)
          .eq("status", "PROCESSING");

        results.sent++;
      } catch (err) {
        console.error("Error processing calendar reminder:", err);
        results.errors++;

        await adminSupabase
          .from("calendar_event_reminders")
          .update({ status: "FAILED", updatedAt: nowIso })
          .eq("id", reminder.id)
          .eq("status", "PROCESSING");
      }
    }

    return NextResponse.json({ success: true, timestamp: nowIso, results });
  } catch (err) {
    console.error("Cron job error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
