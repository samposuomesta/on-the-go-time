import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useDateLocale } from '@/lib/date-locale';
import { ArrowLeft, CalendarIcon, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserId } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function VacationRequests() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [comment, setComment] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const { data: requests = [] } = useQuery({
    queryKey: ['vacation-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacation_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!startDate || !endDate) throw new Error('Select both dates');
      const { error } = await supabase.from('vacation_requests').insert({
        user_id: userId,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        comment: comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-requests'] });
      toast.success(t('vacation.submitted'));
      setDialogOpen(false);
      setStartDate(undefined);
      setEndDate(undefined);
      setComment('');
    },
    onError: () => toast.error(t('vacation.failedToSubmit')),
  });

  const statusConfig: Record<string, { icon: typeof Clock; className: string }> = {
    pending: { icon: Clock, className: 'bg-warning/15 text-warning border-warning/30' },
    approved: { icon: CheckCircle2, className: 'bg-success/15 text-success border-success/30' },
    rejected: { icon: XCircle, className: 'bg-destructive/15 text-destructive border-destructive/30' },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="touch-target flex items-center justify-center rounded-lg hover:bg-muted p-2 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-display font-bold">{t('vacation.title')}</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t('common.new')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">{t('vacation.newRequest')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>{t('vacation.startDate')}</Label>
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {startDate ? format(startDate, 'PPP', { locale: dateLocale }) : t('vacation.pickStartDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => { setStartDate(d); setStartOpen(false); }}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      locale={dateLocale}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label>{t('vacation.endDate')}</Label>
                <Popover open={endOpen} onOpenChange={setEndOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {endDate ? format(endDate, 'PPP', { locale: dateLocale }) : t('vacation.pickEndDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(d) => { setEndDate(d); setEndOpen(false); }}
                      disabled={(d) => d < (startDate || new Date(new Date().setHours(0, 0, 0, 0)))}
                      locale={dateLocale}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label>{t('vacation.comment')}</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('vacation.commentPlaceholder')}
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                disabled={!startDate || !endDate || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? t('vacation.submitting') : t('vacation.submitRequest')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-2">
        {requests.length === 0 ? (
          <div className="text-center py-16">
            <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">{t('vacation.noRequests')}</p>
          </div>
        ) : (
          requests.map((r) => {
            const cfg = statusConfig[r.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            return (
              <div key={r.id} className="bg-card rounded-lg border border-border p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">
                      {format(parseISO(r.start_date), 'MMM d')} — {format(parseISO(r.end_date), 'MMM d, yyyy')}
                    </p>
                    {r.comment && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.comment}</p>
                    )}
                  </div>
                  <Badge variant="outline" className={cn("text-xs gap-1 capitalize", cfg.className)}>
                    <StatusIcon className="h-3 w-3" />
                    {t(`common.${r.status}` as any)}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
