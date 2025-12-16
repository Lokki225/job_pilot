"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type CalendarEventType = "EVENT" | "REMINDER" | "INTERVIEW_SESSION";

export type CalendarReminderChannel = "in_app" | "email" | "push";
export type CalendarReminderStatus = "PENDING" | "PROCESSING" | "SENT" | "CANCELLED" | "FAILED";

export interface CalendarEventData {
  id: string;
  userId: string;
  type: CalendarEventType;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  recurrenceRule: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventReminderData {
  id: string;
  eventId: string;
  userId: string;
  remindAt: string;
  channel: CalendarReminderChannel;
  status: CalendarReminderStatus;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const CreateCalendarEventSchema = z
  .object({
    type: z.enum(["EVENT", "REMINDER", "INTERVIEW_SESSION"]).optional(),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(5000).optional(),
    location: z.string().trim().max(500).optional(),
    startAt: z.string().min(1),
    endAt: z.string().min(1),
    timezone: z.string().trim().min(1).max(100).optional(),
    recurrenceRule: z.string().trim().max(500).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .strict();

const CreateCalendarEventReminderSchema = z
  .object({
    eventId: z.string().min(1),
    remindAt: z.string().min(1),
    channel: z.enum(["in_app", "email", "push"]).optional(),
  })
  .strict();

const UpdateCalendarEventSchema = z
  .object({
    type: z.enum(["EVENT", "REMINDER", "INTERVIEW_SESSION"]).optional(),
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    location: z.string().trim().max(500).optional().nullable(),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
    timezone: z.string().trim().min(1).max(100).optional(),
    recurrenceRule: z.string().trim().max(500).optional().nullable(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .strict();

function toIso(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString();
}

export async function getCalendarEvents(params: {
  startAt: string;
  endAt: string;
}): Promise<{ data: CalendarEventData[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const startIso = toIso(params.startAt);
    const endIso = toIso(params.endAt);

    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .gte("startAt", startIso)
      .lt("startAt", endIso)
      .order("startAt", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data || []) as CalendarEventData[], error: null };
  } catch (err) {
    console.error("Error getting calendar events:", err);
    return { data: null, error: "Failed to load calendar events" };
  }
}

export async function createCalendarEvent(input: z.infer<typeof CreateCalendarEventSchema>): Promise<{
  data: CalendarEventData | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const parsed = CreateCalendarEventSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: "Invalid input" };

    const startAt = toIso(parsed.data.startAt);
    const endAt = toIso(parsed.data.endAt);

    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { data: null, error: "Invalid date" };
    }
    if (end <= start) {
      return { data: null, error: "End time must be after start time" };
    }

    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        userId: user.id,
        type: parsed.data.type ?? "EVENT",
        title: parsed.data.title,
        description: parsed.data.description || null,
        location: parsed.data.location || null,
        startAt,
        endAt,
        timezone: parsed.data.timezone ?? "UTC",
        recurrenceRule: parsed.data.recurrenceRule || null,
        metadata: parsed.data.metadata || {},
      })
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as CalendarEventData, error: null };
  } catch (err) {
    console.error("Error creating calendar event:", err);
    return { data: null, error: "Failed to create event" };
  }
}

export async function updateCalendarEvent(
  eventId: string,
  patch: z.infer<typeof UpdateCalendarEventSchema>
): Promise<{ data: CalendarEventData | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const parsed = UpdateCalendarEventSchema.safeParse(patch);
    if (!parsed.success) return { data: null, error: "Invalid input" };
    if (Object.keys(parsed.data).length === 0) return { data: null, error: "No updates provided" };

    const update: Record<string, any> = { ...parsed.data };
    if (typeof update.startAt === "string") update.startAt = toIso(update.startAt);
    if (typeof update.endAt === "string") update.endAt = toIso(update.endAt);

    if (update.startAt && update.endAt) {
      const start = new Date(update.startAt);
      const end = new Date(update.endAt);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
        return { data: null, error: "End time must be after start time" };
      }
    }

    const { data, error } = await supabase
      .from("calendar_events")
      .update(update)
      .eq("id", eventId)
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as CalendarEventData, error: null };
  } catch (err) {
    console.error("Error updating calendar event:", err);
    return { data: null, error: "Failed to update event" };
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: false, error: "Unauthorized" };

    const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
    if (error) return { data: false, error: error.message };

    return { data: true, error: null };
  } catch (err) {
    console.error("Error deleting calendar event:", err);
    return { data: false, error: "Failed to delete event" };
  }
}

export async function getCalendarEventReminders(eventId: string): Promise<{
  data: CalendarEventReminderData[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { data, error } = await supabase
      .from("calendar_event_reminders")
      .select("*")
      .eq("eventId", eventId)
      .order("remindAt", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data || []) as CalendarEventReminderData[], error: null };
  } catch (err) {
    console.error("Error getting calendar reminders:", err);
    return { data: null, error: "Failed to load reminders" };
  }
}

export async function createCalendarEventReminder(
  input: z.infer<typeof CreateCalendarEventReminderSchema>
): Promise<{ data: CalendarEventReminderData | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const parsed = CreateCalendarEventReminderSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: "Invalid input" };

    const remindAt = toIso(parsed.data.remindAt);
    const remindDate = new Date(remindAt);
    if (Number.isNaN(remindDate.getTime())) return { data: null, error: "Invalid date" };

    const { data: event } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("id", parsed.data.eventId)
      .maybeSingle();

    if (!event) return { data: null, error: "Event not found" };

    const { data, error } = await supabase
      .from("calendar_event_reminders")
      .insert({
        eventId: parsed.data.eventId,
        userId: user.id,
        remindAt,
        channel: parsed.data.channel ?? "in_app",
        status: "PENDING",
      })
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as CalendarEventReminderData, error: null };
  } catch (err) {
    console.error("Error creating calendar reminder:", err);
    return { data: null, error: "Failed to create reminder" };
  }
}

export async function cancelCalendarEventReminder(reminderId: string): Promise<{
  data: CalendarEventReminderData | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("calendar_event_reminders")
      .update({ status: "CANCELLED", updatedAt: nowIso })
      .eq("id", reminderId)
      .eq("userId", user.id)
      .in("status", ["PENDING", "PROCESSING"])
      .select("*")
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: "Reminder not found" };

    return { data: data as CalendarEventReminderData, error: null };
  } catch (err) {
    console.error("Error cancelling calendar reminder:", err);
    return { data: null, error: "Failed to cancel reminder" };
  }
}
