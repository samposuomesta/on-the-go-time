import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useDateLocale } from '@/lib/date-locale';

export function HeaderClock() {
  const [now, setNow] = useState(new Date());
  const dateLocale = useDateLocale();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = format(now, 'EEEEEE d.M.', { locale: dateLocale });
  const timeStr = format(now, 'HH:mm');

  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-lg font-display font-bold tabular-nums">{timeStr}</span>
      <span className="text-xs text-muted-foreground capitalize">{dateStr}</span>
    </div>
  );
}
