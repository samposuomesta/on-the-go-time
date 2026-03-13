import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, CalendarIcon, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID } from '@/lib/demo-user';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function LongSickLeave() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const { data: absences = [] } = useQuery({
    queryKey: ['sick-absences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absences')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .eq('type', 'sick')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!startDate || !endDate) throw new Error('Select both dates');
      const { error } = await supabase.from('absences').insert({
        user_id: DEMO_USER_ID,
        type: 'sick' as const,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        status: 'pending' as const,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sick-absences'] });
      toast.success('Sick leave request submitted');
      setDialogOpen(false);
      setStartDate(undefined);
      setEndDate(undefined);
    },
    onError: () => toast.error('Failed to submit'),
  });

  const statusColors: Record<string, string> = {
    pending: 'bg-warning/15 text-warning border-warning/30',
    approved: 'bg-success/15 text-success border-success/30',
    rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="touch-target flex items-center justify-center rounded-lg hover:bg-muted p-2 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-display font-bold">Long Sick Leave</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="font-display">Report Long Sick Leave</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {startDate ? format(startDate, 'PPP') : 'Pick start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setStartOpen(false); }} className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Popover open={endOpen} onOpenChange={setEndOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {endDate ? format(endDate, 'PPP') : 'Pick end date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setEndOpen(false); }} disabled={(d) => startDate ? d < startDate : false} className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <Button className="w-full" disabled={!startDate || !endDate || createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? 'Submitting…' : 'Submit Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-2">
        {absences.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">No sick leave records</p>
          </div>
        ) : (
          absences.map((a) => (
            <div key={a.id} className="bg-card rounded-lg border border-border p-3 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">{format(parseISO(a.start_date), 'MMM d')} — {format(parseISO(a.end_date), 'MMM d, yyyy')}</p>
              </div>
              <Badge variant="outline" className={cn("text-xs capitalize", statusColors[a.status])}>{a.status}</Badge>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
