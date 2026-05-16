"use client";

import { Card } from "@/components/ui/card";

interface CodeforcesUserCardProps {
  handle: string;
  rating: number | null;
  maxRating: number | null;
  rank: string | null;
  maxRank: string | null;
  avatar: string | null;
  titlePhoto: string | null;
  contribution: number;
  lastOnlineTimeSeconds: number | null;
  registrationTimeSeconds: number | null;
}

function getRatingColor(rating: number | null): string {
  if (rating === null) return "text-gray-500";
  if (rating >= 4000) return "text-red-900";
  if (rating >= 3000) return "text-red-700";
  if (rating >= 2400) return "text-red-500";
  if (rating >= 2300) return "text-orange-500";
  if (rating >= 2100) return "text-orange-400";
  if (rating >= 1900) return "text-purple-500";
  if (rating >= 1600) return "text-blue-500";
  if (rating >= 1400) return "text-teal-500";
  if (rating >= 1200) return "text-green-500";
  return "text-gray-500";
}

function getRankBadge(rank: string | null): string {
  if (!rank) return "bg-gray-500";
  const lower = rank.toLowerCase();
  if (lower.includes("legendary")) return "bg-red-900";
  if (lower.includes("grandmaster")) return "bg-red-500";
  if (lower.includes("master")) return "bg-orange-400";
  if (lower.includes("candidate")) return "bg-purple-500";
  if (lower.includes("expert")) return "bg-blue-500";
  if (lower.includes("specialist")) return "bg-teal-500";
  if (lower.includes("pupil")) return "bg-green-500";
  return "bg-gray-500";
}

function formatTimestamp(seconds: number | null): string {
  if (!seconds) return "N/A";
  return new Date(seconds * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getTimeAgo(seconds: number | null): string {
  if (!seconds) return "N/A";
  const now = Date.now();
  const diff = now - seconds * 1000;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export function CodeforcesUserCard({
  handle,
  rating,
  maxRating,
  rank,
  maxRank,
  avatar,
  contribution,
  lastOnlineTimeSeconds,
  registrationTimeSeconds,
}: CodeforcesUserCardProps) {
  return (
    <Card className="p-4">
      <div className="flex flex-row gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          {avatar && !avatar.includes("/default/") ? (
            <img
              src={avatar}
              alt={`${handle}'s avatar`}
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground">
              {handle.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Handle and Rank */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-lg font-bold">{handle}</span>
            {rank && (
              <span
                className={`rounded-full ${getRankBadge(rank)} px-2.5 py-0.5 text-xs font-medium text-white`}
              >
                {rank}
              </span>
            )}
          </div>

          {/* Rating */}
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <span>
              Rating:{" "}
              <span className={`font-semibold ${getRatingColor(rating)}`}>
                {rating ?? "Unrated"}
              </span>
            </span>
            <span className="text-muted-foreground">
              Max:{" "}
              <span className={`font-semibold ${getRatingColor(maxRating)}`}>
                {maxRating ?? "—"}
              </span>
              {maxRank && (
                <span className="text-muted-foreground">
                  {" "}
                  ({maxRank})
                </span>
              )}
            </span>
            <span className="text-muted-foreground">
              Contribution:{" "}
              <span
                className={
                  contribution >= 0 ? "text-green-500" : "text-red-500"
                }
              >
                {contribution > 0 ? "+" : ""}
                {contribution}
              </span>
            </span>
          </div>

          {/* Dates */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Last seen: {getTimeAgo(lastOnlineTimeSeconds)}</span>
            <span>
              Registered: {formatTimestamp(registrationTimeSeconds)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
