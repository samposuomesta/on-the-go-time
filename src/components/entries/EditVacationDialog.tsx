import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Props {
  entry: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditVacationDialog({ entry, open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(entry.start_date);
  const [endDate, setEndDate] = useState(entry.end_date);
  const [comment, setComment] = useState(entry.comment ?? '');

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('vacation_requests')
        .update({ start_date: startDate, end_date: endDate, comment: comment || null })
        .eq('id', entry.id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-vacations'] });
      toast.success(t('entries.updated'));
      onOpenChange(false);
    },
    onError: () => toast.error(t('entries.updateFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('vacation_requests')
        .delete()
        .eq('id', entry.id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-vacations'] });
      toast.success(t('entries.deleted'));
      onOpenChange(false);
    },
    onError: () => toast.error(t('entries.deleteFailed')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('entries.editVacation')}</DialogTitle>
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
          <div>
            <Label>{t('entries.comment')}</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">{t('entries.delete')}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('entries.confirmDeleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>{t('entries.confirmDeleteVacation')}</AlertDialogDescription>
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
