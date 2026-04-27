/**
 * Finnish bank holidays (pyhäpäivät) — Deno port for edge functions.
 * Mirror of src/lib/finnish-holidays.ts.
 */

function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isFinnishHoliday(dateStr: string): boolean {
  const year = parseInt(dateStr.substring(0, 4), 10);
  const easter = getEasterDate(year);

  const june19 = new Date(year, 5, 19);
  let midsummerEve = new Date(june19);
  while (midsummerEve.getDay() !== 5) midsummerEve = addDays(midsummerEve, 1);
  const midsummerDay = addDays(midsummerEve, 1);

  const oct31 = new Date(year, 9, 31);
  let allSaints = new Date(oct31);
  while (allSaints.getDay() !== 6) allSaints = addDays(allSaints, 1);

  const holidays = new Set<string>([
    `${year}-01-01`,
    `${year}-01-06`,
    toDateStr(addDays(easter, -2)),
    toDateStr(easter),
    toDateStr(addDays(easter, 1)),
    `${year}-05-01`,
    toDateStr(addDays(easter, 39)),
    toDateStr(midsummerEve),
    toDateStr(midsummerDay),
    toDateStr(allSaints),
    `${year}-12-06`,
    `${year}-12-24`,
    `${year}-12-25`,
    `${year}-12-26`,
  ]);

  return holidays.has(dateStr);
}
