"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type CalendarViewMode = "month" | "week" | "day";

export function CalendarViewTabs(props: {
  value: CalendarViewMode;
  onValueChange: (value: CalendarViewMode) => void;
}) {
  const { value, onValueChange } = props;

  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as CalendarViewMode)}>
      <TabsList>
        <TabsTrigger value="month">Month</TabsTrigger>
        <TabsTrigger value="week">Week</TabsTrigger>
        <TabsTrigger value="day">Day</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
