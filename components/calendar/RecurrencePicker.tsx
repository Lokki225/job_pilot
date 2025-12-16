"use client";

import type { RecurrenceFrequency, RecurrenceRule, Weekday } from "@/lib/calendar/recurrence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toLocalDatetimeInputValue } from "@/components/calendar/date-utils";

function toIsoFromLocalDatetimeInput(value: string): string | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const WEEKDAYS: Array<{ value: Weekday; label: string }> = [
  { value: "SU", label: "Sun" },
  { value: "MO", label: "Mon" },
  { value: "TU", label: "Tue" },
  { value: "WE", label: "Wed" },
  { value: "TH", label: "Thu" },
  { value: "FR", label: "Fri" },
  { value: "SA", label: "Sat" },
];

function defaultRule(): RecurrenceRule {
  return {
    frequency: "WEEKLY",
    interval: 1,
    end: { type: "never" },
  };
}

export function RecurrencePicker(props: {
  value: RecurrenceRule | null;
  onChange: (v: RecurrenceRule | null) => void;
  disabled?: boolean;
}) {
  const { value, onChange, disabled } = props;

  const enabled = Boolean(value);
  const rule = value;

  const setRule = (patch: Partial<RecurrenceRule>) => {
    if (!rule) return;
    const next: any = { ...rule, ...patch };
    if (next.frequency !== "WEEKLY") delete next.byWeekday;
    if (next.frequency !== "MONTHLY" && next.frequency !== "YEARLY") delete next.byMonthDay;
    onChange(next as RecurrenceRule);
  };

  const setEndType = (type: "never" | "until" | "count") => {
    if (!rule) return;
    if (type === "never") return setRule({ end: { type: "never" } });
    if (type === "count") return setRule({ end: { type: "count", count: 10 } });

    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    setRule({ end: { type: "until", until: now.toISOString() } });
  };

  const endType = rule?.end?.type ?? "never";

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Repeat</div>
          <div className="text-xs text-muted-foreground">Set this event to repeat on a schedule.</div>
        </div>
        <Switch
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(v) => {
            if (!v) return onChange(null);
            if (!rule) return onChange(defaultRule());
            return onChange(rule);
          }}
        />
      </div>

      {enabled && rule ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={rule.frequency}
                disabled={disabled}
                onValueChange={(v) => {
                  setRule({ frequency: v as RecurrenceFrequency });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Every</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={String(rule.interval ?? 1)}
                  disabled={disabled}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setRule({ interval: Number.isFinite(n) && n > 0 ? Math.floor(n) : 1 });
                  }}
                />
                <div className="text-sm text-muted-foreground">
                  {rule.frequency === "DAILY"
                    ? "day(s)"
                    : rule.frequency === "WEEKLY"
                      ? "week(s)"
                      : rule.frequency === "MONTHLY"
                        ? "month(s)"
                        : "year(s)"}
                </div>
              </div>
            </div>
          </div>

          {rule.frequency === "WEEKLY" ? (
            <div className="space-y-2">
              <Label>On</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((d) => {
                  const active = Array.isArray(rule.byWeekday) ? rule.byWeekday.includes(d.value) : false;
                  return (
                    <Button
                      key={d.value}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      aria-pressed={active}
                      className={active ? "border-primary bg-primary/10 text-primary" : undefined}
                      onClick={() => {
                        const current = Array.isArray(rule.byWeekday) ? rule.byWeekday : [];
                        const next = active ? current.filter((x) => x !== d.value) : [...current, d.value];
                        setRule({ byWeekday: next.length ? (next as Weekday[]) : undefined });
                      }}
                    >
                      {d.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {rule.frequency === "MONTHLY" || rule.frequency === "YEARLY" ? (
            <div className="space-y-2">
              <Label>{rule.frequency === "MONTHLY" ? "Day of month (optional)" : "Day of month (optional)"}</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={rule.byMonthDay ? String(rule.byMonthDay) : ""}
                placeholder="Same as start date"
                disabled={disabled}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  if (!raw) return setRule({ byMonthDay: undefined });
                  const n = Number(raw);
                  if (!Number.isFinite(n)) return;
                  setRule({ byMonthDay: Math.min(31, Math.max(1, Math.floor(n))) });
                }}
              />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Ends</Label>
              <Select value={endType} disabled={disabled} onValueChange={(v) => setEndType(v as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="until">On date</SelectItem>
                  <SelectItem value="count">After</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {endType === "count" ? (
              <div className="space-y-2">
                <Label>Occurrences</Label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={rule.end.type === "count" ? String(rule.end.count) : ""}
                  disabled={disabled}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    setRule({ end: { type: "count", count: Math.min(1000, Math.max(1, Math.floor(n))) } });
                  }}
                />
              </div>
            ) : endType === "until" ? (
              <div className="space-y-2">
                <Label>Until</Label>
                <Input
                  type="datetime-local"
                  value={
                    rule.end.type === "until" && rule.end.until && !Number.isNaN(new Date(rule.end.until).getTime())
                      ? toLocalDatetimeInputValue(new Date(rule.end.until))
                      : ""
                  }
                  disabled={disabled}
                  onChange={(e) => {
                    const iso = toIsoFromLocalDatetimeInput(e.target.value);
                    if (!iso) return;
                    setRule({ end: { type: "until", until: iso } });
                  }}
                />
              </div>
            ) : (
              <div />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
