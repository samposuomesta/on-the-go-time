import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { APP_VERSION } from '@/lib/version';

export function AboutSection() {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);

  const checkForUpdate = async () => {
    if (checking) return;
    setChecking(true);
    try {
      if (!('serviceWorker' in navigator)) {
        toast.error(t('settings.updateCheckFailed'));
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        toast.error(t('settings.updateCheckFailed'));
        return;
      }
      await reg.update();
      await new Promise((r) => setTimeout(r, 1500));
      const fresh = await navigator.serviceWorker.getRegistration();
      const waiting = fresh?.waiting;
      if (waiting) {
        toast.success(t('settings.updateAvailable'));
        waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        toast.success(t('settings.upToDate'));
      }
    } catch {
      toast.error(t('settings.updateCheckFailed'));
    } finally {
      setChecking(false);
    }
  };

  return (
    <section>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('settings.about')}
      </Label>
      <Card className="mt-2">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between items-center text-sm gap-2">
            <span className="text-muted-foreground">{t('settings.version')}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium font-display">{APP_VERSION}</span>
              <button
                type="button"
                onClick={checkForUpdate}
                disabled={checking}
                className="text-primary hover:underline disabled:opacity-50 inline-flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
                {checking ? t('settings.checkingUpdates') : t('settings.checkForUpdates')}
              </button>
            </div>
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
  );
}
