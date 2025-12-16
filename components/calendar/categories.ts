/**
 * Calendar categories.
 *
 * This is the "human" categorization for the calendar, stored as `calendar_events.metadata.category`.
 * It's intentionally separate from the technical `calendar_events.type` column.
 */

import type { CalendarEventData } from "@/lib/actions/calendar.action";

export type CalendarCategory =
  | "job"
  | "interview"
  | "study"
  | "training"
  | "community"
  | "personal"
  | "other";

export const CALENDAR_CATEGORY_OPTIONS: Array<{ value: CalendarCategory; label: string }> = [
  { value: "job", label: "Job" },
  { value: "interview", label: "Interview" },
  { value: "study", label: "Study" },
  { value: "training", label: "Training" },
  { value: "community", label: "Community" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
];

export const CATEGORY_META: Record<
  CalendarCategory,
  { label: string; chipBorderClass: string; badgeClass: string; dotClass: string }
> = {
  job: {
    label: "Job",
    chipBorderClass: "border-l-blue-500",
    badgeClass:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-200",
    dotClass: "bg-blue-500",
  },
  interview: {
    label: "Interview",
    chipBorderClass: "border-l-red-500",
    badgeClass:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-200",
    dotClass: "bg-red-500",
  },
  study: {
    label: "Study",
    chipBorderClass: "border-l-emerald-500",
    badgeClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200",
    dotClass: "bg-emerald-500",
  },
  training: {
    label: "Training",
    chipBorderClass: "border-l-violet-500",
    badgeClass:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-900/20 dark:text-violet-200",
    dotClass: "bg-violet-500",
  },
  community: {
    label: "Community",
    chipBorderClass: "border-l-amber-500",
    badgeClass:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200",
    dotClass: "bg-amber-500",
  },
  personal: {
    label: "Personal",
    chipBorderClass: "border-l-slate-500",
    badgeClass:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/20 dark:text-slate-200",
    dotClass: "bg-slate-500",
  },
  other: {
    label: "Other",
    chipBorderClass: "border-l-zinc-500",
    badgeClass:
      "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-200",
    dotClass: "bg-zinc-500",
  },
};

export function normalizeCategory(value: unknown): CalendarCategory {
  if (typeof value !== "string") return "personal";

  return (CALENDAR_CATEGORY_OPTIONS.map((o) => o.value) as string[]).includes(value)
    ? (value as CalendarCategory)
    : "personal";
}

export function getEventCategory(ev: CalendarEventData): CalendarCategory {
  const meta = ev.metadata as any;
  return normalizeCategory(meta?.category);
}
