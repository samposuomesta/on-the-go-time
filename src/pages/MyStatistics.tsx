import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, differenceInMinutes } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserId } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['hsl(220,25%,18%)', 'hsl(152,60%,40%)', 'hsl(38,92%,50%)', 'hsl(210,80%,52%)', 'hsl(0,72%,51%)'];

export default function MyStatistics() {
  const userId = useUserId();
  const { t } = useTranslation();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['stats-time-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString())
        .not('end_time', 'is', null);
      if (error) throw error;
      return data;
    },
  });

  const { data: projectHours = [] } = useQuery({
    queryKey: ['stats-project-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_hours')
        .select('*, projects(name)')
        .eq('user_id', userId)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));
      if (error) throw error;
      return data;
    },
  });

  const days = eachDayOfInterval({ start: monthStart, end: now > monthEnd ? monthEnd : now });
  const dailyData = days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const hours = timeEntries
      .filter(e => format(new Date(e.start_time), 'yyyy-MM-dd') === dayStr)
      .reduce((sum, e) => {
        const mins = differenceInMinutes(new Date(e.end_time!), new Date(e.start_time));
        return sum + (mins - (e.break_minutes ?? 0)) / 60;
      }, 0);
    return { day: format(day, 'd'), hours: Math.round(hours * 10) / 10 };
  });

  const projectMap: Record<string, number> = {};
  (projectHours as any[]).forEach(ph => {
    const name = ph.projects?.name ?? t('common.unknown');
    projectMap[name] = (projectMap[name] || 0) + Number(ph.hours);
  });
  const projectData = Object.entries(projectMap).map(([name, hours]) => ({ name, hours }));

  const totalWorked = timeEntries.reduce((sum, e) => {
    const mins = differenceInMinutes(new Date(e.end_time!), new Date(e.start_time));
    return sum + (mins - (e.break_minutes ?? 0)) / 60;
  }, 0);
  const totalProjectHours = projectHours.reduce((s, ph) => s + Number(ph.hours), 0);
  const workDays = new Set(timeEntries.map(e => format(new Date(e.start_time), 'yyyy-MM-dd'))).size;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/" className="touch-target flex items-center justify-center rounded-lg hover:bg-muted p-2 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-display font-bold">{t('stats.title')}</h1>
        <span className="text-xs text-muted-foreground ml-auto">{format(monthStart, 'MMMM yyyy')}</span>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('stats.totalHours')}</p>
              <p className="text-xl font-display font-bold">{totalWorked.toFixed(1)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('stats.workDays')}</p>
              <p className="text-xl font-display font-bold">{workDays}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('stats.avgPerDay')}</p>
              <p className="text-xl font-display font-bold">{workDays > 0 ? (totalWorked / workDays).toFixed(1) : '0'}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">{t('stats.dailyHours')}</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={30} />
                  <Tooltip formatter={(val: number) => [`${val}h`, t('projectHours.hours')]} />
                  <Bar dataKey="hours" fill="hsl(220,25%,18%)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">{t('stats.noData')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">{t('stats.projectHours')} ({totalProjectHours.toFixed(1)}h)</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            {projectData.length > 0 ? (
              <div className="flex items-center gap-4 h-full">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie data={projectData} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                      {projectData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => [`${val}h`, t('projectHours.hours')]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1">
                  {projectData.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="truncate">{p.name}</span>
                      <span className="ml-auto font-medium">{p.hours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">{t('stats.noProjectHours')}</div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
