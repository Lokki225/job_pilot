import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/server";
import {
  notifyInterviewReminder,
  hasRecentReminder,
} from "@/lib/actions/notifications.action";

// This endpoint should be called by a cron job every 15 minutes
// On Vercel: Add to vercel.json crons configuration
// Locally: Can be called manually for testing

export async function GET(request: NextRequest) {
  // Verify cron secret (optional but recommended for production)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const results = {
      checked: 0,
      reminders24h: 0,
      reminders1h: 0,
      skippedDuplicates: 0,
      errors: 0,
    };

    // Find interviews in the next 24-25 hours (for 24h reminder)
    const in24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const in24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Find interviews in the next 55-65 minutes (for 1h reminder)
    const in1hStart = new Date(now.getTime() + 55 * 60 * 1000);
    const in1hEnd = new Date(now.getTime() + 65 * 60 * 1000);

    // Query for 24h reminders
    const { data: interviews24h } = await adminSupabase
      .from("job_applications")
      .select("id, userId, jobTitle, company, interviewDate")
      .gte("interviewDate", in24hStart.toISOString())
      .lte("interviewDate", in24hEnd.toISOString())
      .not("interviewDate", "is", null);

    // Query for 1h reminders
    const { data: interviews1h } = await adminSupabase
      .from("job_applications")
      .select("id, userId, jobTitle, company, interviewDate")
      .gte("interviewDate", in1hStart.toISOString())
      .lte("interviewDate", in1hEnd.toISOString())
      .not("interviewDate", "is", null);

    results.checked =
      (interviews24h?.length || 0) + (interviews1h?.length || 0);

    // Process 24h reminders
    for (const interview of interviews24h || []) {
      try {
        const alreadySent = await hasRecentReminder(
          interview.userId,
          interview.id,
          "24h"
        );

        if (alreadySent) {
          results.skippedDuplicates++;
          continue;
        }

        const interviewDate = new Date(interview.interviewDate);
        const hoursUntil =
          (interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        await notifyInterviewReminder(
          interview.userId,
          interview.jobTitle,
          interview.company,
          interview.id,
          interviewDate,
          hoursUntil
        );

        results.reminders24h++;
      } catch (err) {
        console.error("Error sending 24h reminder:", err);
        results.errors++;
      }
    }

    // Process 1h reminders
    for (const interview of interviews1h || []) {
      try {
        const alreadySent = await hasRecentReminder(
          interview.userId,
          interview.id,
          "1h"
        );

        if (alreadySent) {
          results.skippedDuplicates++;
          continue;
        }

        const interviewDate = new Date(interview.interviewDate);
        const hoursUntil =
          (interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        await notifyInterviewReminder(
          interview.userId,
          interview.jobTitle,
          interview.company,
          interview.id,
          interviewDate,
          hoursUntil
        );

        results.reminders1h++;
      } catch (err) {
        console.error("Error sending 1h reminder:", err);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (err) {
    console.error("Cron job error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
