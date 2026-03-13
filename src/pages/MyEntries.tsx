import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { ArrowLeft, Clock, Briefcase, Car, CalendarIcon, Filter, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { exportTimeEntriesCSV, exportProjectHoursCSV, exportTravelExpensesCSV } from '@/lib/csv-export';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID } from '@/lib/demo-user';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DateRange = { from: Date; to: Date };

export default function MyEntries() {
  const now = new Date();
  const [range, setRange] = useState<DateRange>({
    from: startOfMonth(now),
    to: endOfMonth(now),
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarSelection, setCalendarSelection] = useState<{ from?: Date; to?: Date }>({
    from: range.from,
    to: range.to,
  });

  // Fetch time entries
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries', range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .gte('start_time', range.from.toISOString())
        .lte('start_time', range.to.toISOString())
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch project hours
  const { data: projectHours = [] } = useQuery({
    queryKey: ['project-hours', range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_hours')
        .select('*, projects(name)')
        .eq('user_id', DEMO_USER_ID)
        .gte('date', format(range.from, 'yyyy-MM-dd'))
        .lte('date', format(range.to, 'yyyy-MM-dd'))
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch travel expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['travel-expenses', range.from.toISOString(), range.to.toISOString()],
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

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'In progress…';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/" className="touch-target flex items-center justify-center rounded-lg hover:bg-muted p-2 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-display font-bold">My Entries</h1>
      </header>

      {/* Date Filter */}
      <div className="px-4 pt-4 pb-2 max-w-lg mx-auto w-full">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(range.from, 'MMM d, yyyy')} — {format(range.to, 'MMM d, yyyy')}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={calendarSelection as any}
              onSelect={(val: any) => {
                setCalendarSelection(val || {});
                if (val?.from && val?.to) {
                  setRange({ from: val.from, to: val.to });
                  setCalendarOpen(false);
                }
              }}
              numberOfMonths={1}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Tabs */}
      <main className="flex-1 px-4 pb-4 max-w-lg mx-auto w-full">
        <Tabs defaultValue="time" className="mt-2">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="time" className="gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5" />
              Time ({timeEntries.length})
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1.5 text-xs">
              <Briefcase className="h-3.5 w-3.5" />
              Projects ({projectHours.length})
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-1.5 text-xs">
              <Car className="h-3.5 w-3.5" />
              Expenses ({expenses.length})
            </TabsTrigger>
          </TabsList>

          {/* Time Entries */}
          <TabsContent value="time" className="mt-3 space-y-2">
            {timeEntries.length === 0 ? (
              <EmptyState label="No time entries in this period" />
            ) : (
              timeEntries.map((e) => (
                <div key={e.id} className="bg-card rounded-lg border border-border p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{format(new Date(e.start_time), 'EEE, MMM d')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(e.start_time), 'HH:mm')}
                        {e.end_time ? ` — ${format(new Date(e.end_time), 'HH:mm')}` : ' — …'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold font-display">
                      {formatDuration(e.start_time, e.end_time)}
                    </span>
                  </div>
                  {(e.break_minutes ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Break: {e.break_minutes}m</p>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* Project Hours */}
          <TabsContent value="projects" className="mt-3 space-y-2">
            {projectHours.length === 0 ? (
              <EmptyState label="No project hours in this period" />
            ) : (
              projectHours.map((ph: any) => (
                <div key={ph.id} className="bg-card rounded-lg border border-border p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{ph.projects?.name ?? 'Unknown project'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(parseISO(ph.date), 'EEE, MMM d')}</p>
                    </div>
                    <span className="text-sm font-semibold font-display">{ph.hours}h</span>
                  </div>
                  {ph.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ph.description}</p>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* Travel Expenses */}
          <TabsContent value="expenses" className="mt-3 space-y-2">
            {expenses.length === 0 ? (
              <EmptyState label="No expenses in this period" />
            ) : (
              expenses.map((ex: any) => (
                <div key={ex.id} className="bg-card rounded-lg border border-border p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{ex.projects?.name ?? 'No project'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(parseISO(ex.date), 'EEE, MMM d')}</p>
                    </div>
                    <div className="text-right">
                      {(ex.kilometers ?? 0) > 0 && (
                        <p className="text-xs font-medium">{ex.kilometers} km</p>
                      )}
                      {(ex.parking_cost ?? 0) > 0 && (
                        <p className="text-xs font-medium">€{Number(ex.parking_cost).toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                  {ex.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ex.description}</p>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-12">
      <Filter className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
