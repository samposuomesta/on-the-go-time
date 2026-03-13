import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ArrowLeft, Car, CalendarIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID } from '@/lib/demo-user';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function TravelExpenses() {
  const now = new Date();
  const [range, setRange] = useState({ from: startOfMonth(now), to: endOfMonth(now) });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarSelection, setCalendarSelection] = useState<{ from?: Date; to?: Date }>({ from: range.from, to: range.to });

  const { data: expenses = [] } = useQuery({
    queryKey: ['travel-expenses-page', range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('travel_expenses')
        .select('*, projects(name)')
        .eq('user_id', DEMO_USER_ID)
        .gte('date', format(range.from, 'yyyy-MM-dd'))
        .lte('date', format(range.to, 'yyyy-MM-dd'))
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalKm = expenses.reduce((s: number, e: any) => s + Number(e.kilometers ?? 0), 0);
  const totalParking = expenses.reduce((s: number, e: any) => s + Number(e.parking_cost ?? 0), 0);

  const statusColors: Record<string, string> = {
    pending: 'bg-warning/15 text-warning border-warning/30',
    approved: 'bg-success/15 text-success border-success/30',
    rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/" className="touch-target flex items-center justify-center rounded-lg hover:bg-muted p-2 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-display font-bold">Travel Expenses</h1>
      </header>

      <div className="px-4 pt-4 pb-2 max-w-lg mx-auto w-full">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              {format(range.from, 'MMM d, yyyy')} — {format(range.to, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={calendarSelection as any}
              onSelect={(val: any) => {
                setCalendarSelection(val || {});
                if (val?.from && val?.to) { setRange({ from: val.from, to: val.to }); setCalendarOpen(false); }
              }}
              numberOfMonths={1}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-card rounded-lg border border-border p-2 text-center">
            <p className="text-xs text-muted-foreground">Entries</p>
            <p className="text-lg font-display font-bold">{expenses.length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-2 text-center">
            <p className="text-xs text-muted-foreground">Total KM</p>
            <p className="text-lg font-display font-bold">{totalKm.toFixed(1)}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-2 text-center">
            <p className="text-xs text-muted-foreground">Parking</p>
            <p className="text-lg font-display font-bold">€{totalParking.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 py-2 max-w-lg mx-auto w-full space-y-2">
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <Car className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No expenses in this period</p>
          </div>
        ) : (
          expenses.map((ex: any) => (
            <div key={ex.id} className="bg-card rounded-lg border border-border p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium">{ex.projects?.name ?? 'No project'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{format(parseISO(ex.date), 'EEE, MMM d')}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div>
                    {Number(ex.kilometers ?? 0) > 0 && <span className="text-xs font-medium">{ex.kilometers} km</span>}
                    {Number(ex.parking_cost ?? 0) > 0 && <span className="text-xs font-medium ml-2">€{Number(ex.parking_cost).toFixed(2)}</span>}
                  </div>
                  <Badge variant="outline" className={cn("text-xs capitalize", statusColors[ex.status ?? 'pending'])}>{ex.status ?? 'pending'}</Badge>
                </div>
              </div>
              {ex.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ex.description}</p>}
              {ex.receipt_image && (
                <a href={ex.receipt_image} target="_blank" rel="noopener noreferrer" className="text-xs text-info underline mt-1 inline-block">View receipt</a>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
