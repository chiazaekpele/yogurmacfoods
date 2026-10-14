// Business-day logic uses Africa/Lagos (WAT, UTC+1, no daylight saving).
export function lagosDateStamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}${get("month")}${get("day")}`;
}

const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// The Lagos calendar date of an instant, as a UTC-midnight Date (what Prisma
// stores in @db.Date columns).
export function lagosDate(at = new Date()): Date {
  const shifted = new Date(at.getTime() + LAGOS_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

// The instant a Lagos calendar day starts (00:00 WAT).
export function lagosDayStart(day: Date): Date {
  return new Date(day.getTime() - LAGOS_OFFSET_MS);
}

export function addDays(day: Date, n: number): Date {
  return new Date(day.getTime() + n * DAY_MS);
}

export function addMonths(day: Date, n: number): Date {
  const d = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + n, 1));
  // Clamp to the month's last day (31 Jan + 1 month = 28/29 Feb).
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day.getUTCDate(), last));
  return d;
}

export function isoDay(day: Date): string {
  return day.toISOString().slice(0, 10);
}

const dateFmt = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
// @db.Date values are UTC midnight; format them without a timezone shift.
const plainDateFmt = new Intl.DateTimeFormat("en-NG", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" });

export const formatDate = (d: Date) => dateFmt.format(d);
export const formatDateTime = (d: Date) => dateTimeFmt.format(d);
export const formatDay = (d: Date) => plainDateFmt.format(d);
