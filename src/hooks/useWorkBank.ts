import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserId } from '@/contexts/AuthContext';
import { format, eachDayOfInterval, isWeekend, startOfYear, parseISO } from 'date-fns';
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
        .select('daily_work_hours, auto_subtract_lunch, lunch_threshold_hours, contract_start_date, company_id')
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

      let startingBalance = 0;
      let calculationStart = settings.contract_start_date
        ? new Date(settings.contract_start_date)
        : startOfYear(new Date());

      if (adjustments && adjustments.length > 0) {
        const latest = adjustments[0];
        startingBalance = Number(latest.hours);
        const adjDate = new Date(latest.created_at);
        adjDate.setDate(adjDate.getDate() + 1);
        adjDate.setHours(0, 0, 0, 0);
        calculationStart = adjDate;
      }

      // Fetch time entries, absences, vacations, and absence reasons in parallel
      const [entriesRes, absencesRes, vacationsRes, reasonsRes] = await Promise.all([
        supabase
          .from('time_entries')
          .select('start_time, end_time, break_minutes, status')
          .eq('user_id', userId)
          .not('end_time', 'is', null)
          .neq('status', 'rejected'),
        supabase
          .from('absences')
          .select('start_date, end_date, reason_id, status')
          .eq('user_id', userId)
          .eq('status', 'approved'),
        supabase
          .from('vacation_requests')
          .select('start_date, end_date, status')
          .eq('user_id', userId)
          .eq('status', 'approved'),
        supabase
          .from('absence_reasons')
          .select('id, label, label_fi')
          .eq('company_id', user.company_id),
      ]);

      const entries = entriesRes.data ?? [];
      const absences = absencesRes.data ?? [];
      const vacations = vacationsRes.data ?? [];
      const reasons = reasonsRes.data ?? [];

      // Find the "Saldovapaa" (Time Bank free) reason id
      const timeBankReasonIds = new Set(
        reasons
          .filter((r) => r.label === 'Time Bank free' || r.label_fi === 'Saldovapaa')
          .map((r) => r.id)
      );

      // Build neutralize set: days when balance should NOT be reduced
      const neutralizeDays = new Set<string>();

      const addRange = (startStr: string, endStr: string, target: Set<string>) => {
        try {
          const s = parseISO(startStr);
          const e = parseISO(endStr);
          if (e < s) return;
          for (const d of eachDayOfInterval({ start: s, end: e })) {
            target.add(format(d, 'yyyy-MM-dd'));
          }
        } catch {
          // ignore malformed dates
        }
      };

      for (const v of vacations) {
        addRange(v.start_date, v.end_date, neutralizeDays);
      }
      for (const a of absences) {
        // Skip Saldovapaa: those days SHOULD deduct from the bank
        if (a.reason_id && timeBankReasonIds.has(a.reason_id)) continue;
        addRange(a.start_date, a.end_date, neutralizeDays);
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

      if (calculationStart > today) {
        setBalance(Math.round(startingBalance * 10) / 10);
        setLoading(false);
        return;
      }

      const days = eachDayOfInterval({ start: calculationStart, end: today });

      let totalBalance = startingBalance;

      for (const day of days) {
        const dateKey = format(day, 'yyyy-MM-dd');
        const worked = workedByDate[dateKey] ?? 0;

        if (neutralizeDays.has(dateKey)) {
          // Approved non-Saldovapaa absence or approved vacation: no deduction
          totalBalance += worked;
          continue;
        }

        const isWorkDay = !isWeekend(day) && !isFinnishHoliday(dateKey);

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
