import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useDateLocale } from '@/lib/date-locale';
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
import { useUserId } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProjectHoursDialog({ open, onOpenChange }: Props) {
  const userId = useUserId();
  const projects = useProjects();
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
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
      user_id: userId,
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(parseISO(date), 'PPP', { locale: dateLocale }) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                 <Calendar
                   mode="single"
                   selected={date ? parseISO(date) : undefined}
                   onSelect={(d) => d && setDate(format(d, 'yyyy-MM-dd'))}
                   initialFocus
                   locale={dateLocale}
                   className={cn("p-3 pointer-events-auto")}
                 />
              </PopoverContent>
            </Popover>
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
