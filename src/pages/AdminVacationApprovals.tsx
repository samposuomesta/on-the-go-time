import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, CalendarDays, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTranslation } from '@/lib/i18n';
import { useDateLocale } from '@/lib/date-locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AdminVacationApprovals() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const isManager = currentUser?.role === 'manager';
  const currentUserId = currentUser?.id;

  const { data: userManagers = [] } = useQuery({
    queryKey: ['vacation-user-managers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_managers' as any).select('*');
      if (error) throw error;
      return data as any[];
    },
  });

  const managedUserIds = useMemo(() => {
    if (!isManager || !currentUserId) return null;
    return userManagers
      .filter((um: any) => um.manager_id === currentUserId)
      .map((um: any) => um.user_id);
  }, [isManager, currentUserId, userManagers]);

  const canSeeUser = (userId: string) => {
    if (!managedUserIds) return true; // admin sees all
    return managedUserIds.includes(userId);
  };

  const { data: allRequests = [] } = useQuery({
    queryKey: ['admin-vacation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacation_requests')
        .select('*, users(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const requests = allRequests.filter((r: any) => canSeeUser(r.user_id));

  const approveVacation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('vacation_requests').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vacation'] });
      toast.success('Updated');
    },
  });

  const pending = requests.filter((r: any) => r.status === 'pending');
  const handled = requests.filter((r: any) => r.status !== 'pending');

  const statusBadge = (status: string) => {
    const config: Record<string, { className: string }> = {
      pending: { className: 'bg-warning/15 text-warning border-warning/30' },
      approved: { className: 'bg-success/15 text-success border-success/30' },
      rejected: { className: 'bg-destructive/15 text-destructive border-destructive/30' },
    };
    return (
      <Badge variant="outline" className={cn("capitalize", config[status]?.className)}>
        {t(`admin.${status}` as any)}
      </Badge>
    );
  };

  // Block employees
  if (!userLoading && currentUser && currentUser.role === 'employee') {
    return <Navigate to="/" replace />;
  }

  if (userLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 lg:px-6 py-3 flex items-center gap-3">
        <Link to="/admin" className="flex items-center justify-center rounded-lg hover:bg-muted p-2 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg lg:text-xl font-display font-bold">{t('admin.vacationApprovals')}</h1>
          <p className="text-xs lg:text-sm text-muted-foreground">{t('admin.reviewManageVacation')}</p>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base lg:text-lg font-display flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              {t('admin.pendingRequests')}
              <Badge variant="secondary" className="ml-auto">{pending.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.employee')}</TableHead>
                    <TableHead>{t('admin.startDate')}</TableHead>
                    <TableHead>{t('admin.endDate')}</TableHead>
                    <TableHead>{t('admin.comment')}</TableHead>
                    <TableHead>{t('admin.submitted')}</TableHead>
                    <TableHead className="text-right">{t('admin.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {t('admin.noPendingVacation')}
                      </TableCell>
                    </TableRow>
                  ) : pending.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.users?.name ?? 'Unknown'}</TableCell>
                      <TableCell>{format(parseISO(r.start_date), 'd.M.yyyy')}</TableCell>
                      <TableCell>{format(parseISO(r.end_date), 'd.M.yyyy')}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.comment || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(r.created_at), 'd.M.')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-success hover:text-success border-success/30 hover:bg-success/10"
                            disabled={approveVacation.isPending}
                            onClick={() => approveVacation.mutate({ id: r.id, status: 'approved' })}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                            disabled={approveVacation.isPending}
                            onClick={() => approveVacation.mutate({ id: r.id, status: 'rejected' })}
                          >
                            <XCircle className="h-4 w-4" /> Reject
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base lg:text-lg font-display flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              History
              <Badge variant="secondary" className="ml-auto">{handled.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {handled.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No history yet
                      </TableCell>
                    </TableRow>
                  ) : handled.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.users?.name ?? 'Unknown'}</TableCell>
                      <TableCell>{format(parseISO(r.start_date), 'd.M.yyyy')}</TableCell>
                      <TableCell>{format(parseISO(r.end_date), 'd.M.yyyy')}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.comment || '—'}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
