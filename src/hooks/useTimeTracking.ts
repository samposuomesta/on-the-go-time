import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfToday } from 'date-fns';
import { DEMO_USER_ID } from '@/lib/demo-user';
import { toast } from 'sonner';

export interface ActiveEntry {
  id: string;
  start_time: string;
  project_id: string | null;
}

export function useTimeTracking() {
  const [activeEntry, setActiveEntry] = useState<ActiveEntry | null>(null);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchActive = useCallback(async () => {
    const todayStr = startOfToday().toISOString();

    const [activeRes, completedRes] = await Promise.all([
      supabase
        .from('time_entries')
        .select('id, start_time, project_id')
        .eq('user_id', DEMO_USER_ID)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('time_entries')
        .select('id')
        .eq('user_id', DEMO_USER_ID)
        .not('end_time', 'is', null)
        .gte('start_time', todayStr)
        .limit(1)
        .maybeSingle(),
    ]);

    if (activeRes.error) {
      console.error('Error fetching active entry:', activeRes.error);
    }
    setActiveEntry(activeRes.data);
    setTodayCompleted(!!completedRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  const startWork = async () => {
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

    const { error } = await supabase.from('time_entries').insert({
      user_id: DEMO_USER_ID,
      start_lat: lat ?? null,
      start_lng: lng ?? null,
      gps_accuracy: accuracy ?? null,
    });

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
  };

  const addFullWorkday = async () => {
    const today = startOfToday();
    const startTime = new Date(today);
    startTime.setHours(8, 0, 0, 0);
    const endTime = new Date(today);
    endTime.setHours(16, 0, 0, 0);

    const { error } = await supabase.from('time_entries').insert({
      user_id: DEMO_USER_ID,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      break_minutes: 30,
    });

    if (error) {
      toast.error('Failed to add workday');
      console.error(error);
      return;
    }

    toast.success('Workday 8:00–16:00 added (7.5h effective)');
    fetchActive();
  };

  return { activeEntry, loading, startWork, stopWork, addFullWorkday, refetch: fetchActive };
}
