"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CalendarEventData } from "@/lib/actions/calendar.action";
import { CATEGORY_META, getEventCategory } from "@/components/calendar/categories";
import { formatTime, toDayKey } from "@/components/calendar/date-utils";
import { CalendarEventPopover } from "@/components/calendar/CalendarEventPopover";

type DragState = {
  dayKey: string;
  day: Date;
  startMin: number;
  currentMin: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function snapMinutes(minutes: number, step: number) {
  return Math.round(minutes / step) * step;
}

function startOfDayLocal(day: Date) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
}

function addMinutes(date: Date, minutes: number) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

export function CalendarTimeGrid(props: {
  days: Date[];
  eventsByDayKey: Map<string, CalendarEventData[]>;
  onCreateRange: (start: Date, end: Date) => void;
  onEditEvent: (ev: CalendarEventData) => void;
  onDeleteEvent: (ev: CalendarEventData) => void;
  dayHeader?: (day: Date) => ReactNode;
}) {
  const { days, eventsByDayKey, onCreateRange, onEditEvent, onDeleteEvent, dayHeader } = props;

  const HOUR_HEIGHT = 60;
  const STEP_MINUTES = 15;
  const MIN_DURATION_MINUTES = 30;

  const pxPerMinute = HOUR_HEIGHT / 60;
  const totalHeight = 24 * HOUR_HEIGHT;

  const gridTemplateColumns = useMemo(() => {
    return `64px repeat(${days.length}, minmax(220px, 1fr))`;
  }, [days.length]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 8 * HOUR_HEIGHT;
  }, [HOUR_HEIGHT]);

  function minutesFromClientY(dayColEl: HTMLDivElement, clientY: number) {
    const rect = dayColEl.getBoundingClientRect();
    const y = clientY - rect.top;
    const raw = y / pxPerMinute;
    return clamp(snapMinutes(raw, STEP_MINUTES), 0, 24 * 60);
  }

  function endFromSelection(startMin: number, endMin: number) {
    const s = clamp(startMin, 0, 24 * 60);
    const e = clamp(endMin, 0, 24 * 60);
    const a = Math.min(s, e);
    let b = Math.max(s, e);

    if (b - a < MIN_DURATION_MINUTES) {
      b = clamp(a + MIN_DURATION_MINUTES, 0, 24 * 60);
    }

    return { startMin: a, endMin: b };
  }

  return (
    <div ref={scrollRef} className="h-[70vh] overflow-auto">
      {dayHeader ? (
        <div className="sticky top-0 z-30 grid border-b bg-background" style={{ gridTemplateColumns }}>
          <div className="sticky left-0 z-40 border-r bg-background" />
          {days.map((day) => (
            <div key={day.toISOString()} className="border-r px-3 py-2">
              {dayHeader(day)}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid" style={{ gridTemplateColumns, height: totalHeight }}>
        <div className="sticky left-0 z-20 border-r bg-background">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="relative border-b px-2 text-[11px] text-muted-foreground" style={{ height: HOUR_HEIGHT }}>
              <span className="absolute -top-2 left-2">{String(h).padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayKey = toDayKey(day);
          const dayStart = startOfDayLocal(day);
          const dayEvents = eventsByDayKey.get(dayKey) || [];

          return (
            <div
              key={day.toISOString()}
              className="relative border-r"
              style={{ height: totalHeight }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                const col = e.currentTarget;
                col.setPointerCapture(e.pointerId);
                const m = minutesFromClientY(col, e.clientY);
                setDrag({ dayKey, day, startMin: m, currentMin: m });
              }}
              onPointerMove={(e) => {
                if (!drag || drag.dayKey !== dayKey) return;
                const col = e.currentTarget;
                const m = minutesFromClientY(col, e.clientY);
                setDrag((prev) => (prev && prev.dayKey === dayKey ? { ...prev, currentMin: m } : prev));
              }}
              onPointerUp={(e) => {
                if (!drag || drag.dayKey !== dayKey) return;
                const col = e.currentTarget;
                try {
                  col.releasePointerCapture(e.pointerId);
                } catch {
                  // ignore
                }

                const { startMin, endMin } = endFromSelection(drag.startMin, drag.currentMin);
                const start = addMinutes(dayStart, startMin);
                const end = addMinutes(dayStart, endMin);
                setDrag(null);
                onCreateRange(start, end);
              }}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-muted/60"
                  style={{ top: h * HOUR_HEIGHT }}
                  aria-hidden
                />
              ))}

              {dayEvents.map((ev) => {
                const start = new Date(ev.startAt);
                const end = new Date(ev.endAt);
                if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

                const startMin = clamp(start.getHours() * 60 + start.getMinutes(), 0, 24 * 60);
                const endMin = clamp(end.getHours() * 60 + end.getMinutes(), 0, 24 * 60);
                const top = Math.min(startMin, endMin) * pxPerMinute;
                const height = Math.max(22, Math.abs(endMin - startMin) * pxPerMinute);

                const cat = getEventCategory(ev);
                const catMeta = CATEGORY_META[cat];
                const time = !Number.isNaN(start.getTime()) ? formatTime(start, ev.timezone) : "";

                return (
                  <CalendarEventPopover key={ev.id} ev={ev} onEditEvent={onEditEvent} onDeleteEvent={onDeleteEvent}>
                    <button
                      type="button"
                      className={
                        "absolute left-1 right-1 z-10 rounded-md border border-l-4 bg-background/90 px-2 py-1 text-left text-xs shadow-sm transition-colors hover:bg-background " +
                        catMeta.chipBorderClass
                      }
                      style={{ top, height }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <div className="truncate font-medium">{ev.title}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{time}</div>
                    </button>
                  </CalendarEventPopover>
                );
              })}

              {drag && drag.dayKey === dayKey ? (() => {
                const { startMin, endMin } = endFromSelection(drag.startMin, drag.currentMin);
                const top = startMin * pxPerMinute;
                const height = Math.max(22, (endMin - startMin) * pxPerMinute);
                return (
                  <div
                    className="pointer-events-none absolute left-1 right-1 z-20 rounded-md border border-primary/40 bg-primary/15"
                    style={{ top, height }}
                    aria-hidden
                  />
                );
              })() : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
