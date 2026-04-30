import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const REMINDER_TYPES = [
  { value: 'clock_in', labelKey: 'reminders.clockIn' as const },
  { value: 'clock_out', labelKey: 'reminders.clockOut' as const },
  { value: 'vacation_approval', labelKey: 'reminders.vacationApproval' as const },
  { value: 'manager_approval', labelKey: 'reminders.managerApproval' as const },
  { value: 'hours_approval', labelKey: 'reminders.hoursApproval' as const },
];

const DEFAULT_MESSAGES: Record<string, string> = {
  clock_in: "Don't forget to start your workday!",
  clock_out: 'Still working? Remember to clock out.',
  vacation_approval: 'You have vacation requests to review.',
  manager_approval: 'You have pending approvals.',
  hours_approval: 'Please review and approve employee working hours for last month.',
};

function AddReminderDialog({ onCreate }: { onCreate: (data: { type: string; time: string; message: string; message_fi?: string; day_of_month?: number; resend_after_days?: number }) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('clock_in');
  const [time, setTime] = useState('08:30');
  const [message, setMessage] = useState('');
  const [messageFi, setMessageFi] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [resendAfterDays, setResendAfterDays] = useState('3');

  const isMonthly = type === 'hours_approval';

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setType('clock_in'); setTime('08:30'); setMessage(''); setMessageFi(''); setDayOfMonth('1'); setResendAfterDays('3'); } }}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> {t('reminders.add')}</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">{t('reminders.add')}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>{t('reminders.type')}</Label>
            <Select value={type} onValueChange={(v) => { setType(v); setMessage(DEFAULT_MESSAGES[v] || ''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REMINDER_TYPES.map(rt => <SelectItem key={rt.value} value={rt.value}>{t(rt.labelKey)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isMonthly ? (
            <>
              <div className="space-y-1.5">
                <Label>{t('reminders.dayOfMonth')}</Label>
                <Input type="number" min="1" max="28" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('reminders.resendAfterDays')}</Label>
                <p className="text-xs text-muted-foreground">{t('reminders.resendAfterDaysHelp')}</p>
                <Input type="number" min="1" max="14" value={resendAfterDays} onChange={(e) => setResendAfterDays(e.target.value)} />
              </div>
            </>
          ) : (
            <div className="space-y-1.5"><Label>{t('reminders.time')}</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          )}
          <div className="space-y-1.5"><Label>{t('reminders.messageEn')}</Label><Input value={message || DEFAULT_MESSAGES[type]} onChange={(e) => setMessage(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('reminders.messageFi')}</Label><Input value={messageFi} onChange={(e) => setMessageFi(e.target.value)} placeholder="Viesti suomeksi" /></div>
          <Button className="w-full" onClick={() => {
            onCreate({
              type, time: isMonthly ? '09:00' : time,
              message: message || DEFAULT_MESSAGES[type],
              message_fi: messageFi.trim() || undefined,
              ...(isMonthly ? { day_of_month: parseInt(dayOfMonth) || 1, resend_after_days: parseInt(resendAfterDays) || 3 } : {}),
            });
            setOpen(false); setType('clock_in'); setTime('08:30'); setMessage(''); setMessageFi(''); setDayOfMonth('1'); setResendAfterDays('3');
          }}>{t('reminders.add')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditReminderDialog({ reminder, onSave }: { reminder: any; onSave: (data: { type?: string; time?: string; message?: string; message_fi?: string | null; day_of_month?: number | null; resend_after_days?: number | null }) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(reminder.type);
  const [time, setTime] = useState(reminder.time);
  const [message, setMessage] = useState(reminder.message);
  const [messageFi, setMessageFi] = useState(reminder.message_fi || '');
  const [dayOfMonth, setDayOfMonth] = useState(String(reminder.day_of_month ?? 1));
  const [resendAfterDays, setResendAfterDays] = useState(String(reminder.resend_after_days ?? 3));

  const isMonthly = type === 'hours_approval';

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setType(reminder.type); setTime(reminder.time); setMessage(reminder.message); setMessageFi(reminder.message_fi || ''); setDayOfMonth(String(reminder.day_of_month ?? 1)); setResendAfterDays(String(reminder.resend_after_days ?? 3)); } }}>
      <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">{t('reminders.edit')}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>{t('reminders.type')}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REMINDER_TYPES.map(rt => <SelectItem key={rt.value} value={rt.value}>{t(rt.labelKey)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isMonthly ? (
            <>
              <div className="space-y-1.5">
                <Label>{t('reminders.dayOfMonth')}</Label>
                <Input type="number" min="1" max="28" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('reminders.resendAfterDays')}</Label>
                <p className="text-xs text-muted-foreground">{t('reminders.resendAfterDaysHelp')}</p>
                <Input type="number" min="1" max="14" value={resendAfterDays} onChange={(e) => setResendAfterDays(e.target.value)} />
              </div>
            </>
          ) : (
            <div className="space-y-1.5"><Label>{t('reminders.time')}</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          )}
          <div className="space-y-1.5"><Label>{t('reminders.messageEn')}</Label><Input value={message} onChange={(e) => setMessage(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('reminders.messageFi')}</Label><Input value={messageFi} onChange={(e) => setMessageFi(e.target.value)} placeholder="Viesti suomeksi" /></div>
          <Button className="w-full" onClick={() => {
            onSave({
              type, time: isMonthly ? '09:00' : time, message,
              message_fi: messageFi.trim() || null,
              day_of_month: isMonthly ? (parseInt(dayOfMonth) || 1) : null,
              resend_after_days: isMonthly ? (parseInt(resendAfterDays) || 3) : null,
            });
            setOpen(false);
          }}>{t('common.save')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RemindersPanel({ admin }: { admin: any }) {
  const { t } = useTranslation();
  const reminders = admin.reminderRules.data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">{t('reminders.title')}</h2>
          <p className="text-sm text-muted-foreground">{reminders.length} {t('reminders.title').toLowerCase()}</p>
        </div>
        <AddReminderDialog onCreate={(data) => { admin.createReminder.mutate(data); toast.success(t('common.added')); }} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">{t('reminders.type')}</TableHead>
                  <TableHead className="font-semibold">{t('reminders.time')}</TableHead>
                  <TableHead className="font-semibold">{t('reminders.message')}</TableHead>
                  <TableHead className="font-semibold">{t('reminders.messageFi')}</TableHead>
                  <TableHead className="font-semibold">{t('reminders.enabled')}</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">{t('reminders.noReminders')}</TableCell></TableRow>
                ) : reminders.map((r: any) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium capitalize">
                      {r.type === 'hours_approval' ? t('reminders.hoursApproval') : r.type.replace('_', ' ')}
                      {r.day_of_month && <span className="text-xs text-muted-foreground ml-1">({t('reminders.dayOfMonth')}: {r.day_of_month}, {t('reminders.resendAfterDays')}: {r.resend_after_days ?? '—'})</span>}
                    </TableCell>
                    <TableCell className="font-mono">{r.time}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.message}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.message_fi || '—'}</TableCell>
                    <TableCell><Switch checked={r.enabled} onCheckedChange={(enabled) => admin.toggleReminder.mutate({ id: r.id, enabled })} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <EditReminderDialog reminder={r} onSave={(data) => { admin.updateReminder.mutate({ id: r.id, ...data }); toast.success(t('common.updated')); }} />
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8"
                          onClick={() => { admin.deleteReminder.mutate(r.id); toast.success(t('common.deleted')); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
