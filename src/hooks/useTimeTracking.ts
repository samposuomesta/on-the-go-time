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

export interface OverlapEntry {
  id: string;
  start_time: string;
  end_time: string | null;
}

export function useTimeTracking() {
  const userId = useUserId();
  const [activeEntry, setActiveEntry] = useState<ActiveEntry | null>(null);
  const [todayCompleted, setTodayCompleted] = useState(false);
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
        .select('id')
        .eq('user_id', userId)
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
  }, [userId]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  const checkOverlap = async (startTime: Date, endTime: Date): Promise<OverlapEntry[]> => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('id, start_time, end_time')
      .eq('user_id', userId)
      .lt('start_time', endTime.toISOString())
      .or(`end_time.gt.${startTime.toISOString()},end_time.is.null`)
      .limit(10);

    if (error) {
      console.error('Error checking overlaps:', error);
      return [];
    }
    return (data as OverlapEntry[]) ?? [];
  };

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

    const { error } = await supabase.from('time_entries').insert({
      user_id: userId,
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

  const addFullWorkday = async (replaceIds?: string[]) => {
    const today = startOfToday();
    const startTime = new Date(today);
    startTime.setHours(8, 0, 0, 0);
    const endTime = new Date(today);
    endTime.setHours(16, 0, 0, 0);

    if (!replaceIds) {
      const overlaps = await checkOverlap(startTime, endTime);
      if (overlaps.length > 0) {
        return { overlaps };
      }
    }

    if (replaceIds && replaceIds.length > 0) {
      const { error: delError } = await supabase
        .from('time_entries')
        .delete()
        .in('id', replaceIds);
      if (delError) {
        toast.error('Failed to replace entries');
        console.error(delError);
        return;
      }
    }

    const { error } = await supabase.from('time_entries').insert({
      user_id: userId,
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
    return undefined;
  };

  return { activeEntry, todayCompleted, loading, startWork, stopWork, addFullWorkday, checkOverlap, refetch: fetchActive };
}
