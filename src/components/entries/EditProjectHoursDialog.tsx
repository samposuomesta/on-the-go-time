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

export function EditProjectHoursDialog({ entry, open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const projects = useProjects();
  const [projectId, setProjectId] = useState(entry.project_id);
  const [hours, setHours] = useState(String(entry.hours));
  const [date, setDate] = useState(entry.date);
  const [description, setDescription] = useState(entry.description ?? '');

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('project_hours')
        .update({ project_id: projectId, hours: parseFloat(hours), date, description: description || null })
        .eq('id', entry.id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-hours'] });
      toast.success(t('entries.updated'));
      onOpenChange(false);
    },
    onError: () => toast.error(t('entries.updateFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('project_hours').delete().eq('id', entry.id).eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-hours'] });
      toast.success(t('entries.deleted'));
      onOpenChange(false);
    },
    onError: () => toast.error(t('entries.deleteFailed')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('entries.editProjectHours')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>{t('projectHours.project')}</Label>
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
            <Label>{t('projectHours.hours')}</Label>
            <Input type="number" step="0.25" min={0} value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div>
            <Label>{t('projectHours.date')}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
