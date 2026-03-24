import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserId } from '@/contexts/AuthContext';
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
  const userId = useUserId();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function calculate() {
      const { data: user } = await supabase
        .from('users')
        .select('daily_work_hours, auto_subtract_lunch, lunch_threshold_hours, contract_start_date')
        .eq('id', userId)
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

      // Fetch adjustments first to determine baseline
      const { data: adjustments } = await supabase
        .from('work_bank_transactions')
        .select('hours, created_at')
        .eq('user_id', userId)
        .eq('type', 'adjustment')
        .order('created_at', { ascending: false });

      // If there's a "set balance" adjustment, use its date as calculation start
      // and its value as the starting balance
      let startingBalance = 0;
      let calculationStart = settings.contract_start_date
        ? new Date(settings.contract_start_date)
        : startOfYear(new Date());

      if (adjustments && adjustments.length > 0) {
        // Latest adjustment is the "set balance" reset point
        const latest = adjustments[0];
        startingBalance = Number(latest.hours);
        // Start calculation from the day AFTER the adjustment
        const adjDate = new Date(latest.created_at);
        adjDate.setDate(adjDate.getDate() + 1);
        adjDate.setHours(0, 0, 0, 0);
        calculationStart = adjDate;
      }

      const { data: entries } = await supabase
        .from('time_entries')
        .select('start_time, end_time, break_minutes, status')
        .eq('user_id', userId)
        .not('end_time', 'is', null)
        .neq('status', 'rejected');

      if (!entries) {
        setBalance(Math.round(startingBalance * 10) / 10);
        setLoading(false);
        return;
      }

      const workedByDate: Record<string, number> = {};

      for (const entry of entries as TimeEntry[]) {
        if (!entry.end_time) continue;
        const dateKey = format(new Date(entry.start_time), 'yyyy-MM-dd');
        const rawMs = new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime();
        const rawHours = rawMs / 3600000;
        const breakHours = (entry.break_minutes ?? 0) / 60;
        let netHours = rawHours - breakHours;

        if (settings.auto_subtract_lunch && rawHours > settings.lunch_threshold_hours) {
          netHours -= 0.5;
        }

        netHours = Math.max(0, netHours);
        workedByDate[dateKey] = (workedByDate[dateKey] ?? 0) + netHours;
      }

      const today = new Date();

      // Only calculate from the baseline date forward
      if (calculationStart > today) {
        setBalance(Math.round(startingBalance * 10) / 10);
        setLoading(false);
        return;
      }

      const days = eachDayOfInterval({ start: calculationStart, end: today });

      let totalBalance = startingBalance;

      for (const day of days) {
        const dateKey = format(day, 'yyyy-MM-dd');
        const isWorkDay = !isWeekend(day) && !isFinnishHoliday(dateKey);
        const worked = workedByDate[dateKey] ?? 0;

        if (isWorkDay) {
          totalBalance += worked - settings.daily_work_hours;
        } else {
          totalBalance += worked;
        }
      }

      setBalance(Math.round(totalBalance * 10) / 10);
      setLoading(false);
    }

    calculate();
  }, [userId]);

  return { balance, loading };
}
