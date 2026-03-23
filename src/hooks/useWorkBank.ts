import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID } from '@/lib/demo-user';
import { format, eachDayOfInterval, isWeekend, startOfYear } from 'date-fns';
import { isFinnishHoliday } from '@/lib/finnish-holidays';

interface UserSettings {
  daily_work_hours: number;
  auto_subtract_lunch: boolean;
  lunch_threshold_hours: number;
  contract_start_date: string | null;
}

interface TimeEntry {
  start_time: string;
  end_time: string | null;
  break_minutes: number | null;
  status: string;
}

export function useWorkBank() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function calculate() {
      // Fetch user settings
      const { data: user } = await supabase
        .from('users')
        .select('daily_work_hours, auto_subtract_lunch, lunch_threshold_hours, contract_start_date')
        .eq('id', DEMO_USER_ID)
        .single();

      if (!user) {
        setLoading(false);
        return;
      }

      const settings: UserSettings = {
        daily_work_hours: Number(user.daily_work_hours),
        auto_subtract_lunch: user.auto_subtract_lunch,
        lunch_threshold_hours: Number(user.lunch_threshold_hours),
        contract_start_date: user.contract_start_date,
      };

      // Fetch all completed time entries (approved or pending - not rejected)
      const { data: entries } = await supabase
        .from('time_entries')
        .select('start_time, end_time, break_minutes, status')
        .eq('user_id', DEMO_USER_ID)
        .not('end_time', 'is', null)
        .neq('status', 'rejected');

      if (!entries) {
        setLoading(false);
        return;
      }

      // Group worked hours by date
      const workedByDate: Record<string, number> = {};

      for (const entry of entries as TimeEntry[]) {
        if (!entry.end_time) continue;
        const dateKey = format(new Date(entry.start_time), 'yyyy-MM-dd');
        const rawMs = new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime();
        const rawHours = rawMs / 3600000;
        const breakHours = (entry.break_minutes ?? 0) / 60;
        let netHours = rawHours - breakHours;

        // Auto-subtract lunch if enabled and over threshold
        if (settings.auto_subtract_lunch && rawHours > settings.lunch_threshold_hours) {
          netHours -= 0.5; // 30 min lunch
        }

        netHours = Math.max(0, netHours);
        workedByDate[dateKey] = (workedByDate[dateKey] ?? 0) + netHours;
      }

      // Calculate from contract start date (or start of year if no contract date)
      const periodStart = settings.contract_start_date
        ? new Date(settings.contract_start_date)
        : startOfYear(new Date());
      const today = new Date();

      const days = eachDayOfInterval({ start: periodStart, end: today });

      let totalBalance = 0;

      for (const day of days) {
        const dateKey = format(day, 'yyyy-MM-dd');
        const isWorkDay = !isWeekend(day) && !isFinnishHoliday(dateKey);
        const worked = workedByDate[dateKey] ?? 0;

        if (isWorkDay) {
          // Expected vs actual
          totalBalance += worked - settings.daily_work_hours;
        } else {
          // Weekend/holiday work is all positive balance
          totalBalance += worked;
        }
      }

      // Also add any manual adjustment transactions
      const { data: adjustments } = await supabase
        .from('work_bank_transactions')
        .select('hours')
        .eq('user_id', DEMO_USER_ID)
        .eq('type', 'adjustment');

      if (adjustments) {
        for (const adj of adjustments) {
          totalBalance += Number(adj.hours);
        }
      }

      setBalance(Math.round(totalBalance * 10) / 10);
      setLoading(false);
    }

    calculate();
  }, []);

  return { balance, loading };
}
