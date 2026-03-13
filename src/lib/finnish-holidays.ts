/**
 * Finnish bank holidays (pyhäpäivät).
 * Includes fixed and moveable (Easter-based) holidays.
 */

function getEasterDate(year: number): Date {
  // Anonymous Gregorian algorithm
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getFinnishHolidays(year: number): { date: string; name: string }[] {
  const easter = getEasterDate(year);

  // Midsummer Eve: Friday between June 19-25
  const june19 = new Date(year, 5, 19);
  let midsummerEve = new Date(june19);
  while (midsummerEve.getDay() !== 5) {
    midsummerEve = addDays(midsummerEve, 1);
  }
  const midsummerDay = addDays(midsummerEve, 1);

  // All Saints' Day: Saturday between Oct 31 - Nov 6
  const oct31 = new Date(year, 9, 31);
  let allSaints = new Date(oct31);
  while (allSaints.getDay() !== 6) {
    allSaints = addDays(allSaints, 1);
  }

  const holidays = [
    { date: `${year}-01-01`, name: 'Uudenvuodenpäivä' },
    { date: `${year}-01-06`, name: 'Loppiainen' },
    { date: toDateStr(addDays(easter, -2)), name: 'Pitkäperjantai' },
    { date: toDateStr(easter), name: 'Pääsiäispäivä' },
    { date: toDateStr(addDays(easter, 1)), name: '2. pääsiäispäivä' },
    { date: `${year}-05-01`, name: 'Vappu' },
    { date: toDateStr(addDays(easter, 39)), name: 'Helatorstai' },
    { date: toDateStr(midsummerEve), name: 'Juhannusaatto' },
    { date: toDateStr(midsummerDay), name: 'Juhannuspäivä' },
    { date: toDateStr(allSaints), name: 'Pyhäinpäivä' },
    { date: `${year}-12-06`, name: 'Itsenäisyyspäivä' },
    { date: `${year}-12-24`, name: 'Jouluaatto' },
    { date: `${year}-12-25`, name: 'Joulupäivä' },
    { date: `${year}-12-26`, name: 'Tapaninpäivä' },
  ];

  return holidays;
}

/**
 * Returns a Set of date strings (YYYY-MM-DD) for Finnish holidays in the given year(s).
 */
export function getFinnishHolidaySet(years: number[]): Set<string> {
  const set = new Set<string>();
  for (const year of years) {
    for (const h of getFinnishHolidays(year)) {
      set.add(h.date);
    }
  }
  return set;
}

/**
 * Check if a given date string is a Finnish bank holiday.
 */
export function isFinnishHoliday(dateStr: string): boolean {
  const year = parseInt(dateStr.substring(0, 4));
  const holidays = getFinnishHolidays(year);
  return holidays.some(h => h.date === dateStr);
}
