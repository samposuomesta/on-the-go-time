import { format, parseISO } from 'date-fns';
import { diffChanges, summarizeInsertOrDelete, tableLabel, targetUserIdForLog } from './audit-format';

export function exportTimeEntriesCSV(entries: any[]) {
  const headers = ['Date', 'Start Time', 'End Time', 'Duration (h)', 'Break (min)'];
  const rows = entries.map(e => {
    const start = new Date(e.start_time);
    const end = e.end_time ? new Date(e.end_time) : null;
    const durationH = end ? ((end.getTime() - start.getTime()) / 3600000).toFixed(2) : '';
    return [
      format(start, 'yyyy-MM-dd'),
      format(start, 'HH:mm'),
      end ? format(end, 'HH:mm') : '',
      durationH,
      e.break_minutes ?? 0,
    ].join(',');
  });
  downloadCSV([headers.join(','), ...rows].join('\n'), 'time-entries.csv');
}

export function exportProjectHoursCSV(hours: any[]) {
  const headers = ['Date', 'Project', 'Hours', 'Description'];
  const rows = hours.map((h: any) => [
    h.date,
    `"${(h.projects?.name ?? 'Unknown').replace(/"/g, '""')}"`,
    h.hours,
    `"${(h.description ?? '').replace(/"/g, '""')}"`,
  ].join(','));
  downloadCSV([headers.join(','), ...rows].join('\n'), 'project-hours.csv');
}

export function exportTravelExpensesCSV(expenses: any[]) {
  const headers = ['Date', 'Title', 'Project', 'Kilometers', 'Parking (€)', 'Description', 'Status', 'Receipt'];
  const rows = expenses.map((e: any) => [
    e.date,
    `"${(e.title ?? '').replace(/"/g, '""')}"`,
    `"${(e.projects?.name ?? '').replace(/"/g, '""')}"`,
    e.kilometers ?? 0,
    Number(e.parking_cost ?? 0).toFixed(2),
    `"${(e.description ?? '').replace(/"/g, '""')}"`,
    e.status ?? 'pending',
    e.receipt_image ?? '',
  ].join(','));
  downloadCSV([headers.join(','), ...rows].join('\n'), 'travel-expenses.csv');
}

export function exportAdminWorkingHoursCSV(entries: any[]) {
  const headers = ['Employee', 'Date', 'Start', 'End', 'Break (min)', 'Net Hours', 'Project', 'Status'];
  const rows = entries.map((e: any) => {
    const start = new Date(e.start_time);
    const end = e.end_time ? new Date(e.end_time) : null;
    const breakMins = e.break_minutes ?? 0;
    const netH = end ? Math.max(0, ((end.getTime() - start.getTime()) / 3600000) - breakMins / 60).toFixed(2) : '';
    return [
      `"${(e.users?.name ?? 'Unknown').replace(/"/g, '""')}"`,
      format(start, 'yyyy-MM-dd'),
      format(start, 'HH:mm'),
      end ? format(end, 'HH:mm') : '',
      breakMins,
      netH,
      `"${(e.projects?.name ?? '').replace(/"/g, '""')}"`,
      e.status ?? 'pending',
    ].join(',');
  });
  downloadCSV([headers.join(','), ...rows].join('\n'), 'working-hours.csv');
}

export function exportAdminTravelExpensesCSV(expenses: any[]) {
  const headers = ['Employee', 'Date', 'Project', 'Kilometers', 'Parking (€)', 'Description', 'Status'];
  const rows = expenses.map((e: any) => [
    `"${(e.users?.name ?? 'Unknown').replace(/"/g, '""')}"`,
    e.date,
    `"${(e.projects?.name ?? '').replace(/"/g, '""')}"`,
    e.kilometers ?? 0,
    Number(e.parking_cost ?? 0).toFixed(2),
    `"${(e.description ?? '').replace(/"/g, '""')}"`,
    e.status ?? 'pending',
  ].join(','));
  downloadCSV([headers.join(','), ...rows].join('\n'), 'travel-expenses-admin.csv');
}

export function exportAdminProjectHoursCSV(hours: any[]) {
  const headers = ['Employee', 'Date', 'Project', 'Hours', 'Description', 'Status'];
  const rows = hours.map((h: any) => [
    `"${(h.users?.name ?? 'Unknown').replace(/"/g, '""')}"`,
    h.date,
    `"${(h.projects?.name ?? '').replace(/"/g, '""')}"`,
    h.hours,
    `"${(h.description ?? '').replace(/"/g, '""')}"`,
    h.status ?? 'pending',
  ].join(','));
  downloadCSV([headers.join(','), ...rows].join('\n'), 'project-hours-admin.csv');
}

export function exportProjectManagementCSV(rows: { projectName: string; employeeName: string; description: string; date: string; hoursUsed: number; targetHours: string; approvedHours: number; unapprovedHours: number }[]) {
  const headers = ['Project', 'Employee', 'Description', 'Date', 'Hours Used', 'Target Hours', 'Approved Hours', 'Unapproved Hours'];
  const csvRows = rows.map(r => [
    `"${r.projectName.replace(/"/g, '""')}"`,
    `"${r.employeeName.replace(/"/g, '""')}"`,
    `"${(r.description ?? '').replace(/"/g, '""')}"`,
    r.date,
    r.hoursUsed,
    r.targetHours,
    r.approvedHours,
    r.unapprovedHours,
  ].join(','));
  downloadCSV([headers.join(','), ...csvRows].join('\n'), 'project-management.csv');
}

export function exportAuditTrailCSV(
  logs: any[],
  nameMap: Record<string, string> = {},
  lang: 'fi' | 'en' = 'en'
) {
  // Lazy import to avoid circular deps
  // (helpers imported at top)
  const headers = lang === 'fi'
    ? ['Aika', 'Taulu', 'Kohde', 'Toiminto', 'Muutokset', 'Tekijä']
    : ['Time', 'Table', 'Target', 'Action', 'Changes', 'By'];
  const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = logs.map((l: any) => {
    const uid = targetUserIdForLog(l);
    const target = (uid && nameMap[uid]) ? nameMap[uid] : (uid ? uid.slice(0, 8) + '…' : '—');
    let changesText = '';
    if (l.action === 'INSERT' || l.action === 'DELETE') {
      const verb = l.action === 'INSERT'
        ? (lang === 'fi' ? 'Luotu' : 'Created')
        : (lang === 'fi' ? 'Poistettu' : 'Deleted');
      changesText = `${verb}: ${summarizeInsertOrDelete(l, nameMap, lang)}`;
    } else {
      const changes = diffChanges(l, nameMap, lang);
      changesText = changes.length === 0
        ? (lang === 'fi' ? 'Ei näkyviä muutoksia' : 'No visible changes')
        : changes.map((c: any) => `${c.field}: ${c.oldValue} → ${c.newValue}`).join('; ');
    }
    return [
      l.created_at ? format(parseISO(l.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
      escape(tableLabel(l.table_name, lang)),
      escape(target),
      l.action,
      escape(changesText),
      escape(l.changed_by ?? 'system'),
    ].join(',');
  });
  downloadCSV([headers.join(','), ...rows].join('\n'), 'audit-trail.csv');
}

export function exportWeeklyGoalsCSV(rows: { userName: string; weekNumber: number; year: number; goalText: string; rating: number | null; comment: string | null; isAdminAssigned: boolean; templateName: string | null }[]) {
  const headers = ['Employee', 'Year', 'Week', 'Goal', 'Rating', 'Comment', 'Source', 'Template'];
  const csvRows = rows.map(r => [
    `"${r.userName.replace(/"/g, '""')}"`,
    r.year,
    r.weekNumber,
    `"${(r.goalText ?? '').replace(/"/g, '""')}"`,
    r.rating ?? '',
    `"${(r.comment ?? '').replace(/"/g, '""')}"`,
    r.isAdminAssigned ? 'admin' : 'self',
    `"${(r.templateName ?? '').replace(/"/g, '""')}"`,
  ].join(','));
  downloadCSV([headers.join(','), ...csvRows].join('\n'), 'weekly-goals.csv');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
