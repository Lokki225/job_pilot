"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { expandRecurrenceStarts, parseRecurrenceRule, serializeRecurrenceRule } from "@/lib/calendar/recurrence";

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
  seriesId?: string | null;
  overrideOfStartAt?: string | null;
  recurrenceExceptions?: any;
  metadata: Record<string, any>;
  renderKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventReminderData {
  id: string;
  eventId: string;
  userId: string;
  remindAt: string;
  occurrenceStartAt?: string | null;
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
    recurrenceRule: z.union([z.string().trim().max(2000), z.record(z.string(), z.any())]).optional(),
    seriesId: z.string().uuid().optional().nullable(),
    overrideOfStartAt: z.string().optional().nullable(),
    recurrenceExceptions: z.array(z.string()).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .strict();

const CreateCalendarEventReminderSchema = z
  .object({
    eventId: z.string().uuid(),
    remindAt: z.string().min(1),
    occurrenceStartAt: z.string().optional().nullable(),
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
    recurrenceRule: z.union([z.string().trim().max(2000), z.record(z.string(), z.any())]).optional().nullable(),
    seriesId: z.string().uuid().optional().nullable(),
    overrideOfStartAt: z.string().optional().nullable(),
    recurrenceExceptions: z.array(z.string()).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .strict();

function toIso(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString();
}

type NormalizeRecurrenceResult =
  | { ok: true; value: string | null | undefined }
  | { ok: false; error: string };

function normalizeRecurrenceRuleInput(value: unknown): NormalizeRecurrenceResult {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return { ok: true, value: null };

    const parsed = parseRecurrenceRule(trimmed);
    if (!parsed) return { ok: false, error: "Invalid recurrence rule" };

    return { ok: true, value: serializeRecurrenceRule(parsed) };
  }

  const parsed = parseRecurrenceRule(value);
  if (!parsed) return { ok: false, error: "Invalid recurrence rule" };

  return { ok: true, value: serializeRecurrenceRule(parsed) };
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

    const startDate = new Date(startIso);
    const endDate = new Date(endIso);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      return { data: null, error: "Invalid date" };
    }

    const overlapsRange = (ev: { startAt: string; endAt: string }) => {
      const s = new Date(ev.startAt).getTime();
      const e = new Date(ev.endAt).getTime();
      if (Number.isNaN(s) || Number.isNaN(e)) return false;
      return s < endDate.getTime() && e > startDate.getTime();
    };

    const seen = new Set<string>();
    const pushUnique = (ev: CalendarEventData) => {
      const key = ev.renderKey || ev.id;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(ev);
    };

    const out: CalendarEventData[] = [];

    const { data: standalone, error: standaloneError } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("userId", user.id)
      .is("seriesId", null)
      .is("recurrenceRule", null)
      .lt("startAt", endIso)
      .gt("endAt", startIso)
      .order("startAt", { ascending: true });

    if (standaloneError) return { data: null, error: standaloneError.message };
    for (const ev of (standalone || []) as CalendarEventData[]) {
      pushUnique({ ...ev, renderKey: ev.id });
    }

    const { data: seriesRoots, error: seriesError } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("userId", user.id)
      .is("seriesId", null)
      .not("recurrenceRule", "is", null)
      .lt("startAt", endIso)
      .order("startAt", { ascending: true });

    if (seriesError) return { data: null, error: seriesError.message };

    const rootEvents = (seriesRoots || []) as CalendarEventData[];
    const rootIds = rootEvents.map((r) => r.id);

    if (rootIds.length > 0) {
      const { data: overridesByStart, error: overridesByStartError } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("userId", user.id)
        .in("seriesId", rootIds)
        .lt("startAt", endIso)
        .gt("endAt", startIso);

      if (overridesByStartError) return { data: null, error: overridesByStartError.message };

      const { data: overridesByOccurrence, error: overridesByOccurrenceError } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("userId", user.id)
        .in("seriesId", rootIds)
        .gte("overrideOfStartAt", startIso)
        .lt("overrideOfStartAt", endIso);

      if (overridesByOccurrenceError) return { data: null, error: overridesByOccurrenceError.message };

      const allOverrides = [...((overridesByStart || []) as CalendarEventData[]), ...((overridesByOccurrence || []) as CalendarEventData[])];

      const overridesBySeries = new Map<string, CalendarEventData[]>();
      for (const ov of allOverrides) {
        const sid = ov.seriesId || "";
        if (!sid) continue;
        const arr = overridesBySeries.get(sid) || [];
        arr.push(ov);
        overridesBySeries.set(sid, arr);
      }

      for (const ov of (overridesByStart || []) as CalendarEventData[]) {
        pushUnique({ ...ov, renderKey: `${ov.id}:${ov.overrideOfStartAt || ov.startAt}` });
      }

      for (const root of rootEvents) {
        const rule = parseRecurrenceRule(root.recurrenceRule);
        if (!rule) continue;

        const rootStart = new Date(root.startAt);
        const rootEnd = new Date(root.endAt);
        if (Number.isNaN(rootStart.getTime()) || Number.isNaN(rootEnd.getTime())) continue;

        const durationMs = Math.max(1, rootEnd.getTime() - rootStart.getTime());
        const exceptionValues = Array.isArray(root.recurrenceExceptions) ? root.recurrenceExceptions : [];
        const exceptions = new Set<string>(exceptionValues.map((v: any) => (typeof v === "string" ? toIso(v) : "")).filter(Boolean));

        const seriesOverrides = overridesBySeries.get(root.id) || [];
        const overrideMap = new Map<string, CalendarEventData>();
        for (const ov of seriesOverrides) {
          if (!ov.overrideOfStartAt) continue;
          overrideMap.set(toIso(ov.overrideOfStartAt), ov);
        }

        const occurrenceStarts = expandRecurrenceStarts({
          seriesStartAt: root.startAt,
          rule,
          rangeStartAt: startIso,
          rangeEndAt: endIso,
        });

        for (const occurrenceStartAt of occurrenceStarts) {
          const occIso = toIso(occurrenceStartAt);

          const ov = overrideMap.get(occIso);
          if (ov) {
            if (overlapsRange(ov)) {
              pushUnique({ ...ov, renderKey: `${ov.id}:${ov.overrideOfStartAt || ov.startAt}` });
            }
            continue;
          }

          if (exceptions.has(occIso)) continue;

          const occStart = new Date(occIso);
          if (Number.isNaN(occStart.getTime())) continue;
          const occEnd = new Date(occStart.getTime() + durationMs);

          const occurrence: CalendarEventData = {
            ...root,
            recurrenceRule: null,
            seriesId: root.id,
            overrideOfStartAt: occIso,
            startAt: occIso,
            endAt: occEnd.toISOString(),
            renderKey: `${root.id}:${occIso}`,
          };

          pushUnique(occurrence);
        }
      }
    }

    out.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    return { data: out, error: null };
  } catch (err) {
    console.error("Error getting calendar events:", err);
    return { data: null, error: "Failed to load calendar events" };
  }
}

export async function getCalendarEventById(eventId: string): Promise<{ data: CalendarEventData | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("id", eventId)
      .eq("userId", user.id)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: "Event not found" };
    return { data: data as CalendarEventData, error: null };
  } catch (err) {
    console.error("Error getting calendar event:", err);
    return { data: null, error: "Failed to load calendar event" };
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

    const normalizedRecurrence = normalizeRecurrenceRuleInput(parsed.data.recurrenceRule);
    if (!normalizedRecurrence.ok) return { data: null, error: normalizedRecurrence.error };

    if (parsed.data.seriesId && (normalizedRecurrence.value ?? null)) {
      return { data: null, error: "Overrides cannot define recurrence rules" };
    }

    if (parsed.data.overrideOfStartAt && !parsed.data.seriesId) {
      return { data: null, error: "overrideOfStartAt requires seriesId" };
    }

    if (parsed.data.seriesId && !parsed.data.overrideOfStartAt) {
      return { data: null, error: "seriesId requires overrideOfStartAt" };
    }

    const insert: Record<string, any> = {
      userId: user.id,
      type: parsed.data.type ?? "EVENT",
      title: parsed.data.title,
      description: parsed.data.description || null,
      location: parsed.data.location || null,
      startAt,
      endAt,
      timezone: parsed.data.timezone ?? "UTC",
      recurrenceRule: normalizedRecurrence.value ?? null,
      metadata: parsed.data.metadata || {},
    };

    if (parsed.data.seriesId !== undefined) insert.seriesId = parsed.data.seriesId;
    if (parsed.data.overrideOfStartAt !== undefined) {
      insert.overrideOfStartAt = parsed.data.overrideOfStartAt ? toIso(parsed.data.overrideOfStartAt) : null;
    }
    if (parsed.data.recurrenceExceptions !== undefined) {
      insert.recurrenceExceptions = parsed.data.recurrenceExceptions.map((v) => toIso(v));
    }

    const { data, error } = await supabase
      .from("calendar_events")
      .insert(insert)
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

    if (
      Object.prototype.hasOwnProperty.call(update, "seriesId") &&
      Object.prototype.hasOwnProperty.call(update, "recurrenceRule") &&
      update.seriesId &&
      update.recurrenceRule
    ) {
      return { data: null, error: "Overrides cannot define recurrence rules" };
    }

    if (Object.prototype.hasOwnProperty.call(update, "seriesId") && update.seriesId && !update.overrideOfStartAt) {
      return { data: null, error: "seriesId requires overrideOfStartAt" };
    }

    if (Object.prototype.hasOwnProperty.call(update, "overrideOfStartAt") && update.overrideOfStartAt && !update.seriesId) {
      const { data: existing, error: existingError } = await supabase
        .from("calendar_events")
        .select("id,seriesId")
        .eq("id", eventId)
        .maybeSingle();

      if (existingError) return { data: null, error: existingError.message };
      if (!existing) return { data: null, error: "Event not found" };
      if (!existing.seriesId) return { data: null, error: "overrideOfStartAt requires seriesId" };

      update.seriesId = existing.seriesId;
    }

    if (typeof update.startAt === "string") update.startAt = toIso(update.startAt);
    if (typeof update.endAt === "string") update.endAt = toIso(update.endAt);

    if (Object.prototype.hasOwnProperty.call(update, "overrideOfStartAt")) {
      update.overrideOfStartAt = update.overrideOfStartAt ? toIso(update.overrideOfStartAt) : null;
    }

    if (Object.prototype.hasOwnProperty.call(update, "recurrenceRule")) {
      const normalizedRecurrence = normalizeRecurrenceRuleInput(update.recurrenceRule);
      if (!normalizedRecurrence.ok) return { data: null, error: normalizedRecurrence.error };
      update.recurrenceRule = normalizedRecurrence.value ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(update, "recurrenceExceptions") && Array.isArray(update.recurrenceExceptions)) {
      update.recurrenceExceptions = update.recurrenceExceptions.map((v: string) => toIso(v));
    }

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

export async function getCalendarEventReminders(params: {
  eventId: string;
  occurrenceStartAt?: string | null;
}): Promise<{
  data: CalendarEventReminderData[] | null;
  error: string | null;
}> {
  try {
    const parsedEventId = z.string().uuid().safeParse(params.eventId);
    if (!parsedEventId.success) return { data: null, error: "Invalid event" };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    let query = supabase.from("calendar_event_reminders").select("*").eq("eventId", parsedEventId.data);
    if (params.occurrenceStartAt === null) {
      query = query.is("occurrenceStartAt", null);
    } else if (typeof params.occurrenceStartAt === "string" && params.occurrenceStartAt.trim()) {
      query = query.eq("occurrenceStartAt", toIso(params.occurrenceStartAt));
    }

    const { data, error } = await query.order("remindAt", { ascending: true });

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

    const occurrenceStartAt = parsed.data.occurrenceStartAt ? toIso(parsed.data.occurrenceStartAt) : null;

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
        occurrenceStartAt,
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

const OccurrenceOverridePatchSchema = z
  .object({
    type: z.enum(["EVENT", "REMINDER", "INTERVIEW_SESSION"]).optional(),
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    location: z.string().trim().max(500).optional().nullable(),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
    timezone: z.string().trim().min(1).max(100).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .strict();

async function resolveSeriesRootId(supabase: any, eventId: string): Promise<string | null> {
  const { data: ev, error } = await supabase
    .from("calendar_events")
    .select("id,seriesId")
    .eq("id", eventId)
    .maybeSingle();

  if (error) return null;
  if (!ev) return null;
  return (ev.seriesId as string | null) ?? (ev.id as string);
}

export async function deleteCalendarEventSeries(eventId: string): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: false, error: "Unauthorized" };

    const rootId = await resolveSeriesRootId(supabase, eventId);
    if (!rootId) return { data: false, error: "Event not found" };

    const { error } = await supabase.from("calendar_events").delete().eq("id", rootId);
    if (error) return { data: false, error: error.message };

    return { data: true, error: null };
  } catch (err) {
    console.error("Error deleting calendar event series:", err);
    return { data: false, error: "Failed to delete event series" };
  }
}

export async function deleteCalendarEventOccurrence(params: {
  seriesEventId: string;
  occurrenceStartAt: string;
}): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: false, error: "Unauthorized" };

    const occurrenceIso = toIso(params.occurrenceStartAt);
    const rootId = await resolveSeriesRootId(supabase, params.seriesEventId);
    if (!rootId) return { data: false, error: "Event not found" };

    const { data: root, error: rootError } = await supabase
      .from("calendar_events")
      .select("id,recurrenceRule,recurrenceExceptions")
      .eq("id", rootId)
      .maybeSingle();

    if (rootError) return { data: false, error: rootError.message };
    if (!root) return { data: false, error: "Event not found" };
    if (!root.recurrenceRule) return { data: false, error: "Not a recurring series" };

    const { data: existingOverride, error: overrideLookupError } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("seriesId", rootId)
      .eq("overrideOfStartAt", occurrenceIso)
      .maybeSingle();

    if (overrideLookupError) return { data: false, error: overrideLookupError.message };

    if (existingOverride?.id) {
      const { error: deleteOverrideError } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", existingOverride.id);

      if (deleteOverrideError) return { data: false, error: deleteOverrideError.message };
    }

    const current = Array.isArray(root.recurrenceExceptions) ? root.recurrenceExceptions : [];
    const next = current.includes(occurrenceIso) ? current : [...current, occurrenceIso].sort();

    const { error: updateError } = await supabase
      .from("calendar_events")
      .update({ recurrenceExceptions: next })
      .eq("id", rootId);

    if (updateError) return { data: false, error: updateError.message };

    return { data: true, error: null };
  } catch (err) {
    console.error("Error deleting calendar event occurrence:", err);
    return { data: false, error: "Failed to delete occurrence" };
  }
}

export async function upsertCalendarEventOccurrenceOverride(params: {
  seriesEventId: string;
  occurrenceStartAt: string;
  patch: z.infer<typeof OccurrenceOverridePatchSchema>;
}): Promise<{ data: CalendarEventData | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Unauthorized" };

    const parsedPatch = OccurrenceOverridePatchSchema.safeParse(params.patch);
    if (!parsedPatch.success) return { data: null, error: "Invalid input" };

    const occurrenceIso = toIso(params.occurrenceStartAt);
    const rootId = await resolveSeriesRootId(supabase, params.seriesEventId);
    if (!rootId) return { data: null, error: "Event not found" };

    const { data: root, error: rootError } = await supabase
      .from("calendar_events")
      .select("id,type,title,description,location,startAt,endAt,timezone,recurrenceRule,recurrenceExceptions,metadata")
      .eq("id", rootId)
      .maybeSingle();

    if (rootError) return { data: null, error: rootError.message };
    if (!root) return { data: null, error: "Event not found" };
    if (!root.recurrenceRule) return { data: null, error: "Not a recurring series" };

    const rootStart = new Date(root.startAt);
    const rootEnd = new Date(root.endAt);
    const occurrenceStart = new Date(occurrenceIso);
    if (Number.isNaN(rootStart.getTime()) || Number.isNaN(rootEnd.getTime()) || Number.isNaN(occurrenceStart.getTime())) {
      return { data: null, error: "Invalid date" };
    }

    const durationMs = Math.max(1, rootEnd.getTime() - rootStart.getTime());
    const defaultStartAt = occurrenceStart.toISOString();
    const defaultEndAt = new Date(occurrenceStart.getTime() + durationMs).toISOString();

    const startAt = parsedPatch.data.startAt ? toIso(parsedPatch.data.startAt) : defaultStartAt;
    const endAt = parsedPatch.data.endAt ? toIso(parsedPatch.data.endAt) : defaultEndAt;

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return { data: null, error: "Invalid date" };
    if (endDate <= startDate) return { data: null, error: "End time must be after start time" };

    const overrideBase: Record<string, any> = {
      type: parsedPatch.data.type ?? root.type,
      title: parsedPatch.data.title ?? root.title,
      description: Object.prototype.hasOwnProperty.call(parsedPatch.data, "description") ? parsedPatch.data.description : root.description,
      location: Object.prototype.hasOwnProperty.call(parsedPatch.data, "location") ? parsedPatch.data.location : root.location,
      startAt,
      endAt,
      timezone: parsedPatch.data.timezone ?? root.timezone,
      metadata: parsedPatch.data.metadata ?? (root.metadata || {}),
      recurrenceRule: null,
      seriesId: rootId,
      overrideOfStartAt: occurrenceIso,
    };

    const { data: existingOverride, error: overrideLookupError } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("seriesId", rootId)
      .eq("overrideOfStartAt", occurrenceIso)
      .maybeSingle();

    if (overrideLookupError) return { data: null, error: overrideLookupError.message };

    let saved: any = null;
    if (existingOverride?.id) {
      const { data, error } = await supabase
        .from("calendar_events")
        .update(overrideBase)
        .eq("id", existingOverride.id)
        .select("*")
        .single();

      if (error) return { data: null, error: error.message };
      saved = data;
    } else {
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({
          userId: user.id,
          ...overrideBase,
        })
        .select("*")
        .single();

      if (error) return { data: null, error: error.message };
      saved = data;
    }

    const current = Array.isArray(root.recurrenceExceptions) ? root.recurrenceExceptions : [];
    if (current.includes(occurrenceIso)) {
      const next = current.filter((v: string) => v !== occurrenceIso);
      const { error: updateError } = await supabase
        .from("calendar_events")
        .update({ recurrenceExceptions: next })
        .eq("id", rootId);

      if (updateError) return { data: null, error: updateError.message };
    }

    return { data: saved as CalendarEventData, error: null };
  } catch (err) {
    console.error("Error upserting calendar event occurrence override:", err);
    return { data: null, error: "Failed to update occurrence" };
  }
}
