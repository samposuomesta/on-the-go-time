import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useDateLocale } from '@/lib/date-locale';
import { ArrowLeft, Clock, Briefcase, Car, CalendarIcon, Filter, Download, Pencil, CalendarOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { exportTimeEntriesCSV, exportProjectHoursCSV, exportTravelExpensesCSV } from '@/lib/csv-export';
import { supabase } from '@/integrations/supabase/client';
import { useUserId } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EditTimeEntryDialog } from '@/components/entries/EditTimeEntryDialog';
import { EditProjectHoursDialog } from '@/components/entries/EditProjectHoursDialog';
import { EditExpenseDialog } from '@/components/entries/EditExpenseDialog';

type DateRange = { from: Date; to: Date };

function StatusBadge({ status, t }: { status: string; t: (k: any) => string }) {
  const variant = status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary';
  const label = status === 'approved' ? t('entries.approved') : status === 'rejected' ? t('entries.rejected') : t('entries.pending');
  return <Badge variant={variant} className="text-[10px] px-1.5 py-0">{label}</Badge>;
}

export default function MyEntries() {
  const userId = useUserId();
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const now = new Date();
  const [range, setRange] = useState<DateRange>({
    from: startOfMonth(now),
    to: endOfMonth(now),
  });
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [editTimeEntry, setEditTimeEntry] = useState<any>(null);
  const [editProjectHour, setEditProjectHour] = useState<any>(null);
  const [editExpense, setEditExpense] = useState<any>(null);

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries', range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', range.from.toISOString())
        .lte('start_time', range.to.toISOString())
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: projectHours = [] } = useQuery({
    queryKey: ['project-hours', range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_hours')
        .select('*, projects(name)')
        .eq('user_id', userId)
        .gte('date', format(range.from, 'yyyy-MM-dd'))
        .lte('date', format(range.to, 'yyyy-MM-dd'))
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['travel-expenses', range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('travel_expenses')
        .select('*, projects(name)')
        .eq('user_id', userId)
        .gte('date', format(range.from, 'yyyy-MM-dd'))
        .lte('date', format(range.to, 'yyyy-MM-dd'))
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['my-absences', range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absences')
        .select('*, absence_reasons(label, label_fi)')
        .eq('user_id', userId)
        .gte('start_date', format(range.from, 'yyyy-MM-dd'))
        .lte('start_date', format(range.to, 'yyyy-MM-dd'))
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: vacations = [] } = useQuery({
    queryKey: ['my-vacations', range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacation_requests')
        .select('*')
        .eq('user_id', userId)
        .gte('start_date', format(range.from, 'yyyy-MM-dd'))
        .lte('start_date', format(range.to, 'yyyy-MM-dd'))
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return t('entries.inProgress');
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/" className="touch-target flex items-center justify-center rounded-lg hover:bg-muted p-2 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-display font-bold flex-1">{t('entries.title')}</h1>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs"
          onClick={() => {
            exportTimeEntriesCSV(timeEntries);
            exportProjectHoursCSV(projectHours);
            exportTravelExpensesCSV(expenses);
          }}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </header>

      <div className="px-4 pt-4 pb-2 max-w-lg mx-auto w-full">
        <div className="flex gap-2">
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start text-left font-normal gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>{format(range.from, 'MMM d, yyyy', { locale: dateLocale })}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={range.from}
                onSelect={(date) => {
                  if (date) {
                    setRange(prev => ({ ...prev, from: date > prev.to ? prev.to : date }));
                    setFromOpen(false);
                  }
                }}
                locale={dateLocale}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <span className="flex items-center text-muted-foreground text-sm">—</span>
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start text-left font-normal gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>{format(range.to, 'MMM d, yyyy')}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={range.to}
                onSelect={(date) => {
                  if (date) {
                    setRange(prev => ({ ...prev, to: date < prev.from ? prev.from : date }));
                    setToOpen(false);
                  }
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <main className="flex-1 px-4 pb-4 max-w-lg mx-auto w-full">
        <Tabs defaultValue="time" className="mt-2">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="time" className="gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5" />
              {t('entries.time')} ({timeEntries.length})
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1.5 text-xs">
              <Briefcase className="h-3.5 w-3.5" />
              {t('entries.projects')} ({projectHours.length})
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-1.5 text-xs">
              <Car className="h-3.5 w-3.5" />
              {t('entries.expenses')} ({expenses.length})
            </TabsTrigger>
            <TabsTrigger value="absences" className="gap-1.5 text-xs">
              <CalendarOff className="h-3.5 w-3.5" />
              Absences ({absences.length + vacations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="time" className="mt-3 space-y-2">
            {timeEntries.length === 0 ? (
              <EmptyState label={t('entries.noTimeEntries')} />
            ) : (
              timeEntries.map((e) => (
                <div key={e.id} className="bg-card rounded-lg border border-border p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{format(new Date(e.start_time), 'EEE, MMM d')}</p>
                        <StatusBadge status={e.status} t={t} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(e.start_time), 'HH:mm')}
                        {e.end_time ? ` — ${format(new Date(e.end_time), 'HH:mm')}` : ' — …'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold font-display">
                        {formatDuration(e.start_time, e.end_time)}
                      </span>
                      {e.status === 'pending' && (
                        <button onClick={() => setEditTimeEntry(e)} className="p-1 rounded hover:bg-muted">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                  {(e.break_minutes ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{t('entries.break')}: {e.break_minutes}m</p>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="projects" className="mt-3 space-y-2">
            {projectHours.length === 0 ? (
              <EmptyState label={t('entries.noProjectHours')} />
            ) : (
              projectHours.map((ph: any) => (
                <div key={ph.id} className="bg-card rounded-lg border border-border p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{ph.projects?.name ?? t('entries.unknownProject')}</p>
                        <StatusBadge status={ph.status} t={t} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(parseISO(ph.date), 'EEE, MMM d')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold font-display">{ph.hours}h</span>
                      {ph.status === 'pending' && (
                        <button onClick={() => setEditProjectHour(ph)} className="p-1 rounded hover:bg-muted">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                  {ph.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ph.description}</p>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="expenses" className="mt-3 space-y-2">
            {expenses.length === 0 ? (
              <EmptyState label={t('entries.noExpenses')} />
            ) : (
              expenses.map((ex: any) => (
                <div key={ex.id} className="bg-card rounded-lg border border-border p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{ex.projects?.name ?? t('entries.noProject')}</p>
                        <StatusBadge status={ex.status} t={t} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(parseISO(ex.date), 'EEE, MMM d')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        {(ex.kilometers ?? 0) > 0 && (
                          <p className="text-xs font-medium">{ex.kilometers} km</p>
                        )}
                        {(ex.parking_cost ?? 0) > 0 && (
                          <p className="text-xs font-medium">€{Number(ex.parking_cost).toFixed(2)}</p>
                        )}
                      </div>
                      {ex.status === 'pending' && (
                        <button onClick={() => setEditExpense(ex)} className="p-1 rounded hover:bg-muted">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
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
          <TabsContent value="absences" className="mt-3 space-y-2">
            {absences.length === 0 && vacations.length === 0 ? (
              <EmptyState label="No absences in this period" />
            ) : (
              <>
                {vacations.map((v: any) => (
                  <div key={v.id} className="bg-card rounded-lg border border-border p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Vacation</p>
                          <StatusBadge status={v.status} t={t} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(v.start_date), 'MMM d')} — {format(parseISO(v.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">Vacation</Badge>
                    </div>
                    {v.comment && <p className="text-xs text-muted-foreground mt-1">{v.comment}</p>}
                  </div>
                ))}
                {absences.map((a: any) => (
                  <div key={a.id} className="bg-card rounded-lg border border-border p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{a.type === 'sick' ? 'Sick Leave' : (a.absence_reasons?.label || 'Absence')}</p>
                          <StatusBadge status={a.status} t={t} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(a.start_date), 'MMM d')}{a.start_date !== a.end_date ? ` — ${format(parseISO(a.end_date), 'MMM d, yyyy')}` : `, ${format(parseISO(a.start_date), 'yyyy')}`}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px]", a.type === 'sick' ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-warning/10 text-warning border-warning/30')}>
                        {a.type === 'sick' ? 'Sick' : 'Absence'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Dialogs */}
      {editTimeEntry && (
        <EditTimeEntryDialog
          entry={editTimeEntry}
          open={!!editTimeEntry}
          onOpenChange={(open) => { if (!open) setEditTimeEntry(null); }}
        />
      )}
      {editProjectHour && (
        <EditProjectHoursDialog
          entry={editProjectHour}
          open={!!editProjectHour}
          onOpenChange={(open) => { if (!open) setEditProjectHour(null); }}
        />
      )}
      {editExpense && (
        <EditExpenseDialog
          entry={editExpense}
          open={!!editExpense}
          onOpenChange={(open) => { if (!open) setEditExpense(null); }}
        />
      )}
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
