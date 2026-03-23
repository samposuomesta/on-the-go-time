import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID } from '@/lib/demo-user';
import { useProjects } from '@/hooks/useProjects';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProjectHoursDialog({ open, onOpenChange }: Props) {
  const projects = useProjects();
  const { t } = useTranslation();
  const [projectId, setProjectId] = useState('');
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!projectId || !hours) {
      toast.error(t('projectHours.fillRequired'));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('project_hours').insert({
      user_id: DEMO_USER_ID,
      project_id: projectId,
      hours: parseFloat(hours),
      date,
      description: description || null,
    });
    setSaving(false);
    if (error) {
      toast.error(t('projectHours.failedToSave'));
      return;
    }
    toast.success(t('projectHours.added'));
    onOpenChange(false);
    setProjectId(''); setHours(''); setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{t('projectHours.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('projectHours.project')} *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder={t('projectHours.selectProject')} /></SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('projectHours.hours')} *</Label>
            <Input type="number" step="0.5" min="0" value={hours} onChange={e => setHours(e.target.value)} placeholder="8" />
          </div>
          <div>
            <Label>{t('projectHours.date')}</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <Label>{t('projectHours.description')}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t('projectHours.descriptionPlaceholder')} />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full touch-target">
            {saving ? t('projectHours.saving') : t('projectHours.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
