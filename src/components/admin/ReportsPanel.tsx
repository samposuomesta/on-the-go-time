import { useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';
import { useDateLocale } from '@/lib/date-locale';
import { Download, CalendarIcon, FileText, Settings2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// All possible columns
const ALL_COLUMNS = [
  { key: 'type', labelKey: 'reports.colType' },
  { key: 'employee', labelKey: 'reports.colEmployee' },
  { key: 'company', labelKey: 'reports.colCompany' },
  { key: 'date', labelKey: 'reports.colDate' },
  { key: 'time', labelKey: 'reports.colTime' },
  { key: 'loginTime', labelKey: 'reports.colLoginTime' },
  { key: 'logoutTime', labelKey: 'reports.colLogoutTime' },
  { key: 'loginLat', labelKey: 'reports.colLoginLat' },
  { key: 'loginLng', labelKey: 'reports.colLoginLng' },
  { key: 'logoutLat', labelKey: 'reports.colLogoutLat' },
  { key: 'logoutLng', labelKey: 'reports.colLogoutLng' },
  { key: 'startTime', labelKey: 'reports.colStartTime' },
  { key: 'endTime', labelKey: 'reports.colEndTime' },
  { key: 'breakMin', labelKey: 'reports.colBreakMin' },
  { key: 'netHours', labelKey: 'reports.colNetHours' },
  { key: 'project', labelKey: 'reports.colProject' },
  { key: 'projectHours', labelKey: 'reports.colProjectHours' },
  { key: 'description', labelKey: 'reports.colDescription' },
  { key: 'status', labelKey: 'reports.colStatus' },
] as const;

type ColumnKey = typeof ALL_COLUMNS[number]['key'];

const DEFAULT_COLUMNS: ColumnKey[] = [
  'type', 'employee', 'date', 'time', 'loginTime', 'logoutTime',
  'loginLat', 'loginLng', 'project', 'projectHours', 'description', 'status',
];

interface ReportRow {
  type: string;
  employee: string;
  company: string;
  date: string;
  time: string;
  loginTime: string;
  logoutTime: string;
  loginLat: string;
  loginLng: string;
  logoutLat: string;
  logoutLng: string;
  startTime: string;
  endTime: string;
  breakMin: string;
  netHours: string;
  project: string;
  projectHours: string;
  description: string;
  status: string;
  sortKey: string;
}

export function ReportsPanel({ admin, canSeeUser }: { admin: any; canSeeUser: (id: string) => boolean }) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [fromDate, setFromDate] = useState(() => startOfMonth(subMonths(new Date(), 1)));
  const [toDate, setToDate] = useState(() => endOfMonth(new Date()));
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(new Set(DEFAULT_COLUMNS));
  const [showColPicker, setShowColPicker] = useState(false);
  const [dataFilter, setDataFilter] = useState<string>('all');

  const employees = (admin.employees.data ?? []).filter((e: any) => canSeeUser(e.id));
  const companies = admin.companies?.data ?? [];

  const nameMap = useMemo(() => {
    const map: Record<string, string> = {};
    employees.forEach((e: any) => { map[e.id] = e.name; });
    return map;
  }, [employees]);

  const companyMap = useMemo(() => {
    const map: Record<string, string> = {};
    companies.forEach((c: any) => { map[c.id] = c.name; });
    return map;
  }, [companies]);

  const employeeCompanyMap = useMemo(() => {
    const map: Record<string, string> = {};
    employees.forEach((e: any) => { map[e.id] = companyMap[e.company_id] ?? ''; });
    return map;
  }, [employees, companyMap]);

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    (admin.projects?.data ?? []).forEach((p: any) => { map[p.id] = p.name; });
    return map;
  }, [admin.projects?.data]);

  const fromStr = format(fromDate, 'yyyy-MM-dd');
  const toStr = format(toDate, 'yyyy-MM-dd');

  // Build unified rows
  const rows = useMemo(() => {
    const result: ReportRow[] = [];

    // Login sessions
    if (dataFilter === 'all' || dataFilter === 'login') {
      (admin.loginSessions?.data ?? []).forEach((ls: any) => {
        if (!canSeeUser(ls.user_id)) return;
        const d = ls.login_at?.slice(0, 10) ?? '';
        if (d < fromStr || d > toStr) return;
        result.push({
          type: t('reports.typeLogin' as any),
          employee: nameMap[ls.user_id] ?? '',
          company: employeeCompanyMap[ls.user_id] ?? '',
          date: ls.login_at ? format(new Date(ls.login_at), 'dd.MM.yyyy') : '',
          time: ls.login_at ? format(new Date(ls.login_at), 'HH:mm') : '',
          loginTime: ls.login_at ? format(new Date(ls.login_at), 'dd.MM.yyyy HH:mm') : '',
          logoutTime: ls.logout_at ? format(new Date(ls.logout_at), 'dd.MM.yyyy HH:mm') : '',
          loginLat: ls.login_lat != null ? String(ls.login_lat) : '',
          loginLng: ls.login_lng != null ? String(ls.login_lng) : '',
          logoutLat: ls.logout_lat != null ? String(ls.logout_lat) : '',
          logoutLng: ls.logout_lng != null ? String(ls.logout_lng) : '',
          startTime: '', endTime: '', breakMin: '', netHours: '',
          project: '', projectHours: '', description: '', status: '',
          sortKey: ls.login_at ?? '',
        });
      });
    }

    // Time entries (working hours)
    if (dataFilter === 'all' || dataFilter === 'working') {
      (admin.allTimeEntries?.data ?? []).forEach((te: any) => {
        if (!canSeeUser(te.user_id)) return;
        const d = format(new Date(te.start_time), 'yyyy-MM-dd');
        if (d < fromStr || d > toStr) return;
        const start = new Date(te.start_time);
        const end = te.end_time ? new Date(te.end_time) : null;
        const mins = end ? differenceInMinutes(end, start) - (te.break_minutes ?? 0) : 0;
        result.push({
          type: t('reports.typeWorkHours' as any),
          employee: nameMap[te.user_id] ?? '',
          company: employeeCompanyMap[te.user_id] ?? '',
          date: format(start, 'dd.MM.yyyy'),
          time: format(start, 'HH:mm'),
          loginTime: '', logoutTime: '',
          loginLat: '', loginLng: '', logoutLat: '', logoutLng: '',
          startTime: format(start, 'HH:mm'),
          endTime: end ? format(end, 'HH:mm') : '',
          breakMin: String(te.break_minutes ?? 0),
          netHours: (Math.max(0, mins) / 60).toFixed(1),
          project: projectMap[te.project_id] ?? '',
          projectHours: '', description: '', status: te.status ?? '',
          sortKey: te.start_time,
        });
      });
    }

    // Project hours
    if (dataFilter === 'all' || dataFilter === 'project') {
      (admin.projectHours?.data ?? []).forEach((ph: any) => {
        if (!canSeeUser(ph.user_id)) return;
        if (ph.date < fromStr || ph.date > toStr) return;
        result.push({
          type: t('reports.typeProjectHours' as any),
          employee: nameMap[ph.user_id] ?? '',
          company: employeeCompanyMap[ph.user_id] ?? '',
          date: ph.date ? format(new Date(ph.date + 'T00:00'), 'dd.MM.yyyy') : '',
          time: '',
          loginTime: '', logoutTime: '',
          loginLat: '', loginLng: '', logoutLat: '', logoutLng: '',
          startTime: '', endTime: '', breakMin: '', netHours: '',
          project: projectMap[ph.project_id] ?? '',
          projectHours: String(ph.hours ?? ''),
          description: ph.description ?? '',
          status: ph.status ?? '',
          sortKey: ph.date ?? '',
        });
      });
    }

    // Sort by date descending
    result.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    return result;
  }, [admin, fromStr, toStr, nameMap, employeeCompanyMap, projectMap, dataFilter, t]);

  const toggleCol = (key: ColumnKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const activeColumns = ALL_COLUMNS.filter(c => visibleCols.has(c.key));

  const downloadCSV = () => {
    const headers = activeColumns.map(c => t(c.labelKey as any));
    const csvRows = rows.map(row =>
      activeColumns.map(c => {
        const val = row[c.key];
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    );
    const content = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${fromStr}-${toStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const headers = activeColumns.map(c => t(c.labelKey as any));
    const title = `${t('admin.reports' as any)} ${format(fromDate, 'dd.MM.yyyy')} – ${format(toDate, 'dd.MM.yyyy')}`;

    // Build HTML table for print
    const colWidth = Math.max(60, Math.floor(700 / activeColumns.length));
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      @page { size: landscape; margin: 10mm; }
      body { font-family: Arial, sans-serif; font-size: 9px; margin: 0; padding: 10px; }
      h1 { font-size: 14px; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f0f0f0; border: 1px solid #ccc; padding: 4px 6px; text-align: left; font-size: 8px; white-space: nowrap; }
      td { border: 1px solid #ddd; padding: 3px 6px; font-size: 8px; word-break: break-word; max-width: ${colWidth}px; }
      tr:nth-child(even) { background: #fafafa; }
      .count { font-size: 10px; color: #666; margin-bottom: 8px; }
    </style></head><body>
    <h1>${title}</h1>
    <p class="count">${rows.length} ${t('admin.entries' as any)}</p>
    <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;

    rows.forEach(row => {
      html += '<tr>';
      activeColumns.forEach(c => {
        html += `<td>${row[c.key]}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table></body></html>';

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold">{t('admin.reports' as any)}</h2>
        <p className="text-sm text-muted-foreground">{t('admin.reportsDesc' as any)}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">{t('admin.from' as any)}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[140px] justify-start text-left font-normal h-9 text-sm">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(fromDate, 'dd.MM.yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={fromDate} onSelect={(d) => d && setFromDate(d)} locale={dateLocale} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">{t('admin.to' as any)}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[140px] justify-start text-left font-normal h-9 text-sm">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(toDate, 'dd.MM.yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={toDate} onSelect={(d) => d && setToDate(d)} locale={dateLocale} />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">{t('reports.filterType' as any)}</Label>
          <Select value={dataFilter} onValueChange={setDataFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('reports.filterAll' as any)}</SelectItem>
              <SelectItem value="login">{t('reports.typeLogin' as any)}</SelectItem>
              <SelectItem value="working">{t('reports.typeWorkHours' as any)}</SelectItem>
              <SelectItem value="project">{t('reports.typeProjectHours' as any)}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Column picker */}
        <Popover open={showColPicker} onOpenChange={setShowColPicker}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-9 text-sm">
              <Settings2 className="h-4 w-4" />
              {t('reports.columns' as any)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">{t('reports.selectColumns' as any)}</p>
              {ALL_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={visibleCols.has(col.key)}
                    onCheckedChange={() => toggleCol(col.key)}
                  />
                  {t(col.labelKey as any)}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Export buttons */}
        <div className="flex gap-2 ml-auto">
          <span className="text-xs text-muted-foreground self-center mr-2">{rows.length} {t('admin.entries' as any)}</span>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={downloadCSV} disabled={rows.length === 0}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={downloadPDF} disabled={rows.length === 0}>
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Data table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {activeColumns.map(col => (
                  <TableHead key={col.key} className="text-xs whitespace-nowrap">{t(col.labelKey as any)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={activeColumns.length} className="text-center text-muted-foreground py-8">
                    {t('reports.noData' as any)}
                  </TableCell>
                </TableRow>
              ) : rows.slice(0, 200).map((row, i) => (
                <TableRow key={i}>
                  {activeColumns.map(col => (
                    <TableCell key={col.key} className="text-xs max-w-[200px] truncate">
                      {row[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {rows.length > 200 && (
                <TableRow>
                  <TableCell colSpan={activeColumns.length} className="text-center text-xs text-muted-foreground py-3">
                    {t('reports.showingFirst200' as any)} ({rows.length} {t('admin.entries' as any)})
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
