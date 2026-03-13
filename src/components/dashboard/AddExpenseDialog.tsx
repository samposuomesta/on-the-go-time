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
import { Camera } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'kilometers' | 'parking' | 'receipt';
}

export function AddExpenseDialog({ open, onOpenChange, mode }: Props) {
  const projects = useProjects();
  const [projectId, setProjectId] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [parkingCost, setParkingCost] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const titles: Record<string, string> = {
    kilometers: 'Add Kilometers',
    parking: 'Add Parking Cost',
    receipt: 'Upload Receipt',
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('travel_expenses').insert({
      user_id: DEMO_USER_ID,
      project_id: projectId || null,
      date,
      kilometers: mode === 'kilometers' ? parseFloat(kilometers) || 0 : 0,
      parking_cost: mode === 'parking' ? parseFloat(parkingCost) || 0 : 0,
      description: description || null,
    });
    setSaving(false);
    if (error) {
      toast.error('Failed to save');
      return;
    }
    toast.success('Expense added');
    onOpenChange(false);
    setKilometers(''); setParkingCost(''); setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{titles[mode]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Project</Label>
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
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          {mode === 'kilometers' && (
            <div>
              <Label>Kilometers *</Label>
              <Input type="number" step="0.1" min="0" value={kilometers} onChange={e => setKilometers(e.target.value)} placeholder="0" />
            </div>
          )}
          {mode === 'parking' && (
            <div>
              <Label>Parking Cost (€) *</Label>
              <Input type="number" step="0.01" min="0" value={parkingCost} onChange={e => setParkingCost(e.target.value)} placeholder="0.00" />
            </div>
          )}
          {mode === 'receipt' && (
            <div>
              <Label>Receipt Photo</Label>
              <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-border bg-muted/50 cursor-pointer">
                <div className="text-center">
                  <Camera className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-1">Tap to take photo</p>
                </div>
              </div>
            </div>
          )}
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details..." />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full touch-target">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
