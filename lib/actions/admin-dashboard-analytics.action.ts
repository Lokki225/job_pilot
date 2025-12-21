"use server";

import { adminSupabase } from "@/lib/supabase/server";
import { requireAtLeastRole } from "@/lib/auth/rbac";

export type AdminTimeRange = "7d" | "30d";

export interface AdminTrendPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface AdminFeatureAdoption {
  feature: string;
  users: number;
  events: number;
  adoptionRate: number; // 0..1
}

export interface AdminDashboardAnalytics {
  range: AdminTimeRange;

  totals: {
    totalUsers: number;
    onboardedUsers: number;
    activationRate: number; // onboarded / total

    signupsInRange: number;
    activeUsersInRange: number;

    dauToday: number;
    eventsInRange: number;
    actionsInRange: number;

    mentorKycSubmitted: number;
    roleAppsSubmitted: number;
  };

  trends: {
    signupsByDay: AdminTrendPoint[];
    activeUsersByDay: AdminTrendPoint[];
    eventsByDay: AdminTrendPoint[];
    actionsByDay: AdminTrendPoint[];
  };

  featureAdoption: AdminFeatureAdoption[];

  topEvents: { event: string; count: number }[];
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function dateKeyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysUTC(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function buildDateKeys(fromInclusive: Date, toExclusive: Date): string[] {
  const keys: string[] = [];
  let cur = startOfDayUTC(fromInclusive);
  const end = startOfDayUTC(toExclusive);

  while (cur < end) {
    keys.push(dateKeyUTC(cur));
    cur = addDaysUTC(cur, 1);
  }

  return keys;
}

function safeNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

export async function getAdminDashboardAnalytics(range: AdminTimeRange = "30d"): Promise<{
  data: AdminDashboardAnalytics | null;
  error: string | null;
}> {
  try {
    await requireAtLeastRole("ADMIN");

    const now = new Date();
    const todayStart = startOfDayUTC(now);

    const days = range === "7d" ? 7 : 30;
    const from = addDaysUTC(todayStart, -(days - 1));
    const toExclusive = addDaysUTC(todayStart, 1);

    const dateKeys = buildDateKeys(from, toExclusive);

    const [
      totalUsersRes,
      onboardedUsersRes,
      signupsRowsRes,
      eventRowsRes,
      mentorKycRes,
      roleAppsRes,
      jobAppsRes,
      coverLettersRes,
      trainingSessionsRes,
      resumesRes,
      resumesParsedRes,
      aiContentRes,
      studyRes,
      communityPostsRes,
      chatMessagesRes,
    ] = await Promise.all([
      adminSupabase.from("users").select("id", { count: "exact", head: true }),
      adminSupabase.from("users").select("id", { count: "exact", head: true }).eq("isOnboarded", true),

      adminSupabase.from("users").select("id,createdAt").gte("createdAt", from.toISOString()).lt("createdAt", toExclusive.toISOString()),

      adminSupabase
        .from("event_logs")
        .select("event,userId,createdAt")
        .gte("createdAt", from.toISOString())
        .lt("createdAt", toExclusive.toISOString()),

      adminSupabase.from("mentor_kyc_verifications").select("id", { count: "exact", head: true }).eq("status", "SUBMITTED"),
      adminSupabase.from("community_role_applications").select("id", { count: "exact", head: true }).eq("status", "SUBMITTED"),

      adminSupabase.from("job_applications").select("id,userId,createdAt").gte("createdAt", from.toISOString()).lt("createdAt", toExclusive.toISOString()),
      adminSupabase.from("cover_letters").select("id,userId,createdAt").gte("createdAt", from.toISOString()).lt("createdAt", toExclusive.toISOString()),
      adminSupabase.from("training_sessions").select("id,userId,createdAt").gte("createdAt", from.toISOString()).lt("createdAt", toExclusive.toISOString()),
      adminSupabase.from("resumes").select("id,userId,createdAt").gte("createdAt", from.toISOString()).lt("createdAt", toExclusive.toISOString()),
      adminSupabase.from("resumes").select("id,userId,createdAt").not("parsedData", "is", null).gte("createdAt", from.toISOString()).lt("createdAt", toExclusive.toISOString()),
      adminSupabase.from("ai_generated_content").select("id,userId,createdAt,type").gte("createdAt", from.toISOString()).lt("createdAt", toExclusive.toISOString()),
      adminSupabase
        .from("user_study_progress")
        .select("id,userId,createdAt,status")
        .gte("createdAt", from.toISOString())
        .lt("createdAt", toExclusive.toISOString()),
      adminSupabase.from("community_posts").select("id,userId,createdAt").gte("createdAt", from.toISOString()).lt("createdAt", toExclusive.toISOString()),
      adminSupabase.from("chat_messages").select("id,userId,createdAt").gte("createdAt", from.toISOString()).lt("createdAt", toExclusive.toISOString()),
    ]);

    if (totalUsersRes.error) return { data: null, error: totalUsersRes.error.message };
    if (onboardedUsersRes.error) return { data: null, error: onboardedUsersRes.error.message };
    if (signupsRowsRes.error) return { data: null, error: signupsRowsRes.error.message };
    if (eventRowsRes.error) return { data: null, error: eventRowsRes.error.message };

    const totalUsers = safeNumber(totalUsersRes.count);
    const onboardedUsers = safeNumber(onboardedUsersRes.count);

    const signupsRows = signupsRowsRes.data || [];
    const eventRows = eventRowsRes.data || [];

    const eventsInRange = eventRows.length;

    // Signups trend
    const signupsCountByDay = new Map<string, number>();
    for (const r of signupsRows) {
      const key = dateKeyUTC(new Date((r as any).createdAt));
      signupsCountByDay.set(key, (signupsCountByDay.get(key) || 0) + 1);
    }

    const signupsByDay: AdminTrendPoint[] = dateKeys.map((k) => ({
      date: k,
      count: signupsCountByDay.get(k) || 0,
    }));

    // Events trend + active users trend
    const eventsCountByDay = new Map<string, number>();
    const activeUsersByDaySet = new Map<string, Set<string>>();

    const topEventCounts = new Map<string, number>();

    for (const r of eventRows) {
      const createdAt = new Date((r as any).createdAt);
      const key = dateKeyUTC(createdAt);

      eventsCountByDay.set(key, (eventsCountByDay.get(key) || 0) + 1);

      const userId = (r as any).userId as string | null;
      if (userId) {
        const set = activeUsersByDaySet.get(key) || new Set<string>();
        set.add(userId);
        activeUsersByDaySet.set(key, set);
      }

      const ev = String((r as any).event || "unknown");
      topEventCounts.set(ev, (topEventCounts.get(ev) || 0) + 1);
    }

    const eventsByDay: AdminTrendPoint[] = dateKeys.map((k) => ({
      date: k,
      count: eventsCountByDay.get(k) || 0,
    }));

    const activeUsersByDay: AdminTrendPoint[] = dateKeys.map((k) => ({
      date: k,
      count: activeUsersByDaySet.get(k)?.size || 0,
    }));

    // DAU today (proxy)
    const dauToday = activeUsersByDaySet.get(dateKeyUTC(todayStart))?.size || 0;

    const signupsInRange = signupsRows.length;

    const jobAppRows = jobAppsRes.data || [];
    const coverLetterRows = coverLettersRes.data || [];
    const trainingRows = trainingSessionsRes.data || [];
    const resumeRows = resumesRes.data || [];
    const resumeParsedRows = resumesParsedRes.data || [];
    const aiContentRows = aiContentRes.data || [];
    const studyRows = (studyRes.data || []).filter((r: any) => r.status === "COMPLETED");
    const communityPostRows = communityPostsRes.data || [];
    const chatMessageRows = chatMessagesRes.data || [];

    const activityRows: Array<{ userId: string | null; createdAt: string }> = [];
    const pushActivity = (rows: any[]) => {
      for (const r of rows) {
        activityRows.push({
          userId: (r as any).userId ?? null,
          createdAt: String((r as any).createdAt),
        });
      }
    };

    pushActivity(eventRows);
    pushActivity(jobAppRows);
    pushActivity(coverLetterRows);
    pushActivity(trainingRows);
    pushActivity(resumeRows);
    pushActivity(resumeParsedRows);
    pushActivity(aiContentRows);
    pushActivity(studyRows);
    pushActivity(communityPostRows);
    pushActivity(chatMessageRows);

    const actionsCountByDay = new Map<string, number>();
    const activeUsersByDaySetAll = new Map<string, Set<string>>();

    for (const r of activityRows) {
      const createdAt = new Date(r.createdAt);
      const key = dateKeyUTC(createdAt);

      actionsCountByDay.set(key, (actionsCountByDay.get(key) || 0) + 1);

      if (r.userId) {
        const set = activeUsersByDaySetAll.get(key) || new Set<string>();
        set.add(r.userId);
        activeUsersByDaySetAll.set(key, set);
      }
    }

    const actionsByDay: AdminTrendPoint[] = dateKeys.map((k) => ({
      date: k,
      count: actionsCountByDay.get(k) || 0,
    }));

    const activeUsersByDayAll: AdminTrendPoint[] = dateKeys.map((k) => ({
      date: k,
      count: activeUsersByDaySetAll.get(k)?.size || 0,
    }));

    const dauTodayAll = activeUsersByDaySetAll.get(dateKeyUTC(todayStart))?.size || 0;
    const activeUsersInRangeAll = new Set(
      Array.from(activeUsersByDaySetAll.values()).flatMap((s) => Array.from(s.values()))
    ).size;

    const actionsInRange = activityRows.length;

    // Feature adoption
    const distinctUsers = (rows: Array<{ userId?: string | null }>): number => {
      const s = new Set<string>();
      for (const r of rows) {
        const id = (r as any).userId as string | null;
        if (id) s.add(id);
      }
      return s.size;
    };

    const featureAdoption: AdminFeatureAdoption[] = [
      {
        feature: "Cover Letters (AI)",
        users: distinctUsers(coverLetterRows),
        events: coverLetterRows.length,
        adoptionRate: ratio(distinctUsers(coverLetterRows), totalUsers),
      },
      {
        feature: "Interview Training",
        users: distinctUsers(trainingRows),
        events: trainingRows.length,
        adoptionRate: ratio(distinctUsers(trainingRows), totalUsers),
      },
      {
        feature: "Resume Uploads",
        users: distinctUsers(resumeRows),
        events: resumeRows.length,
        adoptionRate: ratio(distinctUsers(resumeRows), totalUsers),
      },
      {
        feature: "Resume Parsed (AI)",
        users: distinctUsers(resumeParsedRows),
        events: resumeParsedRows.length,
        adoptionRate: ratio(distinctUsers(resumeParsedRows), totalUsers),
      },
      {
        feature: "AI Content (All)",
        users: distinctUsers(aiContentRows),
        events: aiContentRows.length,
        adoptionRate: ratio(distinctUsers(aiContentRows), totalUsers),
      },
      {
        feature: "Job Applications Created",
        users: distinctUsers(jobAppRows),
        events: jobAppRows.length,
        adoptionRate: ratio(distinctUsers(jobAppRows), totalUsers),
      },
      {
        feature: "Study (Completed Lessons)",
        users: distinctUsers(studyRows),
        events: studyRows.length,
        adoptionRate: ratio(distinctUsers(studyRows), totalUsers),
      },
      {
        feature: "Community Posts",
        users: distinctUsers(communityPostRows),
        events: communityPostRows.length,
        adoptionRate: ratio(distinctUsers(communityPostRows), totalUsers),
      },
      {
        feature: "Community Chat Messages",
        users: distinctUsers(chatMessageRows),
        events: chatMessageRows.length,
        adoptionRate: ratio(distinctUsers(chatMessageRows), totalUsers),
      },
    ];

    const topEvents = Array.from(topEventCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const analytics: AdminDashboardAnalytics = {
      range,
      totals: {
        totalUsers,
        onboardedUsers,
        activationRate: ratio(onboardedUsers, totalUsers),

        signupsInRange,
        activeUsersInRange: activeUsersInRangeAll,

        dauToday: dauTodayAll,
        eventsInRange,
        actionsInRange,

        mentorKycSubmitted: safeNumber(mentorKycRes.count),
        roleAppsSubmitted: safeNumber(roleAppsRes.count),
      },
      trends: {
        signupsByDay,
        activeUsersByDay: activeUsersByDayAll,
        eventsByDay,
        actionsByDay,
      },
      featureAdoption,
      topEvents,
    };

    return { data: analytics, error: null };
  } catch (err) {
    console.error("Error getting admin dashboard analytics:", err);
    return { data: null, error: "Failed to load admin analytics" };
  }
}
