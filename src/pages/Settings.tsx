import { useState, useEffect } from 'react';
import { ArrowLeft, Moon, Sun, Monitor, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTranslation, Language } from '@/lib/i18n';

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

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const { language, setLanguage, t } = useTranslation();

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

        {/* App Info */}
        <section>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('settings.about')}</Label>
          <Card className="mt-2">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('settings.version')}</span>
                <span className="font-medium font-display">0.1.0</span>
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
