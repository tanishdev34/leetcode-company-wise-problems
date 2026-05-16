import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  throw new Error(
    "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables. " +
      "Set them in .env file (see docs/wiki/configuration.md).",
  );
}

export const redis = new Redis({ url, token });

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