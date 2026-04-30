import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

interface Props {
  slackUserId: string;
  setSlackUserId: (v: string) => void;
  saving: boolean;
  savedValue: string | null | undefined;
  onSave: () => void;
}

export function SlackSection({ slackUserId, setSlackUserId, saving, savedValue, onSave }: Props) {
  const { t } = useTranslation();
  return (
    <section>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('settings.slackIntegration')}
      </Label>
      <Card className="mt-2">
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="slack-user-id" className="text-sm">{t('settings.slackUserId')}</Label>
            <Input
              id="slack-user-id"
              placeholder="U01ABCDE2FG"
              value={slackUserId}
              onChange={(e) => setSlackUserId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t('settings.slackUserIdHint')}</p>
          </div>
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving || slackUserId.trim() === (savedValue ?? '')}
          >
            {t('common.save')}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
