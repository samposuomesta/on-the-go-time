import { useMemo, useState } from 'react';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, subMonths, isWeekend } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { getFinnishHolidaySet, getFinnishHolidays } from '@/lib/finnish-holidays';
import { useTranslation } from '@/lib/i18n';
import { useDateLocale } from '@/lib/date-locale';

interface VacationTimelineProps {
  employees: any[];
  vacationRequests: any[];
  userManagers: any[];
  companyCountry?: string;
  onApprove: (id: string, status: 'approved' | 'rejected') => void;
  isPending?: boolean;
}

export function VacationTimeline({ employees, vacationRequests, userManagers, companyCountry, onApprove, isPending }: VacationTimelineProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthsToShow] = useState(3);

  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < monthsToShow; i++) {
      result.push(addMonths(startOfMonth(currentDate), i));
    }
    return result;
  }, [currentDate, monthsToShow]);

  // Holiday set & name lookup for Finland
  const holidaySet = useMemo(() => {
    if (companyCountry !== 'Finland') return new Set<string>();
    const years = months.map(m => m.getFullYear());
    const uniqueYears = [...new Set(years)];
    return getFinnishHolidaySet(uniqueYears);
  }, [companyCountry, months]);

  const holidayNames = useMemo(() => {
    if (companyCountry !== 'Finland') return new Map<string, string>();
    const years = months.map(m => m.getFullYear());
    const uniqueYears = [...new Set(years)];
    const map = new Map<string, string>();
    for (const year of uniqueYears) {
      for (const h of getFinnishHolidays(year)) {
        map.set(h.date, h.name);
      }
    }
    return map;
  }, [companyCountry, months]);

  const managerLookup = useMemo(() => {
    const map: Record<string, string[]> = {};
    (userManagers ?? []).forEach((um: any) => {
      const mgr = employees.find((e: any) => e.id === um.manager_id);
      if (mgr) {
        if (!map[um.user_id]) map[um.user_id] = [];
        map[um.user_id].push(mgr.name);
      }
    });
    return map;
  }, [userManagers, employees]);

  const sortedPeople = useMemo(() => {
    const managers = employees.filter((e: any) => e.role === 'manager' || e.role === 'admin');
    const nonManagers = employees.filter((e: any) => e.role === 'employee');
    return [...managers, ...nonManagers];
  }, [employees]);

  const vacByUser = useMemo(() => {
    const map: Record<string, any[]> = {};
    (vacationRequests ?? []).forEach((v: any) => {
      if (!map[v.user_id]) map[v.user_id] = [];
      map[v.user_id].push(v);
    });
    return map;
  }, [vacationRequests]);

  const getDayVacation = (userId: string, day: Date) => {
    const reqs = vacByUser[userId] ?? [];
    const dayStr = format(day, 'yyyy-MM-dd');
    return reqs.find((r: any) => dayStr >= r.start_date && dayStr <= r.end_date && r.status !== 'rejected');
  };

  const formatDayStr = (day: Date) =>
    `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

  const CELL_W = 28;
  const NAME_W = 200;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">{t('admin.vacationTimeline')}</h2>
          <p className="text-sm text-muted-foreground">{t('admin.vacationTimelineDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => subMonths(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {format(months[0], 'MMM yyyy', { locale: dateLocale })} — {format(months[months.length - 1], 'MMM yyyy', { locale: dateLocale })}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => addMonths(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded-sm bg-warning/60 border border-warning/40" />
          <span className="text-muted-foreground">{t('admin.legendPending')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded-sm bg-success/60 border border-success/40" />
          <span className="text-muted-foreground">{t('admin.legendApproved')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded-sm bg-muted border border-border" />
          <span className="text-muted-foreground">{t('admin.legendWeekend')}</span>
        </div>
        {companyCountry === 'Finland' && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded-sm bg-destructive/30 border border-destructive/40" />
            <span className="text-muted-foreground">{t('admin.legendHoliday')}</span>
          </div>
        )}
      </div>

      {/* Timeline grid */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-max">
              {/* Month headers */}
              <div className="flex border-b border-border sticky top-0 z-20 bg-card">
                <div className="shrink-0 border-r border-border bg-muted/50" style={{ width: NAME_W, minWidth: NAME_W }}>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">{t('admin.employeeManager')}</div>
                </div>
                <div className="flex">
                  {months.map((month, mi) => {
                    const daysInMonth = eachDayOfInterval({ start: month, end: endOfMonth(month) });
                    return (
                      <div key={mi} className="border-r border-border last:border-r-0">
                        <div className="text-xs font-semibold text-center py-1.5 bg-muted/50 border-b border-border">
                          {format(month, 'LLLL yyyy', { locale: dateLocale })}
                        </div>
                        <div className="flex">
                          {daysInMonth.map((day, di) => {
                            const dayStr = formatDayStr(day);
                            const isHoliday = holidaySet.has(dayStr);
                            const holidayName = holidayNames.get(dayStr);
                            return (
                              <Tooltip key={di}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "text-center border-r border-border last:border-r-0 py-1",
                                      isWeekend(day) && "bg-muted/40",
                                      isHoliday && "bg-destructive/20"
                                    )}
                                    style={{ width: CELL_W, minWidth: CELL_W }}
                                  >
                                    <div className={cn("text-[9px] leading-none", isHoliday ? "text-destructive font-bold" : "text-muted-foreground")}>
                                      {format(day, 'EEEEE', { locale: dateLocale })}
                                    </div>
                                    <div className={cn("text-[10px] font-medium leading-none mt-0.5", isHoliday && "text-destructive")}>
                                      {format(day, 'd')}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                {isHoliday && (
                                  <TooltipContent side="bottom" className="text-xs">
                                    <p className="font-medium">{holidayName}</p>
                                    <p className="text-muted-foreground">{format(day, 'd.M.yyyy', { locale: dateLocale })}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* People rows */}
              {sortedPeople.map((person: any) => {
                const isManager = person.role === 'manager' || person.role === 'admin';
                const managers = managerLookup[person.id] ?? [];

                return (
                  <div key={person.id} className={cn("flex border-b border-border last:border-b-0 hover:bg-muted/20", isManager && "bg-primary/5")}>
                    <div
                      className="shrink-0 border-r border-border flex items-center px-3 py-1.5 gap-2"
                      style={{ width: NAME_W, minWidth: NAME_W }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate flex items-center gap-1.5">
                          {person.name}
                          {isManager && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0">Mgr</Badge>}
                        </div>
                        {managers.length > 0 && (
                          <div className="text-[10px] text-muted-foreground truncate">→ {managers.join(', ')}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex">
                      {months.map((month, mi) => {
                        const daysInMonth = eachDayOfInterval({ start: month, end: endOfMonth(month) });
                        return (
                          <div key={mi} className="flex border-r border-border last:border-r-0">
                            {daysInMonth.map((day, di) => {
                              const vac = getDayVacation(person.id, day);
                              const weekend = isWeekend(day);
                              const dayStr = formatDayStr(day);
                              const isHoliday = holidaySet.has(dayStr);

                              return (
                                <Tooltip key={di}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(
                                        "border-r border-border/50 last:border-r-0 flex items-center justify-center cursor-default transition-colors",
                                        weekend && !vac && !isHoliday && "bg-muted/30",
                                        isHoliday && !vac && "bg-destructive/15",
                                        vac?.status === 'pending' && "bg-warning/50 hover:bg-warning/70",
                                        vac?.status === 'approved' && "bg-success/50 hover:bg-success/70",
                                      )}
                                      style={{ width: CELL_W, minWidth: CELL_W, height: 32 }}
                                    >
                                      {vac && (
                                        <div className={cn(
                                          "w-3 h-3 rounded-full",
                                          vac.status === 'pending' ? "bg-warning" : "bg-success"
                                        )} />
                                      )}
                                      {!vac && isHoliday && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-destructive/60" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  {(vac || isHoliday) && (
                                    <TooltipContent side="top" className="text-xs max-w-[200px]">
                                      {isHoliday && (
                                        <p className="text-destructive font-medium">{holidayNames.get(dayStr)}</p>
                                      )}
                                      {vac && (
                                        <>
                                          <p className="font-medium">{person.name}</p>
                                          <p>{format(parseISO(vac.start_date), 'MMM d')} — {format(parseISO(vac.end_date), 'MMM d, yyyy')}</p>
                                          <p className="capitalize font-medium mt-0.5">{vac.status}</p>
                                          {vac.comment && <p className="text-muted-foreground mt-0.5">{vac.comment}</p>}
                                          {vac.status === 'pending' && (
                                            <div className="flex gap-1 mt-1.5">
                                              <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 text-success border-success/30"
                                                disabled={isPending}
                                                onClick={() => { onApprove(vac.id, 'approved'); toast.success('Approved'); }}>
                                                <CheckCircle2 className="h-3 w-3" /> Approve
                                              </Button>
                                              <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 text-destructive border-destructive/30"
                                                disabled={isPending}
                                                onClick={() => { onApprove(vac.id, 'rejected'); toast.success('Rejected'); }}>
                                                <XCircle className="h-3 w-3" /> Reject
                                              </Button>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {sortedPeople.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No employees found
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
