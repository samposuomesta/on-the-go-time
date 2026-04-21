import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminData } from '@/hooks/useAdminData';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle2, AlertTriangle, Target, Users, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* =============================================================
   Helpers
   ============================================================= */

// Read file as UTF-8 text, stripping a leading BOM so åäö survive.
const readFileUtf8 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      let text = (reader.result as string) ?? '';
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      resolve(text);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });

// Parse a single semicolon-delimited CSV line, supporting quoted fields with embedded ";" or escaped quotes.
const parseCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ';') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
};

const parseDateFi = (val: string): string | null => {
  if (!val) return null;
  const s = val.trim();
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return s;
  return null;
};

/* =============================================================
   Weekly Goals CSV import
   Columns (semicolon-separated): email; year; week; goal_text; rating; comment
   Rating + comment optional.
   ============================================================= */

interface WgRow {
  rowNumber: number;
  email: string;
  year: number | null;
  week: number | null;
  goalText: string;
  rating: number | null;
  comment: string;
  userId?: string;
  userName?: string;
  error?: string;
}

function WeeklyGoalsImport() {
  const { t } = useTranslation();
  const admin = useAdminData();
  const employees = admin.employees.data ?? [];
  const [preview, setPreview] = useState<WgRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileUtf8(file);
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        toast.error(t('admin.importCsvHeaderError'));
        return;
      }
      // Skip header row (line 0) — assume first row contains column names.
      const userByEmail = new Map<string, { id: string; name: string }>();
      employees.forEach((u: any) => userByEmail.set(String(u.email).toLowerCase().trim(), { id: u.id, name: u.name }));

      const rows: WgRow[] = lines.slice(1).map((raw, idx) => {
        const cols = parseCsvLine(raw);
        const email = (cols[0] || '').toLowerCase();
        const year = parseInt((cols[1] || '').trim(), 10);
        const week = parseInt((cols[2] || '').trim(), 10);
        const goalText = (cols[3] || '').trim();
        const ratingRaw = (cols[4] || '').trim();
        const comment = (cols[5] || '').trim();
        const rating = ratingRaw ? Number(ratingRaw.replace(',', '.')) : null;

        const user = userByEmail.get(email);
        let error: string | undefined;
        if (!email) error = t('admin.importErrMissingEmail');
        else if (!user) error = t('admin.importErrUnknownEmail');
        else if (!Number.isFinite(year) || year < 2000 || year > 2100) error = t('admin.importErrInvalidYear');
        else if (!Number.isFinite(week) || week < 1 || week > 53) error = t('admin.importErrInvalidWeek');
        else if (!goalText) error = t('admin.importErrMissingGoal');
        else if (rating !== null && (!Number.isFinite(rating) || rating < 1 || rating > 4)) error = t('admin.importErrInvalidRating');

        return {
          rowNumber: idx + 2, // +2 because: 1-based + skipped header
          email,
          year: Number.isFinite(year) ? year : null,
          week: Number.isFinite(week) ? week : null,
          goalText,
          rating: rating !== null && Number.isFinite(rating) ? rating : null,
          comment,
          userId: user?.id,
          userName: user?.name,
          error,
        };
      });

      setPreview(rows);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to read file');
    }
  };

  const handleImport = async () => {
    const valid = preview.filter(r => !r.error && r.userId && r.year && r.week);
    if (valid.length === 0) { toast.error(t('admin.importNoValidRows')); return; }
    setImporting(true);
    try {
      // Group by user+year+week to upsert weekly_goals once per group.
      const groups = new Map<string, WgRow[]>();
      valid.forEach(r => {
        const key = `${r.userId}|${r.year}|${r.week}`;
        const arr = groups.get(key) ?? [];
        arr.push(r);
        groups.set(key, arr);
      });

      let goalsInserted = 0;
      let weekErrors = 0;

      for (const [key, rowsInGroup] of groups) {
        const [userId, yearStr, weekStr] = key.split('|');
        const year = parseInt(yearStr, 10);
        const week = parseInt(weekStr, 10);

        // Find existing weekly_goals row or create one.
        const { data: existing, error: selErr } = await supabase
          .from('weekly_goals')
          .select('id')
          .eq('user_id', userId)
          .eq('year', year)
          .eq('week_number', week)
          .maybeSingle();
        if (selErr) { weekErrors++; continue; }

        let weeklyGoalId = existing?.id;
        if (!weeklyGoalId) {
          const { data: created, error: insErr } = await supabase
            .from('weekly_goals')
            .insert({ user_id: userId, year, week_number: week })
            .select('id')
            .single();
          if (insErr || !created) { weekErrors++; continue; }
          weeklyGoalId = created.id;
        }

        // Insert goals (ALWAYS append — never overwrite existing).
        const goalRows = rowsInGroup.map(r => ({
          weekly_goal_id: weeklyGoalId!,
          text: r.goalText,
          rating: r.rating ?? null,
          comment: r.comment || null,
        }));
        const { error: gErr } = await supabase.from('goals').insert(goalRows);
        if (gErr) { weekErrors++; continue; }
        goalsInserted += goalRows.length;

        // If any row had a rating, mark week as rated.
        if (rowsInGroup.some(r => r.rating !== null)) {
          await supabase
            .from('weekly_goals')
            .update({ rated_at: new Date().toISOString() })
            .eq('id', weeklyGoalId!);
        }
      }

      toast.success(`${t('admin.importDone')}: ${goalsInserted} ${t('admin.importGoalsInserted')}` + (weekErrors ? ` (${weekErrors} ${t('admin.importErrors')})` : ''));
      setPreview([]);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      toast.error(err?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const validCount = preview.filter(r => !r.error).length;
  const errorCount = preview.length - validCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display"><Target className="w-5 h-5" /> {t('admin.importWeeklyGoalsTitle')}</CardTitle>
        <CardDescription>{t('admin.importWeeklyGoalsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t('admin.csvFile')}</Label>
          <Input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} />
          <p className="text-xs text-muted-foreground">
            {t('admin.importWeeklyGoalsCols')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('admin.importWeeklyGoalsHint')}
          </p>
        </div>

        {preview.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {validCount} {t('admin.valid')}
              </Badge>
              {errorCount > 0 && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {errorCount} {t('admin.errors')}
                </Badge>
              )}
              <span className="text-muted-foreground">/ {preview.length} {t('admin.total')}</span>
            </div>

            <div className="overflow-x-auto border rounded-lg max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 sticky top-0">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('admin.email')}</TableHead>
                    <TableHead>{t('admin.importColUser')}</TableHead>
                    <TableHead>{t('admin.importColYear')}</TableHead>
                    <TableHead>{t('admin.importColWeek')}</TableHead>
                    <TableHead>{t('admin.importColGoal')}</TableHead>
                    <TableHead>{t('admin.importColRating')}</TableHead>
                    <TableHead>{t('admin.importColComment')}</TableHead>
                    <TableHead>{t('admin.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((r, i) => (
                    <TableRow key={i} className={r.error ? 'bg-destructive/10' : ''}>
                      <TableCell className="text-xs text-muted-foreground">{r.rowNumber}</TableCell>
                      <TableCell className="text-xs">{r.email}</TableCell>
                      <TableCell className="text-xs">{r.userName || <span className="text-muted-foreground italic">—</span>}</TableCell>
                      <TableCell className="text-xs">{r.year ?? ''}</TableCell>
                      <TableCell className="text-xs">{r.week ?? ''}</TableCell>
                      <TableCell className="text-xs max-w-[260px] truncate" title={r.goalText}>{r.goalText}</TableCell>
                      <TableCell className="text-xs">{r.rating ?? ''}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={r.comment}>{r.comment}</TableCell>
                      <TableCell>{r.error
                        ? <span className="text-destructive text-xs">{r.error}</span>
                        : <CheckCircle2 className="h-4 w-4 text-success" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button onClick={handleImport} disabled={importing || validCount === 0} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              {importing ? t('admin.importing') : `${t('admin.importCount')} ${validCount} ${t('admin.importGoalsLabel')}`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* =============================================================
   Employees CSV import (preview + commit)
   Columns (semicolon): first name; last name; email; company; employee number; contract start (dd.mm.yyyy)
   ============================================================= */

interface EmpCsvRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  employeeNumber: string;
  contractDate: string;
  companyId: string;
  error?: string;
}

function EmployeesCsvImport() {
  const { t } = useTranslation();
  const admin = useAdminData();
  const companies = admin.companies.data ?? [];
  const [preview, setPreview] = useState<EmpCsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const resolveCompany = (name: string): string => {
    if (!name?.trim()) return companies.length > 0 ? companies[0].id : '';
    const found = companies.find((c: any) => c.name.toLowerCase() === name.trim().toLowerCase());
    return found ? found.id : (companies.length > 0 ? companies[0].id : '');
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileUtf8(file);
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) { toast.error(t('admin.importCsvHeaderError')); return; }
      const rows: EmpCsvRow[] = lines.slice(1).map((line, idx) => {
        const cols = parseCsvLine(line);
        const companyId = resolveCompany(cols[3] || '');
        const contractDate = parseDateFi(cols[5] || '') || '';
        return {
          rowNumber: idx + 2,
          firstName: cols[0] || '',
          lastName: cols[1] || '',
          email: (cols[2] || '').trim(),
          company: cols[3] || '',
          employeeNumber: cols[4] || '',
          contractDate,
          companyId,
          error: !cols[0] ? t('admin.importErrMissingFirst')
            : !cols[1] ? t('admin.importErrMissingLast')
            : !cols[2] ? t('admin.importErrMissingEmail')
            : !companyId ? t('admin.importErrNoCompany')
            : undefined,
        };
      });
      setPreview(rows);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to read file');
    }
  };

  const handleImport = async () => {
    const valid = preview.filter(r => !r.error);
    if (valid.length === 0) { toast.error(t('admin.importNoValidRows')); return; }
    setImporting(true);
    try {
      for (const r of valid) {
        await admin.createEmployee.mutateAsync({
          name: `${r.firstName} ${r.lastName}`.trim(),
          email: r.email,
          employee_number: r.employeeNumber || null,
          company_id: r.companyId,
          role: 'employee' as const,
          contract_start_date: r.contractDate || null,
        });
      }
      toast.success(`${t('admin.importDone')}: ${valid.length} ${t('admin.employees_count')}`);
      setPreview([]);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      toast.error(err?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const validCount = preview.filter(r => !r.error).length;
  const errorCount = preview.length - validCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display"><Users className="w-5 h-5" /> {t('admin.importCsvTitle')}</CardTitle>
        <CardDescription>{t('admin.csvColumns')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t('admin.csvFile')}</Label>
          <Input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} />
        </div>

        {preview.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {validCount} {t('admin.valid')}
              </Badge>
              {errorCount > 0 && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {errorCount} {t('admin.errors')}
                </Badge>
              )}
              <span className="text-muted-foreground">/ {preview.length} {t('admin.total')}</span>
            </div>

            <div className="overflow-x-auto border rounded-lg max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 sticky top-0">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('admin.firstName')}</TableHead>
                    <TableHead>{t('admin.lastName')}</TableHead>
                    <TableHead>{t('admin.email')}</TableHead>
                    <TableHead>{t('admin.company')}</TableHead>
                    <TableHead>{t('admin.empNumber')}</TableHead>
                    <TableHead>{t('admin.contractStartLabel')}</TableHead>
                    <TableHead>{t('admin.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((r, i) => (
                    <TableRow key={i} className={r.error ? 'bg-destructive/10' : ''}>
                      <TableCell className="text-xs text-muted-foreground">{r.rowNumber}</TableCell>
                      <TableCell className="text-xs">{r.firstName}</TableCell>
                      <TableCell className="text-xs">{r.lastName}</TableCell>
                      <TableCell className="text-xs">{r.email}</TableCell>
                      <TableCell className="text-xs">{r.company || <span className="text-muted-foreground italic">(default)</span>}</TableCell>
                      <TableCell className="text-xs">{r.employeeNumber}</TableCell>
                      <TableCell className="text-xs">{r.contractDate}</TableCell>
                      <TableCell>{r.error ? <span className="text-destructive text-xs">{r.error}</span> : <CheckCircle2 className="h-4 w-4 text-success" />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button onClick={handleImport} disabled={importing || validCount === 0} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              {importing ? t('admin.importing') : `${t('admin.importCount')} ${validCount} ${t('admin.employees_count')}`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* =============================================================
   Employees Fennoa XLSX import (preview + commit)
   Columns: A=Emp#, B=First, C=Last, K=Email, P=Contract start
   Row 1 ignored. Defaults: vacation=0, work=8h, auto lunch 30min if >6h.
   ============================================================= */

interface FennoaRow {
  rowNumber: number;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  contractDate: string;
  companyId: string;
  error?: string;
}

function EmployeesFennoaImport() {
  const { t } = useTranslation();
  const admin = useAdminData();
  const companies = admin.companies.data ?? [];
  const [preview, setPreview] = useState<FennoaRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseDate = (val: string): string | null => {
    if (!val) return null;
    const str = String(val).trim();
    const m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return str;
    const num = Number(str);
    if (!isNaN(num) && num > 30000 && num < 60000) {
      const d = new Date((num - 25569) * 86400 * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return null;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const data = await file.arrayBuffer();
      await workbook.xlsx.load(data);
      const ws = workbook.worksheets[0];
      if (!ws) { toast.error('No worksheet found'); return; }
      const rows: any[][] = [];
      ws.eachRow((row) => { rows.push(row.values as any[]); });
      if (rows.length < 2) { toast.error('File must have at least 2 rows'); return; }
      const defaultCompanyId = companies.length > 0 ? companies[0].id : '';
      const parsed: FennoaRow[] = rows.slice(1)
        .filter((r: any[]) => r.some(c => c != null && String(c).trim()))
        .map((r: any[], idx) => {
          const empNum = String(r[1] ?? '').trim();
          const firstName = String(r[2] ?? '').trim();
          const lastName = String(r[3] ?? '').trim();
          const email = String(r[11] ?? '').trim();
          const contractDateRaw = r[16];
          const contractDate = parseDate(contractDateRaw != null ? String(contractDateRaw) : '') || '';
          return {
            rowNumber: idx + 2,
            employeeNumber: empNum,
            firstName,
            lastName,
            email,
            contractDate,
            companyId: defaultCompanyId,
            error: !firstName ? t('admin.importErrMissingFirst')
              : !lastName ? t('admin.importErrMissingLast')
              : !email ? t('admin.importErrMissingEmail')
              : !defaultCompanyId ? t('admin.importErrNoCompany')
              : undefined,
          };
        });
      setPreview(parsed);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to read file');
    }
  };

  const handleImport = async () => {
    const valid = preview.filter(r => !r.error);
    if (valid.length === 0) { toast.error(t('admin.importNoValidRows')); return; }
    setImporting(true);
    try {
      for (const r of valid) {
        await admin.createEmployee.mutateAsync({
          name: `${r.firstName} ${r.lastName}`.trim(),
          email: r.email,
          employee_number: r.employeeNumber || null,
          company_id: r.companyId,
          role: 'employee' as const,
          contract_start_date: r.contractDate || null,
          annual_vacation_days: 0,
          daily_work_hours: 8,
          auto_subtract_lunch: true,
          lunch_threshold_hours: 6,
        });
      }
      toast.success(`${t('admin.importDone')}: ${valid.length} ${t('admin.employees_count')}`);
      setPreview([]);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      toast.error(err?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const validCount = preview.filter(r => !r.error).length;
  const errorCount = preview.length - validCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display"><FileSpreadsheet className="w-5 h-5" /> {t('admin.importFennoaTitle')}</CardTitle>
        <CardDescription>{t('admin.fennoaColumns')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t('admin.xlsxFile')}</Label>
          <Input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} />
        </div>

        {preview.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {validCount} {t('admin.valid')}
              </Badge>
              {errorCount > 0 && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {errorCount} {t('admin.errors')}
                </Badge>
              )}
              <span className="text-muted-foreground">/ {preview.length} {t('admin.total')}</span>
            </div>

            <div className="overflow-x-auto border rounded-lg max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 sticky top-0">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('admin.empNumber')}</TableHead>
                    <TableHead>{t('admin.firstName')}</TableHead>
                    <TableHead>{t('admin.lastName')}</TableHead>
                    <TableHead>{t('admin.email')}</TableHead>
                    <TableHead>{t('admin.contractStartLabel')}</TableHead>
                    <TableHead>{t('admin.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((r, i) => (
                    <TableRow key={i} className={r.error ? 'bg-destructive/10' : ''}>
                      <TableCell className="text-xs text-muted-foreground">{r.rowNumber}</TableCell>
                      <TableCell className="text-xs">{r.employeeNumber}</TableCell>
                      <TableCell className="text-xs">{r.firstName}</TableCell>
                      <TableCell className="text-xs">{r.lastName}</TableCell>
                      <TableCell className="text-xs">{r.email}</TableCell>
                      <TableCell className="text-xs">{r.contractDate}</TableCell>
                      <TableCell>{r.error ? <span className="text-destructive text-xs">{r.error}</span> : <CheckCircle2 className="h-4 w-4 text-success" />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button onClick={handleImport} disabled={importing || validCount === 0} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              {importing ? t('admin.importing') : `${t('admin.importCount')} ${validCount} ${t('admin.employees_count')}`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* =============================================================
   Top-level panel
   ============================================================= */

export function ImportPanel() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-display font-bold">{t('admin.import')}</h2>
        <p className="text-sm text-muted-foreground">{t('admin.importDesc')}</p>
      </div>
      <Tabs defaultValue="weekly-goals">
        <TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
          <TabsTrigger value="weekly-goals" className="data-[state=active]:bg-background">
            <Target className="w-4 h-4 mr-2" />{t('admin.importWeeklyGoals')}
          </TabsTrigger>
          <TabsTrigger value="employees-csv" className="data-[state=active]:bg-background">
            <Users className="w-4 h-4 mr-2" />{t('admin.importCsv')}
          </TabsTrigger>
          <TabsTrigger value="employees-fennoa" className="data-[state=active]:bg-background">
            <FileSpreadsheet className="w-4 h-4 mr-2" />{t('admin.importFennoa')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="weekly-goals" className="mt-4"><WeeklyGoalsImport /></TabsContent>
        <TabsContent value="employees-csv" className="mt-4"><EmployeesCsvImport /></TabsContent>
        <TabsContent value="employees-fennoa" className="mt-4"><EmployeesFennoaImport /></TabsContent>
      </Tabs>
    </div>
  );
}
