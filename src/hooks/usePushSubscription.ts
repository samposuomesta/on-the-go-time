import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';

let vapidPublicKeyPromise: Promise<string> | null = null;

type PushDebugLevel = 'log' | 'warn' | 'error';
let externalLogger: ((level: PushDebugLevel, ...args: unknown[]) => void) | null = null;
export function setPushDebugLogger(fn: ((level: PushDebugLevel, ...args: unknown[]) => void) | null) {
  externalLogger = fn;
}
function plog(level: PushDebugLevel, ...args: unknown[]) {
  if (externalLogger) {
    try { externalLogger(level, ...args); } catch { /* ignore */ }
  }
  // Errors aina näkyviin; muut lokit vain kehitysympäristössä tai kun
  // ulkoinen debug-logger (esim. Settings-sivun push-debug) on aktiivinen.
  if (level === 'error') {
    console.error(...args);
    return;
  }
  if (!import.meta.env.DEV && !externalLogger) return;
  if (level === 'warn') console.warn(...args);
  else console.log(...args);
}

function urlBase64ToUint8Array(base64String: string) {
  // lisää padding oikein
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

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
        if (data && typeof data === 'object' && 'ok' in data && data.ok === false) {
          const message = typeof data.error === 'string' ? data.error : 'Failed to fetch VAPID public key';
          throw new Error(message);
        }
        const publicKey = typeof data?.publicKey === 'string' ? data.publicKey : '';
        if (!publicKey) throw new Error('Missing VAPID public key');
        // Return key as-is without normalization
        return publicKey;
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
  | { ok: false; reason: SubscribeReason; error?: string };

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

async function getActiveServiceWorker(): Promise<ServiceWorkerRegistration> {
  // 1. Hae kaikki rekisteröinnit
  const regs = await navigator.serviceWorker.getRegistrations();

  // 2. Poista rikkinäiset (iOS bugi)
  for (const r of regs) {
    if (!r.active) {
      plog('log', '[push] removing inactive SW registration', r.scope);
      await r.unregister();
    }
  }

  // 3. Rekisteröi uudelleen
  const reg = await navigator.serviceWorker.register('/sw.js');

  // 4. ODOTA että oikeasti aktivoituu
  await navigator.serviceWorker.ready;

  // 5. iOS tarvitsee pienen delayn
  await new Promise((res) => setTimeout(res, 300));

  return reg;
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
      plog('log', '[push] subscribe() called, requestPermission=', requestPermission);
      plog('log', '[push] supported:', 'serviceWorker' in navigator, 'PushManager' in window, 'Notification' in window);

      if (!currentUser?.id) {
        plog('warn', '[push] no current user');
        return { ok: false, reason: 'no-user' };
      }
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        plog('warn', '[push] unsupported browser');
        return { ok: false, reason: 'unsupported' };
      }

      const isIOS = detectIOS();
      const standalone = detectStandalone();
      plog('log', '[push] iOS:', isIOS, 'standalone:', standalone);

      // iOS hard requirement: must be installed to home screen
      if (isIOS && !standalone) {
        plog('warn', '[push] iOS not in standalone — must add to Home Screen');
        return { ok: false, reason: 'not-standalone-ios' };
      }

      try {
        let permission = Notification.permission;
        plog('log', '[push] current permission:', permission);

        // iOS fallback: try to request permission anyway if not granted
        if (permission !== 'granted') {
          try {
            permission = await Notification.requestPermission();
            plog('log', '[push] permission after request:', permission);
          } catch (e) {
            plog('warn', '[push] permission request failed', e);
          }
        }

        // Do NOT block if iOS bugs the permission status — continue to subscription anyway
        if (permission !== 'granted') {
          plog('warn', '[push] permission not explicitly granted, but continuing for iOS');
        }

        // ⚠️ TÄRKEÄ: käytä RAW avainta backendista (älä normalize sitä)
        const vapidPublicKey = await getVapidPublicKey();
        plog('log', '[push] VAPID key:', vapidPublicKey);
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

        // DEBUG (pakollinen tarkistus) — pitäisi olla 65
        plog('log', '[push] VAPID key length:', applicationServerKey.length);

        const registration = await getActiveServiceWorker();
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          plog('log', '[push] creating new subscription');
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        } else {
          const currentEndpoint = subscription.endpoint;
          const currentApplicationServerKey = arrayBufferToBase64Url(subscription.options?.applicationServerKey);
          const shouldRefreshSubscription = isIOS || (currentApplicationServerKey !== null && currentApplicationServerKey !== vapidPublicKey);

          if (shouldRefreshSubscription) {
            plog('log', '[push] refreshing existing subscription', {
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
            plog('log', '[push] reusing existing subscription');
          }
        }

        const subJson = subscription.toJSON();
        plog('log', '[push] SUBSCRIPTION OBJECT:', JSON.stringify(subJson));

        if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
          console.error('[push] subscription missing fields');
          return { ok: false, reason: 'unknown', error: 'subscription missing endpoint/keys' };
        }

        if (subJson.endpoint.includes('web.push.apple.com')) {
          plog('log', '[push] iOS PUSH ENDPOINT DETECTED');
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
          plog('log', '[push] subscription stored in database');
        } else {
          // Refresh metadata in case UA changed
          await supabase
            .from('push_subscriptions')
            .update({ user_agent: userAgent, platform })
            .eq('id', existing[0].id);
          plog('log', '[push] subscription metadata updated');
        }

        await refresh();
        return { ok: true };
      } catch (err) {
        console.error('[push] subscription failed:', err);
        const errorDetail = err instanceof Error
          ? `${err.name}: ${err.message}`
          : typeof err === 'string'
          ? err
          : (() => { try { return JSON.stringify(err); } catch { return String(err); } })();
        return { ok: false, reason: 'unknown', error: errorDetail };
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
          plog('log', '[push] local subscription removed');
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
        plog('warn', '[push] unsubscribe failed:', err);
      }
    },
    [currentUser?.id, refresh],
  );

  const resetAll = useCallback(async (): Promise<SubscribeResult> => {
    plog('log', '[push] resetAll() called (force reset)');
    if (!currentUser?.id) {
      plog('warn', '[push] reset: no current user');
      return { ok: false, reason: 'no-user' };
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      plog('warn', '[push] reset: unsupported environment');
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
          plog('log', '[push] reset: local subscription removed');
        } else {
          plog('log', '[push] reset: no local subscription to remove');
        }
      } catch (e) {
        plog('warn', '[push] reset: local unsubscribe failed (iOS bug)', e);
      }

      // 3. Delete ALL server-side subscriptions for this user (always)
      try {
        const { error: delErr } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', currentUser.id);
        if (delErr) {
          plog('warn', '[push] reset: server delete error', delErr);
        } else {
          plog('log', '[push] reset: server subscriptions deleted');
        }
      } catch (e) {
        plog('warn', '[push] reset: server delete threw', e);
      }

      // 4. Unregister ALL service workers and re-register (CRITICAL for iOS)
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const r of registrations) {
          await r.unregister();
          plog('log', '[push] reset: unregistered SW', r.scope);
        }
        await navigator.serviceWorker.register('/sw.js');
        plog('log', '[push] reset: service worker re-registered');
      } catch (e) {
        plog('warn', '[push] reset: SW re-register failed', e);
      }

      // 5. Small delay (iOS needs this to settle APNs registration)
      await new Promise((res) => setTimeout(res, 500));

      try {
        await refresh();
      } catch (e) {
        plog('warn', '[push] reset: refresh failed', e);
      }

      // 6. Re-subscribe with fresh APNs/FCM registration
      plog('log', '[push] reset: re-subscribing');
      return await subscribe({ requestPermission: true });
    } catch (err) {
      console.error('[push] reset failed', err);
      const errorDetail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      return { ok: false, reason: 'unknown', error: errorDetail };
    }
  }, [currentUser?.id, refresh, subscribe]);

  return { status, subscribe, unsubscribe, refresh, resetAll };
}
