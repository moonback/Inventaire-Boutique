import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

type RelativeTimeUnit = Intl.RelativeTimeFormatUnit;

const RELATIVE_TIME_UNITS: Array<{ unit: RelativeTimeUnit; ms: number }> = [
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
  { unit: "second", ms: 1000 },
];

export function formatRelativeTime(timestamp: number, now = Date.now()) {
  const diff = timestamp - now;
  const absoluteDiff = Math.abs(diff);

  if (absoluteDiff < 5 * 1000) {
    return "à l'instant";
  }

  for (const { unit, ms } of RELATIVE_TIME_UNITS) {
    if (absoluteDiff >= ms || unit === "second") {
      return relativeTimeFormatter.format(Math.round(diff / ms), unit);
    }
  }

  return "à l'instant";
}

export function isRecentTimestamp(timestamp: number, windowMs = 24 * 60 * 60 * 1000, now = Date.now()) {
  return now - timestamp < windowMs;
}
