import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Square, Clock, Car, ParkingCircle, Camera, 
  Thermometer, UserX, Menu, CalendarDays, FileText, 
  BarChart3, Receipt, Settings, LogOut, AlertTriangle, Shield, Target, BookOpen
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useWorkBank } from '@/hooks/useWorkBank';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTranslation } from '@/lib/i18n';
import { StatusCard } from './StatusCard';
import { HeaderClock } from './HeaderClock';
import { ActionButton } from './ActionButton';
import { AddProjectHoursDialog } from './AddProjectHoursDialog';
import { AbsenceReasonDialog } from './AbsenceReasonDialog';
import { AddExpenseDialog } from './AddExpenseDialog';
import { supabase } from '@/integrations/supabase/client';
import { useUserId } from '@/contexts/AuthContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';



export function Dashboard() {
  const userId = useUserId();
  const { signOut } = useAuthContext();
  const { activeEntry, todayCompleted, todayEntries, loading, startWork, stopWork } = useTimeTracking();
  const { balance: bankBalance } = useWorkBank();
  const { data: currentUser } = useCurrentUser();
  const { t } = useTranslation();
  useOfflineSync();
  
  const navigate = useNavigate();
  const [showProjectHours, setShowProjectHours] = useState(false);
  const [expenseMode, setExpenseMode] = useState<'kilometers' | 'parking' | 'receipt' | null>(null);
  const [showAbsenceDialog, setShowAbsenceDialog] = useState(false);
  const [showSickConfirm, setShowSickConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const markAbsence = async (type: 'sick' | 'absence') => {
    // If clocked in, stop work first and record sick/absence for rest of day
    if (activeEntry && type === 'sick') {
      await stopWork();
    }

    const { error } = await supabase.from('absences').insert({
      user_id: userId,
      type,
    });
    if (error) {
      toast.error(t('dashboard.failedToRecord'));
      return;
    }
    toast.success(type === 'sick' ? t('dashboard.sickDayRecorded') : t('dashboard.absenceRecorded'));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/favicon.png" alt="Logo" className="h-9 w-9 shrink-0 dark:hidden" />
          <img src="/favicon-white.png" alt="Logo" className="h-9 w-9 shrink-0 hidden dark:block" />
          <div className="min-w-0">
            {(() => {
              const parts = (currentUser?.name ?? '').split(' ');
              const firstName = parts[0] || '';
              const lastName = parts.slice(1).join(' ') || '';
              return (
                <>
                  <p className="text-sm font-display font-bold leading-tight truncate">{firstName}</p>
                  {lastName && <p className="text-xs text-muted-foreground leading-tight truncate">{lastName}</p>}
                </>
              );
            })()}
          </div>
        </div>
        <HeaderClock />

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="touch-target flex items-center justify-center rounded-lg hover:bg-muted p-2">
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle className="font-display">{t('menu.title')}</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 space-y-1">
              {[
                { icon: Target, label: t('menu.weeklyGoals'), path: '/weekly-goals' },
                { icon: FileText, label: t('menu.myEntries'), path: '/my-entries' },
                { icon: BarChart3, label: t('menu.myStatistics'), path: '/my-statistics' },
                { icon: Receipt, label: t('menu.travelExpenses'), path: '/travel-expenses' },
                { icon: CalendarDays, label: t('menu.vacationRequests'), path: '/vacation-requests' },
                { icon: AlertTriangle, label: t('menu.longSickLeave'), path: '/long-sick-leave' },
                { icon: Settings, label: t('menu.settings'), path: '/settings' },
                { icon: BookOpen, label: t('menu.userGuide'), path: '/ohje' },
                ...(isAdminOrManager ? [{ icon: Shield, label: t('menu.adminPanel'), path: '/admin' }] : []),
                { icon: LogOut, label: t('menu.logout'), path: null },
              ].map(({ icon: Icon, label, path }) => (
                <button
                  key={label}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted touch-target"
                  onClick={async () => {
                    setMenuOpen(false);
                    if (path) {
                      navigate(path);
                    } else {
                      await signOut();
                      navigate('/login');
                    }
                  }}
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  {label}
                </button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-4 space-y-5 max-w-lg mx-auto w-full">
        {/* Status */}
        <StatusCard activeEntry={activeEntry} loading={loading} bankBalance={bankBalance} todayCompleted={todayCompleted} todayEntries={todayEntries} />

        {/* Clock Actions */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('dashboard.clock')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              icon={Play}
              label={t('dashboard.startWork')}
              onClick={startWork}
              variant="success"
              disabled={!!activeEntry || loading}
            />
            <ActionButton
              icon={Square}
              label={t('dashboard.stopWork')}
              onClick={stopWork}
              variant="destructive"
              disabled={!activeEntry || loading}
            />
          </div>
        </section>

        {/* Project Hours */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('dashboard.projectHours')}</h2>
          <div className="grid grid-cols-1 gap-3">
            <ActionButton
              icon={Clock}
              label={t('dashboard.addProjectHours')}
              onClick={() => setShowProjectHours(true)}
              variant="default"
            />
          </div>
        </section>

        {/* Expenses */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('dashboard.expenses')}</h2>
          <div className="grid grid-cols-3 gap-3">
            <ActionButton
              icon={Car}
              label={t('dashboard.kilometers')}
              onClick={() => setExpenseMode('kilometers')}
              variant="warning"
            />
            <ActionButton
              icon={ParkingCircle}
              label={t('dashboard.parking')}
              onClick={() => setExpenseMode('parking')}
              variant="warning"
            />
            <ActionButton
              icon={Camera}
              label={t('dashboard.receipt')}
              onClick={() => setExpenseMode('receipt')}
              variant="warning"
            />
          </div>
        </section>

        {/* Absence */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('dashboard.absence')}</h2>
          <div className="grid grid-cols-2 gap-3">
             <ActionButton
              icon={Thermometer}
              label={t('dashboard.sickToday')}
              onClick={() => setShowSickConfirm(true)}
              variant="secondary"
            />
            <ActionButton
              icon={UserX}
              label={t('dashboard.absentToday')}
              onClick={() => setShowAbsenceDialog(true)}
              variant="secondary"
            />
          </div>
        </section>
      </main>




      {/* Dialogs */}
      <AddProjectHoursDialog open={showProjectHours} onOpenChange={setShowProjectHours} />
      {expenseMode && (
        <AddExpenseDialog
          open={!!expenseMode}
          onOpenChange={(open) => { if (!open) setExpenseMode(null); }}
          mode={expenseMode}
        />
      )}
      <AbsenceReasonDialog open={showAbsenceDialog} onOpenChange={setShowAbsenceDialog} />

      {/* Sick confirmation dialog */}
      <AlertDialog open={showSickConfirm} onOpenChange={setShowSickConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.sickConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('dashboard.sickConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-warning/20 text-warning hover:bg-warning/30 border-warning/30">
              {t('dashboard.sickConfirmNo')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-success text-success-foreground hover:bg-success/90"
              onClick={() => markAbsence('sick')}
            >
              {t('dashboard.sickConfirmYes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
