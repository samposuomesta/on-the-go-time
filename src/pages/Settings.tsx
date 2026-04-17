import { useState, useEffect } from 'react';
import { APP_VERSION, BUILD_DATE } from '@/lib/version';
import { ArrowLeft, Moon, Sun, Monitor, Bell, Smartphone, Check, X, AlertTriangle, Send, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation, Language } from '@/lib/i18n';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePushSubscription } from '@/hooks/usePushSubscription';
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
}

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const { language, setLanguage, t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const { status: pushStatus, subscribe, unsubscribe, refresh: refreshPush } = usePushSubscription();
  const [testSending, setTestSending] = useState(false);
  const queryClient = useQueryClient();

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
    const result = await subscribe({ requestPermission: true });
    if (result.ok) {
      toast.success(t('settings.notificationsEnabled'));
      void refetchSubs();
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
          : t('settings.notificationsPermissionRequired');
      toast.error(msg);
    }
  };

  const handleSendTest = async () => {
    setTestSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-test-notification');
      if (error) throw error;
      const result = data as { sent?: number; failed?: number; expired?: number; error?: string } | null;
      if (result?.error === 'no-subscriptions') {
        toast.error(t('settings.noSubscriptions'));
      } else if ((result?.sent ?? 0) > 0) {
        toast.success(t('settings.testSent'));
      } else {
        toast.error(t('settings.testFailed'));
      }
      void refetchSubs();
    } catch (err) {
      console.error('Test send failed:', err);
      toast.error(t('settings.testFailed'));
    } finally {
      setTestSending(false);
    }
  };

  const handleRevokeDevice = async (endpoint: string) => {
    await unsubscribe(endpoint);
    toast.success(t('settings.deviceRevoked'));
    void refetchSubs();
  };
    mutationFn: async ({ type, enabled, time }: { type: string; enabled: boolean; time: string }) => {
      if (!userId) return;
      const { error } = await supabase
        .from('user_reminders')
        .upsert({ user_id: userId, type, enabled, time }, { onConflict: 'user_id,type' });
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
      const result = await subscribe({ requestPermission: true });

      if (!result.ok) {
        const reason = 'reason' in result ? result.reason : 'unknown';
        const msg =
          reason === 'unsupported'
            ? t('settings.notificationsUnsupported')
            : reason === 'not-standalone-ios'
            ? t('settings.iosInstallTitle')
            : t('settings.notificationsPermissionRequired');
        toast.error(msg);
        return;
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
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => handleTimeChange(type, e.target.value)}
                        className="w-24 h-8 text-xs"
                        disabled={!isEnabled}
                      />
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
                        <Input
                          type="time"
                          value={time}
                          onChange={(e) => handleTimeChange(type, e.target.value)}
                          className="w-24 h-8 text-xs"
                          disabled={!isEnabled}
                        />
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
