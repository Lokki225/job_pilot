"use client";

import { Loader2 } from "lucide-react";
import type { CalendarEventData } from "@/lib/actions/calendar.action";
import { CalendarTimeGrid } from "@/components/calendar/CalendarTimeGrid";

export function CalendarDayView(props: {
  isLoading: boolean;
  day: Date;
  eventsByDayKey: Map<string, CalendarEventData[]>;
  onDayClick: (day: Date) => void;
  onCreateRange: (start: Date, end: Date) => void;
  onEditEvent: (ev: CalendarEventData) => void;
  onEditSeries?: (ev: CalendarEventData) => void;
  onDeleteEvent: (ev: CalendarEventData) => void;
  onDeleteSeries?: (ev: CalendarEventData) => void;
}) {
  const { isLoading, day, eventsByDayKey, onDayClick, onCreateRange, onEditEvent, onEditSeries, onDeleteEvent, onDeleteSeries } = props;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <CalendarTimeGrid
      days={[day]}
      eventsByDayKey={eventsByDayKey}
      onCreateRange={onCreateRange}
      onEditEvent={onEditEvent}
      onEditSeries={onEditSeries}
      onDeleteEvent={onDeleteEvent}
      onDeleteSeries={onDeleteSeries}
      dayHeader={(d) => {
        const label = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(d);

        return (
          <button
            type="button"
            className="w-full text-left text-xs font-medium text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onDayClick(d);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onDayClick(d);
              }
            }}
            aria-label={`Create event on ${d.toDateString()}`}
          >
            {label}
          </button>
        );
      }}
    />
  );
}
