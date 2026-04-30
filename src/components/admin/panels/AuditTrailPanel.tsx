import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportAuditTrailCSV } from '@/lib/csv-export';

function ApiLogTab({ admin }: { admin: any }) {
  const { t } = useTranslation();
  const apiLogs = admin.apiLogs?.data ?? [];
  const apiKeys = admin.apiKeysList?.data ?? [];

  const keyLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    apiKeys.forEach((k: any) => { map[k.id] = k.label || k.id.slice(0, 8); });
    return map;
  }, [apiKeys]);

  const statusColor = (code: number) => {
    if (code < 300) return 'bg-success/15 text-success border-success/30';
    if (code < 500) return 'bg-warning/15 text-warning border-warning/30';
    return 'bg-destructive/15 text-destructive border-destructive/30';
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.auditTime')}</TableHead>
              <TableHead>{t('admin.apiEndpoint')}</TableHead>
              <TableHead>{t('admin.apiStatus')}</TableHead>
              <TableHead>{t('admin.apiResponseTime')}</TableHead>
              <TableHead>{t('admin.apiKeyLabel')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiLogs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t('admin.noApiLogs')}</TableCell></TableRow>
            ) : apiLogs.slice(0, 200).map((log: any) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {format(parseISO(log.created_at), 'dd.MM.yyyy HH:mm:ss')}
                </TableCell>
                <TableCell className="text-xs font-mono">{log.endpoint}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('text-[10px]', statusColor(log.status_code))}>
                    {log.status_code}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.response_time_ms != null ? `${log.response_time_ms} ms` : '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{keyLabelMap[log.api_key_id] ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AuditLogTab({ admin }: { admin: any }) {
  const { t } = useTranslation();
  const [tableFilter, setTableFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const logs = admin.auditLog.data ?? [];

  const tables = useMemo(() => {
    const set = new Set(logs.map((l: any) => l.table_name));
    return Array.from(set).sort() as string[];
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l: any) => {
      if (tableFilter !== 'all' && l.table_name !== tableFilter) return false;
      if (actionFilter !== 'all' && l.action !== actionFilter) return false;
      if (dateFrom && l.created_at && l.created_at.slice(0, 10) < dateFrom) return false;
      if (dateTo && l.created_at && l.created_at.slice(0, 10) > dateTo) return false;
      return true;
    });
  }, [logs, tableFilter, actionFilter, dateFrom, dateTo]);

  const formatChanges = (log: any) => {
    if (log.action === 'INSERT') {
      const d = log.new_data;
      if (d?.name) return `Created "${d.name}"`;
      if (d?.status) return `Status: ${d.status}`;
      return 'New record';
    }
    if (log.action === 'DELETE') {
      const d = log.old_data;
      if (d?.name) return `Deleted "${d.name}"`;
      return 'Record deleted';
    }
    if (log.action === 'UPDATE' && log.old_data && log.new_data) {
      const changes: string[] = [];
      for (const key of Object.keys(log.new_data)) {
        if (key === 'created_at' || key === 'id') continue;
        if (JSON.stringify(log.old_data[key]) !== JSON.stringify(log.new_data[key])) {
          const oldVal = log.old_data[key];
          const newVal = log.new_data[key];
          changes.push(`${key}: ${oldVal} → ${newVal}`);
        }
      }
      return changes.length > 0 ? changes.join(', ') : 'No visible changes';
    }
    return '';
  };

  const actionColor: Record<string, string> = {
    INSERT: 'bg-success/15 text-success border-success/30',
    UPDATE: 'bg-warning/15 text-warning border-warning/30',
    DELETE: 'bg-destructive/15 text-destructive border-destructive/30',
  };

  return (
    <div className="space-y-6">
      <div />

      <div className="flex flex-wrap gap-3 items-end">
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder={t('admin.allTables')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.allTables')}</SelectItem>
            {tables.map(tbl => <SelectItem key={tbl} value={tbl}>{tbl.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder={t('admin.allActions')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.allActions')}</SelectItem>
            <SelectItem value="INSERT">{t('admin.insert')}</SelectItem>
            <SelectItem value="UPDATE">{t('admin.update')}</SelectItem>
            <SelectItem value="DELETE">{t('admin.deleteAction')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="space-y-1">
          <Label className="text-xs">{t('admin.from')}</Label>
          <DatePickerInput value={dateFrom} onChange={setDateFrom} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('admin.to')}</Label>
          <DatePickerInput value={dateTo} onChange={setDateTo} />
        </div>
        {(tableFilter !== 'all' || actionFilter !== 'all' || dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setTableFilter('all'); setActionFilter('all'); setDateFrom(''); setDateTo(''); }}>
            <X className="h-3.5 w-3.5 mr-1" /> {t('admin.clear')}
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">{filtered.length} {t('admin.entries')}</span>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => exportAuditTrailCSV(filtered)}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.auditTime')}</TableHead>
                <TableHead>{t('admin.auditTable')}</TableHead>
                <TableHead>{t('admin.auditAction')}</TableHead>
                <TableHead>{t('admin.auditChanges')}</TableHead>
                <TableHead>{t('admin.auditBy')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t('admin.noAuditEntries')}</TableCell></TableRow>
              ) : filtered.slice(0, 100).map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {format(parseISO(log.created_at), 'dd.MM.yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="text-xs">{log.table_name.replace(/_/g, ' ')}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-[10px]', actionColor[log.action])}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-[300px] truncate">{formatChanges(log)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.changed_by === 'system' ? t('admin.system') : log.changed_by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function AuditTrailPanel({ admin }: { admin: any }) {
  const { t } = useTranslation();
  const [logTab, setLogTab] = useState<'audit' | 'api'>('audit');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold">{t('admin.logs')}</h2>
        <p className="text-sm text-muted-foreground">{t('admin.logsDesc')}</p>
      </div>

      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => setLogTab('audit')}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            logTab === 'audit' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t('admin.auditTrail')}
        </button>
        <button
          onClick={() => setLogTab('api')}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            logTab === 'api' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t('admin.apiLogs')}
        </button>
      </div>

      {logTab === 'audit' ? <AuditLogTab admin={admin} /> : <ApiLogTab admin={admin} />}
    </div>
  );
}
