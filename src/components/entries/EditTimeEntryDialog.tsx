import { useState } from 'react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  entry: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTimeEntryDialog({ entry, open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [startTime, setStartTime] = useState(format(new Date(entry.start_time), "yyyy-MM-dd'T'HH:mm"));
  const [endTime, setEndTime] = useState(entry.end_time ? format(new Date(entry.end_time), "yyyy-MM-dd'T'HH:mm") : '');
  const [breakMinutes, setBreakMinutes] = useState(String(entry.break_minutes ?? 0));

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('time_entries')
        .update({
          start_time: new Date(startTime).toISOString(),
          end_time: endTime ? new Date(endTime).toISOString() : null,
          break_minutes: parseInt(breakMinutes) || 0,
        })
        .eq('id', entry.id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success(t('entries.updated'));
      onOpenChange(false);
    },
    onError: () => toast.error(t('entries.updateFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entry.id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success(t('entries.deleted'));
      onOpenChange(false);
    },
    onError: () => toast.error(t('entries.deleteFailed')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('entries.editTimeEntry')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>{t('entries.startTime')}</Label>
            <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="dark:[color-scheme:dark]" />
          </div>
          <div>
            <Label>{t('entries.endTime')}</Label>
            <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="dark:[color-scheme:dark]" />
          </div>
          <div>
            <Label>{t('entries.breakMinutes')}</Label>
            <Input type="number" min={0} value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()}>
            {t('entries.delete')}
          </Button>
          <Button onClick={() => updateMutation.mutate()}>{t('entries.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
