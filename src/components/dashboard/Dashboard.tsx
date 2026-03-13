import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Square, Clock, Car, ParkingCircle, Camera, 
  Thermometer, UserX, Menu, CalendarDays, FileText, 
  BarChart3, Receipt, Settings, LogOut, AlertTriangle, Shield
} from 'lucide-react';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { StatusCard } from './StatusCard';
import { ActionButton } from './ActionButton';
import { AddProjectHoursDialog } from './AddProjectHoursDialog';
import { AddExpenseDialog } from './AddExpenseDialog';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID } from '@/lib/demo-user';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const APP_VERSION = '0.1.0';

export function Dashboard() {
  const { activeEntry, loading, startWork, stopWork } = useTimeTracking();
  const navigate = useNavigate();
  const [showProjectHours, setShowProjectHours] = useState(false);
  const [expenseMode, setExpenseMode] = useState<'kilometers' | 'parking' | 'receipt' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const markAbsence = async (type: 'sick' | 'absence') => {
    const { error } = await supabase.from('absences').insert({
      user_id: DEMO_USER_ID,
      type,
    });
    if (error) {
      toast.error('Failed to record');
      return;
    }
    toast.success(type === 'sick' ? 'Sick day recorded' : 'Absence recorded');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-bold">TimeTrack</h1>
          <p className="text-xs text-muted-foreground">John Employee</p>
        </div>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="touch-target flex items-center justify-center rounded-lg hover:bg-muted p-2">
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle className="font-display">Menu</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 space-y-1">
              {[
                { icon: CalendarDays, label: 'Vacation Requests', path: '/vacation-requests' },
                { icon: AlertTriangle, label: 'Long Sick Leave', path: null },
                { icon: FileText, label: 'My Entries', path: '/my-entries' },
                { icon: BarChart3, label: 'My Statistics', path: null },
                { icon: Receipt, label: 'Travel Expenses', path: null },
                { icon: Settings, label: 'Settings', path: null },
                { icon: LogOut, label: 'Logout', path: null },
              ].map(({ icon: Icon, label, path }) => (
                <button
                  key={label}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted touch-target"
                  onClick={() => {
                    setMenuOpen(false);
                    if (path) {
                      navigate(path);
                    } else {
                      toast.info(`${label} — coming soon`);
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
        <StatusCard activeEntry={activeEntry} loading={loading} bankBalance={0} />

        {/* Clock Actions */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Clock</h2>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              icon={Play}
              label="Start Work"
              onClick={startWork}
              variant="success"
              disabled={!!activeEntry || loading}
            />
            <ActionButton
              icon={Square}
              label="Stop Work"
              onClick={stopWork}
              variant="destructive"
              disabled={!activeEntry || loading}
            />
          </div>
        </section>

        {/* Project Hours */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Project Hours</h2>
          <div className="grid grid-cols-1 gap-3">
            <ActionButton
              icon={Clock}
              label="Add Project Hours"
              onClick={() => setShowProjectHours(true)}
              variant="default"
            />
          </div>
        </section>

        {/* Expenses */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Expenses</h2>
          <div className="grid grid-cols-3 gap-3">
            <ActionButton
              icon={Car}
              label="Kilometers"
              onClick={() => setExpenseMode('kilometers')}
              variant="warning"
            />
            <ActionButton
              icon={ParkingCircle}
              label="Parking"
              onClick={() => setExpenseMode('parking')}
              variant="warning"
            />
            <ActionButton
              icon={Camera}
              label="Receipt"
              onClick={() => setExpenseMode('receipt')}
              variant="warning"
            />
          </div>
        </section>

        {/* Absence */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Absence</h2>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              icon={Thermometer}
              label="Sick Today"
              onClick={() => markAbsence('sick')}
              variant="secondary"
            />
            <ActionButton
              icon={UserX}
              label="Absent Today"
              onClick={() => markAbsence('absence')}
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
    </div>
  );
}
