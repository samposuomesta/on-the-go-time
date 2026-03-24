import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Workplace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useWorkplaceDetection(isClockedIn: boolean) {
  const companyId = useCompanyId();
  const shownRef = useRef<Set<string>>(new Set());
  const lastStateRef = useRef<Map<string, boolean>>(new Map());

  const checkProximity = useCallback(async () => {
    if (!('geolocation' in navigator)) return;

    let pos: GeolocationPosition;
    try {
      pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 60000 })
      );
    } catch {
      return;
    }

    const { latitude, longitude } = pos.coords;

    const { data: workplaces } = await supabase
      .from('workplaces')
      .select('*')
      .eq('company_id', companyId);

    if (!workplaces?.length) return;

    for (const wp of workplaces as Workplace[]) {
      const distance = haversineDistance(latitude, longitude, wp.latitude, wp.longitude);
      const isNear = distance <= wp.radius_meters;
      const wasNear = lastStateRef.current.get(wp.id);

      // Entered workplace zone & not clocked in
      if (isNear && !isClockedIn && wasNear !== true && !shownRef.current.has(`enter-${wp.id}`)) {
        shownRef.current.add(`enter-${wp.id}`);
        shownRef.current.delete(`leave-${wp.id}`);
        toast.info(`📍 You are near ${wp.name}. Start your workday?`, { duration: 8000 });
      }

      // Left workplace zone & still clocked in
      if (!isNear && isClockedIn && wasNear === true && !shownRef.current.has(`leave-${wp.id}`)) {
        shownRef.current.add(`leave-${wp.id}`);
        shownRef.current.delete(`enter-${wp.id}`);
        toast.warning(`📍 You left ${wp.name}. Did you forget to clock out?`, { duration: 8000 });
      }

      lastStateRef.current.set(wp.id, isNear);
    }
  }, [isClockedIn]);

  useEffect(() => {
    // Check on mount
    checkProximity();

    // Check every 2 minutes
    const interval = setInterval(checkProximity, 120000);
    return () => clearInterval(interval);
  }, [checkProximity]);
}
