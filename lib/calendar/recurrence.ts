import { z } from "zod";

export const WeekdaySchema = z.enum(["SU", "MO", "TU", "WE", "TH", "FR", "SA"]);
export type Weekday = z.infer<typeof WeekdaySchema>;

export const RecurrenceFrequencySchema = z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);
export type RecurrenceFrequency = z.infer<typeof RecurrenceFrequencySchema>;

export const RecurrenceEndSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("never") }).strict(),
  z
    .object({
      type: z.literal("until"),
      until: z.string().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("count"),
      count: z.number().int().min(1).max(1000),
    })
    .strict(),
]);
export type RecurrenceEnd = z.infer<typeof RecurrenceEndSchema>;

export const RecurrenceRuleSchema = z
  .object({
    frequency: RecurrenceFrequencySchema,
    interval: z.number().int().min(1).max(365).default(1),
    byWeekday: z.array(WeekdaySchema).min(1).max(7).optional(),
    byMonthDay: z.number().int().min(1).max(31).optional(),
    end: RecurrenceEndSchema.default({ type: "never" }),
  })
  .strict();

export type RecurrenceRule = z.infer<typeof RecurrenceRuleSchema>;

export function serializeRecurrenceRule(rule: RecurrenceRule): string {
  return JSON.stringify(rule);
}

export function parseRecurrenceRule(value: unknown): RecurrenceRule | null {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      const res = RecurrenceRuleSchema.safeParse(parsed);
      return res.success ? res.data : null;
    } catch {
      return null;
    }
  }

  const res = RecurrenceRuleSchema.safeParse(value);
  return res.success ? res.data : null;
}

function startOfWeekUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

function addDaysUtc(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function makeUtcDate(
  year: number,
  month: number,
  day: number,
  time: { h: number; m: number; s: number; ms: number }
): Date | null {
  const d = new Date(Date.UTC(year, month, day, time.h, time.m, time.s, time.ms));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month || d.getUTCDate() !== day) return null;
  return d;
}

const WEEKDAY_TO_NUM: Record<Weekday, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

export function expandRecurrenceStarts(params: {
  seriesStartAt: string;
  rule: RecurrenceRule;
  rangeStartAt: string;
  rangeEndAt: string;
}): string[] {
  const seriesStart = new Date(params.seriesStartAt);
  const rangeStart = new Date(params.rangeStartAt);
  const rangeEnd = new Date(params.rangeEndAt);

  if (
    Number.isNaN(seriesStart.getTime()) ||
    Number.isNaN(rangeStart.getTime()) ||
    Number.isNaN(rangeEnd.getTime()) ||
    rangeEnd <= rangeStart
  ) {
    return [];
  }

  const time = {
    h: seriesStart.getUTCHours(),
    m: seriesStart.getUTCMinutes(),
    s: seriesStart.getUTCSeconds(),
    ms: seriesStart.getUTCMilliseconds(),
  };

  let untilMs = Number.POSITIVE_INFINITY;
  if (params.rule.end.type === "until") {
    const t = new Date(params.rule.end.until).getTime();
    untilMs = Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
  }

  const maxCount = params.rule.end.type === "count" ? params.rule.end.count : Number.POSITIVE_INFINITY;

  const out: string[] = [];
  let produced = 0;
  let guard = 0;

  const pushIfInRange = (d: Date) => {
    const ms = d.getTime();
    if (Number.isNaN(ms)) return;
    if (ms < seriesStart.getTime()) return;
    if (ms > untilMs) return;

    produced += 1;
    if (produced > maxCount) return;
    if (ms >= rangeStart.getTime() && ms < rangeEnd.getTime()) out.push(d.toISOString());
  };

  if (params.rule.frequency === "DAILY") {
    const intervalDays = Math.max(1, params.rule.interval);
    let cursor = new Date(seriesStart);

    if (params.rule.end.type !== "count" && rangeStart > seriesStart) {
      const diffDays = Math.floor((rangeStart.getTime() - seriesStart.getTime()) / (24 * 60 * 60 * 1000));
      const jump = Math.floor(diffDays / intervalDays) * intervalDays;
      cursor = addDaysUtc(seriesStart, jump);
    }

    while (guard < 20000) {
      guard += 1;
      if (cursor.getTime() > untilMs) break;
      if (produced >= maxCount) break;
      if (cursor >= rangeEnd) break;

      pushIfInRange(cursor);
      cursor = addDaysUtc(cursor, intervalDays);
    }
    return out;
  }

  if (params.rule.frequency === "WEEKLY") {
    const weekdays = (params.rule.byWeekday && params.rule.byWeekday.length > 0 ? params.rule.byWeekday : [
      ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][seriesStart.getUTCDay()] as Weekday,
    ])
      .map((w) => WEEKDAY_TO_NUM[w])
      .sort((a, b) => a - b);

    const baseWeekStart = startOfWeekUtc(seriesStart);
    const intervalWeeks = Math.max(1, params.rule.interval);
    let weekStart = baseWeekStart;

    if (params.rule.end.type !== "count" && rangeStart > seriesStart) {
      const targetWeekStart = startOfWeekUtc(rangeStart);
      const diffWeeks = Math.floor((targetWeekStart.getTime() - baseWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const jumpWeeks = Math.floor(diffWeeks / intervalWeeks) * intervalWeeks;
      if (jumpWeeks > 0) weekStart = addDaysUtc(baseWeekStart, jumpWeeks * 7);
    }

    while (guard < 20000) {
      guard += 1;
      if (weekStart.getTime() > untilMs) break;
      if (produced >= maxCount) break;
      if (weekStart >= rangeEnd && weekStart > seriesStart) break;

      for (const wd of weekdays) {
        const day = addDaysUtc(weekStart, wd);
        day.setUTCHours(time.h, time.m, time.s, time.ms);
        if (day.getTime() > untilMs) break;
        if (produced >= maxCount) break;
        if (day >= rangeEnd) continue;
        pushIfInRange(day);
      }

      weekStart = addDaysUtc(weekStart, intervalWeeks * 7);
    }
    return out;
  }

  if (params.rule.frequency === "MONTHLY") {
    const targetDay = params.rule.byMonthDay ?? seriesStart.getUTCDate();
    let cursorYear = seriesStart.getUTCFullYear();
    let cursorMonth = seriesStart.getUTCMonth();
    while (guard < 20000) {
      guard += 1;
      const d = makeUtcDate(cursorYear, cursorMonth, targetDay, time);
      if (d) {
        if (d.getTime() > untilMs) break;
        if (produced >= maxCount) break;
        if (d >= rangeEnd && d > seriesStart) break;
        pushIfInRange(d);
      }

      cursorMonth += params.rule.interval;
      cursorYear += Math.floor(cursorMonth / 12);
      cursorMonth = ((cursorMonth % 12) + 12) % 12;
    }
    return out;
  }

  if (params.rule.frequency === "YEARLY") {
    const targetMonth = seriesStart.getUTCMonth();
    const targetDay = params.rule.byMonthDay ?? seriesStart.getUTCDate();
    let cursorYear = seriesStart.getUTCFullYear();
    while (guard < 20000) {
      guard += 1;
      const d = makeUtcDate(cursorYear, targetMonth, targetDay, time);
      if (d) {
        if (d.getTime() > untilMs) break;
        if (produced >= maxCount) break;
        if (d >= rangeEnd && d > seriesStart) break;
        pushIfInRange(d);
      }

      cursorYear += params.rule.interval;
    }
    return out;
  }

  return out;
}
