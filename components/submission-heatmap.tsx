"use client"

import { Card } from "@/components/ui/card"

interface SubmissionHeatmapProps {
  submissionCalendar: Record<string, number>
  streak: number
  totalActiveDays: number
}

function getColorClass(count: number): string {
  if (count === 0) return "bg-muted"
  if (count <= 2) return "bg-green-900"
  if (count <= 5) return "bg-green-700"
  if (count <= 9) return "bg-green-500"
  return "bg-green-300"
}

function utcDateStr(ts: number): string {
  return new Date(ts).toISOString().split("T")[0]
}

function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]
  return `${months[month - 1]} ${day}, ${year}`
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

// w-3 (12px) + gap-0.5 (2px) = 14px per column
const COL_WIDTH = 14

export function SubmissionHeatmap({
  submissionCalendar,
  streak,
  totalActiveDays,
}: SubmissionHeatmapProps) {
  const parsedCalendar: Record<string, number> =
    typeof submissionCalendar === "string"
      ? (() => {
          try { return JSON.parse(submissionCalendar) } catch { return {} }
        })()
      : submissionCalendar

  // All date arithmetic in UTC to avoid timezone drift with midnight-UTC timestamps
  const now = new Date()
  const todayTs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const startTs = todayTs - 363 * 86400_000

  const dateMap = new Map<string, number>()
  for (let ts = startTs; ts <= todayTs; ts += 86400_000) {
    dateMap.set(utcDateStr(ts), 0)
  }
  for (const [timestamp, count] of Object.entries(parsedCalendar)) {
    const key = utcDateStr(parseInt(timestamp) * 1000)
    if (dateMap.has(key)) dateMap.set(key, count)
  }

  // Align grid to start on the Sunday on or before startTs
  const startDayOfWeek = new Date(startTs).getUTCDay()
  const gridStartTs = startTs - startDayOfWeek * 86400_000

  type Cell = { date: string; count: number; inRange: boolean }
  const weeks: Cell[][] = []
  let week: Cell[] = []

  for (let ts = gridStartTs; ts <= todayTs; ts += 86400_000) {
    const dateStr = utcDateStr(ts)
    const inRange = ts >= startTs
    week.push({ date: dateStr, count: inRange ? (dateMap.get(dateStr) ?? 0) : 0, inRange })
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }

  // Pad the final partial week
  if (week.length > 0) {
    let ts = todayTs + 86400_000
    while (week.length < 7) {
      week.push({ date: utcDateStr(ts), count: 0, inRange: false })
      ts += 86400_000
    }
    weeks.push(week)
  }

  // Month label: mark column where each new month first appears
  const monthPositions: { label: string; colIndex: number }[] = []
  let lastMonth = -1
  weeks.forEach((w, colIndex) => {
    const first = w.find((c) => c.inRange)
    if (!first) return
    const month = parseInt(first.date.split("-")[1]) - 1
    if (month !== lastMonth) {
      monthPositions.push({ label: MONTHS[month], colIndex })
      lastMonth = month
    }
  })

  return (
    <Card className="p-4">
      <div className="mb-4 flex gap-4">
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
          <div className="flex flex-col">
            {/* Month labels row — spacer must match day-label div exactly */}
            <div className="mb-1 flex">
              <div className="w-4 shrink-0 mr-1" />
              <div
                className="relative h-4"
                style={{ width: weeks.length * COL_WIDTH }}
              >
                {monthPositions.map((m, i) => (
                  <span
                    key={i}
                    className="absolute text-xs text-muted-foreground"
                    style={{ left: m.colIndex * COL_WIDTH }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Grid row */}
            <div className="flex">
              {/* Day-of-week labels — same w-4 mr-1 as the spacer above */}
              <div className="w-4 shrink-0 mr-1 flex flex-col gap-0.5">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                  <span key={i} className="h-3 text-xs leading-3 text-muted-foreground">
                    {i % 2 === 0 ? day : ""}
                  </span>
                ))}
              </div>

              {/* Heatmap grid */}
              <div className="flex gap-0.5">
                {weeks.map((w, wi) => (
                  <div key={wi} className="flex flex-col gap-0.5">
                    {w.map((cell, di) => (
                      <div
                        key={di}
                        className={`h-3 w-3 rounded-sm ${cell.inRange ? getColorClass(cell.count) : "bg-transparent"}`}
                        title={
                          cell.inRange
                            ? `${formatDisplayDate(cell.date)}: ${cell.count} submission${cell.count !== 1 ? "s" : ""}`
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-0.5">
              <div className="h-3 w-3 rounded-sm bg-muted" />
              <div className="h-3 w-3 rounded-sm bg-green-900" />
              <div className="h-3 w-3 rounded-sm bg-green-700" />
              <div className="h-3 w-3 rounded-sm bg-green-500" />
              <div className="h-3 w-3 rounded-sm bg-green-300" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
