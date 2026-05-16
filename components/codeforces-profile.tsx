"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeforcesUserCard } from "@/components/codeforces-user-card";
import { RatingHistoryChart } from "@/components/rating-history-chart";
import { ContestHistoryTable } from "@/components/contest-history-table";

interface UserData {
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

interface RatingEntry {
  contestId: number;
  contestName: string;
  rank: number;
  oldRating: number;
  newRating: number;
  ratingUpdateTimeSeconds: number;
}

interface ChartDataPoint {
  contestName: string;
  rating: number;
  date: string;
  rank: number;
}

interface CodeforcesProfileProps {
  handle: string;
}

export function CodeforcesProfile({ handle }: CodeforcesProfileProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [ratingHistory, setRatingHistory] = useState<RatingEntry[]>([]);

  async function fetchData() {
    setLoading(true);
    setError("");

    try {
      const [userRes, ratingRes] = await Promise.all([
        fetch(`/api/codeforces/user?handle=${handle}`),
        fetch(`/api/codeforces/rating?handle=${handle}`),
      ]);

      const [userDataResult, ratingDataResult] = await Promise.all([
        userRes.json(),
        ratingRes.json(),
      ]);

      if (userDataResult.error) {
        setError(userDataResult.error);
        setLoading(false);
        return;
      }

      setUserData(userDataResult);

      if (ratingDataResult.error) {
        setError(ratingDataResult.error);
        setLoading(false);
        return;
      }

      setRatingHistory(ratingDataResult.ratingHistory || []);
    } catch {
      setError("Failed to fetch Codeforces data");
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [handle]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 text-center">
        <p className="mb-4 text-destructive">{error}</p>
        <Button onClick={fetchData}>Retry</Button>
      </Card>
    );
  }

  if (!userData) {
    return null;
  }

  // Filter rating entries where newRating > 0 and map to chart data
  const chartData: ChartDataPoint[] = ratingHistory
    .filter((entry) => entry.newRating > 0)
    .map((entry) => ({
      contestName: entry.contestName,
      rating: entry.newRating,
      date: new Date(entry.ratingUpdateTimeSeconds * 1000).toISOString(),
      rank: entry.rank,
    }));

  return (
    <div className="space-y-4">
      <CodeforcesUserCard
        handle={userData.handle}
        rating={userData.rating}
        maxRating={userData.maxRating}
        rank={userData.rank}
        maxRank={userData.maxRank}
        avatar={userData.avatar}
        titlePhoto={userData.titlePhoto}
        contribution={userData.contribution}
        lastOnlineTimeSeconds={userData.lastOnlineTimeSeconds}
        registrationTimeSeconds={userData.registrationTimeSeconds}
      />
      <RatingHistoryChart data={chartData} />
      <ContestHistoryTable entries={ratingHistory} />
    </div>
  );
}
