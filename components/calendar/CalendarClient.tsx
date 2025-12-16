"use client";

/**
 * CalendarClient
 *
 * Stateful month calendar container used by `/dashboard/calendar`.
 * Owns data fetching, navigation, search, and create/edit/delete flows.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CalendarEventData } from "@/lib/actions/calendar.action";
import {
  createCalendarEvent,
  createCalendarEventReminder,
  deleteCalendarEvent,
  deleteCalendarEventOccurrence,
  deleteCalendarEventSeries,
  getCalendarEventById,
  getCalendarEvents,
  upsertCalendarEventOccurrenceOverride,
  updateCalendarEvent,
} from "@/lib/actions/calendar.action";

import type { RecurrenceRule } from "@/lib/calendar/recurrence";
import { parseRecurrenceRule } from "@/lib/calendar/recurrence";

import { Button } from "@/components/ui/button";

import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarMonthCard } from "@/components/calendar/CalendarMonthCard";
import { CreateEventDialog, DeleteEventDialog, EditEventDialog } from "@/components/calendar/CalendarDialogs";
import { CalendarMonthGrid } from "@/components/calendar/CalendarMonthGrid";
import { CalendarRangeCard } from "@/components/calendar/CalendarRangeCard";
import { CalendarSidebar } from "@/components/calendar/CalendarSidebar";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CalendarViewTabs, type CalendarViewMode } from "@/components/calendar/CalendarViewTabs";
import { CalendarWeekGrid } from "@/components/calendar/CalendarWeekGrid";

import type { CalendarCategory } from "@/components/calendar/categories";

import {
  addDays,
  formatMonthTitle,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDayKey,
  toLocalDatetimeInputValue,
} from "@/components/calendar/date-utils";

import { getEventCategory } from "@/components/calendar/categories";

export function CalendarClient() {
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEventData | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<CalendarCategory>("personal");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editMetadataBase, setEditMetadataBase] = useState<Record<string, any>>({});
  const [editStartAt, setEditStartAt] = useState("");
  const [editEndAt, setEditEndAt] = useState("");
  const [editRecurrence, setEditRecurrence] = useState<RecurrenceRule | null>(null);
  const [editShowRecurrence, setEditShowRecurrence] = useState(true);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [deleteEvent, setDeleteEvent] = useState<CalendarEventData | null>(null);
  const [deleteEventTitle, setDeleteEventTitle] = useState("");
  const [deleteMode, setDeleteMode] = useState<"single" | "series">("single");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CalendarCategory>("personal");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);

  const [remind15m, setRemind15m] = useState(false);
  const [remind1h, setRemind1h] = useState(false);
  const [remind1d, setRemind1d] = useState(false);
  const [enableCustomReminder, setEnableCustomReminder] = useState(false);
  const [customRemindAt, setCustomRemindAt] = useState("");

  const [viewDate, setViewDate] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [icsCopied, setIcsCopied] = useState(false);

  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  useEffect(() => {
    try {
      setOrigin(window.location.origin);
    } catch {
      setOrigin("");
    }
  }, []);

  const gridRange = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = addDays(gridStart, 42);
    return { start: gridStart, end: gridEnd };
  }, [viewDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(viewDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [viewDate]);

  const dayDate = useMemo(() => {
    return startOfDay(viewDate);
  }, [viewDate]);

  const viewTitle = useMemo(() => {
    if (viewMode === "month") return formatMonthTitle(viewDate);

    if (viewMode === "week") {
      const start = startOfWeek(viewDate);
      const end = addDays(start, 6);
      const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
      const fmtYear = new Intl.DateTimeFormat(undefined, { year: "numeric" });
      return `${fmt.format(start)} – ${fmt.format(end)}, ${fmtYear.format(end)}`;
    }

    return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(
      viewDate
    );
  }, [viewDate, viewMode]);

  const queryRange = useMemo(() => {
    if (viewMode === "month") return gridRange;
    if (viewMode === "week") {
      const start = startOfWeek(viewDate);
      const end = addDays(start, 7);
      return { start, end };
    }
    const start = startOfDay(viewDate);
    const end = addDays(start, 1);
    return { start, end };
  }, [gridRange, viewDate, viewMode]);

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    let d = new Date(gridRange.start);
    while (d < gridRange.end) {
      days.push(new Date(d));
      d = addDays(d, 1);
    }
    return days;
  }, [gridRange.end, gridRange.start]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await getCalendarEvents({
        startAt: queryRange.start.toISOString(),
        endAt: queryRange.end.toISOString(),
      });

      if (res.error) {
        setError(res.error);
        setEvents([]);
        return;
      }

      setEvents(res.data || []);
    } catch (err) {
      console.error("Error loading calendar events:", err);
      setError("Failed to load calendar events");
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [queryRange.end, queryRange.start]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpdate() {
    if (!editEventId && !editEvent) return;
    if (!editTitle.trim() || !editStartAt || !editEndAt) return;

    setIsUpdating(true);
    setError(null);

    try {
      const startDate = new Date(editStartAt);
      const endDate = new Date(editEndAt);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        setError("Invalid date");
        return;
      }

      const isOccurrence = Boolean(editEvent?.seriesId && editEvent?.overrideOfStartAt);
      const res = isOccurrence
        ? await upsertCalendarEventOccurrenceOverride({
            seriesEventId: editEvent!.seriesId as string,
            occurrenceStartAt: editEvent!.overrideOfStartAt as string,
            patch: {
              title: editTitle.trim(),
              startAt: startDate.toISOString(),
              endAt: endDate.toISOString(),
              description: editDescription.trim() ? editDescription.trim() : null,
              location: editLocation.trim() ? editLocation.trim() : null,
              metadata: { ...editMetadataBase, category: editCategory },
            },
          })
        : await updateCalendarEvent(editEventId as string, {
            title: editTitle.trim(),
            startAt: startDate.toISOString(),
            endAt: endDate.toISOString(),
            description: editDescription.trim() ? editDescription.trim() : null,
            location: editLocation.trim() ? editLocation.trim() : null,
            metadata: { ...editMetadataBase, category: editCategory },
            ...(editShowRecurrence ? { recurrenceRule: editRecurrence } : {}),
          });

      if (res.error) {
        setError(res.error);
        return;
      }

      setIsEditOpen(false);
      setEditEventId(null);
      setEditEvent(null);
      setEditTitle("");
      setEditCategory("personal");
      setEditDescription("");
      setEditLocation("");
      setEditMetadataBase({});
      setEditStartAt("");
      setEditEndAt("");
      setEditRecurrence(null);
      setEditShowRecurrence(true);
      await load();
    } catch (err) {
      console.error("Error updating calendar event:", err);
      setError("Failed to update event");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteEventId && !deleteEvent) return;

    setIsDeleting(true);
    setError(null);

    try {
      const isOccurrence = Boolean(deleteEvent?.seriesId && deleteEvent?.overrideOfStartAt);
      const res = deleteMode === "series"
        ? await deleteCalendarEventSeries(deleteEventId as string)
        : isOccurrence
          ? await deleteCalendarEventOccurrence({
              seriesEventId: deleteEvent!.seriesId as string,
              occurrenceStartAt: deleteEvent!.overrideOfStartAt as string,
            })
          : await deleteCalendarEvent(deleteEventId as string);
      if (res.error) {
        setError(res.error);
        return;
      }

      setIsDeleteOpen(false);
      setDeleteEventId(null);
      setDeleteEvent(null);
      setDeleteEventTitle("");
      setDeleteMode("single");
      await load();
    } catch (err) {
      console.error("Error deleting calendar event:", err);
      setError("Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  }

  function prefillCreateForDate(date: Date) {
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(date);
    end.setHours(10, 0, 0, 0);

    setTitle("");
    setCategory("personal");
    setDescription("");
    setLocation("");
    setStartAt(toLocalDatetimeInputValue(start));
    setEndAt(toLocalDatetimeInputValue(end));
    setRecurrence(null);
    setRemind15m(false);
    setRemind1h(false);
    setRemind1d(false);
    setEnableCustomReminder(false);
    setCustomRemindAt("");
  }

  function prefillCreateForRange(start: Date, end: Date) {
    setTitle("");
    setCategory("personal");
    setDescription("");
    setLocation("");
    setStartAt(toLocalDatetimeInputValue(start));
    setEndAt(toLocalDatetimeInputValue(end));
    setRecurrence(null);
    setRemind15m(false);
    setRemind1h(false);
    setRemind1d(false);
    setEnableCustomReminder(false);
    setCustomRemindAt("");
  }

  function applyDurationToCreate(minutes: number) {
    const startDate = new Date(startAt);
    if (Number.isNaN(startDate.getTime())) return;
    const end = new Date(startDate.getTime() + minutes * 60 * 1000);
    setEndAt(toLocalDatetimeInputValue(end));
  }

  function applyDurationToEdit(minutes: number) {
    const startDate = new Date(editStartAt);
    if (Number.isNaN(startDate.getTime())) return;
    const end = new Date(startDate.getTime() + minutes * 60 * 1000);
    setEditEndAt(toLocalDatetimeInputValue(end));
  }

  function handleDayClick(date: Date) {
    setIsEditOpen(false);
    setIsDeleteOpen(false);
    prefillCreateForDate(date);
    setIsCreateOpen(true);
  }

  function handleCreateRange(start: Date, end: Date) {
    setIsEditOpen(false);
    setIsDeleteOpen(false);
    prefillCreateForRange(start, end);
    setIsCreateOpen(true);
  }

  function openEdit(ev: CalendarEventData) {
    setIsCreateOpen(false);
    setIsDeleteOpen(false);
    setEditEventId(ev.id);
    setEditEvent(ev);
    setEditTitle(ev.title || "");

    setEditCategory(getEventCategory(ev));
    setEditDescription(ev.description || "");
    setEditLocation(ev.location || "");
    setEditMetadataBase((ev.metadata as any) || {});

    const start = new Date(ev.startAt);
    const end = new Date(ev.endAt);
    setEditStartAt(!Number.isNaN(start.getTime()) ? toLocalDatetimeInputValue(start) : "");
    setEditEndAt(!Number.isNaN(end.getTime()) ? toLocalDatetimeInputValue(end) : "");

    const isOccurrence = Boolean(ev.seriesId && ev.overrideOfStartAt);
    setEditShowRecurrence(!isOccurrence);
    setEditRecurrence(!isOccurrence ? parseRecurrenceRule(ev.recurrenceRule) : null);

    setIsEditOpen(true);
  }

  async function openEditSeries(ev: CalendarEventData) {
    const rootId = ev.seriesId || ev.id;
    try {
      setError(null);
      const res = await getCalendarEventById(rootId);
      if (res.error || !res.data) {
        setError(res.error || "Failed to load series");
        return;
      }
      openEdit(res.data);
    } catch (err) {
      console.error("Error loading series:", err);
      setError("Failed to load series");
    }
  }

  function openDelete(ev: CalendarEventData) {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setDeleteEventId(ev.id);
    setDeleteEvent(ev);
    setDeleteEventTitle(ev.title || "this event");
    setDeleteMode("single");
    setIsDeleteOpen(true);
  }

  function openDeleteSeries(ev: CalendarEventData) {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    const rootId = ev.seriesId || ev.id;
    setDeleteEventId(rootId);
    setDeleteEvent(ev);
    setDeleteEventTitle(ev.title || "this event");
    setDeleteMode("series");
    setIsDeleteOpen(true);
  }

  async function handleCreate() {
    if (!title.trim() || !startAt || !endAt) return;

    setIsCreating(true);
    setError(null);

    try {
      const startDate = new Date(startAt);
      const endDate = new Date(endAt);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        setError("Invalid date");
        return;
      }

      const startAtIso = startDate.toISOString();
      const endAtIso = endDate.toISOString();

      const res = await createCalendarEvent({
        title: title.trim(),
        startAt: startAtIso,
        endAt: endAtIso,
        timezone,
        type: "EVENT",
        description: description.trim() ? description.trim() : undefined,
        location: location.trim() ? location.trim() : undefined,
        recurrenceRule: recurrence || undefined,
        metadata: { category },
      });

      if (res.error) {
        setError(res.error);
        return;
      }

      setIsCreateOpen(false);

      const created = res.data;
      if (created) {
        const start = new Date(created.startAt);
        if (!Number.isNaN(start.getTime())) {
          const reminderTimes = new Set<string>();

          if (remind15m) reminderTimes.add(new Date(start.getTime() - 15 * 60 * 1000).toISOString());
          if (remind1h) reminderTimes.add(new Date(start.getTime() - 60 * 60 * 1000).toISOString());
          if (remind1d) reminderTimes.add(new Date(start.getTime() - 24 * 60 * 60 * 1000).toISOString());

          if (enableCustomReminder && customRemindAt) {
            const custom = new Date(customRemindAt);
            if (!Number.isNaN(custom.getTime())) reminderTimes.add(custom.toISOString());
          }

          const reminderErrors: string[] = [];
          for (const remindAt of reminderTimes) {
            const reminderRes = await createCalendarEventReminder({
              eventId: created.id,
              remindAt,
              occurrenceStartAt: recurrence ? created.startAt : null,
              channel: "in_app",
            });

            if (reminderRes.error) reminderErrors.push(reminderRes.error);
          }

          if (reminderErrors.length > 0) {
            setError("Event created, but failed to create one or more reminders");
          }
        }
      }
      setTitle("");
      setCategory("personal");
      setDescription("");
      setLocation("");
      setStartAt("");
      setEndAt("");
      setRecurrence(null);
      setRemind15m(false);
      setRemind1h(false);
      setRemind1d(false);
      setEnableCustomReminder(false);
      setCustomRemindAt("");
      await load();
    } catch (err) {
      console.error("Error creating calendar event:", err);
      setError("Failed to create event");
    } finally {
      setIsCreating(false);
    }
  }

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => {
      const hay = `${e.title || ""} ${e.description || ""} ${e.location || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [events, search]);

  const eventsByDayKey = useMemo(() => {
    const map = new Map<string, CalendarEventData[]>();
    for (const ev of filteredEvents) {
      const d = new Date(ev.startAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = toDayKey(d);
      const arr = map.get(key) || [];
      arr.push(ev);
      map.set(key, arr);
    }

    for (const [key, arr] of map.entries()) {
      arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      map.set(key, arr);
    }

    return map;
  }, [filteredEvents]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return [...filteredEvents]
      .filter((e) => {
        const t = new Date(e.startAt).getTime();
        return !Number.isNaN(t) && t >= now;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 12);
  }, [filteredEvents]);

  const icsUrl = useMemo(() => {
    if (!origin) return "";
    return `${origin}/api/calendar/ics`;
  }, [origin]);

  const copyIcs = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(icsUrl);
      setIcsCopied(true);
      setTimeout(() => setIcsCopied(false), 1500);
    } catch {
      setIcsCopied(false);
    }
  }, [icsUrl]);

  return (
    <div className="container mx-auto max-w-6xl space-y-6">
      <CalendarHeader search={search} onSearchChange={setSearch}>
        <CalendarViewTabs value={viewMode} onValueChange={setViewMode} />
        <CreateEventDialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (open) {
              setIsEditOpen(false);
              setIsDeleteOpen(false);
            }
          }}
          onOpenPrefillToday={() => {
            prefillCreateForDate(new Date());
          }}
          title={title}
          setTitle={setTitle}
          category={category}
          setCategory={setCategory}
          description={description}
          setDescription={setDescription}
          location={location}
          setLocation={setLocation}
          startAt={startAt}
          setStartAt={setStartAt}
          endAt={endAt}
          setEndAt={setEndAt}
          timezone={timezone}
          recurrence={recurrence}
          setRecurrence={setRecurrence}
          applyDurationToCreate={applyDurationToCreate}
          remind15m={remind15m}
          setRemind15m={setRemind15m}
          remind1h={remind1h}
          setRemind1h={setRemind1h}
          remind1d={remind1d}
          setRemind1d={setRemind1d}
          enableCustomReminder={enableCustomReminder}
          setEnableCustomReminder={setEnableCustomReminder}
          customRemindAt={customRemindAt}
          setCustomRemindAt={setCustomRemindAt}
          isCreating={isCreating}
          onCreate={handleCreate}
        />

        <EditEventDialog
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (open) {
              setIsCreateOpen(false);
              setIsDeleteOpen(false);
            }
            if (!open) {
              setEditEventId(null);
              setEditEvent(null);
              setEditTitle("");
              setEditCategory("personal");
              setEditDescription("");
              setEditLocation("");
              setEditMetadataBase({});
              setEditStartAt("");
              setEditEndAt("");
              setEditRecurrence(null);
              setEditShowRecurrence(true);
            }
          }}
          editTitle={editTitle}
          setEditTitle={setEditTitle}
          editCategory={editCategory}
          setEditCategory={setEditCategory}
          editDescription={editDescription}
          setEditDescription={setEditDescription}
          editLocation={editLocation}
          setEditLocation={setEditLocation}
          editStartAt={editStartAt}
          setEditStartAt={setEditStartAt}
          editEndAt={editEndAt}
          setEditEndAt={setEditEndAt}
          timezone={timezone}
          showRecurrence={editShowRecurrence}
          recurrence={editRecurrence}
          setRecurrence={setEditRecurrence}
          applyDurationToEdit={applyDurationToEdit}
          isUpdating={isUpdating}
          onSave={handleUpdate}
        />

        <DeleteEventDialog
          open={isDeleteOpen}
          onOpenChange={(open) => {
            setIsDeleteOpen(open);
            if (open) {
              setIsCreateOpen(false);
              setIsEditOpen(false);
            }
            if (!open) {
              setDeleteEventId(null);
              setDeleteEvent(null);
              setDeleteEventTitle("");
              setDeleteMode("single");
            }
          }}
          deleteEventTitle={deleteEventTitle}
          deleteMode={deleteMode}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirmed}
        />
      </CalendarHeader>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <Button variant="link" className="ml-2 p-0" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {viewMode === "month" ? (
          <CalendarMonthCard
            title={viewTitle}
            onToday={() => {
              setViewDate(new Date());
            }}
            onPrevMonth={() => {
              const d = new Date(viewDate);
              d.setMonth(d.getMonth() - 1);
              setViewDate(d);
            }}
            onNextMonth={() => {
              const d = new Date(viewDate);
              d.setMonth(d.getMonth() + 1);
              setViewDate(d);
            }}
          >
            <CalendarMonthGrid
              isLoading={isLoading}
              calendarDays={calendarDays}
              viewDate={viewDate}
              eventsByDayKey={eventsByDayKey}
              onDayClick={handleDayClick}
              onEditEvent={openEdit}
              onEditSeries={openEditSeries}
              onDeleteEvent={openDelete}
              onDeleteSeries={openDeleteSeries}
            />
          </CalendarMonthCard>
        ) : (
          <CalendarRangeCard
            title={viewTitle}
            onToday={() => {
              setViewDate(new Date());
            }}
            onPrev={() => {
              setViewDate((d) => {
                if (viewMode === "week") return addDays(d, -7);
                return addDays(d, -1);
              });
            }}
            onNext={() => {
              setViewDate((d) => {
                if (viewMode === "week") return addDays(d, 7);
                return addDays(d, 1);
              });
            }}
          >
            {viewMode === "week" ? (
              <CalendarWeekGrid
                isLoading={isLoading}
                weekDays={weekDays}
                viewDate={viewDate}
                eventsByDayKey={eventsByDayKey}
                onDayClick={handleDayClick}
                onCreateRange={handleCreateRange}
                onEditEvent={openEdit}
                onEditSeries={openEditSeries}
                onDeleteEvent={openDelete}
                onDeleteSeries={openDeleteSeries}
              />
            ) : (
              <CalendarDayView
                isLoading={isLoading}
                day={dayDate}
                eventsByDayKey={eventsByDayKey}
                onDayClick={handleDayClick}
                onCreateRange={handleCreateRange}
                onEditEvent={openEdit}
                onEditSeries={openEditSeries}
                onDeleteEvent={openDelete}
                onDeleteSeries={openDeleteSeries}
              />
            )}
          </CalendarRangeCard>
        )}

        <CalendarSidebar upcomingEvents={upcomingEvents} icsUrl={icsUrl} icsCopied={icsCopied} onCopyIcs={copyIcs} />
      </div>
    </div>
  );
}
