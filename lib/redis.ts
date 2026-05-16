import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://peaceful-hippo-114036.upstash.io",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "gQAAAAAAAb10AAIgcDI5ZmZjYWUyNzQ3ZTM0MzQyOTA1MzJmOGQ5YmRlNzYwOQ",
});

export function getSecondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

export const CACHE_TTL = {
  DAILY: getSecondsUntilMidnightUTC(),
  STATS: 3600,
  CALENDAR: 3600,
  SUBMISSIONS: 3600,
};