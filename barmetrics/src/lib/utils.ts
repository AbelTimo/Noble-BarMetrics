import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Today's date as a `YYYY-MM-DD` string in the *local* timezone.
 *
 * Use this instead of `new Date().toISOString().split('T')[0]` — `toISOString()`
 * is UTC, so for positive-UTC-offset timezones it returns yesterday's date late
 * at night (a real problem for a bar that operates past midnight).
 */
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
