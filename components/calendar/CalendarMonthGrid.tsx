"use client";

/**
 * Month grid view.
 *
 * Stateless rendering of the 7x6 calendar grid with event chips and popovers.
 */

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CalendarEventData } from "@/lib/actions/calendar.action";
import { CATEGORY_META, getEventCategory } from "@/components/calendar/categories";
import { CalendarEventChip } from "@/components/calendar/CalendarEventChip";
import { formatTime, toDayKey } from "@/components/calendar/date-utils";

export function CalendarMonthGrid(props: {
  isLoading: boolean;
  calendarDays: Date[];
  viewDate: Date;
  eventsByDayKey: Map<string, CalendarEventData[]>;
  onDayClick: (day: Date) => void;
  onEditEvent: (ev: CalendarEventData) => void;
  onEditSeries?: (ev: CalendarEventData) => void;
  onDeleteEvent: (ev: CalendarEventData) => void;
  onDeleteSeries?: (ev: CalendarEventData) => void;
}) {
  const { isLoading, calendarDays, viewDate, eventsByDayKey, onDayClick, onEditEvent, onEditSeries, onDeleteEvent, onDeleteSeries } = props;

  return (
    <>
      <div className="grid grid-cols-7 border-b bg-muted/20 text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-3 py-2">
            {d}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const isCurrentMonth = day.getMonth() === viewDate.getMonth();
            const isToday = toDayKey(day) === toDayKey(new Date());
            const dayEvents = eventsByDayKey.get(toDayKey(day)) || [];
            const visibleEvents = dayEvents.slice(0, 3);
            const remainingCount = Math.max(0, dayEvents.length - visibleEvents.length);

            return (
              <div
                key={day.toISOString()}
                role="button"
                tabIndex={0}
                onClick={() => onDayClick(day)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onDayClick(day);
                  }
                }}
                className={
                  "group relative min-h-[110px] border-b border-r p-2 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" +
                  (isCurrentMonth ? "" : " bg-muted/10")
                }
                aria-label={`Create event on ${day.toDateString()}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold" +
                      (isToday ? " bg-primary text-primary-foreground" : "")
                    }
                  >
                    {day.getDate()}
                  </div>
                  <div className="opacity-0 transition-opacity group-hover:opacity-100">
                    <Badge variant="secondary" className="rounded-full">
                      +
                    </Badge>
                  </div>
                </div>

                <div className="mt-2 space-y-1">
                  {visibleEvents.map((ev) => {
                    const key = ev.renderKey || ev.id;
                    return (
                      <CalendarEventChip
                        key={key}
                        ev={ev}
                        onEditEvent={onEditEvent}
                        onEditSeries={onEditSeries}
                        onDeleteEvent={onDeleteEvent}
                        onDeleteSeries={onDeleteSeries}
                      />
                    );
                  })}

                  {remainingCount > 0 ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded-md border bg-muted/30 px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50"
                        >
                          +{remainingCount} more
                        </button>
                      </PopoverTrigger>
                      <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()} className="w-80">
                        <div className="space-y-2">
                          <div className="text-sm font-semibold">Events</div>
                          <div className="space-y-2">
                            {dayEvents.map((ev) => {
                              const key = ev.renderKey || ev.id;
                              const start = new Date(ev.startAt);
                              const time = !Number.isNaN(start.getTime()) ? formatTime(start, ev.timezone) : "";
                              const cat = getEventCategory(ev);
                              const catMeta = CATEGORY_META[cat];
                              return (
                                <div key={key} className="rounded-md border p-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium">
                                        {time ? `${time} ` : ""}
                                        {ev.title}
                                      </div>
                                      <div className="text-xs text-muted-foreground">{catMeta.label}</div>
                                    </div>
                                    <Badge variant="outline" className={catMeta.badgeClass}>
                                      {catMeta.label}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
