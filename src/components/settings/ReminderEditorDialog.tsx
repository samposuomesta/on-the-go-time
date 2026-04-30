import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation, type TranslationKey } from '@/lib/i18n';

export interface ReminderEditState {
  type: string;
  time: string;
  day_of_week: number | null;
  showDay: boolean;
  labelKey: string;
}

interface Props {
  editing: ReminderEditState | null;
  setEditing: (state: ReminderEditState | null) => void;
  onSave: (state: ReminderEditState) => void;
}

export function ReminderEditorDialog({ editing, setEditing, onSave }: Props) {
  const { t, language } = useTranslation();

  return (
    <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? t(editing.labelKey as TranslationKey) : ''}</DialogTitle>
        </DialogHeader>
        {editing && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('settings.reminderTime')}</Label>
              <Input
                type="time"
                value={editing.time}
                onChange={(e) => setEditing({ ...editing, time: e.target.value })}
                className="h-10"
              />
            </div>
            {editing.showDay && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {language === 'fi' ? 'Viikonpäivä' : 'Day of week'}
                </Label>
                <select
                  value={editing.day_of_week ?? 5}
                  onChange={(e) => setEditing({ ...editing, day_of_week: parseInt(e.target.value, 10) })}
                  className="w-full h-10 text-sm rounded-md border border-input bg-background px-2"
                >
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <option key={d} value={d}>{t(`settings.day.${d}` as TranslationKey)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setEditing(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => editing && onSave(editing)}
          >
            <Check className="h-4 w-4 mr-2" />
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
