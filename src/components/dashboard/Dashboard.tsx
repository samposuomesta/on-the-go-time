import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Square, Clock, Car, ParkingCircle, Camera, 
  Thermometer, UserX, Menu, CalendarDays, FileText, 
  BarChart3, Receipt, Settings, LogOut, AlertTriangle, Shield, CalendarCheck
} from 'lucide-react';
import { useTimeTracking, OverlapEntry } from '@/hooks/useTimeTracking';
import { useWorkBank } from '@/hooks/useWorkBank';
import { useOfflineSync } from '@/hooks/useOfflineSync';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTranslation } from '@/lib/i18n';
import { StatusCard } from './StatusCard';
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

const APP_VERSION = '0.1.0';

export function Dashboard() {
  const userId = useUserId();
  const { signOut } = useAuthContext();
  const { activeEntry, todayCompleted, loading, startWork, stopWork, addFullWorkday } = useTimeTracking();
  const { balance: bankBalance } = useWorkBank();
  const { data: currentUser } = useCurrentUser();
  const { t } = useTranslation();
  useOfflineSync();
  
  const navigate = useNavigate();
  const [showProjectHours, setShowProjectHours] = useState(false);
  const [expenseMode, setExpenseMode] = useState<'kilometers' | 'parking' | 'receipt' | null>(null);
  const [showAbsenceDialog, setShowAbsenceDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [overlapEntries, setOverlapEntries] = useState<OverlapEntry[]>([]);
  const [showOverlapDialog, setShowOverlapDialog] = useState(false);

  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const [overlapSource, setOverlapSource] = useState<'workday' | 'start'>('workday');

  const handleAddFullWorkday = async () => {
    const result = await addFullWorkday();
    if (result?.overlaps) {
      setOverlapEntries(result.overlaps);
      setOverlapSource('workday');
      setShowOverlapDialog(true);
    }
  };

  const handleStartWork = async () => {
    const result = await startWork();
    if (result?.overlaps) {
      setOverlapEntries(result.overlaps);
      setOverlapSource('start');
      setShowOverlapDialog(true);
    }
  };

  const handleReplaceOverlap = async () => {
    setShowOverlapDialog(false);
    const ids = overlapEntries.map(e => e.id);
    if (overlapSource === 'workday') {
      await addFullWorkday(ids);
    } else {
      await startWork(ids);
    }
    setOverlapEntries([]);
  };

  const markAbsence = async (type: 'sick' | 'absence') => {
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
        <div className="min-w-0">
          <h1 className="text-lg font-display font-bold">TimeTrack</h1>
          <p className="text-xs text-muted-foreground truncate">{currentUser?.name ?? ''}</p>
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
                { icon: FileText, label: t('menu.myEntries'), path: '/my-entries' },
                { icon: BarChart3, label: t('menu.myStatistics'), path: '/my-statistics' },
                { icon: Receipt, label: t('menu.travelExpenses'), path: '/travel-expenses' },
                { icon: CalendarDays, label: t('menu.vacationRequests'), path: '/vacation-requests' },
                { icon: AlertTriangle, label: t('menu.longSickLeave'), path: '/long-sick-leave' },
                { icon: Settings, label: t('menu.settings'), path: '/settings' },
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
        <StatusCard activeEntry={activeEntry} loading={loading} bankBalance={bankBalance} todayCompleted={todayCompleted} />

        {/* Clock Actions */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('dashboard.clock')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              icon={Play}
              label={t('dashboard.startWork')}
              onClick={handleStartWork}
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

        {/* Project Hours & Work Day */}
        <section>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('dashboard.projectHours')}</h2>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('dashboard.workDay')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              icon={Clock}
              label={t('dashboard.addProjectHours')}
              onClick={() => setShowProjectHours(true)}
              variant="default"
            />
            <ActionButton
              icon={CalendarCheck}
              label={t('dashboard.fullWorkday')}
              onClick={handleAddFullWorkday}
              variant="success"
              disabled={!!activeEntry || loading}
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
              onClick={() => markAbsence('sick')}
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

      {/* Footer */}
      <footer className="border-t border-border px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">
          TimeTrack v{APP_VERSION}
        </p>
      </footer>

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

      <AlertDialog open={showOverlapDialog} onOpenChange={setShowOverlapDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.duplicateTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.duplicateDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setShowOverlapDialog(false); setOverlapEntries([]); }}>
              {t('dashboard.discard')}
            </AlertDialogCancel>
            <AlertDialogAction className="bg-success text-success-foreground hover:bg-success/90" onClick={handleReplaceOverlap}>
              {t('dashboard.replace')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
