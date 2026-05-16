"use client";

import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface RatingPoint {
  contestName: string;
  rating: number;
  date: string;
  rank: number;
}

interface RatingHistoryChartProps {
  data: RatingPoint[];
}

const RATING_THRESHOLDS = [
  { value: 1200, label: "Pupil", color: "fill-green-500" },
  { value: 1400, label: "Specialist", color: "fill-teal-500" },
  { value: 1600, label: "Expert", color: "fill-blue-500" },
  { value: 1900, label: "Candidate Master", color: "fill-purple-500" },
  { value: 2100, label: "Master", color: "fill-orange-400" },
  { value: 2400, label: "Grandmaster", color: "fill-red-500" },
] as const;

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: RatingPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{entry.contestName}</p>
      <p className="text-muted-foreground">
        Rating: <span className="font-semibold">{entry.rating}</span>
      </p>
      <p className="text-muted-foreground">
        Rank: {entry.rank}
      </p>
      <p className="text-muted-foreground">{formatDate(entry.date)}</p>
    </div>
  );
}

export function RatingHistoryChart({ data }: RatingHistoryChartProps) {
  if (!data.length) {
    return (
      <Card className="p-4">
        <p className="text-center text-sm text-muted-foreground">
          No contest history available
        </p>
      </Card>
    );
  }

  const ratings = data.map((d) => d.rating);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  const yMin = Math.max(0, minRating - 100);
  const yMax = maxRating + 100;

  // Show relevant thresholds within visible range
  const visibleThresholds = RATING_THRESHOLDS.filter(
    (t) => t.value >= yMin && t.value <= yMax
  );

  return (
    <Card className="p-4">
      <h3 className="mb-4 text-sm font-semibold">Rating History</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            {visibleThresholds.map((threshold) => (
              <ReferenceLine
                key={threshold.value}
                y={threshold.value}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: threshold.label,
                  position: "right",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
            ))}
            <Line
              type="monotone"
              dataKey="rating"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}


