import { describe, expect, it } from "vitest";

import type { RecurrenceRule } from "@/lib/calendar/recurrence";
import { expandRecurrenceStarts } from "@/lib/calendar/recurrence";

function iso(y: number, m: number, d: number, hh = 9, mm = 0) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0)).toISOString();
}

describe("expandRecurrenceStarts", () => {
  it("returns empty array for invalid dates", () => {
    const rule: RecurrenceRule = { frequency: "DAILY", interval: 1, end: { type: "never" } };
    const res = expandRecurrenceStarts({
      seriesStartAt: "not-a-date",
      rule,
      rangeStartAt: iso(2025, 1, 1),
      rangeEndAt: iso(2025, 1, 8),
    });
    expect(res).toEqual([]);
  });

  it("expands daily occurrences within range", () => {
    const rule: RecurrenceRule = { frequency: "DAILY", interval: 1, end: { type: "never" } };
    const res = expandRecurrenceStarts({
      seriesStartAt: iso(2025, 1, 1, 9, 0),
      rule,
      rangeStartAt: iso(2025, 1, 1, 0, 0),
      rangeEndAt: iso(2025, 1, 4, 0, 0),
    });
    expect(res).toEqual([iso(2025, 1, 1, 9, 0), iso(2025, 1, 2, 9, 0), iso(2025, 1, 3, 9, 0)]);
  });

  it("supports weekly byWeekday", () => {
    const rule: RecurrenceRule = {
      frequency: "WEEKLY",
      interval: 1,
      byWeekday: ["MO", "WE"],
      end: { type: "never" },
    };

    // series start is Monday Jan 6 2025 09:00 UTC
    const res = expandRecurrenceStarts({
      seriesStartAt: iso(2025, 1, 6, 9, 0),
      rule,
      rangeStartAt: iso(2025, 1, 5, 0, 0),
      rangeEndAt: iso(2025, 1, 20, 0, 0),
    });

    expect(res).toEqual([
      iso(2025, 1, 6, 9, 0),
      iso(2025, 1, 8, 9, 0),
      iso(2025, 1, 13, 9, 0),
      iso(2025, 1, 15, 9, 0),
    ]);
  });

  it("supports monthly byMonthDay", () => {
    const rule: RecurrenceRule = {
      frequency: "MONTHLY",
      interval: 1,
      byMonthDay: 15,
      end: { type: "never" },
    };

    const res = expandRecurrenceStarts({
      seriesStartAt: iso(2025, 1, 1, 9, 0),
      rule,
      rangeStartAt: iso(2025, 1, 1, 0, 0),
      rangeEndAt: iso(2025, 4, 1, 0, 0),
    });

    expect(res).toEqual([iso(2025, 1, 15, 9, 0), iso(2025, 2, 15, 9, 0), iso(2025, 3, 15, 9, 0)]);
  });

  it("supports yearly recurrence", () => {
    const rule: RecurrenceRule = {
      frequency: "YEARLY",
      interval: 1,
      end: { type: "never" },
    };

    const res = expandRecurrenceStarts({
      seriesStartAt: iso(2024, 5, 10, 9, 0),
      rule,
      rangeStartAt: iso(2024, 1, 1, 0, 0),
      rangeEndAt: iso(2027, 1, 1, 0, 0),
    });

    expect(res).toEqual([iso(2024, 5, 10, 9, 0), iso(2025, 5, 10, 9, 0), iso(2026, 5, 10, 9, 0)]);
  });

  it("respects end.type=until", () => {
    const rule: RecurrenceRule = {
      frequency: "DAILY",
      interval: 1,
      end: { type: "until", until: iso(2025, 1, 3, 9, 0) },
    };

    const res = expandRecurrenceStarts({
      seriesStartAt: iso(2025, 1, 1, 9, 0),
      rule,
      rangeStartAt: iso(2025, 1, 1, 0, 0),
      rangeEndAt: iso(2025, 1, 10, 0, 0),
    });

    // until is inclusive at the same timestamp
    expect(res).toEqual([iso(2025, 1, 1, 9, 0), iso(2025, 1, 2, 9, 0), iso(2025, 1, 3, 9, 0)]);
  });

  it("treats invalid until as never", () => {
    const rule: RecurrenceRule = {
      frequency: "DAILY",
      interval: 1,
      end: { type: "until", until: "not-a-date" },
    };

    const res = expandRecurrenceStarts({
      seriesStartAt: iso(2025, 1, 1, 9, 0),
      rule,
      rangeStartAt: iso(2025, 1, 1, 0, 0),
      rangeEndAt: iso(2025, 1, 4, 0, 0),
    });

    expect(res).toEqual([iso(2025, 1, 1, 9, 0), iso(2025, 1, 2, 9, 0), iso(2025, 1, 3, 9, 0)]);
  });

  it("respects end.type=count", () => {
    const rule: RecurrenceRule = {
      frequency: "DAILY",
      interval: 1,
      end: { type: "count", count: 2 },
    };

    const res = expandRecurrenceStarts({
      seriesStartAt: iso(2025, 1, 1, 9, 0),
      rule,
      rangeStartAt: iso(2025, 1, 1, 0, 0),
      rangeEndAt: iso(2025, 1, 10, 0, 0),
    });

    expect(res).toEqual([iso(2025, 1, 1, 9, 0), iso(2025, 1, 2, 9, 0)]);
  });

  it("end.type=count still works when range starts later", () => {
    const rule: RecurrenceRule = {
      frequency: "DAILY",
      interval: 1,
      end: { type: "count", count: 3 },
    };

    const res = expandRecurrenceStarts({
      seriesStartAt: iso(2025, 1, 1, 9, 0),
      rule,
      rangeStartAt: iso(2025, 1, 3, 0, 0),
      rangeEndAt: iso(2025, 1, 10, 0, 0),
    });

    // occurrences are Jan1, Jan2, Jan3; range includes only Jan3
    expect(res).toEqual([iso(2025, 1, 3, 9, 0)]);
  });
});
