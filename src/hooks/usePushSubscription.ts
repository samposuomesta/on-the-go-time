import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';

// This must match the VAPID_PUBLIC_KEY secret
const VAPID_PUBLIC_KEY = 'BIXnTKeIRE7ZUXy-SOII2sCZh1engSLzWA2rXJnr4787y0dUtAjmQkalAKmriG9olpmZ0i0_mwnlVqVg_P50JCc';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const { data: currentUser } = useCurrentUser();

  const subscribe = useCallback(async () => {
    if (!currentUser?.id) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const subJson = subscription.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) return;

      // Check if already stored
      const { data: existing } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('endpoint', subJson.endpoint)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from('push_subscriptions').insert({
          user_id: currentUser.id,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        });
      }
    } catch (err) {
      console.warn('Push subscription failed:', err);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    subscribe();
  }, [subscribe]);

  return { subscribe };
}
