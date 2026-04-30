import { format, parseISO } from 'date-fns';

/**
 * Field labels per (table, column). Falls back to a generic dictionary,
 * then to the raw column name.
 */
const TABLE_FIELD_LABELS: Record<string, Record<string, { en: string; fi: string }>> = {
  work_bank_transactions: {
    hours: { en: 'Work bank hours', fi: 'Työaikapankin tunnit' },
    type: { en: 'Type', fi: 'Tyyppi' },
    reference_id: { en: 'Reference', fi: 'Viite' },
  },
  users: {
    name: { en: 'Name', fi: 'Nimi' },
    email: { en: 'Email', fi: 'Sähköposti' },
    role: { en: 'Role', fi: 'Rooli' },
    annual_vacation_days: { en: 'Annual vacation days', fi: 'Vuosilomapäivät' },
    daily_work_hours: { en: 'Daily work hours', fi: 'Päivittäiset työtunnit' },
    auto_subtract_lunch: { en: 'Auto-subtract lunch', fi: 'Automaattinen lounasvähennys' },
    lunch_threshold_hours: { en: 'Lunch threshold (h)', fi: 'Lounaskynnys (h)' },
    contract_start_date: { en: 'Contract start', fi: 'Sopimuksen alku' },
    employee_number: { en: 'Employee #', fi: 'Henkilönumero' },
    timezone: { en: 'Timezone', fi: 'Aikavyöhyke' },
    manager_id: { en: 'Manager', fi: 'Esimies' },
    company_id: { en: 'Company', fi: 'Yritys' },
    slack_user_id: { en: 'Slack user', fi: 'Slack-käyttäjä' },
  },
  time_entries: {
    start_time: { en: 'Start', fi: 'Alku' },
    end_time: { en: 'End', fi: 'Loppu' },
    break_minutes: { en: 'Break (min)', fi: 'Tauko (min)' },
    project_id: { en: 'Project', fi: 'Projekti' },
    status: { en: 'Status', fi: 'Tila' },
  },
  project_hours: {
    date: { en: 'Date', fi: 'Päivä' },
    hours: { en: 'Hours', fi: 'Tunnit' },
    project_id: { en: 'Project', fi: 'Projekti' },
    description: { en: 'Description', fi: 'Kuvaus' },
    status: { en: 'Status', fi: 'Tila' },
  },
  vacation_requests: {
    start_date: { en: 'Start date', fi: 'Alkupäivä' },
    end_date: { en: 'End date', fi: 'Loppupäivä' },
    comment: { en: 'Comment', fi: 'Kommentti' },
    status: { en: 'Status', fi: 'Tila' },
  },
  absences: {
    start_date: { en: 'Start date', fi: 'Alkupäivä' },
    end_date: { en: 'End date', fi: 'Loppupäivä' },
    type: { en: 'Type', fi: 'Tyyppi' },
    reason_id: { en: 'Reason', fi: 'Syy' },
    status: { en: 'Status', fi: 'Tila' },
  },
  travel_expenses: {
    date: { en: 'Date', fi: 'Päivä' },
    kilometers: { en: 'Kilometers', fi: 'Kilometrit' },
    parking_cost: { en: 'Parking cost', fi: 'Pysäköinti' },
    per_diem: { en: 'Per diem', fi: 'Päiväraha' },
    vehicle_type: { en: 'Vehicle', fi: 'Ajoneuvo' },
    customer_name: { en: 'Customer', fi: 'Asiakas' },
    project_id: { en: 'Project', fi: 'Projekti' },
    title: { en: 'Title', fi: 'Otsikko' },
    route: { en: 'Route', fi: 'Reitti' },
    status: { en: 'Status', fi: 'Tila' },
  },
  projects: {
    name: { en: 'Name', fi: 'Nimi' },
    customer: { en: 'Customer', fi: 'Asiakas' },
    target_hours: { en: 'Target hours', fi: 'Tavoitetunnit' },
    active: { en: 'Active', fi: 'Aktiivinen' },
  },
  companies: {
    name: { en: 'Name', fi: 'Nimi' },
    km_rate: { en: 'Km rate', fi: 'Km-korvaus' },
    car_km_rate: { en: 'Car km rate', fi: 'Auton km-korvaus' },
    benefit_car_km_rate: { en: 'Benefit car km rate', fi: 'Etuauton km-korvaus' },
    trailer_km_rate: { en: 'Trailer km rate', fi: 'Perävaunun km-korvaus' },
    per_diem_full: { en: 'Full per diem', fi: 'Kokopäiväraha' },
    per_diem_partial: { en: 'Partial per diem', fi: 'Osapäiväraha' },
    timezone: { en: 'Timezone', fi: 'Aikavyöhyke' },
  },
};

const NOISE_FIELDS = new Set([
  'id', 'created_at', 'updated_at', 'synced_at', 'sync_status', 'external_id',
  'auth_user_id', 'gps_accuracy', 'start_lat', 'start_lng', 'end_lat', 'end_lng',
  'login_lat', 'login_lng', 'logout_lat', 'logout_lng',
]);

const TABLE_LABELS: Record<string, { en: string; fi: string }> = {
  work_bank_transactions: { en: 'Work bank', fi: 'Työaikapankki' },
  users: { en: 'User', fi: 'Käyttäjä' },
  time_entries: { en: 'Time entry', fi: 'Työaikamerkintä' },
  project_hours: { en: 'Project hours', fi: 'Projektitunnit' },
  vacation_requests: { en: 'Vacation request', fi: 'Lomapyyntö' },
  absences: { en: 'Absence', fi: 'Poissaolo' },
  travel_expenses: { en: 'Travel expense', fi: 'Matkakulu' },
  projects: { en: 'Project', fi: 'Projekti' },
  companies: { en: 'Company', fi: 'Yritys' },
  api_keys: { en: 'API key', fi: 'API-avain' },
  reminder_rules: { en: 'Reminder rule', fi: 'Muistutussääntö' },
  user_managers: { en: 'Manager assignment', fi: 'Esimiesnimitys' },
  user_teams: { en: 'Team assignment', fi: 'Tiiminimitys' },
  teams: { en: 'Team', fi: 'Tiimi' },
  weekly_goals: { en: 'Weekly goal', fi: 'Viikkotavoite' },
  goals: { en: 'Goal', fi: 'Tavoite' },
  workplaces: { en: 'Workplace', fi: 'Työpaikka' },
  absence_reasons: { en: 'Absence reason', fi: 'Poissaolosyy' },
};

export type Lang = 'fi' | 'en';

export function fieldLabel(table: string, column: string, lang: Lang): string {
  const entry = TABLE_FIELD_LABELS[table]?.[column];
  if (entry) return entry[lang];
  return column.replace(/_/g, ' ');
}

export function tableLabel(table: string, lang: Lang): string {
  return TABLE_LABELS[table]?.[lang] ?? table.replace(/_/g, ' ');
}

function isIsoDateTime(v: unknown): boolean {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);
}
function isIsoDate(v: unknown): boolean {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function isUuid(v: unknown): boolean {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

const STATUS_LABELS: Record<string, { en: string; fi: string }> = {
  pending: { en: 'Pending', fi: 'Odottaa' },
  approved: { en: 'Approved', fi: 'Hyväksytty' },
  rejected: { en: 'Rejected', fi: 'Hylätty' },
  sick: { en: 'Sick', fi: 'Sairaana' },
  absence: { en: 'Absent', fi: 'Poissa' },
};

export function formatValue(
  table: string,
  column: string,
  value: unknown,
  nameMap: Record<string, string>,
  lang: Lang
): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') {
    if (lang === 'fi') return value ? 'Kyllä' : 'Ei';
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    if (lang === 'fi') return String(value).replace('.', ',');
    return String(value);
  }
  if (typeof value === 'string') {
    // status-like
    if (column === 'status' || column === 'type') {
      const s = STATUS_LABELS[value];
      if (s) return s[lang];
    }
    if (isIsoDateTime(value)) {
      try { return format(parseISO(value), 'd.M.yyyy HH:mm'); } catch { return value; }
    }
    if (isIsoDate(value)) {
      try { return format(parseISO(value), 'd.M.yyyy'); } catch { return value; }
    }
    if (isUuid(value)) {
      const name = nameMap[value];
      if (name) return name;
      return value.slice(0, 8) + '…';
    }
    return value;
  }
  try { return JSON.stringify(value); } catch { return String(value); }
}

/**
 * Find the user_id this audit row pertains to, so we can show "kenen".
 */
export function targetUserIdForLog(log: any): string | null {
  if (log.table_name === 'users') {
    return log.new_data?.id ?? log.old_data?.id ?? log.record_id ?? null;
  }
  return log.new_data?.user_id ?? log.old_data?.user_id ?? null;
}

export interface FieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

export function diffChanges(
  log: any,
  nameMap: Record<string, string>,
  lang: Lang
): FieldChange[] {
  if (log.action !== 'UPDATE' || !log.old_data || !log.new_data) return [];
  const changes: FieldChange[] = [];
  for (const key of Object.keys(log.new_data)) {
    if (NOISE_FIELDS.has(key)) continue;
    const oldRaw = log.old_data[key];
    const newRaw = log.new_data[key];
    if (JSON.stringify(oldRaw) === JSON.stringify(newRaw)) continue;
    changes.push({
      field: fieldLabel(log.table_name, key, lang),
      oldValue: formatValue(log.table_name, key, oldRaw, nameMap, lang),
      newValue: formatValue(log.table_name, key, newRaw, nameMap, lang),
    });
  }
  return changes;
}

export function summarizeInsertOrDelete(
  log: any,
  nameMap: Record<string, string>,
  lang: Lang
): string {
  const data = log.action === 'INSERT' ? log.new_data : log.old_data;
  if (!data) return lang === 'fi' ? '(ei tietoja)' : '(no data)';
  // Show 2-3 most meaningful fields
  const candidates = [
    'name', 'label', 'hours', 'type', 'status', 'date',
    'start_date', 'end_date', 'start_time', 'project_id', 'kilometers',
  ];
  const parts: string[] = [];
  for (const key of candidates) {
    if (data[key] === undefined || data[key] === null || data[key] === '') continue;
    if (NOISE_FIELDS.has(key)) continue;
    parts.push(`${fieldLabel(log.table_name, key, lang)}: ${formatValue(log.table_name, key, data[key], nameMap, lang)}`);
    if (parts.length >= 3) break;
  }
  return parts.length > 0
    ? parts.join(' · ')
    : (lang === 'fi' ? '(ei lisätietoja)' : '(no details)');
}
