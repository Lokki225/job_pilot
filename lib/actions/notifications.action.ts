"use server"

import { adminSupabase, createClient } from "@/lib/supabase/server";
import { AppEvent } from "@/lib/types/app-events";
import {
  notifyAchievement,
  notifyLevelUp as emitLevelUp,
  notifyInterviewReminder as emitInterviewReminder,
  notifyApplicationUpdate as emitApplicationUpdate,
  notifyStoryLiked as emitStoryLiked,
  notifyStreakMilestone as emitStreakMilestone,
} from "@/lib/services/event-dispatcher";

// ===========================================================
// TYPES (kept for backward compatibility)
// ===========================================================

type NotificationType =
  | "achievement_unlock"
  | "achievement_unlocked"
  | "level_up"
  | "xp_earned"
  | "story_liked"
  | "interview_reminder"
  | "interview_reminder_24h"
  | "interview_reminder_1h"
  | "application_update"
  | "application_status_changed"
  | "streak_milestone"
  | "system"
  | AppEvent;

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

// ===========================================================
// CREATE NOTIFICATION (internal use)
// ===========================================================

export async function createNotification(
  input: CreateNotificationInput
): Promise<{ data: any | null; error: string | null }> {
  try {
    const { data, error } = await adminSupabase
      .from("notifications")
      .insert({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link || null,
        metadata: input.metadata || null,
      })
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err) {
    console.error("Error creating notification:", err);
    return { data: null, error: "Failed to create notification" };
  }
}

// ===========================================================
// NOTIFICATION HELPERS (using new event dispatcher)
// These maintain backward compatibility while using the new system
// ===========================================================

export async function notifyAchievementUnlock(
  userId: string,
  achievementTitle: string,
  achievementIcon: string
): Promise<void> {
  await notifyAchievement(userId, achievementTitle, achievementIcon);
}

export async function notifyLevelUp(
  userId: string,
  newLevel: number,
  levelTitle: string
): Promise<void> {
  await emitLevelUp(userId, newLevel, levelTitle);
}

export async function notifyStoryLiked(
  userId: string,
  storyTitle: string,
  storyId?: string
): Promise<void> {
  await emitStoryLiked(userId, storyTitle, storyId || "");
}

export async function notifyStreakMilestone(
  userId: string,
  streakDays: number
): Promise<void> {
  await emitStreakMilestone(userId, streakDays);
}

export async function notifyApplicationUpdate(
  userId: string,
  jobTitle: string,
  company: string,
  applicationId: string,
  updateType: "status_change" | "interview_scheduled" | "interview_updated",
  details: string
): Promise<void> {
  const statusMap: Record<string, string> = {
    status_change: "UPDATED",
    interview_scheduled: "INTERVIEWING",
    interview_updated: "INTERVIEWING",
  };
  await emitApplicationUpdate(
    userId,
    jobTitle,
    company,
    applicationId,
    statusMap[updateType] || "UPDATED",
    details
  );
}

export async function notifyInterviewReminder(
  userId: string,
  jobTitle: string,
  company: string,
  applicationId: string,
  interviewDate: Date,
  hoursUntil: number
): Promise<void> {
  await emitInterviewReminder(
    userId,
    jobTitle,
    company,
    applicationId,
    interviewDate,
    hoursUntil
  );
}

// ===========================================================
// CHECK FOR DUPLICATE REMINDER (idempotency)
// ===========================================================

export async function hasRecentReminder(
  userId: string,
  applicationId: string,
  reminderWindow: "1h" | "24h"
): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const eventType =
      reminderWindow === "1h" ? AppEvent.INTERVIEW_REMINDER_1H : AppEvent.INTERVIEW_REMINDER_24H;

    const { data } = await adminSupabase
      .from("notifications")
      .select("id")
      .eq("userId", userId)
      .eq("type", eventType)
      .ilike("link", `%jobId=${applicationId}%`)
      .gte("createdAt", cutoff.toISOString())
      .limit(1);

    return (data?.length || 0) > 0;
  } catch {
    return false;
  }
}

// ===========================================================
// GET NOTIFICATIONS
// ===========================================================

export async function getNotifications(params?: {
  limit?: number;
  onlyUnread?: boolean;
}): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Unauthorized" };

    const limit = params?.limit || 20;

    let query = adminSupabase
      .from("notifications")
      .select("*")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })
      .limit(limit);

    if (params?.onlyUnread) {
      query = query.eq("isRead", false);
    }

    const { data, error } = await query;

    if (error) return { data: null, error: error.message };
    return { data: data || [], error: null };
  } catch (err) {
    console.error("Error getting notifications:", err);
    return { data: null, error: "Failed to load notifications" };
  }
}

// ===========================================================
// GET UNREAD COUNT
// ===========================================================

export async function getUnreadCount(): Promise<{
  data: number;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: 0, error: "Unauthorized" };

    const { count, error } = await adminSupabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("userId", user.id)
      .eq("isRead", false);

    if (error) return { data: 0, error: error.message };
    return { data: count || 0, error: null };
  } catch (err) {
    console.error("Error getting unread count:", err);
    return { data: 0, error: "Failed to get unread count" };
  }
}

// ===========================================================
// MARK AS READ
// ===========================================================

export async function markAsRead(
  notificationId: string
): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: false, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("notifications")
      .update({ isRead: true })
      .eq("id", notificationId)
      .eq("userId", user.id);

    if (error) return { data: false, error: error.message };
    return { data: true, error: null };
  } catch (err) {
    console.error("Error marking as read:", err);
    return { data: false, error: "Failed to mark as read" };
  }
}

// ===========================================================
// MARK ALL AS READ
// ===========================================================

export async function markAllAsRead(): Promise<{
  data: boolean;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: false, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("notifications")
      .update({ isRead: true })
      .eq("userId", user.id)
      .eq("isRead", false);

    if (error) return { data: false, error: error.message };
    return { data: true, error: null };
  } catch (err) {
    console.error("Error marking all as read:", err);
    return { data: false, error: "Failed to mark all as read" };
  }
}

// ===========================================================
// DELETE NOTIFICATION
// ===========================================================

export async function deleteNotification(
  notificationId: string
): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: false, error: "Unauthorized" };

    const { error } = await adminSupabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("userId", user.id);

    if (error) return { data: false, error: error.message };
    return { data: true, error: null };
  } catch (err) {
    console.error("Error deleting notification:", err);
    return { data: false, error: "Failed to delete notification" };
  }
}