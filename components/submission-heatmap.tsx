"use client";

import { Card } from "@/components/ui/card";

interface SubmissionHeatmapProps {
  submissionCalendar: Record<string, number>;
  streak: number;
  totalActiveDays: number;
}

function getColorClass(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 2) return "bg-green-900";
  if (count <= 5) return "bg-green-700";
  if (count <= 9) return "bg-green-500";
  return "bg-green-300";
}

export function SubmissionHeatmap({ submissionCalendar, streak, totalActiveDays }: SubmissionHeatmapProps) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  
  const dateMap = new Map<string, number>();
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split("T")[0];
    dateMap.set(key, 0);
  }
  
  Object.entries(submissionCalendar).forEach(([timestamp, count]) => {
    const date = new Date(parseInt(timestamp) * 1000);
    const key = date.toISOString().split("T")[0];
    if (dateMap.has(key)) {
      dateMap.set(key, count);
    }
  });
  
  const weeks: Map<string, number[]> = new Map();
  let currentWeek: number[] = [];
  
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const key = d.toISOString().split("T")[0];
    const count = dateMap.get(key) || 0;
    
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      const weekKey = d.toISOString().split("T")[0];
      weeks.set(weekKey, currentWeek);
      currentWeek = [];
    }
    currentWeek.push(count);
  }
  
  if (currentWeek.length > 0) {
    const weekKey = today.toISOString().split("T")[0];
    while (currentWeek.length < 7) {
      currentWeek.push(0);
    }
    weeks.set(weekKey, currentWeek);
  }
  
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const weekKeys = Array.from(weeks.keys());
  
  const monthPositions: { month: string; position: number }[] = [];
  let lastMonth = -1;
  weekKeys.forEach((_, i) => {
    const date = new Date(weekKeys[i]);
    const month = date.getMonth();
    if (month !== lastMonth) {
      monthPositions.push({ month: monthLabels[month], position: i });
      lastMonth = month;
    }
  });

  return (
    <Card className="p-4">
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-1">
          <span className="text-amber-500">🔥</span>
          <span className="text-sm">{streak} day streak</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm">📅</span>
          <span className="text-sm">{totalActiveDays} active days</span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="flex text-xs text-muted-foreground mb-1 ml-8">
            {monthPositions.map((m, i) => (
              <span key={i} className="flex-1" style={{ marginLeft: i === 0 ? 0 : (m.position - monthPositions[i-1].position - 1) * 14 }}>{m.month}</span>
            ))}
          </div>
          
          <div className="flex gap-0.5">
            <div className="flex flex-col gap-0.5 mr-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                <span key={i} className="text-xs text-muted-foreground h-3 leading-3">{i % 2 === 0 ? day : ""}</span>
              ))}
            </div>
            
            <div className="flex gap-0.5">
              {weekKeys.map((weekKey, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-0.5">
                  {weeks.get(weekKey)?.map((count, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`w-3 h-3 rounded-sm ${getColorClass(count)}`}
                      title={`${weekKey}: ${count} submissions`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-0.5">
              <div className="w-3 h-3 rounded-sm bg-muted" />
              <div className="w-3 h-3 rounded-sm bg-green-900" />
              <div className="w-3 h-3 rounded-sm bg-green-700" />
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <div className="w-3 h-3 rounded-sm bg-green-300" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </Card>
  );
}