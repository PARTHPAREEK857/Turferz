/**
 * Date/time helpers. All venue-local logic (booking dates, slot times,
 * "is this slot in the past") uses the venue timezone (Asia/Kolkata),
 * independent of the server's timezone.
 */

import { VENUE_TIMEZONE } from "./constants";

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: VENUE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export interface IstNow {
  /** 'YYYY-MM-DD' */
  date: string;
  /** minutes from midnight in IST */
  minutes: number;
  epochMs: number;
}

/** Current date/time in the venue timezone. */
export function istNow(from: Date = new Date()): IstNow {
  const parts = partsFormatter.formatToParts(from);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  // hour may be '24' at midnight with hour12:false in some ICU versions
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    date: `${year}-${month}-${day}`,
    minutes: Number(hour) * 60 + Number(get("minute")),
    epochMs: from.getTime(),
  };
}

/** 'YYYY-MM-DD' for today in the venue timezone. */
export function istToday(): string {
  return istNow().date;
}

/** Parse 'YYYY-MM-DD' into its numeric parts. Returns null when malformed. */
export function parseDateString(date: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** Whether a string is a real calendar date in 'YYYY-MM-DD' form. */
export function isValidDateString(date: string): boolean {
  const parsed = parseDateString(date);
  if (!parsed) return false;
  const probe = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  return (
    probe.getUTCFullYear() === parsed.year &&
    probe.getUTCMonth() === parsed.month - 1 &&
    probe.getUTCDate() === parsed.day
  );
}

/** Compare two 'YYYY-MM-DD' strings lexicographically-safe. */
export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Add days to a 'YYYY-MM-DD' string. */
export function addDays(date: string, days: number): string {
  const parsed = parseDateString(date);
  if (!parsed) throw new Error(`Invalid date string: ${date}`);
  const probe = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  probe.setUTCDate(probe.getUTCDate() + days);
  return probe.toISOString().slice(0, 10);
}

/** Minutes from midnight -> 'HH:MM' (24h). */
export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** '06:00' -> 360; returns null when malformed. */
export function labelToMinutes(label: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(label.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 24 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/**
 * Epoch ms for a venue-local date + minutes, treating the venue timezone
 * (IST = UTC+5:30, no DST) as a fixed offset.
 */
export function istDateTimeToEpochMs(date: string, minutes: number): number {
  const parsed = parseDateString(date);
  if (!parsed) throw new Error(`Invalid date string: ${date}`);
  return Date.UTC(parsed.year, parsed.month - 1, parsed.day, 0, minutes) - 5.5 * 60 * 60 * 1000;
}

/** Deterministic human formatting of an ISO instant in the venue timezone. */
export function formatIst(
  iso: string,
  opts: {
    weekday?: boolean;
    dateStyle?: "short" | "medium";
    time?: boolean;
  } = {},
): string {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-IN", {
    timeZone: VENUE_TIMEZONE,
    weekday: opts.weekday ? "short" : undefined,
    day: opts.dateStyle === "medium" ? "numeric" : "2-digit",
    month: opts.dateStyle === "medium" ? "short" : "2-digit",
    year: "numeric",
    hour: opts.time ? "numeric" : undefined,
    minute: opts.time ? "2-digit" : undefined,
    hour12: true,
  });
  return fmt.format(d);
}

/** 'YYYY-MM-DD' -> e.g. 'Fri, 29 Aug' (venue calendar date, no timezone math). */
export function formatDateLabel(date: string): string {
  const parsed = parseDateString(date);
  if (!parsed) return date;
  const d = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  const fmt = new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return fmt.format(d);
}
