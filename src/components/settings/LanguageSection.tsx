import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTranslation, type Language } from '@/lib/i18n';

interface Props {
  language: Language;
  onChange: (lang: Language) => void;
}

const options: { value: Language; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'fi', label: 'Suomi', flag: '🇫🇮' },
];

export function LanguageSection({ language, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <section>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('settings.language')}
      </Label>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {options.map(({ value, label, flag }) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-4 transition-colors touch-target',
              language === value
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            <span className="text-xl">{flag}</span>
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
