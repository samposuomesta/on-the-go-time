import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfToday } from 'date-fns';
import { useUserId } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ActiveEntry {
  id: string;
  start_time: string;
  project_id: string | null;
}

export interface CompletedEntry {
  id: string;
  start_time: string;
  end_time: string;
}


export function useTimeTracking() {
  const userId = useUserId();
  const [activeEntry, setActiveEntry] = useState<ActiveEntry | null>(null);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [todayEntries, setTodayEntries] = useState<CompletedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActive = useCallback(async () => {
    const todayStr = startOfToday().toISOString();

    const [activeRes, completedRes] = await Promise.all([
      supabase
        .from('time_entries')
        .select('id, start_time, project_id')
        .eq('user_id', userId)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('time_entries')
        .select('id, start_time, end_time')
        .eq('user_id', userId)
        .not('end_time', 'is', null)
        .gte('start_time', todayStr)
        .order('start_time', { ascending: true }),
    ]);

    if (activeRes.error) {
      console.error('Error fetching active entry:', activeRes.error);
    }
    setActiveEntry(activeRes.data);
    setTodayEntries((completedRes.data ?? []) as CompletedEntry[]);
    setTodayCompleted((completedRes.data ?? []).length > 0);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);


  const startWork = async () => {
    if (activeEntry) return; // already clocked in

    const now = new Date();

    let lat: number | undefined;
    let lng: number | undefined;
    let accuracy: number | undefined;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      accuracy = pos.coords.accuracy;
    } catch {
      // GPS not available, continue without
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const { error } = await supabase.from('time_entries').insert({
      user_id: userId,
      start_lat: lat ?? null,
      start_lng: lng ?? null,
      gps_accuracy: accuracy ?? null,
      timezone: tz,
    } as any);

    if (error) {
      toast.error('Failed to start work');
      console.error(error);
      return;
    }

    toast.success('Work started!');
    fetchActive();
  };

  const stopWork = async () => {
    if (!activeEntry) return;

    let lat: number | undefined;
    let lng: number | undefined;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // GPS not available
    }

    const { error } = await supabase
      .from('time_entries')
      .update({
        end_time: new Date().toISOString(),
        end_lat: lat ?? null,
        end_lng: lng ?? null,
      })
      .eq('id', activeEntry.id);

    if (error) {
      toast.error('Failed to stop work');
      console.error(error);
      return;
    }

    toast.success('Work stopped!');
    setActiveEntry(null);
    setTodayCompleted(true);
    await fetchActive();
  };


  return { activeEntry, todayCompleted, todayEntries, loading, startWork, stopWork, refetch: fetchActive };
}
