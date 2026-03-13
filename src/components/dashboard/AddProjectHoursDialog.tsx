import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID } from '@/lib/demo-user';
import { useProjects } from '@/hooks/useProjects';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProjectHoursDialog({ open, onOpenChange }: Props) {
  const projects = useProjects();
  const [projectId, setProjectId] = useState('');
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!projectId || !hours) {
      toast.error('Please fill required fields');
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
      toast.error('Failed to save');
      return;
    }
    toast.success('Project hours added');
    onOpenChange(false);
    setProjectId(''); setHours(''); setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Add Project Hours</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Project *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Hours *</Label>
            <Input type="number" step="0.5" min="0" value={hours} onChange={e => setHours(e.target.value)} placeholder="8" />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What did you work on?" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full touch-target">
            {saving ? 'Saving...' : 'Save Hours'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
