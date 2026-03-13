import { format, parseISO } from 'date-fns';

export function exportTimeEntriesCSV(entries: any[]) {
  const headers = ['Date', 'Start Time', 'End Time', 'Duration (h)', 'Break (min)', 'Start Lat', 'Start Lng', 'End Lat', 'End Lng'];
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
      e.start_lat ?? '',
      e.start_lng ?? '',
      e.end_lat ?? '',
      e.end_lng ?? '',
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
  const headers = ['Date', 'Project', 'Kilometers', 'Parking (€)', 'Description', 'Status', 'Receipt'];
  const rows = expenses.map((e: any) => [
    e.date,
    `"${(e.projects?.name ?? '').replace(/"/g, '""')}"`,
    e.kilometers ?? 0,
    Number(e.parking_cost ?? 0).toFixed(2),
    `"${(e.description ?? '').replace(/"/g, '""')}"`,
    e.status ?? 'pending',
    e.receipt_image ?? '',
  ].join(','));
  downloadCSV([headers.join(','), ...rows].join('\n'), 'travel-expenses.csv');
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
