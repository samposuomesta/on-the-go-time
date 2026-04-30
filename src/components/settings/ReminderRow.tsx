import { Bell, Pencil, Send } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useTranslation, type TranslationKey } from '@/lib/i18n';

export interface ReminderRowState {
  enabled: boolean;
  time: string;
  day_of_week: number | null;
  send_to_slack: boolean;
}

interface Props {
  labelKey: TranslationKey;
  hintKey?: TranslationKey;
  state: ReminderRowState;
  showDay?: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onToggleSlack: () => void;
}

/**
 * Single reminder row used by clock_in/out, weekly_goal, and vacation reminders.
 * The label, time button, and Slack toggle are presentation-only — all state
 * mutation is delegated back to the parent through callbacks.
 */
export function ReminderRow({
  labelKey,
  hintKey,
  state,
  showDay,
  onEdit,
  onToggle,
  onToggleSlack,
}: Props) {
  const { t, language } = useTranslation();
  const dayLabel = state.day_of_week !== null ? t(`settings.day.${state.day_of_week}` as TranslationKey) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{t(labelKey)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={!state.enabled}
            className="inline-flex items-center gap-1 h-8 px-2 rounded-md border border-input bg-background text-xs disabled:opacity-50 hover:bg-muted"
          >
            <span className="font-mono">{state.time}</span>
            {showDay && dayLabel && (
              <span className="text-muted-foreground">· {dayLabel}</span>
            )}
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
          <Switch checked={state.enabled} onCheckedChange={onToggle} />
        </div>
      </div>
      {hintKey && (
        <p className="text-xs text-muted-foreground ml-7">{t(hintKey)}</p>
      )}
      <div className="flex items-center justify-between gap-3 ml-7">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Send className="h-3 w-3" />
          <span>{language === 'fi' ? 'Lähetä myös Slackiin' : 'Also send to Slack'}</span>
        </div>
        <Switch
          checked={state.send_to_slack}
          disabled={!state.enabled}
          onCheckedChange={onToggleSlack}
        />
      </div>
    </div>
  );
}
