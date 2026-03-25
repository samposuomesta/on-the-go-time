import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserId, useCompanyId } from '@/contexts/AuthContext';
import { useTranslation, getLocalizedField } from '@/lib/i18n';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fi, enUS } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserX } from 'lucide-react';

interface AbsenceReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DialogStep = 'select' | 'explain' | 'confirm';

export function AbsenceReasonDialog({ open, onOpenChange }: AbsenceReasonDialogProps) {
  const userId = useUserId();
  const companyId = useCompanyId();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<DialogStep>('select');
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [selectedReasonLabel, setSelectedReasonLabel] = useState('');
  const [explanation, setExplanation] = useState('');
  const { language, t } = useTranslation();

  const locale = language === 'fi' ? fi : enUS;
  const todayFormatted = format(new Date(), 'd.M.yyyy (EEEE)', { locale });

  const { data: reasons } = useQuery({
    queryKey: ['absence-reasons', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absence_reasons')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('label');
      if (error) throw error;
      return data;
    },
  });

  const resetState = () => {
    setStep('select');
    setSelectedReasonId(null);
    setSelectedReasonLabel('');
    setExplanation('');
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const selectReason = (reasonId: string, label: string) => {
    setSelectedReasonId(reasonId);
    setSelectedReasonLabel(label);
    setStep('confirm');
  };

  const selectOther = () => {
    setSelectedReasonId(null);
    setStep('explain');
  };

  const confirmExplanation = () => {
    setSelectedReasonLabel(explanation.trim());
    setStep('confirm');
  };

  const submit = async () => {
    setSubmitting(true);
    const { error } = await supabase.from('absences').insert({
      user_id: userId,
      type: 'absence' as const,
      reason_id: selectedReasonId,
    });
    setSubmitting(false);
    if (error) {
      toast.error(t('absenceReasons.failedToRecord'));
      return;
    }
    toast.success(t('absenceReasons.absenceRecorded'));
    resetState();
    onOpenChange(false);
  };

  const activeReasons = reasons ?? [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <UserX className="h-5 w-5 text-muted-foreground" />
            {step === 'confirm'
              ? t('absenceReasons.confirmTitle')
              : t('absenceReasons.selectReason')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {step === 'select' && (
            <>
              {activeReasons.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">{t('absenceReasons.noCustomReasons')}</p>
                  <Button className="w-full" onClick={selectOther}>
                    {t('absenceReasons.markAbsent')}
                  </Button>
                </div>
              ) : (
                <>
                  {activeReasons.map((reason: any) => (
                    <Button
                      key={reason.id}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => selectReason(reason.id, getLocalizedField(reason, 'label', language))}
                    >
                      {getLocalizedField(reason, 'label', language)}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={selectOther}
                  >
                    {t('absenceReasons.otherReason')}
                  </Button>
                </>
              )}
            </>
          )}

          {step === 'explain' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('absenceReasons.explainAbsence')}</p>
              <Textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder={t('absenceReasons.explanationPlaceholder')}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => setStep('select')}
                >
                  {t('absenceReasons.goBack')}
                </Button>
                <Button
                  className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                  onClick={confirmExplanation}
                  disabled={!explanation.trim()}
                >
                  OK
                </Button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('absenceReasons.date')}:</span>{' '}
                  <span className="font-medium">{todayFormatted}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('absenceReasons.reasonLabel')}:</span>{' '}
                  <span className="font-medium">{selectedReasonLabel}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => { resetState(); }}
                  disabled={submitting}
                >
                  {t('absenceReasons.cancel')}
                </Button>
                <Button
                  className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                  onClick={submit}
                  disabled={submitting}
                >
                  OK
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
