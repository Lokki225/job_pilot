"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CATEGORY_META, getEventCategory } from "@/components/calendar/categories";
import { formatTime } from "@/components/calendar/date-utils";
import type { CalendarEventData } from "@/lib/actions/calendar.action";
import { CalendarEventReminders } from "@/components/calendar/CalendarEventReminders";

export function CalendarEventPopover(props: {
  ev: CalendarEventData;
  onEditEvent: (ev: CalendarEventData) => void;
  onEditSeries?: (ev: CalendarEventData) => void;
  onDeleteEvent: (ev: CalendarEventData) => void;
  onDeleteSeries?: (ev: CalendarEventData) => void;
  children: ReactNode;
}) {
  const { ev, onEditEvent, onEditSeries, onDeleteEvent, onDeleteSeries, children } = props;
  const [open, setOpen] = useState(false);

  const start = new Date(ev.startAt);
  const end = new Date(ev.endAt);
  const time = !Number.isNaN(start.getTime()) ? formatTime(start, ev.timezone) : "";
  const timeEnd = !Number.isNaN(end.getTime()) ? formatTime(end, ev.timezone) : "";

  const cat = getEventCategory(ev);
  const catMeta = CATEGORY_META[cat];

  const isOccurrence = Boolean(ev.seriesId && ev.overrideOfStartAt);
  const canSeriesActions = isOccurrence && (typeof onEditSeries === "function" || typeof onDeleteSeries === "function");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        className="w-80"
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{ev.title}</div>
              <div className="text-xs text-muted-foreground">{time && timeEnd ? `${time} – ${timeEnd}` : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={catMeta.badgeClass}>
                {catMeta.label}
              </Badge>
              {ev.type !== "EVENT" ? <Badge variant="outline">{ev.type}</Badge> : null}
            </div>
          </div>

          {ev.location ? <div className="text-sm text-muted-foreground">{ev.location}</div> : null}
          {ev.description ? <div className="text-sm text-muted-foreground">{ev.description}</div> : null}

          <CalendarEventReminders ev={ev} open={open} />

          <div className="flex items-center justify-end gap-2 pt-2">
            {canSeriesActions ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      onEditEvent(ev);
                    }}
                  >
                    Edit this occurrence
                  </DropdownMenuItem>
                  {typeof onEditSeries === "function" ? (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.stopPropagation();
                        setOpen(false);
                        onEditSeries(ev);
                      }}
                    >
                      Edit series
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      onDeleteEvent(ev);
                    }}
                  >
                    Delete this occurrence
                  </DropdownMenuItem>
                  {typeof onDeleteSeries === "function" ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={(e) => {
                        e.stopPropagation();
                        setOpen(false);
                        onDeleteSeries(ev);
                      }}
                    >
                      Delete series
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    onEditEvent(ev);
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    onDeleteEvent(ev);
                  }}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
