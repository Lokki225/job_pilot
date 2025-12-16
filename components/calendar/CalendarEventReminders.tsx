"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { CalendarEventData, CalendarEventReminderData } from "@/lib/actions/calendar.action";
import {
  cancelCalendarEventReminder,
  createCalendarEventReminder,
  getCalendarEventReminders,
} from "@/lib/actions/calendar.action";
import { toLocalDatetimeInputValue } from "@/components/calendar/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatRemindAt(remindAt: string) {
  const d = new Date(remindAt);
  if (Number.isNaN(d.getTime())) return remindAt;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function minuteKey(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor(t / 60000);
}

function isUuid(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export function CalendarEventReminders(props: {
  ev: CalendarEventData;
  open: boolean;
}) {
  const { ev, open } = props;

  const [reminders, setReminders] = useState<CalendarEventReminderData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useMemo(() => new Date(ev.startAt), [ev.startAt]);
  const isStartValid = useMemo(() => !Number.isNaN(start.getTime()), [start]);

  const [customRemindAt, setCustomRemindAt] = useState(() => {
    if (!isStartValid) return "";
    const d = new Date(start.getTime() - 15 * 60 * 1000);
    return toLocalDatetimeInputValue(d);
  });

  useEffect(() => {
    if (!open) return;
    if (!isStartValid) {
      setCustomRemindAt("");
      return;
    }
    const d = new Date(start.getTime() - 15 * 60 * 1000);
    setCustomRemindAt(toLocalDatetimeInputValue(d));
  }, [open, isStartValid, start]);

  const refresh = useCallback(async () => {
    if (!isUuid(ev.id)) {
      setError("Invalid event");
      setReminders([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await getCalendarEventReminders({ eventId: ev.id, occurrenceStartAt: ev.overrideOfStartAt ?? null });
      if (res.error) {
        setError(res.error);
        setReminders([]);
        return;
      }
      setReminders(res.data || []);
    } catch (err) {
      console.error("Error loading reminders:", err);
      setError("Failed to load reminders");
      setReminders([]);
    } finally {
      setIsLoading(false);
    }
  }, [ev.id, ev.overrideOfStartAt]);

  useEffect(() => {
    if (!open) return;
    refresh();
  }, [open, refresh]);

  const existingIso = useMemo(() => {
    return new Set((reminders || []).map((r) => r.remindAt));
  }, [reminders]);

  const activeMinuteKeys = useMemo(() => {
    const set = new Set<number>();
    for (const r of reminders || []) {
      if (r.status === "CANCELLED") continue;
      const k = minuteKey(r.remindAt);
      if (k !== null) set.add(k);
    }
    return set;
  }, [reminders]);

  const preset15mKey = useMemo(() => (isStartValid ? minuteKey(new Date(start.getTime() - 15 * 60 * 1000)) : null), [isStartValid, start]);
  const preset1hKey = useMemo(() => (isStartValid ? minuteKey(new Date(start.getTime() - 60 * 60 * 1000)) : null), [isStartValid, start]);
  const preset1dKey = useMemo(
    () => (isStartValid ? minuteKey(new Date(start.getTime() - 24 * 60 * 60 * 1000)) : null),
    [isStartValid, start]
  );

  const preset15mActive = preset15mKey !== null ? activeMinuteKeys.has(preset15mKey) : false;
  const preset1hActive = preset1hKey !== null ? activeMinuteKeys.has(preset1hKey) : false;
  const preset1dActive = preset1dKey !== null ? activeMinuteKeys.has(preset1dKey) : false;

  async function addReminder(remindAt: Date) {
    if (Number.isNaN(remindAt.getTime())) return;

    if (!isUuid(ev.id)) {
      setError("Invalid event");
      return;
    }

    const iso = remindAt.toISOString();
    if (existingIso.has(iso)) return;
    const k = minuteKey(remindAt);
    if (k !== null && activeMinuteKeys.has(k)) return;

    setIsMutating(true);
    setError(null);

    try {
      const res = await createCalendarEventReminder({
        eventId: ev.id,
        remindAt: iso,
        occurrenceStartAt: ev.overrideOfStartAt ?? null,
        channel: "in_app",
      });

      if (res.error) {
        setError(res.error);
        return;
      }

      await refresh();
    } catch (err) {
      console.error("Error creating reminder:", err);
      setError("Failed to create reminder");
    } finally {
      setIsMutating(false);
    }
  }

  async function cancelReminder(reminderId: string) {
    setIsMutating(true);
    setError(null);

    try {
      const res = await cancelCalendarEventReminder(reminderId);
      if (res.error) {
        setError(res.error);
        return;
      }

      await refresh();
    } catch (err) {
      console.error("Error cancelling reminder:", err);
      setError("Failed to cancel reminder");
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Reminders</div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isLoading || isMutating}
          onClick={(e) => {
            e.stopPropagation();
            refresh();
          }}
        >
          Refresh
        </Button>
      </div>

      {error ? <div className="text-xs text-destructive">{error}</div> : null}

      {isLoading ? (
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading reminders...
        </div>
      ) : reminders.length === 0 ? (
        <div className="py-1 text-xs text-muted-foreground">No reminders yet.</div>
      ) : (
        <div className="max-h-32 space-y-2 overflow-auto pr-1">
          {reminders.map((r) => {
            const canCancel = r.status === "PENDING" || r.status === "PROCESSING";
            return (
              <div key={r.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">{formatRemindAt(r.remindAt)}</div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <Badge variant="outline" className="text-[10px]">
                      {r.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{r.channel}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canCancel || isMutating}
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelReminder(r.id);
                  }}
                >
                  Cancel
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 border-t pt-2">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!isStartValid || isMutating}
              aria-pressed={preset15mActive}
              className={preset15mActive ? "border-primary bg-primary/10 text-primary" : undefined}
              onClick={(e) => {
                e.stopPropagation();
                addReminder(new Date(start.getTime() - 15 * 60 * 1000));
              }}
            >
              15m before
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!isStartValid || isMutating}
              aria-pressed={preset1hActive}
              className={preset1hActive ? "border-primary bg-primary/10 text-primary" : undefined}
              onClick={(e) => {
                e.stopPropagation();
                addReminder(new Date(start.getTime() - 60 * 60 * 1000));
              }}
            >
              1h before
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!isStartValid || isMutating}
              aria-pressed={preset1dActive}
              className={preset1dActive ? "border-primary bg-primary/10 text-primary" : undefined}
              onClick={(e) => {
                e.stopPropagation();
                addReminder(new Date(start.getTime() - 24 * 60 * 60 * 1000));
              }}
            >
              1d before
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="datetime-local"
              value={customRemindAt}
              disabled={!isStartValid || isMutating}
              onChange={(e) => setCustomRemindAt(e.target.value)}
              onClick={(e) => {
                e.stopPropagation();
              }}
            />
            <Button
              type="button"
              size="sm"
              disabled={!customRemindAt || isMutating}
              onClick={(e) => {
                e.stopPropagation();
                const d = new Date(customRemindAt);
                addReminder(d);
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
