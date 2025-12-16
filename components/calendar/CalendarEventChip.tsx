"use client";

import { CATEGORY_META, getEventCategory } from "@/components/calendar/categories";
import { formatTime } from "@/components/calendar/date-utils";
import type { CalendarEventData } from "@/lib/actions/calendar.action";
import { CalendarEventPopover } from "@/components/calendar/CalendarEventPopover";

export function CalendarEventChip(props: {
  ev: CalendarEventData;
  onEditEvent: (ev: CalendarEventData) => void;
  onEditSeries?: (ev: CalendarEventData) => void;
  onDeleteEvent: (ev: CalendarEventData) => void;
  onDeleteSeries?: (ev: CalendarEventData) => void;
}) {
  const { ev, onEditEvent, onEditSeries, onDeleteEvent, onDeleteSeries } = props;

  const start = new Date(ev.startAt);
  const end = new Date(ev.endAt);
  const time = !Number.isNaN(start.getTime()) ? formatTime(start, ev.timezone) : "";
  const cat = getEventCategory(ev);
  const catMeta = CATEGORY_META[cat];

  return (
    <CalendarEventPopover ev={ev} onEditEvent={onEditEvent} onEditSeries={onEditSeries} onDeleteEvent={onDeleteEvent} onDeleteSeries={onDeleteSeries}>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={
            "w-full rounded-md border border-l-4 bg-background/70 px-2 py-1 text-xs shadow-sm transition-colors hover:bg-background " +
            catMeta.chipBorderClass
          }
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 truncate font-medium">
              {time ? `${time} ` : ""}
              {ev.title}
            </div>
          </div>
        </button>
    </CalendarEventPopover>
  );
}
