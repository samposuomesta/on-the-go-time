import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPendingActions, clearPendingAction } from '@/lib/offline-db';

export function useOfflineSync() {
  const syncPending = useCallback(async () => {
    if (!navigator.onLine) return;

    const actions = await getPendingActions();
    for (const action of actions) {
      try {
        if (action.type === 'insert') {
          const { error } = await supabase.from(action.table as any).insert(action.data as any);
          if (!error && action.id) await clearPendingAction(action.id);
        } else if (action.type === 'update') {
          const { id: recordId, ...rest } = action.data;
          const { error } = await supabase.from(action.table as any).update(rest as any).eq('id', recordId);
          if (!error && action.id) await clearPendingAction(action.id);
        }
      } catch {
        // Will retry on next sync
      }
    }
  }, []);

  useEffect(() => {
    // Sync on mount
    syncPending();

    // Sync when coming back online
    window.addEventListener('online', syncPending);
    return () => window.removeEventListener('online', syncPending);
  }, [syncPending]);
}
