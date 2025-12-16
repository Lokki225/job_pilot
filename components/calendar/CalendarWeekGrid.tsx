"use client";

import { Loader2 } from "lucide-react";
import type { CalendarEventData } from "@/lib/actions/calendar.action";
import { toDayKey } from "@/components/calendar/date-utils";
import { CalendarTimeGrid } from "@/components/calendar/CalendarTimeGrid";

export function CalendarWeekGrid(props: {
  isLoading: boolean;
  weekDays: Date[];
  viewDate: Date;
  eventsByDayKey: Map<string, CalendarEventData[]>;
  onDayClick: (day: Date) => void;
  onCreateRange: (start: Date, end: Date) => void;
  onEditEvent: (ev: CalendarEventData) => void;
  onEditSeries?: (ev: CalendarEventData) => void;
  onDeleteEvent: (ev: CalendarEventData) => void;
  onDeleteSeries?: (ev: CalendarEventData) => void;
}) {
  const { isLoading, weekDays, viewDate, eventsByDayKey, onDayClick, onCreateRange, onEditEvent, onEditSeries, onDeleteEvent, onDeleteSeries } = props;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <CalendarTimeGrid
      days={weekDays}
      eventsByDayKey={eventsByDayKey}
      onCreateRange={onCreateRange}
      onEditEvent={onEditEvent}
      onEditSeries={onEditSeries}
      onDeleteEvent={onDeleteEvent}
      onDeleteSeries={onDeleteSeries}
      dayHeader={(day) => {
        const isToday = toDayKey(day) === toDayKey(new Date());
        const isCurrentMonth = day.getMonth() === viewDate.getMonth();
        const label = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day);

        return (
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left text-xs font-medium text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onDayClick(day);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onDayClick(day);
              }
            }}
            aria-label={`Create event on ${day.toDateString()}`}
          >
            <span>{label}</span>
            <span
              className={
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold" +
                (isToday ? " bg-primary text-primary-foreground" : isCurrentMonth ? "" : " text-muted-foreground")
              }
            >
              {day.getDate()}
            </span>
          </button>
        );
      }}
    />
  );
}
