import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a decimal hours value as "Xh Ymin" with sign.
 * Examples: 2.566 -> "2h 34min", -0.4 -> "-0h 24min", 0 -> "0h 0min"
 */
export function formatHoursMinutes(hours: number): string {
  const sign = hours < 0 ? '-' : '';
  const abs = Math.abs(hours);
  const totalMinutes = Math.round(abs * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${sign}${h}h ${m}min`;
}

/**
 * Parse an "hh:mm" string into decimal hours.
 * Examples: "1:45" -> 1.75, "-2:30" -> -2.5, "0:00" -> 0
 */
export function parseHhMm(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const sign = trimmed.startsWith('-') ? -1 : 1;
  const body = trimmed.replace(/^-/, '');
  const parts = body.split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return sign * (h + m / 60);
}

/**
 * Format a decimal hours value as "hh:mm" with sign.
 * Examples: 1.75 -> "1:45", -2.5 -> "-2:30", 0 -> "0:00"
 */
export function formatDecimalAsHhMm(hours: number): string {
  const sign = hours < 0 ? '-' : '';
  const abs = Math.abs(hours);
  const totalMinutes = Math.round(abs * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${sign}${h}:${m}`;
}
