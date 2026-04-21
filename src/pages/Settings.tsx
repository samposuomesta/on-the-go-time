import { useState, useEffect } from 'react';
import { APP_VERSION, BUILD_DATE } from '@/lib/version';
import { ArrowLeft, Moon, Sun, Monitor, Bell, Smartphone, Check, X, AlertTriangle, Send, Trash2, RefreshCw, Copy, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTranslation, Language } from '@/lib/i18n';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePushSubscription, setPushDebugLogger } from '@/hooks/usePushSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type Theme = 'light' | 'dark' | 'system';

function getStoredTheme(): Theme {
  return (localStorage.getItem('timetrack-theme') as Theme) || 'system';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

interface UserReminder {
  id: string;
  user_id: string;
  type: string;
  time: string;
  enabled: boolean;
  day_of_week: number | null;
}

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const { language, setLanguage, t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const { status: pushStatus, subscribe, unsubscribe, refresh: refreshPush, resetAll: resetAllPush } = usePushSubscription();
  const [testSending, setTestSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [lastPushError, setLastPushError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<{ time: string; level: 'log' | 'warn' | 'error'; msg: string }[]>([]);
  const queryClient = useQueryClient();

  const pushDebug = (level: 'log' | 'warn' | 'error', ...args: unknown[]) => {
    const time = new Date().toLocaleTimeString();
    const msg = args
      .map((a) => {
        if (a instanceof Error) return `${a.name}: ${a.message}`;
        if (typeof a === 'string') return a;
        try {
          return JSON.stringify(a, (_k, v) => (v instanceof Error ? `${v.name}: ${v.message}` : v));
        } catch {
          return String(a);
        }
      })
      .join(' ');
    setDebugLogs((prev) => [...prev.slice(-49), { time, level, msg }]);
    if (level === 'error') console.error(...args);
    else if (level === 'warn') console.warn(...args);
    else console.log(...args);
  };
  const clearDebugLogs = () => setDebugLogs([]);

  // Forward [push] logs from the hook into the on-screen debug panel
  useEffect(() => {
    setPushDebugLogger((level, ...args) => pushDebug(level, ...args));
    return () => setPushDebugLogger(null);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('timetrack-theme', theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (theme === 'system') applyTheme('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const userId = currentUser?.id;

  // Edit-time dialog state — time/day are committed only on explicit Save
  const [editing, setEditing] = useState<
    | { type: string; time: string; day_of_week: number | null; showDay: boolean; labelKey: string }
    | null
  >(null);

  const { data: reminders = [] } = useQuery<UserReminder[]>({
    queryKey: ['user-reminders', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_reminders')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []) as UserReminder[];
    },
    enabled: !!userId,
  });

  const { data: subscriptions = [], refetch: refetchSubs } = useQuery({
    queryKey: ['push-subscriptions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, user_agent, platform, last_success_at, last_failure_at, failure_count, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });

  const handleEnableNotifications = async () => {
    const refreshed = await refreshPush();
    if (refreshed.permission === 'granted' && refreshed.hasSubscription) {
      toast.success(t('settings.notificationsEnabled'));
      return;
    }

    const result = await subscribe({ requestPermission: true });
    if (result.ok) {
      toast.success(t('settings.notificationsEnabled'));
      void refetchSubs();
    } else {
      const reason = 'reason' in result ? result.reason : 'unknown';
      // If permission is already granted but subscribe failed, the issue is a
      // missing/expired push registration (common on iOS), not permissions.
      const permissionAlreadyGranted = refreshed.permission === 'granted';
      const msg =
        reason === 'unsupported'
          ? t('settings.notificationsUnsupported')
          : reason === 'not-standalone-ios'
          ? t('settings.iosInstallTitle')
          : reason === 'permission-denied'
          ? (refreshed.permission === 'denied'
              ? t('settings.permissionDeniedHelp')
              : t('settings.notificationsPermissionRequired'))
          : permissionAlreadyGranted
          ? (refreshed.isIOS
              ? t('settings.iosResubscribeHelp')
              : t('settings.subscriptionFailed'))
          : t('settings.notificationsPermissionRequired');
      toast.error(msg);
    }
  };

  const handleSendTest = async () => {
    setTestSending(true);
    pushDebug('log', '▶️ Starting handleSendTest');
    try {
      pushDebug('log', 'refreshing push state...');
      const refreshed = await refreshPush();
      pushDebug('log', 'refreshPush result:', refreshed);
      const canUseExistingSubscription = refreshed.hasSubscription || subscriptions.length > 0;
      pushDebug('log', 'canUseExistingSubscription:', canUseExistingSubscription, 'subs in state:', subscriptions.length);

      if (!canUseExistingSubscription) {
        pushDebug('log', 'no subscription found, calling subscribe()...');
        const subscriptionResult = await subscribe({ requestPermission: refreshed.permission === 'default' });
        pushDebug('log', 'subscribe() result:', subscriptionResult);
        if (!subscriptionResult.ok) {
          const reason = 'reason' in subscriptionResult ? subscriptionResult.reason : 'unknown';
          const errorDetail = 'error' in subscriptionResult ? subscriptionResult.error : undefined;
          pushDebug('error', 'subscribe failed:', reason, errorDetail ?? '');
          const baseMsg =
            reason === 'unsupported'
              ? t('settings.notificationsUnsupported')
              : reason === 'not-standalone-ios'
              ? t('settings.iosInstallTitle')
              : reason === 'permission-denied'
              ? (refreshed.permission === 'denied'
                  ? t('settings.permissionDeniedHelp')
                  : t('settings.notificationsPermissionRequired'))
              : refreshed.isIOS
              ? t('settings.iosResubscribeHelp')
              : t('settings.subscriptionFailed');
          toast.error(errorDetail ? `${baseMsg} — ${errorDetail}` : baseMsg);
          return;
        }
        await refetchSubs();
      }

      pushDebug('log', 'fetching auth session...');
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      pushDebug('log', 'accessToken present:', !!accessToken, 'length:', accessToken?.length ?? 0);
      if (!accessToken) {
        toast.error(`${t('settings.testFailed')}: no access token`);
        return;
      }

      pushDebug('log', '📡 invoking send-test-notification...');
      const invokeStart = Date.now();
      const { data, error } = await supabase.functions.invoke('send-test-notification', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const invokeMs = Date.now() - invokeStart;
      pushDebug('log', `✅ invoke returned in ${invokeMs}ms`);
      pushDebug('log', 'data:', data);
      if (error) pushDebug('error', 'error:', error);

      if (error) {
        const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
        pushDebug('error', '❌ invoke error:', errMsg);
        toast.error(`Invoke error: ${errMsg}`);
        throw error;
      }
      type PushDetail = {
        endpointHost: string;
        platform: string | null;
        ok: boolean;
        expired?: boolean;
        status?: number;
        error?: string;
      };
      const result = data as {
        sent?: number;
        failed?: number;
        expired?: number;
        error?: string;
        details?: PushDetail[];
      } | null;
      pushDebug('log', 'parsed result:', result);

      if (result?.error === 'no-subscriptions') {
        pushDebug('warn', 'server reports no subscriptions for this user');
        toast.error(t('settings.noSubscriptions'));
      } else if ((result?.sent ?? 0) > 0) {
        pushDebug('log', `🎉 sent=${result?.sent} failed=${result?.failed} expired=${result?.expired}`);
        toast.success(`${t('settings.testSent')} (sent=${result?.sent}, failed=${result?.failed ?? 0}, expired=${result?.expired ?? 0})`);
      } else {
        const firstFailure = result?.details?.find((d) => !d.ok);
        pushDebug('error', 'all sends failed. details:', result?.details);
        const reasonText = firstFailure
          ? firstFailure.expired
            ? `expired (${firstFailure.endpointHost})`
            : `${firstFailure.endpointHost} → ${firstFailure.error ?? `status ${firstFailure.status ?? '?'}`}`
          : `sent=${result?.sent ?? 0} failed=${result?.failed ?? 0} expired=${result?.expired ?? 0}`;
        toast.error(`${t('settings.testFailed')}: ${reasonText}`);
      }
      void refetchSubs();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      pushDebug('error', '💥 caught exception:', errMsg);
      toast.error(errMsg && errMsg !== 'unknown' ? `${t('settings.testFailed')}: ${errMsg}` : t('settings.testFailed'));
    } finally {
      pushDebug('log', '🏁 handleSendTest finished');
      setTestSending(false);
    }
  };

  const handleRevokeDevice = async (endpoint: string) => {
    await unsubscribe(endpoint);
    toast.success(t('settings.deviceRevoked'));
    void refetchSubs();
  };

  const handleResetSubscriptions = async () => {
    setResetting(true);
    setLastPushError(null);
    try {
      const result = await resetAllPush();
      if (result.ok) {
        toast.success(t('settings.resetSubscriptionsSuccess'));
        setLastPushError(null);
      } else {
        const reason = 'reason' in result ? result.reason : 'unknown';
        const msg =
          reason === 'unsupported'
            ? t('settings.notificationsUnsupported')
            : reason === 'not-standalone-ios'
            ? t('settings.iosInstallTitle')
            : reason === 'permission-denied'
            ? (pushStatus.permission === 'denied'
                ? t('settings.permissionDeniedHelp')
                : t('settings.notificationsPermissionRequired'))
            : t('settings.resetSubscriptionsFailed');
        toast.error(msg);
        setLastPushError(`${msg} (${reason})`);
      }
      void refetchSubs();
    } catch (err) {
      console.error('Reset subscriptions failed:', err);
      const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      toast.error(t('settings.resetSubscriptionsFailed'));
      setLastPushError(detail);
    } finally {
      setResetting(false);
    }
  };

  const upsertReminder = useMutation({
    mutationFn: async ({ type, enabled, time, day_of_week }: { type: string; enabled: boolean; time: string; day_of_week?: number | null }) => {
      if (!userId) return;
      const payload: any = { user_id: userId, type, enabled, time };
      if (day_of_week !== undefined) payload.day_of_week = day_of_week;
      const { error } = await supabase
        .from('user_reminders')
        .upsert(payload, { onConflict: 'user_id,type' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-reminders', userId] });
      toast.success(t('settings.reminderSaved'));
    },
  });

  const getReminder = (type: string) => reminders.find((r) => r.type === type);

  const handleToggle = async (type: string, defaultTime: string) => {
    const existing = getReminder(type);
    const nextEnabled = existing ? !existing.enabled : true;

    if (nextEnabled) {
      const refreshed = await refreshPush();
      const canUseExistingSubscription = refreshed.hasSubscription || subscriptions.length > 0;
      const result = canUseExistingSubscription ? { ok: true as const } : await subscribe({ requestPermission: true });

      if (!result.ok) {
        const reason = 'reason' in result ? result.reason : 'unknown';
        const permissionAlreadyGranted = refreshed.permission === 'granted';
        const msg =
          reason === 'unsupported'
            ? t('settings.notificationsUnsupported')
            : reason === 'not-standalone-ios'
            ? t('settings.iosInstallTitle')
            : reason === 'permission-denied' && refreshed.permission === 'denied'
            ? t('settings.permissionDeniedHelp')
            : permissionAlreadyGranted
            ? (refreshed.isIOS
                ? t('settings.iosResubscribeHelp')
                : t('settings.subscriptionFailed'))
            : t('settings.notificationsPermissionRequired');
        toast.error(msg);
        return;
      }

      if (!canUseExistingSubscription) {
        void refetchSubs();
      }
    }

    upsertReminder.mutate({
      type,
      enabled: nextEnabled,
      time: existing?.time ?? defaultTime,
    });
  };

  const handleTimeChange = (type: string, time: string) => {
    const existing = getReminder(type);
    upsertReminder.mutate({
      type,
      enabled: existing?.enabled ?? true,
      time,
    });
  };

  const handleDayChange = (type: string, day_of_week: number, defaultTime: string) => {
    const existing = getReminder(type);
    upsertReminder.mutate({
      type,
      enabled: existing?.enabled ?? true,
      time: existing?.time ?? defaultTime,
      day_of_week,
    });
  };

  const handleToggleWeekly = async (type: string, defaultTime: string, defaultDay: number) => {
    const existing = getReminder(type);
    const nextEnabled = existing ? !existing.enabled : true;
    if (nextEnabled) {
      const refreshed = await refreshPush();
      const canUseExistingSubscription = refreshed.hasSubscription || subscriptions.length > 0;
      if (!canUseExistingSubscription) {
        const result = await subscribe({ requestPermission: true });
        if (!result.ok) {
          toast.error(t('settings.notificationsPermissionRequired'));
          return;
        }
        void refetchSubs();
      }
    }
    upsertReminder.mutate({
      type,
      enabled: nextEnabled,
      time: existing?.time ?? defaultTime,
      day_of_week: existing?.day_of_week ?? defaultDay,
    });
  };

  const reminderTypes = [
    { type: 'clock_in', labelKey: 'settings.clockInReminder' as const, defaultTime: '08:00' },
    { type: 'clock_out', labelKey: 'settings.clockOutReminder' as const, defaultTime: '16:00' },
  ];

  const isManagerOrAdmin = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const vacationReminderTypes = [
    ...(isManagerOrAdmin ? [{ type: 'vacation_pending', labelKey: 'settings.vacationPendingReminder' as const, defaultTime: '09:00', hintKey: 'settings.vacationPendingHint' as const }] : []),
    { type: 'vacation_status', labelKey: 'settings.vacationStatusReminder' as const, defaultTime: '09:00', hintKey: 'settings.vacationStatusHint' as const },
  ];

  const themeOptions: { value: Theme; icon: typeof Sun; labelKey: 'theme.light' | 'theme.dark' | 'theme.system' }[] = [
    { value: 'light', icon: Sun, labelKey: 'theme.light' },
    { value: 'dark', icon: Moon, labelKey: 'theme.dark' },
    { value: 'system', icon: Monitor, labelKey: 'theme.system' },
  ];

  const langOptions: { value: Language; label: string; flag: string }[] = [
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'fi', label: 'Suomi', flag: '🇫🇮' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/" className="touch-target flex items-center justify-center rounded-lg hover:bg-muted p-2 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-display font-bold">{t('settings.title')}</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-6">
        {/* Language */}
        <section>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('settings.language')}</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {langOptions.map(({ value, label, flag }) => (
              <button
                key={value}
                onClick={() => setLanguage(value)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-4 transition-colors touch-target',
                  language === value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                )}
              >
                <span className="text-xl">{flag}</span>
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Appearance */}
        <section>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('settings.appearance')}</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {themeOptions.map(({ value, icon: Icon, labelKey }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors touch-target',
                  theme === value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Notifications (Web Push) */}
        <section>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('settings.notifications')}</Label>
          <Card className="mt-2">
            <CardContent className="p-4 space-y-4">
              {/* Status rows */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('settings.notificationsBrowserSupport')}</span>
                  <span className={cn('flex items-center gap-1 font-medium', pushStatus.supported ? 'text-success' : 'text-destructive')}>
                    {pushStatus.supported ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    {pushStatus.supported ? t('settings.notificationsSupported') : t('settings.notificationsNotSupported')}
                  </span>
                </div>
                {pushStatus.isIOS && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('settings.notificationsInstalled')}</span>
                    <span className={cn('flex items-center gap-1 font-medium', pushStatus.standalone ? 'text-success' : 'text-destructive')}>
                      {pushStatus.standalone ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      {pushStatus.standalone ? t('settings.notificationsYes') : t('settings.notificationsNo')}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('settings.notificationsPermission')}</span>
                  <span className={cn(
                    'flex items-center gap-1 font-medium',
                    pushStatus.permission === 'granted' ? 'text-success'
                      : pushStatus.permission === 'denied' ? 'text-destructive'
                      : 'text-muted-foreground',
                  )}>
                    {pushStatus.permission === 'granted' && <Check className="h-4 w-4" />}
                    {pushStatus.permission === 'denied' && <X className="h-4 w-4" />}
                    {pushStatus.permission === 'granted'
                      ? t('settings.notificationsGranted')
                      : pushStatus.permission === 'denied'
                      ? t('settings.notificationsDenied')
                      : t('settings.notificationsDefault')}
                  </span>
                </div>
              </div>

              {/* iOS install banner */}
              {pushStatus.supported && pushStatus.isIOS && !pushStatus.standalone && (
                <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-warning-foreground">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    {t('settings.iosInstallTitle')}
                  </div>
                  <p>{t('settings.iosStep1')}</p>
                  <p>{t('settings.iosStep2')}</p>
                  <p>{t('settings.iosStep3')}</p>
                  <p>{t('settings.iosStep4')}</p>
                </div>
              )}

              {/* Permission denied help */}
              {pushStatus.supported && pushStatus.permission === 'denied' && (
                <p className="text-xs text-muted-foreground">{t('settings.permissionDeniedHelp')}</p>
              )}

              {/* Enable button */}
              <Button
                onClick={handleEnableNotifications}
                disabled={
                  !pushStatus.supported ||
                  (pushStatus.isIOS && !pushStatus.standalone) ||
                  pushStatus.permission === 'denied'
                }
                className="w-full"
              >
                <Bell className="h-4 w-4 mr-2" />
                {t('settings.enableNotifications')}
              </Button>

              {/* Test notification — always shown so user can diagnose missing subscription */}
              <Button
                onClick={handleSendTest}
                disabled={testSending}
                variant="outline"
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {t('settings.sendTestNotification')}
              </Button>

              {/* On-screen debug panel — shows the latest [push-test] events without needing Web Inspector */}
              {debugLogs.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/40 p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {language === 'fi' ? 'Push-debuglokit' : 'Push debug log'}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const text = debugLogs.map((e) => `${e.time} [${e.level}] ${e.msg}`).join('\n');
                          try {
                            if (navigator.clipboard?.writeText) {
                              await navigator.clipboard.writeText(text);
                            } else {
                              const ta = document.createElement('textarea');
                              ta.value = text;
                              ta.style.position = 'fixed';
                              ta.style.opacity = '0';
                              document.body.appendChild(ta);
                              ta.select();
                              document.execCommand('copy');
                              document.body.removeChild(ta);
                            }
                            toast.success(language === 'fi' ? 'Kopioitu' : 'Copied');
                          } catch {
                            toast.error(language === 'fi' ? 'Kopiointi epäonnistui' : 'Copy failed');
                          }
                        }}
                        className="h-6 px-2 text-[10px]"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {language === 'fi' ? 'Kopioi' : 'Copy'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearDebugLogs}
                        className="h-6 px-2 text-[10px]"
                      >
                        {language === 'fi' ? 'Tyhjennä' : 'Clear'}
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-auto font-mono text-[10px] leading-tight space-y-0.5">
                    {debugLogs.map((entry, i) => (
                      <div
                        key={i}
                        className={cn(
                          'whitespace-pre-wrap break-all',
                          entry.level === 'error' && 'text-destructive',
                          entry.level === 'warn' && 'text-warning',
                          entry.level === 'log' && 'text-foreground',
                        )}
                      >
                        <span className="text-muted-foreground">{entry.time}</span> {entry.msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset all subscriptions */}
              {pushStatus.supported && !(pushStatus.isIOS && !pushStatus.standalone) && (
                <div className="space-y-1">
                  <Button
                    onClick={handleResetSubscriptions}
                    disabled={resetting || pushStatus.permission === 'denied'}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className={cn('h-4 w-4 mr-2', resetting && 'animate-spin')} />
                    {t('settings.resetSubscriptions')}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t('settings.resetSubscriptionsHint')}</p>
                  {lastPushError && (
                    <p className="text-xs text-destructive break-words pt-1" role="alert">
                      {language === 'fi' ? 'Viimeisin virhe' : 'Last error'}: {lastPushError}
                    </p>
                  )}
                </div>
              )}

              {/* Subscribed devices */}
              {subscriptions.length > 0 && (
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('settings.subscribedDevices')}
                  </div>
                  {subscriptions.map((sub) => {
                    const ua = sub.user_agent ?? '';
                    const shortUa = ua.length > 60 ? ua.slice(0, 60) + '…' : ua;
                    return (
                      <div key={sub.id} className="flex items-start justify-between gap-2 rounded-md border border-border p-2 text-xs">
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Smartphone className="h-3 w-3 shrink-0" />
                            <span className="capitalize">{sub.platform ?? 'unknown'}</span>
                          </div>
                          {shortUa && <div className="text-muted-foreground truncate">{shortUa}</div>}
                          <div className="text-muted-foreground">
                            {t('settings.lastSuccess')}:{' '}
                            {sub.last_success_at
                              ? new Date(sub.last_success_at).toLocaleString()
                              : t('settings.never')}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRevokeDevice(sub.endpoint)}
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Reminders */}
        <section>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('settings.reminders')}</Label>
          <Card className="mt-2">
            <CardContent className="p-4 space-y-4">
              {reminderTypes.map(({ type, labelKey, defaultTime }) => {
                const reminder = getReminder(type);
                const isEnabled = reminder?.enabled ?? false;
                const time = reminder?.time ?? defaultTime;
                return (
                  <div key={type} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{t(labelKey)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing({ type, time, day_of_week: null, showDay: false, labelKey })}
                        disabled={!isEnabled}
                        className="inline-flex items-center gap-1 h-8 px-2 rounded-md border border-input bg-background text-xs font-mono disabled:opacity-50 hover:bg-muted"
                      >
                        {time}
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => handleToggle(type, defaultTime)}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        {/* Weekly Goal Reminders */}
        <section>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('settings.weeklyGoalReminders')}</Label>
          <Card className="mt-2">
            <CardContent className="p-4 space-y-3">
              {(() => {
                const type = 'weekly_goal';
                const defaultTime = '15:00';
                const defaultDay = 5; // Friday
                const reminder = getReminder(type);
                const isEnabled = reminder?.enabled ?? false;
                const time = reminder?.time ?? defaultTime;
                const day = reminder?.day_of_week ?? defaultDay;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{t('settings.weeklyGoalReminder')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing({ type, time, day_of_week: day, showDay: true, labelKey: 'settings.weeklyGoalReminder' })}
                          disabled={!isEnabled}
                          className="inline-flex items-center gap-1 h-8 px-2 rounded-md border border-input bg-background text-xs disabled:opacity-50 hover:bg-muted"
                        >
                          <span className="font-mono">{time}</span>
                          <span className="text-muted-foreground">· {t(`settings.day.${day}` as any)}</span>
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <Switch checked={isEnabled} onCheckedChange={() => handleToggleWeekly(type, defaultTime, defaultDay)} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground ml-7">{t('settings.weeklyGoalHint')}</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </section>

        {/* Vacation Reminders */}
        <section>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('settings.vacationReminders')}</Label>
          <Card className="mt-2">
            <CardContent className="p-4 space-y-4">
              {vacationReminderTypes.map(({ type, labelKey, defaultTime, hintKey }) => {
                const reminder = getReminder(type);
                const isEnabled = reminder?.enabled ?? false;
                const time = reminder?.time ?? defaultTime;
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{t(labelKey)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing({ type, time, day_of_week: null, showDay: false, labelKey })}
                          disabled={!isEnabled}
                          className="inline-flex items-center gap-1 h-8 px-2 rounded-md border border-input bg-background text-xs font-mono disabled:opacity-50 hover:bg-muted"
                        >
                          {time}
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleToggle(type, defaultTime)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground ml-7">{t(hintKey)}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
        <section>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('settings.about')}</Label>
          <Card className="mt-2">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('settings.version')}</span>
                <span className="font-medium font-display">{APP_VERSION}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('settings.platform')}</span>
                <span className="font-medium">PWA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('settings.offline')}</span>
                <span className="font-medium text-success">{t('settings.enabled')}</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
