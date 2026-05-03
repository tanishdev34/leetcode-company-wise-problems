"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TimePeriod = "ALL" | "THIRTY_DAYS" | "THREE_MONTHS" | "SIX_MONTHS" | "MORE_THAN_SIX_MONTHS";

const TABS = [
  { value: "ALL", label: "All" },
  { value: "THIRTY_DAYS", label: "30 Days" },
  { value: "THREE_MONTHS", label: "3 Months" },
  { value: "SIX_MONTHS", label: "6 Months" },
  { value: "MORE_THAN_SIX_MONTHS", label: "6+ Months" },
] as const;

interface TimePeriodTabsProps {
  value: TimePeriod;
  onChange: (value: TimePeriod) => void;
}

export function TimePeriodTabs({ value, onChange }: TimePeriodTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as TimePeriod)}>
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
