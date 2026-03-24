import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export function UpdatePrompt() {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();
  const { t } = useTranslation();

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-lg">
        <RefreshCw className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{t('update.available')}</p>
          <p className="text-xs text-muted-foreground">{t('update.description')}</p>
        </div>
        <Button size="sm" onClick={applyUpdate}>
          {t('update.action')}
        </Button>
      </div>
    </div>
  );
}
