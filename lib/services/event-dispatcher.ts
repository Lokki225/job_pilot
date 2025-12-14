/**
 * Event Dispatcher Service
 * 
 * Centralized service for emitting application events and creating notifications.
 * Handles routing to appropriate channels based on user preferences and event priority.
 */

"use server";

import { adminSupabase, createClient } from "@/lib/supabase/server";
import {
  AppEvent,
  EVENT_META,
  EventCategory,
  DeliveryChannel,
} from "@/lib/types/app-events";

// ═══════════════════════════════════════════════════════════════════════════
// RETENTION LIMITS
// ═══════════════════════════════════════════════════════════════════════════

// Total notifications kept per user (across all event types)
const MAX_NOTIFICATIONS_PER_USER_DEFAULT = 300;

// Notifications kept per event type per user
const MAX_NOTIFICATIONS_PER_EVENT_PER_USER_DEFAULT = 50;

// Per-event overrides for noisy events
const EVENT_RETENTION_OVERRIDES: Partial<
  Record<AppEvent, { maxPerUser?: number; maxPerEventPerUser?: number }>
> = {
  [AppEvent.XP_EARNED]: { maxPerEventPerUser: 25 },
  [AppEvent.CHAT_MESSAGE_RECEIVED]: { maxPerEventPerUser: 120 },
  [AppEvent.CHAT_REACTION_RECEIVED]: { maxPerEventPerUser: 60 },
  [AppEvent.STORY_LIKED]: { maxPerEventPerUser: 60 },
  [AppEvent.STUDY_PLAN_LIKED]: { maxPerEventPerUser: 60 },
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface EmitEventInput {
  event: AppEvent;
  userId: string;
  message: string;
  link?: string;
  titleOverride?: string;
  metadata?: Record<string, any>;
}

export interface EmitEventResult {
  success: boolean;
  notificationId?: string;
  channels: DeliveryChannel[];
  error?: string;
}

export interface BatchEmitInput {
  events: EmitEventInput[];
}

export interface UserNotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  mutedCategories: EventCategory[];
  mutedEvents: AppEvent[];
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string;
  emailDigestFrequency: "instant" | "daily" | "weekly" | "never";
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_PREFERENCES: Omit<UserNotificationPreferences, "userId"> = {
  emailEnabled: true,
  pushEnabled: true,
  inAppEnabled: true,
  mutedCategories: [],
  mutedEvents: [],
  emailDigestFrequency: "instant",
};

// ═══════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Emit a single application event
 * This is the main entry point for triggering notifications
 */
export async function emitEvent(input: EmitEventInput): Promise<EmitEventResult> {
  try {
    const meta = EVENT_META[input.event];
    if (!meta) {
      console.error(`Unknown event type: ${input.event}`);
      return { success: false, channels: [], error: "Unknown event type" };
    }

    // Get user preferences
    const preferences = await getUserPreferences(input.userId);

    // Check if event is muted
    if (isEventMuted(input.event, meta.category, preferences)) {
      return { success: true, channels: [], error: "Event muted by user preferences" };
    }

    // Check quiet hours
    if (isInQuietHours(preferences)) {
      // During quiet hours, only allow urgent events
      if (meta.priority !== "urgent") {
        // Queue for later delivery
        await queueNotification(input, preferences, meta);
        return { success: true, channels: [], error: "Queued for quiet hours" };
      }
    }

    // Determine which channels to use
    const channels = getActiveChannels(meta.defaultChannels, preferences);

    // Create in-app notification
    let notificationId: string | undefined;
    if (channels.includes("in_app")) {
      const result = await createInAppNotification(input, meta);
      notificationId = result.id;

      // Retention enforcement (best-effort)
      if (notificationId) {
        await enforceNotificationRetention(input.userId, input.event);
      }
    }

    // Queue email if enabled (only if user has email preferences set)
    if (channels.includes("email") && preferences.emailEnabled) {
      await queueEmailNotification(input, meta, preferences);
    }

    // Future: Handle push notifications
    // if (channels.includes("push") && preferences.pushEnabled) {
    //   await sendPushNotification(input, meta);
    // }

    // Log event for analytics
    await logEvent(input, channels);

    return {
      success: true,
      notificationId,
      channels,
    };
  } catch (err) {
    console.error("Error emitting event:", err);
    return {
      success: false,
      channels: [],
      error: err instanceof Error ? err.message : "Failed to emit event",
    };
  }
}

/**
 * Emit multiple events at once (batch processing)
 */
export async function emitEvents(input: BatchEmitInput): Promise<EmitEventResult[]> {
  const results = await Promise.all(input.events.map(emitEvent));
  return results;
}

/**
 * Emit an event for the current authenticated user
 */
export async function emitEventForCurrentUser(
  event: AppEvent,
  message: string,
  options?: {
    link?: string;
    titleOverride?: string;
    metadata?: Record<string, any>;
  }
): Promise<EmitEventResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, channels: [], error: "Unauthorized" };
  }

  return emitEvent({
    event,
    userId: user.id,
    message,
    ...options,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get user notification preferences
 */
async function getUserPreferences(userId: string): Promise<UserNotificationPreferences> {
  try {
    const { data } = await adminSupabase
      .from("notification_preferences")
      .select("*")
      .eq("userId", userId)
      .limit(1);

    if (data && data.length > 0) {
      return {
        userId,
        emailEnabled: data[0].emailEnabled ?? DEFAULT_PREFERENCES.emailEnabled,
        pushEnabled: data[0].pushEnabled ?? DEFAULT_PREFERENCES.pushEnabled,
        inAppEnabled: data[0].inAppEnabled ?? DEFAULT_PREFERENCES.inAppEnabled,
        mutedCategories: data[0].mutedCategories ?? DEFAULT_PREFERENCES.mutedCategories,
        mutedEvents: data[0].mutedEvents ?? DEFAULT_PREFERENCES.mutedEvents,
        quietHoursStart: data[0].quietHoursStart,
        quietHoursEnd: data[0].quietHoursEnd,
        emailDigestFrequency: data[0].emailDigestFrequency ?? DEFAULT_PREFERENCES.emailDigestFrequency,
      };
    }

    return { userId, ...DEFAULT_PREFERENCES };
  } catch (err) {
    console.error("Error fetching user preferences:", err);
    return { userId, ...DEFAULT_PREFERENCES };
  }
}

/**
 * Check if an event is muted by user preferences
 */
function isEventMuted(
  event: AppEvent,
  category: EventCategory,
  preferences: UserNotificationPreferences
): boolean {
  if (!preferences.inAppEnabled) return true;
  if (preferences.mutedEvents.includes(event)) return true;
  if (preferences.mutedCategories.includes(category)) return true;
  return false;
}

/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(preferences: UserNotificationPreferences): boolean {
  if (!preferences.quietHoursStart || !preferences.quietHoursEnd) return false;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const start = preferences.quietHoursStart;
  const end = preferences.quietHoursEnd;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  }

  return currentTime >= start && currentTime <= end;
}

/**
 * Get active delivery channels based on preferences
 */
function getActiveChannels(
  defaultChannels: DeliveryChannel[],
  preferences: UserNotificationPreferences
): DeliveryChannel[] {
  return defaultChannels.filter((channel) => {
    switch (channel) {
      case "in_app":
        return preferences.inAppEnabled;
      case "email":
        return preferences.emailEnabled;
      case "push":
        return preferences.pushEnabled;
      default:
        return true;
    }
  });
}

/**
 * Create in-app notification
 */
async function createInAppNotification(
  input: EmitEventInput,
  meta: typeof EVENT_META[AppEvent]
): Promise<{ id: string | undefined }> {
  try {
    const { data, error } = await adminSupabase
      .from("notifications")
      .insert({
        userId: input.userId,
        type: input.event,
        title: input.titleOverride || meta.defaultTitle,
        message: input.message,
        link: input.link || meta.actionUrl || null,
        metadata: input.metadata || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return { id: undefined };
    }

    return { id: data?.id || undefined };
  } catch (err) {
    console.error("Error creating in-app notification:", err);
    return { id: undefined };
  }
}

/**
 * Queue notification for later delivery (quiet hours)
 */
async function queueNotification(
  input: EmitEventInput,
  preferences: UserNotificationPreferences,
  meta?: typeof EVENT_META[AppEvent]
): Promise<void> {
  try {
    // Calculate delivery time (end of quiet hours)
    const deliverAt = preferences.quietHoursEnd
      ? getNextDeliveryTime(preferences.quietHoursEnd)
      : new Date();

    await adminSupabase.from("notification_queue").insert({
      userId: input.userId,
      event: input.event,
      title: input.titleOverride || meta?.defaultTitle || null,
      message: input.message,
      link: input.link,
      metadata: input.metadata,
      scheduledFor: deliverAt.toISOString(),
      status: "pending",
    });
  } catch (err) {
    console.error("Error queuing notification:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RETENTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getRetentionLimits(event: AppEvent): {
  maxPerUser: number;
  maxPerEventPerUser: number;
} {
  const override = EVENT_RETENTION_OVERRIDES[event];
  return {
    maxPerUser: override?.maxPerUser ?? MAX_NOTIFICATIONS_PER_USER_DEFAULT,
    maxPerEventPerUser:
      override?.maxPerEventPerUser ?? MAX_NOTIFICATIONS_PER_EVENT_PER_USER_DEFAULT,
  };
}

async function enforceNotificationRetention(userId: string, event: AppEvent): Promise<void> {
  try {
    const { maxPerUser, maxPerEventPerUser } = getRetentionLimits(event);

    // Global cap
    await pruneNotifications({ userId, limit: maxPerUser });

    // Per-event cap
    await pruneNotifications({ userId, event, limit: maxPerEventPerUser });
  } catch (err) {
    // Best-effort only
    console.error("Error enforcing notification retention:", err);
  }
}

async function pruneNotifications(params: {
  userId: string;
  limit: number;
  event?: AppEvent;
}): Promise<void> {
  const limit = Math.max(1, params.limit);

  let query = adminSupabase
    .from("notifications")
    .select("id")
    .eq("userId", params.userId)
    .order("createdAt", { ascending: false })
    .limit(limit + 1);

  if (params.event) {
    query = query.eq("type", params.event);
  }

  const { data } = await query;
  const rows = data || [];

  if (rows.length <= limit) return;

  const idsToDelete = rows.slice(limit).map((r: any) => r.id);
  if (idsToDelete.length === 0) return;

  await adminSupabase
    .from("notifications")
    .delete()
    .eq("userId", params.userId)
    .in("id", idsToDelete);
}

/**
 * Queue email notification for digest or immediate delivery
 */
async function queueEmailNotification(
  input: EmitEventInput,
  meta: typeof EVENT_META[AppEvent],
  preferences: UserNotificationPreferences
): Promise<void> {
  try {
    // For instant delivery, we'd send immediately
    // For digest, we queue for batch processing
    const isInstant = preferences.emailDigestFrequency === "instant";

    await adminSupabase.from("email_queue").insert({
      userId: input.userId,
      event: input.event,
      subject: input.titleOverride || meta.defaultTitle,
      message: input.message,
      link: input.link,
      metadata: input.metadata,
      digestType: preferences.emailDigestFrequency,
      status: isInstant ? "pending" : "queued_for_digest",
      createdAt: new Date().toISOString(),
    });

    // Future: Trigger immediate email send for instant delivery
    // if (isInstant) {
    //   await sendEmail(input, meta);
    // }
  } catch (err) {
    console.error("Error queuing email notification:", err);
  }
}

/**
 * Log event for analytics
 */
async function logEvent(input: EmitEventInput, channels: DeliveryChannel[]): Promise<void> {
  try {
    await adminSupabase.from("event_logs").insert({
      userId: input.userId,
      event: input.event,
      channels,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    // Silent fail for analytics - don't block main flow
    console.error("Error logging event:", err);
  }
}

/**
 * Calculate next delivery time based on quiet hours end
 */
function getNextDeliveryTime(quietHoursEnd: string): Date {
  const [hours, minutes] = quietHoursEnd.split(":").map(Number);
  const now = new Date();
  const deliverAt = new Date(now);

  deliverAt.setHours(hours, minutes, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  if (deliverAt <= now) {
    deliverAt.setDate(deliverAt.getDate() + 1);
  }

  return deliverAt;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS (for common events)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Notify user of achievement unlock
 */
export async function notifyAchievement(
  userId: string,
  achievementTitle: string,
  achievementIcon: string
): Promise<EmitEventResult> {
  return emitEvent({
    event: AppEvent.ACHIEVEMENT_UNLOCKED,
    userId,
    message: `${achievementIcon} You earned "${achievementTitle}"`,
    link: "/dashboard/community/leaderboard",
    metadata: { achievementTitle, achievementIcon },
  });
}

/**
 * Notify user of level up
 */
export async function notifyLevelUp(
  userId: string,
  newLevel: number,
  levelTitle: string
): Promise<EmitEventResult> {
  return emitEvent({
    event: AppEvent.LEVEL_UP,
    userId,
    message: `Congratulations! You reached Level ${newLevel}: ${levelTitle}`,
    link: "/dashboard",
    metadata: { newLevel, levelTitle },
  });
}

/**
 * Notify user of interview reminder
 */
export async function notifyInterviewReminder(
  userId: string,
  jobTitle: string,
  company: string,
  applicationId: string,
  interviewDate: Date,
  hoursUntil: number
): Promise<EmitEventResult> {
  const event = hoursUntil <= 1 ? AppEvent.INTERVIEW_REMINDER_1H : AppEvent.INTERVIEW_REMINDER_24H;
  const timeLabel = hoursUntil <= 1 ? "in 1 hour" : hoursUntil <= 24 ? "tomorrow" : `in ${Math.round(hoursUntil / 24)} days`;

  const dateStr = interviewDate.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return emitEvent({
    event,
    userId,
    titleOverride: `Interview ${timeLabel} 📅`,
    message: `${jobTitle} at ${company} - ${dateStr}`,
    link: `/dashboard/training?mode=interview&jobId=${applicationId}`,
    metadata: { jobTitle, company, applicationId, interviewDate: interviewDate.toISOString(), hoursUntil },
  });
}

/**
 * Notify user of application status change
 */
export async function notifyApplicationUpdate(
  userId: string,
  jobTitle: string,
  company: string,
  applicationId: string,
  newStatus: string,
  details: string
): Promise<EmitEventResult> {
  let event: AppEvent;

  switch (newStatus.toUpperCase()) {
    case "OFFERED":
      event = AppEvent.APPLICATION_OFFER_RECEIVED;
      break;
    case "ACCEPTED":
      event = AppEvent.APPLICATION_ACCEPTED;
      break;
    case "REJECTED":
      event = AppEvent.APPLICATION_REJECTED;
      break;
    case "WITHDRAWN":
      event = AppEvent.APPLICATION_WITHDRAWN;
      break;
    case "INTERVIEWING":
      event = AppEvent.INTERVIEW_SCHEDULED;
      break;
    default:
      event = AppEvent.APPLICATION_STATUS_CHANGED;
  }

  return emitEvent({
    event,
    userId,
    message: `${jobTitle} at ${company}: ${details}`,
    link: `/dashboard/jobs/${applicationId}`,
    metadata: { jobTitle, company, applicationId, newStatus },
  });
}

/**
 * Notify user of story interaction
 */
export async function notifyStoryLiked(
  userId: string,
  storyTitle: string,
  storyId: string
): Promise<EmitEventResult> {
  return emitEvent({
    event: AppEvent.STORY_LIKED,
    userId,
    message: `Your success story "${storyTitle}" received a new like`,
    link: `/dashboard/community/${storyId}`,
    metadata: { storyTitle, storyId },
  });
}

/**
 * Notify user of streak milestone
 */
export async function notifyStreakMilestone(
  userId: string,
  streakDays: number
): Promise<EmitEventResult> {
  return emitEvent({
    event: AppEvent.STREAK_MILESTONE,
    userId,
    message: `Amazing! You've practiced ${streakDays} days in a row`,
    link: "/dashboard",
    metadata: { streakDays },
  });
}

/**
 * Send welcome notification to new user
 */
export async function notifyWelcome(userId: string, userName: string): Promise<EmitEventResult> {
  return emitEvent({
    event: AppEvent.WELCOME,
    userId,
    message: `Welcome ${userName}! Let's start your job search journey.`,
    link: "/dashboard/onboarding/welcome",
    metadata: { userName },
  });
}

/**
 * Notify user of chat mention
 */
export async function notifyChatMention(
  userId: string,
  mentionedBy: string,
  roomName: string,
  roomSlug: string,
  messagePreview: string
): Promise<EmitEventResult> {
  return emitEvent({
    event: AppEvent.CHAT_MENTION,
    userId,
    message: `${mentionedBy} mentioned you in ${roomName}: "${messagePreview}"`,
    link: `/dashboard/community/hub/chat/${roomSlug}`,
    metadata: { mentionedBy, roomName, roomSlug, messagePreview },
  });
}

/**
 * Notify user of study plan comment
 */
export async function notifyStudyPlanComment(
  userId: string,
  commenterName: string,
  planTitle: string,
  planId: string,
  commentPreview: string
): Promise<EmitEventResult> {
  return emitEvent({
    event: AppEvent.STUDY_PLAN_COMMENT_RECEIVED,
    userId,
    message: `${commenterName} commented on "${planTitle}": "${commentPreview}"`,
    link: `/dashboard/study/community-plans/${planId}`,
    metadata: { commenterName, planTitle, planId, commentPreview },
  });
}
