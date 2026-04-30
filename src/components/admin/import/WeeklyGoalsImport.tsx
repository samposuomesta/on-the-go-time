import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminData } from '@/hooks/useAdminData';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle2, AlertTriangle, Target } from 'lucide-react';
import { toast } from 'sonner';
import { readFileUtf8, parseCsvLine } from './csvHelpers';

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

export function WeeklyGoalsImport() {
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
          rowNumber: idx + 2,
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

        const goalRows = rowsInGroup.map(r => ({
          weekly_goal_id: weeklyGoalId!,
          text: r.goalText,
          rating: r.rating ?? null,
          comment: r.comment || null,
        }));
        const { error: gErr } = await supabase.from('goals').insert(goalRows);
        if (gErr) { weekErrors++; continue; }
        goalsInserted += goalRows.length;

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
          <p className="text-xs text-muted-foreground">{t('admin.importWeeklyGoalsCols')}</p>
          <p className="text-xs text-muted-foreground">{t('admin.importWeeklyGoalsHint')}</p>
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
