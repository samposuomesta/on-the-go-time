import React, { useState, useRef } from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { parseDateAny } from './csvHelpers';

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

export function EmployeesFennoaImport() {
  const { t } = useTranslation();
  const admin = useAdminData();
  const companies = admin.companies.data ?? [];
  const [preview, setPreview] = useState<FennoaRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
          const contractDate = parseDateAny(contractDateRaw != null ? String(contractDateRaw) : '') || '';
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
