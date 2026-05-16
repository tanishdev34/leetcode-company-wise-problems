"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ContestEntry {
  contestId: number;
  contestName: string;
  rank: number;
  oldRating: number;
  newRating: number;
  ratingUpdateTimeSeconds: number;
}

interface ContestHistoryTableProps {
  entries: ContestEntry[];
}

const INITIAL_DISPLAY_COUNT = 20;

function formatDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ContestHistoryTable({ entries }: ContestHistoryTableProps) {
  const [showAll, setShowAll] = useState(false);

  if (!entries.length) {
    return (
      <Card className="p-4">
        <p className="text-center text-sm text-muted-foreground">
          No contest history available
        </p>
      </Card>
    );
  }

  const displayed = showAll ? entries : entries.slice(0, INITIAL_DISPLAY_COUNT);
  // Reverse index (total - i)
  const totalEntries = entries.length;

  return (
    <Card className="p-4">
      <h3 className="mb-4 text-sm font-semibold">Contest History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-2 py-2 font-medium">#</th>
              <th className="px-2 py-2 font-medium">Contest</th>
              <th className="px-2 py-2 font-medium text-right">Rank</th>
              <th className="px-2 py-2 font-medium text-right">Old</th>
              <th className="px-2 py-2 font-medium text-right">New</th>
              <th className="px-2 py-2 font-medium text-right">Delta</th>
              <th className="px-2 py-2 font-medium text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((entry, idx) => {
              const delta = entry.newRating - entry.oldRating;
              const reverseIdx = totalEntries - idx;
              return (
                <tr
                  key={entry.contestId}
                  className="border-b last:border-0 hover:bg-muted/50"
                >
                  <td className="px-2 py-2 text-muted-foreground">
                    {reverseIdx}
                  </td>
                  <td className="max-w-[200px] truncate px-2 py-2 font-medium">
                    {entry.contestName}
                  </td>
                  <td className="px-2 py-2 text-right">{entry.rank}</td>
                  <td className="px-2 py-2 text-right">{entry.oldRating}</td>
                  <td className="px-2 py-2 text-right font-medium">
                    {entry.newRating}
                  </td>
                  <td
                    className={`px-2 py-2 text-right font-medium ${
                      delta > 0
                        ? "text-green-500"
                        : delta < 0
                          ? "text-red-500"
                          : "text-muted-foreground"
                    }`}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta}
                  </td>
                  <td className="px-2 py-2 text-right text-muted-foreground">
                    {formatDate(entry.ratingUpdateTimeSeconds)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {entries.length > INITIAL_DISPLAY_COUNT && (
        <div className="mt-3 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll
              ? "Show less"
              : `Show all ${entries.length} contests`}
          </Button>
        </div>
      )}
    </Card>
  );
}
