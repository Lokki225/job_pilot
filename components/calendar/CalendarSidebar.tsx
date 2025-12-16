"use client";

/**
 * Calendar sidebar.
 *
 * Shows the upcoming events list and the ICS subscription link.
 */

import { Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CalendarEventData } from "@/lib/actions/calendar.action";
import { CATEGORY_META, getEventCategory } from "@/components/calendar/categories";
import { formatTime } from "@/components/calendar/date-utils";

export function CalendarSidebar(props: {
  upcomingEvents: CalendarEventData[];
  icsUrl: string;
  icsCopied: boolean;
  onCopyIcs: () => Promise<void>;
}) {
  const { upcomingEvents, icsUrl, icsCopied, onCopyIcs } = props;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upcoming</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <div className="text-sm text-muted-foreground">No upcoming events.</div>
          ) : (
            <ScrollArea className="h-[420px] pr-2">
              <div className="space-y-3">
                {upcomingEvents.map((ev) => {
                  const key = ev.renderKey || ev.id;
                  const start = new Date(ev.startAt);
                  const end = new Date(ev.endAt);
                  const cat = getEventCategory(ev);
                  const catMeta = CATEGORY_META[cat];
                  const dateLabel = !Number.isNaN(start.getTime())
                    ? new Intl.DateTimeFormat(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      }).format(start)
                    : "";
                  const timeLabel =
                    !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
                      ? `${formatTime(start, ev.timezone)} – ${formatTime(end, ev.timezone)}`
                      : "";

                  return (
                    <div key={key} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${catMeta.dotClass}`} />
                            <div className="truncate font-medium">{ev.title}</div>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {dateLabel} {timeLabel ? `• ${timeLabel}` : ""}
                          </div>
                        </div>
                        <Badge variant="outline" className={catMeta.badgeClass}>
                          {catMeta.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Calendar feed (ICS)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">Use this link to subscribe from Apple Calendar / Google Calendar.</div>
          <div className="flex items-center gap-2">
            <Input value={icsUrl} readOnly />
            <Button type="button" variant="outline" size="icon" disabled={!icsUrl} onClick={onCopyIcs}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {icsCopied ? <div className="text-xs text-muted-foreground">Copied</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
