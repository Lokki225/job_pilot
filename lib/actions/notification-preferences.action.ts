"use server";

import { adminSupabase, createClient } from "@/lib/supabase/server";
import { AppEvent, EventCategory, EVENT_CATEGORIES } from "@/lib/types/app-events";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface NotificationPreferencesData {
  id: string;
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
  mutedCategories: EventCategory[];
  mutedEvents: AppEvent[];
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTimezone: string | null;
  emailDigestFrequency: "instant" | "daily" | "weekly" | "never";
}

export interface UpdatePreferencesInput {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  smsEnabled?: boolean;
  mutedCategories?: EventCategory[];
  mutedEvents?: AppEvent[];
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  quietHoursTimezone?: string | null;
  emailDigestFrequency?: "instant" | "daily" | "weekly" | "never";
}

// ═══════════════════════════════════════════════════════════════════════════
// GET NOTIFICATION PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════

export async function getNotificationPreferences(): Promise<{
  data: NotificationPreferencesData | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data, error } = await adminSupabase
      .from("notification_preferences")
      .select("*")
      .eq("userId", user.id)
      .limit(1);

    if (error) {
      console.error("Error fetching notification preferences:", error);
      return { data: null, error: error.message };
    }

    // If no preferences exist, return defaults
    if (!data || data.length === 0) {
      return {
        data: {
          id: "",
          userId: user.id,
          emailEnabled: true,
          pushEnabled: true,
          inAppEnabled: true,
          smsEnabled: false,
          mutedCategories: [],
          mutedEvents: [],
          quietHoursStart: null,
          quietHoursEnd: null,
          quietHoursTimezone: null,
          emailDigestFrequency: "instant",
        },
        error: null,
      };
    }

    return {
      data: {
        id: data[0].id,
        userId: data[0].userId,
        emailEnabled: data[0].emailEnabled ?? true,
        pushEnabled: data[0].pushEnabled ?? true,
        inAppEnabled: data[0].inAppEnabled ?? true,
        smsEnabled: data[0].smsEnabled ?? false,
        mutedCategories: (data[0].mutedCategories as EventCategory[]) ?? [],
        mutedEvents: (data[0].mutedEvents as AppEvent[]) ?? [],
        quietHoursStart: data[0].quietHoursStart,
        quietHoursEnd: data[0].quietHoursEnd,
        quietHoursTimezone: data[0].quietHoursTimezone,
        emailDigestFrequency: data[0].emailDigestFrequency ?? "instant",
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting notification preferences:", err);
    return { data: null, error: "Failed to get notification preferences" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE NOTIFICATION PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════

export async function updateNotificationPreferences(
  input: UpdatePreferencesInput
): Promise<{ data: NotificationPreferencesData | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Check if preferences exist
    const { data: existing } = await adminSupabase
      .from("notification_preferences")
      .select("id")
      .eq("userId", user.id)
      .limit(1);

    let result;

    if (existing && existing.length > 0) {
      // Update existing
      result = await adminSupabase
        .from("notification_preferences")
        .update({
          ...input,
          updatedAt: new Date().toISOString(),
        })
        .eq("userId", user.id)
        .select()
        .single();
    } else {
      // Create new
      result = await adminSupabase
        .from("notification_preferences")
        .insert({
          userId: user.id,
          ...input,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error("Error updating notification preferences:", result.error);
      return { data: null, error: result.error.message };
    }

    return {
      data: {
        id: result.data.id,
        userId: result.data.userId,
        emailEnabled: result.data.emailEnabled ?? true,
        pushEnabled: result.data.pushEnabled ?? true,
        inAppEnabled: result.data.inAppEnabled ?? true,
        smsEnabled: result.data.smsEnabled ?? false,
        mutedCategories: (result.data.mutedCategories as EventCategory[]) ?? [],
        mutedEvents: (result.data.mutedEvents as AppEvent[]) ?? [],
        quietHoursStart: result.data.quietHoursStart,
        quietHoursEnd: result.data.quietHoursEnd,
        quietHoursTimezone: result.data.quietHoursTimezone,
        emailDigestFrequency: result.data.emailDigestFrequency ?? "instant",
      },
      error: null,
    };
  } catch (err) {
    console.error("Error updating notification preferences:", err);
    return { data: null, error: "Failed to update notification preferences" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MUTE/UNMUTE CATEGORY
// ═══════════════════════════════════════════════════════════════════════════

export async function toggleCategoryMute(
  category: EventCategory
): Promise<{ data: boolean; error: string | null }> {
  try {
    const prefs = await getNotificationPreferences();
    if (prefs.error || !prefs.data) {
      return { data: false, error: prefs.error || "Failed to get preferences" };
    }

    const currentMuted = prefs.data.mutedCategories || [];
    const isMuted = currentMuted.includes(category);

    const newMuted = isMuted
      ? currentMuted.filter((c) => c !== category)
      : [...currentMuted, category];

    const result = await updateNotificationPreferences({
      mutedCategories: newMuted,
    });

    return { data: !isMuted, error: result.error };
  } catch (err) {
    console.error("Error toggling category mute:", err);
    return { data: false, error: "Failed to toggle category mute" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MUTE/UNMUTE SPECIFIC EVENT
// ═══════════════════════════════════════════════════════════════════════════

export async function toggleEventMute(
  event: AppEvent
): Promise<{ data: boolean; error: string | null }> {
  try {
    const prefs = await getNotificationPreferences();
    if (prefs.error || !prefs.data) {
      return { data: false, error: prefs.error || "Failed to get preferences" };
    }

    const currentMuted = prefs.data.mutedEvents || [];
    const isMuted = currentMuted.includes(event);

    const newMuted = isMuted
      ? currentMuted.filter((e) => e !== event)
      : [...currentMuted, event];

    const result = await updateNotificationPreferences({
      mutedEvents: newMuted,
    });

    return { data: !isMuted, error: result.error };
  } catch (err) {
    console.error("Error toggling event mute:", err);
    return { data: false, error: "Failed to toggle event mute" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SET QUIET HOURS
// ═══════════════════════════════════════════════════════════════════════════

export async function setQuietHours(
  start: string | null,
  end: string | null,
  timezone?: string
): Promise<{ data: boolean; error: string | null }> {
  try {
    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (start && !timeRegex.test(start)) {
      return { data: false, error: "Invalid start time format. Use HH:MM" };
    }

    if (end && !timeRegex.test(end)) {
      return { data: false, error: "Invalid end time format. Use HH:MM" };
    }

    const result = await updateNotificationPreferences({
      quietHoursStart: start,
      quietHoursEnd: end,
      quietHoursTimezone: timezone || null,
    });

    return { data: !result.error, error: result.error };
  } catch (err) {
    console.error("Error setting quiet hours:", err);
    return { data: false, error: "Failed to set quiet hours" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SET EMAIL DIGEST FREQUENCY
// ═══════════════════════════════════════════════════════════════════════════

export async function setEmailDigestFrequency(
  frequency: "instant" | "daily" | "weekly" | "never"
): Promise<{ data: boolean; error: string | null }> {
  try {
    const result = await updateNotificationPreferences({
      emailDigestFrequency: frequency,
    });

    return { data: !result.error, error: result.error };
  } catch (err) {
    console.error("Error setting email digest frequency:", err);
    return { data: false, error: "Failed to set email digest frequency" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET AVAILABLE CATEGORIES (for UI)
// ═══════════════════════════════════════════════════════════════════════════

export async function getNotificationCategories(): Promise<{
  data: Array<{
    category: EventCategory;
    label: string;
    icon: string;
    description: string;
    isMuted: boolean;
  }>;
  error: string | null;
}> {
  try {
    const prefs = await getNotificationPreferences();
    const mutedCategories = prefs.data?.mutedCategories || [];

    const categories = Object.entries(EVENT_CATEGORIES).map(([key, value]) => ({
      category: key as EventCategory,
      label: value.label,
      icon: value.icon,
      description: value.description,
      isMuted: mutedCategories.includes(key as EventCategory),
    }));

    return { data: categories, error: null };
  } catch (err) {
    console.error("Error getting notification categories:", err);
    return { data: [], error: "Failed to get notification categories" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESET TO DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

export async function resetNotificationPreferences(): Promise<{
  data: boolean;
  error: string | null;
}> {
  try {
    const result = await updateNotificationPreferences({
      emailEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
      smsEnabled: false,
      mutedCategories: [],
      mutedEvents: [],
      quietHoursStart: null,
      quietHoursEnd: null,
      quietHoursTimezone: null,
      emailDigestFrequency: "instant",
    });

    return { data: !result.error, error: result.error };
  } catch (err) {
    console.error("Error resetting notification preferences:", err);
    return { data: false, error: "Failed to reset notification preferences" };
  }
}
