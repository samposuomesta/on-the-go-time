import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/lib/i18n';
import { useProjects } from '@/hooks/useProjects';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  entry: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditExpenseDialog({ entry, open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const projects = useProjects();
  const [projectId, setProjectId] = useState(entry.project_id ?? '');
  const [date, setDate] = useState(entry.date);
  const [kilometers, setKilometers] = useState(String(entry.kilometers ?? 0));
  const [parkingCost, setParkingCost] = useState(String(entry.parking_cost ?? 0));
  const [description, setDescription] = useState(entry.description ?? '');

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('travel_expenses')
        .update({
          project_id: projectId || null,
          date,
          kilometers: parseFloat(kilometers.replace(',', '.')) || 0,
          parking_cost: parseFloat(parkingCost.replace(',', '.')) || 0,
          description: description || null,
        })
        .eq('id', entry.id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-expenses'] });
      toast.success(t('entries.updated'));
      onOpenChange(false);
    },
    onError: () => toast.error(t('entries.updateFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('travel_expenses').delete().eq('id', entry.id).eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-expenses'] });
      toast.success(t('entries.deleted'));
      onOpenChange(false);
    },
    onError: () => toast.error(t('entries.deleteFailed')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('entries.editExpense')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>{t('expense.project')}</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('projectHours.date')}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>{t('dashboard.kilometers')}</Label>
            <Input type="text" inputMode="decimal" value={kilometers} onChange={(e) => setKilometers(e.target.value)} />
          </div>
          <div>
            <Label>{t('dashboard.parking')} (€)</Label>
            <Input type="text" inputMode="decimal" value={parkingCost} onChange={(e) => setParkingCost(e.target.value)} />
          </div>
          <div>
            <Label>{t('projectHours.description')}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
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
