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
