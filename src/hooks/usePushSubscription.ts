import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';

let vapidPublicKeyPromise: Promise<string> | null = null;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function normalizeBase64Url(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function arrayBufferToBase64Url(value: ArrayBuffer | ArrayBufferView | null | undefined): string | null {
  if (!value) return null;

  const bytes = value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getVapidPublicKey(): Promise<string> {
  if (!vapidPublicKeyPromise) {
    vapidPublicKeyPromise = supabase.functions
      .invoke('push-public-key')
      .then(({ data, error }) => {
        if (error) throw error;
        const publicKey = typeof data?.publicKey === 'string' ? data.publicKey : '';
        if (!publicKey) throw new Error('Missing VAPID public key');
        return normalizeBase64Url(publicKey);
      })
      .catch((error) => {
        vapidPublicKeyPromise = null;
        throw error;
      });
  }

  return vapidPublicKeyPromise;
}

export type SubscribeReason =
  | 'unsupported'
  | 'permission-denied'
  | 'no-user'
  | 'not-standalone-ios'
  | 'unknown';

export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: SubscribeReason };

export interface PushStatus {
  supported: boolean;
  isIOS: boolean;
  standalone: boolean;
  permission: NotificationPermission | 'unsupported';
  hasSubscription: boolean;
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPad on iOS 13+ reports as Mac; detect via touch points
  const isIPadOS = /Macintosh/.test(ua) && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1;
  return /iPhone|iPad|iPod/.test(ua) || isIPadOS;
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS Safari legacy
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function detectPlatform(endpoint: string, userAgent: string): string {
  if (endpoint.includes('web.push.apple.com')) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Mac|Windows|Linux/i.test(userAgent)) return 'desktop';
  return 'other';
}

function readStatus(): PushStatus {
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
  return {
    supported,
    isIOS: detectIOS(),
    standalone: detectStandalone(),
    permission: supported ? Notification.permission : 'unsupported',
    hasSubscription: false,
  };
}

export function usePushSubscription() {
  const { data: currentUser } = useCurrentUser();
  const [status, setStatus] = useState<PushStatus>(() => readStatus());

  const refresh = useCallback(async () => {
    const base = readStatus();
    if (!base.supported) {
      setStatus(base);
      return base;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const next = { ...base, hasSubscription: !!sub };
      setStatus(next);
      return next;
    } catch {
      setStatus(base);
      return base;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAppResume = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      void refresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    window.addEventListener('focus', handleAppResume);
    window.addEventListener('pageshow', handleAppResume);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleAppResume);
      window.removeEventListener('pageshow', handleAppResume);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refresh]);

  const subscribe = useCallback(
    async ({ requestPermission = false }: { requestPermission?: boolean } = {}): Promise<SubscribeResult> => {
      console.log('[push] subscribe() called, requestPermission=', requestPermission);
      console.log('[push] supported:', 'serviceWorker' in navigator, 'PushManager' in window, 'Notification' in window);

      if (!currentUser?.id) {
        console.warn('[push] no current user');
        return { ok: false, reason: 'no-user' };
      }
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        console.warn('[push] unsupported browser');
        return { ok: false, reason: 'unsupported' };
      }

      const isIOS = detectIOS();
      const standalone = detectStandalone();
      console.log('[push] iOS:', isIOS, 'standalone:', standalone);

      // iOS hard requirement: must be installed to home screen
      if (isIOS && !standalone) {
        console.warn('[push] iOS not in standalone — must add to Home Screen');
        return { ok: false, reason: 'not-standalone-ios' };
      }

      try {
        let permission = Notification.permission;
        console.log('[push] current permission:', permission);

        // iOS fallback: try to request permission anyway if not granted
        if (permission !== 'granted') {
          try {
            permission = await Notification.requestPermission();
            console.log('[push] permission after request:', permission);
          } catch (e) {
            console.warn('[push] permission request failed', e);
          }
        }

        // Do NOT block if iOS bugs the permission status — continue to subscription anyway
        if (permission !== 'granted') {
          console.warn('[push] permission not explicitly granted, but continuing for iOS');
        }

        const vapidPublicKey = await getVapidPublicKey();
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          console.log('[push] creating new subscription');
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        } else {
          const currentEndpoint = subscription.endpoint;
          const currentApplicationServerKey = arrayBufferToBase64Url(subscription.options?.applicationServerKey);
          const shouldRefreshSubscription = isIOS || (currentApplicationServerKey !== null && currentApplicationServerKey !== vapidPublicKey);

          if (shouldRefreshSubscription) {
            console.log('[push] refreshing existing subscription', {
              isIOS,
              keyChanged: currentApplicationServerKey !== null && currentApplicationServerKey !== vapidPublicKey,
            });

            await subscription.unsubscribe();
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('user_id', currentUser.id)
              .eq('endpoint', currentEndpoint);

            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey,
            });
          } else {
            console.log('[push] reusing existing subscription');
          }
        }

        const subJson = subscription.toJSON();
        console.log('[push] SUBSCRIPTION OBJECT:', JSON.stringify(subJson));

        if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
          console.error('[push] subscription missing fields');
          return { ok: false, reason: 'unknown' };
        }

        if (subJson.endpoint.includes('web.push.apple.com')) {
          console.log('[push] iOS PUSH ENDPOINT DETECTED');
        }

        const userAgent = navigator.userAgent || '';
        const platform = detectPlatform(subJson.endpoint, userAgent);

        // Upsert by (user_id, endpoint)
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
            user_agent: userAgent,
            platform,
          });
          console.log('[push] subscription stored in database');
        } else {
          // Refresh metadata in case UA changed
          await supabase
            .from('push_subscriptions')
            .update({ user_agent: userAgent, platform })
            .eq('id', existing[0].id);
          console.log('[push] subscription metadata updated');
        }

        await refresh();
        return { ok: true };
      } catch (err) {
        console.error('[push] subscription failed:', err);
        return { ok: false, reason: 'unknown' };
      }
    },
    [currentUser?.id, refresh],
  );

  const unsubscribe = useCallback(
    async (endpoint?: string) => {
      try {
        if (!('serviceWorker' in navigator)) return;
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub && (!endpoint || sub.endpoint === endpoint)) {
          await sub.unsubscribe();
          console.log('[push] local subscription removed');
        }
        if (currentUser?.id) {
          const query = supabase.from('push_subscriptions').delete().eq('user_id', currentUser.id);
          if (endpoint) {
            await query.eq('endpoint', endpoint);
          } else {
            await query;
          }
        }
        await refresh();
      } catch (err) {
        console.warn('[push] unsubscribe failed:', err);
      }
    },
    [currentUser?.id, refresh],
  );

  const resetAll = useCallback(async (): Promise<SubscribeResult> => {
    console.log('[push] resetAll() called (force reset)');
    if (!currentUser?.id) {
      console.warn('[push] reset: no current user');
      return { ok: false, reason: 'no-user' };
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      console.warn('[push] reset: unsupported environment');
      return { ok: false, reason: 'unsupported' };
    }

    try {
      // 1. Try to get existing SW registration
      const reg = await navigator.serviceWorker.ready;

      // 2. Try to unsubscribe locally (don't fail on iOS bugs)
      try {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          console.log('[push] reset: local subscription removed');
        } else {
          console.log('[push] reset: no local subscription to remove');
        }
      } catch (e) {
        console.warn('[push] reset: local unsubscribe failed (iOS bug)', e);
      }

      // 3. Delete ALL server-side subscriptions for this user (always)
      try {
        const { error: delErr } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', currentUser.id);
        if (delErr) {
          console.warn('[push] reset: server delete error', delErr);
        } else {
          console.log('[push] reset: server subscriptions deleted');
        }
      } catch (e) {
        console.warn('[push] reset: server delete threw', e);
      }

      // 4. Unregister ALL service workers and re-register (CRITICAL for iOS)
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const r of registrations) {
          await r.unregister();
          console.log('[push] reset: unregistered SW', r.scope);
        }
        await navigator.serviceWorker.register('/sw.js');
        console.log('[push] reset: service worker re-registered');
      } catch (e) {
        console.warn('[push] reset: SW re-register failed', e);
      }

      // 5. Small delay (iOS needs this to settle APNs registration)
      await new Promise((res) => setTimeout(res, 500));

      try {
        await refresh();
      } catch (e) {
        console.warn('[push] reset: refresh failed', e);
      }

      // 6. Re-subscribe with fresh APNs/FCM registration
      console.log('[push] reset: re-subscribing');
      return await subscribe({ requestPermission: true });
    } catch (err) {
      console.error('[push] reset failed', err);
      return { ok: false, reason: 'unknown' };
    }
  }, [currentUser?.id, refresh, subscribe]);

  return { status, subscribe, unsubscribe, refresh, resetAll };
}
