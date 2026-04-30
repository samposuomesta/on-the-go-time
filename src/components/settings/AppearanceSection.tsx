import { Sun, Moon, Monitor } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

export type Theme = 'light' | 'dark' | 'system';

interface Props {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

const options: { value: Theme; icon: typeof Sun; labelKey: 'theme.light' | 'theme.dark' | 'theme.system' }[] = [
  { value: 'light', icon: Sun, labelKey: 'theme.light' },
  { value: 'dark', icon: Moon, labelKey: 'theme.dark' },
  { value: 'system', icon: Monitor, labelKey: 'theme.system' },
];

export function AppearanceSection({ theme, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <section>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('settings.appearance')}
      </Label>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {options.map(({ value, icon: Icon, labelKey }) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors touch-target',
              theme === value
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{t(labelKey)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
