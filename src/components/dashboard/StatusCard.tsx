import { Clock, Timer, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ActiveEntry } from '@/hooks/useTimeTracking';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from '@/lib/i18n';

interface StatusCardProps {
  activeEntry: ActiveEntry | null;
  loading: boolean;
  bankBalance: number;
  todayCompleted?: boolean;
}

export function StatusCard({ activeEntry, loading, bankBalance, todayCompleted }: StatusCardProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="h-16 animate-pulse rounded-md bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={activeEntry ? 'border-success/30 bg-success/5' : ''}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
            activeEntry ? 'bg-success/20 animate-pulse-success' : 'bg-muted'
          }`}>
            {activeEntry ? (
              <Timer className="h-5 w-5 text-success" />
            ) : (
              <Clock className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {activeEntry ? t('dashboard.workingSince') : t('dashboard.notClockedIn')}
            </p>
            <p className="text-lg font-display font-semibold">
              {activeEntry
                ? formatDistanceToNow(new Date(activeEntry.start_time), { addSuffix: false })
                : t('dashboard.startYourDay')}
            </p>
          </div>
        </div>
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
