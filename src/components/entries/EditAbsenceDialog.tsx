import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/contexts/AuthContext';
import { useTranslation, getLocalizedField } from '@/lib/i18n';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Props {
  entry: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAbsenceDialog({ entry, open, onOpenChange }: Props) {
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();
  const companyId = useCompanyId();
  const [startDate, setStartDate] = useState(entry.start_date);
  const [endDate, setEndDate] = useState(entry.end_date);
  const [reasonId, setReasonId] = useState<string | null>(entry.reason_id ?? null);

  const { data: reasons = [] } = useQuery({
    queryKey: ['absence-reasons', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absence_reasons')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('label');
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('absences')
        .update({ start_date: startDate, end_date: endDate, reason_id: reasonId })
        .eq('id', entry.id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-absences'] });
      toast.success(t('entries.updated'));
      onOpenChange(false);
    },
    onError: () => toast.error(t('entries.updateFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('absences')
        .delete()
        .eq('id', entry.id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-absences'] });
      toast.success(t('entries.deleted'));
      onOpenChange(false);
    },
    onError: () => toast.error(t('entries.deleteFailed')),
  });

  const isSick = entry.type === 'sick';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('entries.editAbsence')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>{t('entries.startDate')}</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="dark:[color-scheme:dark]" />
          </div>
          <div>
            <Label>{t('entries.endDate')}</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="dark:[color-scheme:dark]" />
          </div>
          {!isSick && reasons.length > 0 && (
            <div>
              <Label>{t('absenceReasons.reasonLabel')}</Label>
              <Select value={reasonId ?? 'none'} onValueChange={(v) => setReasonId(v === 'none' ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {reasons.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{getLocalizedField(r, 'label', language)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">{t('entries.delete')}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('entries.confirmDeleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>{t('entries.confirmDeleteAbsence')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('entries.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('entries.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => updateMutation.mutate()} className="bg-success text-success-foreground hover:bg-success/90">
            {t('entries.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
