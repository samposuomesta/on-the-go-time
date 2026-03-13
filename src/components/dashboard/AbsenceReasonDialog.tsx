import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID, DEMO_COMPANY_ID } from '@/lib/demo-user';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserX } from 'lucide-react';

interface AbsenceReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AbsenceReasonDialog({ open, onOpenChange }: AbsenceReasonDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const { data: reasons } = useQuery({
    queryKey: ['absence-reasons', DEMO_COMPANY_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absence_reasons')
        .select('*')
        .eq('company_id', DEMO_COMPANY_ID)
        .eq('active', true)
        .order('label');
      if (error) throw error;
      return data;
    },
  });

  const submit = async (reasonId: string | null) => {
    setSubmitting(true);
    const { error } = await supabase.from('absences').insert({
      user_id: DEMO_USER_ID,
      type: 'absence' as const,
      reason_id: reasonId,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Failed to record absence');
      return;
    }
    toast.success('Absence recorded');
    onOpenChange(false);
  };

  const activeReasons = reasons ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <UserX className="h-5 w-5 text-muted-foreground" />
            Select Absence Reason
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {activeReasons.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">No custom reasons configured.</p>
              <Button
                className="w-full"
                disabled={submitting}
                onClick={() => submit(null)}
              >
                Mark Absent Today
              </Button>
            </div>
          ) : (
            <>
              {activeReasons.map((reason: any) => (
                <Button
                  key={reason.id}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3"
                  disabled={submitting}
                  onClick={() => submit(reason.id)}
                >
                  {reason.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                disabled={submitting}
                onClick={() => submit(null)}
              >
                Other / No specific reason
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
