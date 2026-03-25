import { useState, useEffect } from 'react';
import { Clock, Timer, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ActiveEntry, CompletedEntry } from '@/hooks/useTimeTracking';
import { format } from 'date-fns';
import { useTranslation } from '@/lib/i18n';

function useElapsedTime(startTime: string | null) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    if (!startTime) return;
    const update = () => {
      const diff = Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return elapsed;
}

function formatDurationHM(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

interface StatusCardProps {
  activeEntry: ActiveEntry | null;
  loading: boolean;
  bankBalance: number;
  todayCompleted?: boolean;
  todayEntries?: CompletedEntry[];
}

export function StatusCard({ activeEntry, loading, bankBalance, todayCompleted, todayEntries = [] }: StatusCardProps) {
  const { t } = useTranslation();
  const elapsed = useElapsedTime(activeEntry?.start_time ?? null);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="h-16 animate-pulse rounded-md bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const getStatus = () => {
    if (activeEntry) return 'active';
    if (todayCompleted) return 'completed';
    return 'idle';
  };
  const status = getStatus();

  return (
    <Card className={status === 'active' ? 'border-success/30 bg-success/5' : status === 'completed' ? 'border-success/30 bg-success/5' : ''}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
            status === 'active' ? 'bg-success/20 animate-pulse-success' : status === 'completed' ? 'bg-success/20' : 'bg-muted'
          }`}>
            {status === 'active' ? (
              <Timer className="h-5 w-5 text-success" />
            ) : status === 'completed' ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <Clock className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {status === 'active' ? `${t('dashboard.workingSince')} ${format(new Date(activeEntry!.start_time), 'HH:mm')}` : status === 'completed' ? t('dashboard.workDayMarked') : t('dashboard.notClockedIn')}
            </p>
            <p className="text-lg font-display font-semibold tabular-nums">
              {status === 'active'
                ? elapsed
                : status === 'completed'
                ? t('dashboard.workDayCompleted')
                : t('dashboard.startYourDay')}
            </p>
          </div>
        </div>

        {/* Today's completed sessions */}
        {todayEntries.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-border">
            <span className="text-xs text-muted-foreground">{t('dashboard.todaySessions') ?? 'Tänään'}</span>
            {todayEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground tabular-nums">
                  {format(new Date(entry.start_time), 'HH:mm')} – {format(new Date(entry.end_time), 'HH:mm')}
                </span>
                <span className="font-medium tabular-nums">{formatDurationHM(entry.start_time, entry.end_time)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <span className="text-xs text-muted-foreground">{t('dashboard.timeBank')}</span>
          <span className={`text-sm font-semibold ${bankBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
            {bankBalance >= 0 ? '+' : ''}{bankBalance.toFixed(1)}h
          </span>
        </div>
      </CardContent>
    </Card>
  );
}