import React, { useState, useMemo } from 'react';
import { format, parseISO, differenceInBusinessDays, differenceInHours, differenceInMinutes, eachDayOfInterval, isWeekend, startOfYear, subMonths, startOfMonth, endOfMonth, isWithinInterval, isAfter, isBefore } from 'date-fns';
import {
  ArrowLeft, Users, Briefcase, Car, Clock, CalendarOff,
  CalendarDays, Plus, Pencil, MapPin, Bell, Building2, Trash2, CheckCircle2, XCircle, X, BarChart3, CalendarIcon, FileText, Download, Upload
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAdminData } from '@/hooks/useAdminData';
import { exportAdminWorkingHoursCSV, exportAdminTravelExpensesCSV, exportAdminProjectHoursCSV, exportAuditTrailCSV, exportProjectManagementCSV } from '@/lib/csv-export';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTranslation, getLocalizedField } from '@/lib/i18n';
import { VacationTimeline } from '@/components/admin/VacationTimeline';
import { getFinnishHolidaySet } from '@/lib/finnish-holidays';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

const navItemDefs = [
  { key: 'statistics', labelKey: 'admin.statistics', icon: BarChart3, descKey: 'admin.statisticsDesc' },
  { key: 'approvals', labelKey: 'admin.approvals', icon: Clock, descKey: 'admin.approvalsDesc' },
  { key: 'vacation-approvals', labelKey: 'admin.vacationApprovals', icon: CalendarDays, descKey: 'admin.vacationApprovalsDesc' },
  { key: 'absences', labelKey: 'admin.absences', icon: CalendarOff, descKey: 'admin.absencesDesc' },
  { key: 'projects', labelKey: 'admin.projects', icon: Briefcase, descKey: 'admin.projectsDesc' },
  { key: 'project-management', labelKey: 'admin.projectManagement', icon: BarChart3, descKey: 'admin.projectManagementDesc' },
  { key: 'workplaces', labelKey: 'admin.workplaces', icon: MapPin, descKey: 'admin.workplacesDesc' },
  { key: 'reminders', labelKey: 'admin.reminders', icon: Bell, descKey: 'admin.remindersDesc' },
  { key: 'employees', labelKey: 'admin.employees', icon: Users, descKey: 'admin.employeesDesc' },
  { key: 'companies', labelKey: 'admin.companies', icon: Building2, descKey: 'admin.companiesDesc' },
  { key: 'audit', labelKey: 'admin.audit', icon: FileText, descKey: 'admin.auditDesc' },
] as const;

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    pending: 'bg-warning/15 text-warning border-warning/30',
    approved: 'bg-success/15 text-success border-success/30',
    rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  };
  return <Badge variant="outline" className={cn("capitalize text-xs", config[status])}>{status}</Badge>;
}

function ApproveRejectButtons({ id, onApprove, isPending }: {
  id: string;
  onApprove: (id: string, status: 'approved' | 'rejected') => void;
  isPending?: boolean;
}) {
  return (
    <div className="flex gap-1.5">
      <Button size="sm" variant="outline"
        className="gap-1 text-xs h-8 text-success hover:text-success border-success/30 hover:bg-success/10"
        disabled={isPending}
        onClick={() => { onApprove(id, 'approved'); toast.success('Approved'); }}>
        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
      </Button>
      <Button size="sm" variant="outline"
        className="gap-1 text-xs h-8 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
        disabled={isPending}
        onClick={() => { onApprove(id, 'rejected'); toast.success('Rejected'); }}>
        <XCircle className="h-3.5 w-3.5" /> Reject
      </Button>
    </div>
  );
}

function SickLeaveApproveButtons({ id, onApprove, isPending }: {
  id: string;
  onApprove: (id: string, status: 'approved' | 'rejected') => void;
  isPending?: boolean;
}) {
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  return (
    <>
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline"
          className="gap-1 text-xs h-8 text-success hover:text-success border-success/30 hover:bg-success/10"
          disabled={isPending}
          onClick={() => setCertDialogOpen(true)}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
        </Button>
        <Button size="sm" variant="outline"
          className="gap-1 text-xs h-8 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
          disabled={isPending}
          onClick={() => setRejectDialogOpen(true)}>
          <XCircle className="h-3.5 w-3.5" /> Reject
        </Button>
      </div>
      <AlertDialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sick Leave Certificate</AlertDialogTitle>
            <AlertDialogDescription>
              Have you seen the sick leave certificate for this request?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => setCertDialogOpen(false)}>No</AlertDialogCancel>
            <AlertDialogAction className="bg-success text-success-foreground hover:bg-success/90" onClick={() => { onApprove(id, 'approved'); setCertDialogOpen(false); toast.success('Approved'); }}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Sick Leave</AlertDialogTitle>
            <AlertDialogDescription>
              If rejected, these will be marked as unpaid leave for the user. Mark this as unpaid leave for user?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => setRejectDialogOpen(false)}>No</AlertDialogCancel>
            <AlertDialogAction className="bg-success text-success-foreground hover:bg-success/90" onClick={() => { onApprove(id, 'rejected'); setRejectDialogOpen(false); toast.success('Rejected — marked as unpaid leave'); }}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function AdminDashboard() {
  const admin = useAdminData();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('statistics');

  const isManager = currentUser?.role === 'manager';
  const currentUserId = currentUser?.id;

  // For managers: get list of employee IDs they manage
  const managedUserIds = useMemo(() => {
    if (!isManager || !currentUserId) return null; // null = no filter (admin sees all)
    const userManagers = admin.userManagers.data ?? [];
    return userManagers
      .filter((um: any) => um.manager_id === currentUserId)
      .map((um: any) => um.user_id);
  }, [isManager, currentUserId, admin.userManagers.data]);

  // Filter helper: returns true if userId should be visible
  const canSeeUser = (userId: string) => {
    if (!managedUserIds) return true; // admin sees all
    return managedUserIds.includes(userId);
  };

  // Block employees from accessing admin panel
  if (!userLoading && currentUser && currentUser.role === 'employee') {
    return <Navigate to="/" replace />;
  }

  const pendingCounts = {
    approvals: (admin.pendingTravel.data?.filter((t: any) => canSeeUser(t.user_id)).length ?? 0) 
      + (admin.pendingHours.data?.filter((h: any) => canSeeUser(h.user_id)).length ?? 0) 
      + (admin.pendingTimeEntries.data?.filter((te: any) => canSeeUser(te.user_id)).length ?? 0),
    'vacation-approvals': admin.vacationRequests.data?.filter((v: any) => v.status === 'pending' && canSeeUser(v.user_id)).length ?? 0,
    absences: admin.absences.data?.filter((a: any) => a.status === 'pending' && canSeeUser(a.user_id)).length ?? 0,
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 lg:px-6 h-14 flex items-center gap-3">
        <Link to="/" className="flex items-center justify-center rounded-lg hover:bg-muted p-2 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-base lg:text-lg font-display font-bold">{t('admin.title')}</h1>
      </header>

      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-60 lg:w-72 border-r border-border bg-card shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <nav className="p-2 space-y-0.5">
            {navItemDefs.map((item) => {
              const count = (pendingCounts as any)[item.key] ?? 0;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left group",
                    activeTab === item.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium block">{t(item.labelKey as any)}</span>
                    <span className={cn(
                      "text-[11px] block truncate",
                      activeTab === item.key ? "text-primary-foreground/70" : "text-muted-foreground/70"
                    )}>{t(item.descKey as any)}</span>
                  </div>
                  {count > 0 && (
                    <Badge variant={activeTab === item.key ? "secondary" : "default"} className="text-[10px] h-5 px-1.5 shrink-0">
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile tab bar */}
        <div className="md:hidden w-full">
          <div className="flex overflow-x-auto border-b border-border bg-card px-2 gap-0.5">
            {navItemDefs.map((item) => {
              const count = (pendingCounts as any)[item.key] ?? 0;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
                    activeTab === item.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {t(item.labelKey as any)}
                  {count > 0 && <Badge variant="default" className="text-[10px] h-4 px-1 ml-0.5">{count}</Badge>}
                </button>
              );
            })}
          </div>
          <main className="p-4">
            <AdminContent activeTab={activeTab} admin={admin} canSeeUser={canSeeUser} isManager={isManager} />
          </main>
        </div>

        {/* Desktop content */}
        <main className="hidden md:block flex-1 p-6 lg:p-8 overflow-auto max-w-6xl">
          <AdminContent activeTab={activeTab} admin={admin} canSeeUser={canSeeUser} isManager={isManager} />
        </main>
      </div>
    </div>
  );
}

function AdminContent({ activeTab, admin, canSeeUser, isManager }: { activeTab: string; admin: any; canSeeUser: (id: string) => boolean; isManager: boolean }) {
  switch (activeTab) {
    case 'statistics': return <StatisticsPanel admin={admin} canSeeUser={canSeeUser} />;
    case 'employees': return <EmployeesPanel admin={admin} canSeeUser={canSeeUser} />;
    case 'approvals': return <ApprovalsPanel admin={admin} canSeeUser={canSeeUser} />;
    case 'projects': return <ProjectsPanel admin={admin} />;
    case 'project-management': return <ProjectManagementPanel admin={admin} />;
    case 'absences': return <AbsencesPanel admin={admin} canSeeUser={canSeeUser} />;
    case 'vacation-approvals': return <VacationApprovalsPanel admin={admin} canSeeUser={canSeeUser} />;
    case 'companies': return isManager ? null : <CompaniesPanel admin={admin} />;
    case 'workplaces': return <WorkplacesPanel admin={admin} />;
    case 'reminders': return <RemindersPanel admin={admin} />;
    case 'audit': return isManager ? null : <AuditTrailPanel admin={admin} />;
    default: return null;
  }
}

/* ===== STATISTICS ===== */

function countBusinessDays(startDate: string, endDate: string, holidaySet?: Set<string>): number {
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
  return days.filter(d => {
    if (isWeekend(d)) return false;
    if (holidaySet) {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (holidaySet.has(ds)) return false;
    }
    return true;
  }).length;
}

function useFilteredStats(
  employees: any[], allTimeEntries: any[], allAbsences: any[], allVacationRequests: any[], workBank: any[],
  fromStr: string, toStr: string, holidaySet?: Set<string>
) {
  const timeEntries = useMemo(() => allTimeEntries.filter((te: any) => {
    const d = format(new Date(te.start_time), 'yyyy-MM-dd');
    return d >= fromStr && d <= toStr;
  }), [allTimeEntries, fromStr, toStr]);

  const absences = useMemo(() => allAbsences.filter((a: any) => {
    return a.start_date <= toStr && a.end_date >= fromStr;
  }), [allAbsences, fromStr, toStr]);

  const vacationRequests = useMemo(() => allVacationRequests.filter((v: any) => {
    return v.start_date <= toStr && v.end_date >= fromStr;
  }), [allVacationRequests, fromStr, toStr]);

  const stats = useMemo(() => {
    const perUser: Record<string, {
      name: string; role: string;
      workedHours: number; projectHours: number;
      vacationDaysUsed: number; vacationDaysTotal: number;
      sickDays: number; absenceDays: number;
      bankBalance: number;
    }> = {};

    employees.forEach((emp: any) => {
      perUser[emp.id] = {
        name: emp.name, role: emp.role, workedHours: 0, projectHours: 0,
        vacationDaysUsed: 0, vacationDaysTotal: emp.annual_vacation_days ?? 25,
        sickDays: 0, absenceDays: 0, bankBalance: 0,
      };
    });

    timeEntries.forEach((te: any) => {
      if (!te.end_time || !perUser[te.user_id]) return;
      const mins = differenceInMinutes(new Date(te.end_time), new Date(te.start_time)) - (te.break_minutes ?? 0);
      perUser[te.user_id].workedHours += Math.max(0, mins / 60);
    });

    vacationRequests.forEach((vr: any) => {
      if (vr.status !== 'approved' || !perUser[vr.user_id]) return;
      perUser[vr.user_id].vacationDaysUsed += countBusinessDays(vr.start_date, vr.end_date, holidaySet);
    });

    absences.forEach((ab: any) => {
      if (!perUser[ab.user_id]) return;
      const days = countBusinessDays(ab.start_date, ab.end_date, holidaySet);
      if (ab.type === 'sick') perUser[ab.user_id].sickDays += days;
      else perUser[ab.user_id].absenceDays += days;
    });

    workBank.forEach((wb: any) => {
      if (!perUser[wb.user_id]) return;
      perUser[wb.user_id].bankBalance += Number(wb.hours);
    });

    return perUser;
  }, [employees, timeEntries, absences, vacationRequests, workBank, holidaySet]);

  return stats;
}

function StatisticsDatePicker({ fromDate, toDate, setFromDate, setToDate }: {
  fromDate: Date; toDate: Date; setFromDate: (d: Date) => void; setToDate: (d: Date) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal h-9 text-sm")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(fromDate, 'dd.MM.yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={fromDate} onSelect={(d) => d && setFromDate(d)} initialFocus className="p-3 pointer-events-auto" disabled={(d) => isAfter(d, toDate)} />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">To</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal h-9 text-sm")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(toDate, 'dd.MM.yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="single" selected={toDate} onSelect={(d) => d && setToDate(d)} initialFocus className="p-3 pointer-events-auto" disabled={(d) => isBefore(d, fromDate)} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function StatisticsPanel({ admin, canSeeUser }: { admin: any; canSeeUser: (id: string) => boolean }) {
  const now = new Date();
  const defaultFrom = () => { const d = new Date(now); d.setDate(d.getDate() - 120); return d; };

  const [overviewFrom, setOverviewFrom] = useState<Date>(defaultFrom);
  const [overviewTo, setOverviewTo] = useState<Date>(now);
  const [breakdownFrom, setBreakdownFrom] = useState<Date>(defaultFrom);
  const [breakdownTo, setBreakdownTo] = useState<Date>(now);

  const employees = (admin.employees.data ?? []).filter((e: any) => canSeeUser(e.id));
  const allTimeEntries = (admin.allTimeEntries.data ?? []).filter((te: any) => canSeeUser(te.user_id));
  const allAbsences = (admin.absences.data ?? []).filter((a: any) => canSeeUser(a.user_id));
  const allVacationRequests = (admin.vacationRequests.data ?? []).filter((v: any) => canSeeUser(v.user_id));
  const workBank = (admin.allWorkBank.data ?? []).filter((wb: any) => canSeeUser(wb.user_id));
  const companies = admin.companies.data ?? [];

  const companyCountry = companies[0]?.country;
  const currentYear = new Date().getFullYear();
  const holidaySet = useMemo(() => {
    if (companyCountry === 'Finland') {
      return getFinnishHolidaySet([currentYear - 1, currentYear, currentYear + 1]);
    }
    return undefined;
  }, [companyCountry, currentYear]);

  // Overview stats
  const overviewFromStr = format(overviewFrom, 'yyyy-MM-dd');
  const overviewToStr = format(overviewTo, 'yyyy-MM-dd');
  const overviewStats = useFilteredStats(employees, allTimeEntries, allAbsences, allVacationRequests, workBank, overviewFromStr, overviewToStr, holidaySet);
  const overviewList = Object.values(overviewStats);
  const totalWorkedHours = overviewList.reduce((s, u) => s + u.workedHours, 0);
  const totalVacationDays = overviewList.reduce((s, u) => s + u.vacationDaysUsed, 0);
  const totalSickDays = overviewList.reduce((s, u) => s + u.sickDays, 0);
  const totalAbsenceDays = overviewList.reduce((s, u) => s + u.absenceDays, 0);

  // Breakdown stats (separate date range)
  const breakdownFromStr = format(breakdownFrom, 'yyyy-MM-dd');
  const breakdownToStr = format(breakdownTo, 'yyyy-MM-dd');
  const breakdownStats = useFilteredStats(employees, allTimeEntries, allAbsences, allVacationRequests, workBank, breakdownFromStr, breakdownToStr, holidaySet);
  const breakdownList = Object.values(breakdownStats);
  const managersData = breakdownList.filter((u: any) => u.role === 'manager' || u.role === 'admin');
  const employeesData = breakdownList.filter((u: any) => u.role === 'employee');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold">Statistics Overview</h2>
          <p className="text-sm text-muted-foreground">Company-wide metrics and per-employee breakdown</p>
        </div>
        <StatisticsDatePicker fromDate={overviewFrom} toDate={overviewTo} setFromDate={setOverviewFrom} setToDate={setOverviewTo} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5"><Clock className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{totalWorkedHours.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Total Work Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success/10 p-2.5"><CalendarDays className="h-5 w-5 text-success" /></div>
              <div>
                <p className="text-2xl font-bold">{totalVacationDays}</p>
                <p className="text-xs text-muted-foreground">Vacation Days Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-warning/10 p-2.5"><CalendarOff className="h-5 w-5 text-warning" /></div>
              <div>
                <p className="text-2xl font-bold">{totalSickDays}</p>
                <p className="text-xs text-muted-foreground">Sick Leave Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2.5"><CalendarOff className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-2xl font-bold">{totalAbsenceDays}</p>
                <p className="text-xs text-muted-foreground">Other Absence Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-employee table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-display">Employee & Manager Breakdown</CardTitle>
              <CardDescription>Individual statistics for all team members</CardDescription>
            </div>
            <StatisticsDatePicker fromDate={breakdownFrom} toDate={breakdownTo} setFromDate={setBreakdownFrom} setToDate={setBreakdownTo} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold text-right">Work Hours</TableHead>
                  <TableHead className="font-semibold text-right">Time Bank</TableHead>
                  <TableHead className="font-semibold">Vacation (Used / Total)</TableHead>
                  <TableHead className="font-semibold text-right">Sick Days</TableHead>
                  <TableHead className="font-semibold text-right">Absence Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...managersData, ...employeesData].map((u: any) => {
                  const vacPercent = u.vacationDaysTotal > 0 ? (u.vacationDaysUsed / u.vacationDaysTotal) * 100 : 0;
                  return (
                    <TableRow key={u.name}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-xs capitalize",
                          u.role === 'admin' ? 'border-primary/30 text-primary' :
                          u.role === 'manager' ? 'border-warning/30 text-warning' :
                          'border-muted-foreground/30'
                        )}>{u.role}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{u.workedHours.toFixed(1)}h</TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-mono text-sm font-medium", u.bankBalance >= 0 ? "text-success" : "text-destructive")}>
                          {u.bankBalance >= 0 ? '+' : ''}{u.bankBalance.toFixed(1)}h
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <Progress value={Math.min(vacPercent, 100)} className="h-2 flex-1" />
                          <span className="text-xs font-mono whitespace-nowrap">{u.vacationDaysUsed}/{u.vacationDaysTotal}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{u.sickDays}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{u.absenceDays}</TableCell>
                    </TableRow>
                  );
                })}
                {breakdownList.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No employees found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ===== EMPLOYEES ===== */

function EmployeesPanel({ admin, canSeeUser }: { admin: any; canSeeUser: (id: string) => boolean }) {
  const employees = (admin.employees.data ?? []).filter((e: any) => canSeeUser(e.id));
  const userManagers = admin.userManagers.data ?? [];
  const workBankTxns = admin.allWorkBank.data ?? [];
  const managerNames = (userId: string) => {
    const mgrIds = userManagers.filter((um: any) => um.user_id === userId).map((um: any) => um.manager_id);
    return employees.filter((e: any) => mgrIds.includes(e.id)).map((e: any) => e.name);
  };
  // Compute current adjustment sum per user
  const adjustmentSumByUser = useMemo(() => {
    const sums: Record<string, number> = {};
    workBankTxns.filter((t: any) => t.type === 'adjustment').forEach((t: any) => {
      sums[t.user_id] = (sums[t.user_id] ?? 0) + Number(t.hours);
    });
    return sums;
  }, [workBankTxns]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">Employees</h2>
          <p className="text-sm text-muted-foreground">{employees.length} team members</p>
        </div>
        <div className="flex gap-2">
          <FennoaImportDialog companies={admin.companies.data || []} onCreate={(data) => { admin.createEmployee.mutate(data); }} />
          <ImportEmployeesDialog companies={admin.companies.data || []} onCreate={(data) => { admin.createEmployee.mutate(data); }} />
          <AddEmployeeDialog companies={admin.companies.data || []} onCreate={(data) => { admin.createEmployee.mutate(data); toast.success('Employee added'); }} />
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Employee #</TableHead>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Managers</TableHead>
                  <TableHead className="font-semibold">Contract Start</TableHead>
                  <TableHead className="font-semibold">Vacation Days</TableHead>
                  <TableHead className="font-semibold">Daily Hours</TableHead>
                  <TableHead className="font-semibold">Lunch Break</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-12">No employees found. Add your first team member above.</TableCell></TableRow>
                ) : employees.map((emp: any) => {
                  const mgrs = managerNames(emp.id);
                  return (
                    <TableRow key={emp.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-sm text-muted-foreground">{emp.employee_number || '—'}</TableCell>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{emp.role}</Badge></TableCell>
                      <TableCell>
                        {mgrs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {mgrs.map((n: string) => <Badge key={n} variant="secondary" className="text-[10px]">{n}</Badge>)}
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{emp.contract_start_date ? format(parseISO(emp.contract_start_date), 'MMM d, yyyy') : '—'}</TableCell>
                      <TableCell>{emp.annual_vacation_days ?? 25} days</TableCell>
                      <TableCell className="font-mono text-sm">{emp.daily_work_hours ?? 7.5}h</TableCell>
                      <TableCell>
                        {emp.auto_subtract_lunch ? (
                          <Badge variant="outline" className="text-[10px] border-success/30 text-success">30min &gt;{emp.lunch_threshold_hours ?? 5}h</Badge>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        <EditEmployeeDialog
                          employee={emp}
                          allEmployees={employees}
                          currentManagerIds={userManagers.filter((um: any) => um.user_id === emp.id).map((um: any) => um.manager_id)}
                          onSave={(data, managerIds) => {
                            admin.updateEmployee.mutate({ id: emp.id, ...data });
                            admin.setEmployeeManagers.mutate({ userId: emp.id, managerIds });
                            toast.success('Updated');
                          }}
                          currentAdjustment={adjustmentSumByUser[emp.id] ?? 0}
                          onBankAdjust={(userId, hours) => {
                            admin.addBankAdjustment.mutate({ userId, hours });
                            toast.success(`Work bank adjusted by ${hours > 0 ? '+' : ''}${hours}h`);
                          }}
                          onSetBankBalance={(userId, desiredBalance) => {
                            admin.setBankBalance.mutate({ userId, desiredBalance });
                            toast.success(`Work bank balance set to ${desiredBalance}h`);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ===== APPROVALS (Working Hours + Travel + Project Hours) ===== */

function EditTimeEntryDialog({ entry, onSave }: { entry: any; onSave: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [breakMins, setBreakMins] = useState('0');

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setStartTime(entry.start_time ? format(new Date(entry.start_time), "yyyy-MM-dd'T'HH:mm") : '');
      setEndTime(entry.end_time ? format(new Date(entry.end_time), "yyyy-MM-dd'T'HH:mm") : '');
      setBreakMins(String(entry.break_minutes ?? 0));
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-display">Edit Working Hours</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Start Time</Label>
            <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">End Time</Label>
            <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Break (minutes)</Label>
            <Input type="number" min="0" value={breakMins} onChange={e => setBreakMins(e.target.value)} />
          </div>
          {startTime && endTime && (
            <div className="text-xs text-muted-foreground">
              Net hours: {Math.max(0, (differenceInMinutes(new Date(endTime), new Date(startTime)) - Number(breakMins)) / 60).toFixed(1)}h
            </div>
          )}
          <Button className="w-full" onClick={() => {
            onSave({
              start_time: new Date(startTime).toISOString(),
              end_time: new Date(endTime).toISOString(),
              break_minutes: Number(breakMins),
            });
            setOpen(false);
            toast.success('Hours updated');
          }}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditProjectHoursDialog({ entry, onSave, isHistory, onAuditReason }: { entry: any; onSave: (data: any) => void; isHistory?: boolean; onAuditReason?: (tableName: string, recordId: string, oldData: any, newData: any, reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pendingData, setPendingData] = useState<any>(null);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setHours(String(entry.hours ?? ''));
      setDate(entry.date ?? '');
      setDescription(entry.description ?? '');
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    const data = { hours: Number(hours), date, description: description || null };
    if (isHistory && onAuditReason) {
      setPendingData(data);
      setOpen(false);
      setReason('');
      setReasonOpen(true);
    } else {
      onSave(data);
      setOpen(false);
      toast.success('Project hours updated');
    }
  };

  const handleReasonConfirm = () => {
    if (!reason.trim()) { toast.error('Please provide a reason'); return; }
    onSave(pendingData);
    onAuditReason?.('project_hours', entry.id, entry, { ...entry, ...pendingData }, reason.trim());
    setReasonOpen(false);
    toast.success('Project hours updated');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Edit Project Hours</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="dark:[color-scheme:dark]" />
            </div>
            <div>
              <Label className="text-xs">Hours</Label>
              <Input type="number" min="0" step="0.5" value={hours} onChange={e => setHours(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={reasonOpen} onOpenChange={setReasonOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reason for Change</AlertDialogTitle>
            <AlertDialogDescription>This record has already been processed. Please provide a reason for this modification.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="Enter reason for modification..." value={reason} onChange={e => setReason(e.target.value)} className="min-h-[80px]" />
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-success text-success-foreground hover:bg-success/90" onClick={handleReasonConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditTravelExpenseDialog({ entry, onSave, isHistory, onAuditReason }: { entry: any; onSave: (data: any) => void; isHistory?: boolean; onAuditReason?: (tableName: string, recordId: string, oldData: any, newData: any, reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [parkingCost, setParkingCost] = useState('');
  const [description, setDescription] = useState('');
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pendingData, setPendingData] = useState<any>(null);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setDate(entry.date ?? '');
      setKilometers(String(entry.kilometers ?? 0));
      setParkingCost(String(entry.parking_cost ?? 0));
      setDescription(entry.description ?? '');
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    const data = { date, kilometers: Number(kilometers), parking_cost: Number(parkingCost), description: description || null };
    if (isHistory && onAuditReason) {
      setPendingData(data);
      setOpen(false);
      setReason('');
      setReasonOpen(true);
    } else {
      onSave(data);
      setOpen(false);
      toast.success('Travel expense updated');
    }
  };

  const handleReasonConfirm = () => {
    if (!reason.trim()) { toast.error('Please provide a reason'); return; }
    onSave(pendingData);
    onAuditReason?.('travel_expenses', entry.id, entry, { ...entry, ...pendingData }, reason.trim());
    setReasonOpen(false);
    toast.success('Travel expense updated');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Edit Travel Expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="dark:[color-scheme:dark]" />
            </div>
            <div>
              <Label className="text-xs">Kilometers</Label>
              <Input type="number" min="0" step="0.1" value={kilometers} onChange={e => setKilometers(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Parking Cost (€)</Label>
              <Input type="number" min="0" step="0.01" value={parkingCost} onChange={e => setParkingCost(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={reasonOpen} onOpenChange={setReasonOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reason for Change</AlertDialogTitle>
            <AlertDialogDescription>This record has already been processed. Please provide a reason for this modification.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="Enter reason for modification..." value={reason} onChange={e => setReason(e.target.value)} className="min-h-[80px]" />
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-success text-success-foreground hover:bg-success/90" onClick={handleReasonConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditTimeEntryHistoryDialog({ entry, onSave, isHistory, onAuditReason }: { entry: any; onSave: (data: any) => void; isHistory?: boolean; onAuditReason?: (tableName: string, recordId: string, oldData: any, newData: any, reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [breakMins, setBreakMins] = useState('0');
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pendingData, setPendingData] = useState<any>(null);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setStartTime(entry.start_time ? format(new Date(entry.start_time), "yyyy-MM-dd'T'HH:mm") : '');
      setEndTime(entry.end_time ? format(new Date(entry.end_time), "yyyy-MM-dd'T'HH:mm") : '');
      setBreakMins(String(entry.break_minutes ?? 0));
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    const data = {
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      break_minutes: Number(breakMins),
    };
    if (isHistory && onAuditReason) {
      setPendingData(data);
      setOpen(false);
      setReason('');
      setReasonOpen(true);
    } else {
      onSave(data);
      setOpen(false);
      toast.success('Hours updated');
    }
  };

  const handleReasonConfirm = () => {
    if (!reason.trim()) { toast.error('Please provide a reason'); return; }
    onSave(pendingData);
    onAuditReason?.('time_entries', entry.id, entry, { ...entry, ...pendingData }, reason.trim());
    setReasonOpen(false);
    toast.success('Hours updated');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Edit Working Hours</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Start Time</Label>
              <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">End Time</Label>
              <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Break (minutes)</Label>
              <Input type="number" min="0" value={breakMins} onChange={e => setBreakMins(e.target.value)} />
            </div>
            {startTime && endTime && (
              <div className="text-xs text-muted-foreground">
                Net hours: {Math.max(0, (differenceInMinutes(new Date(endTime), new Date(startTime)) - Number(breakMins)) / 60).toFixed(1)}h
              </div>
            )}
            <Button className="w-full" onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={reasonOpen} onOpenChange={setReasonOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reason for Change</AlertDialogTitle>
            <AlertDialogDescription>This record has already been processed. Please provide a reason for this modification.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="Enter reason for modification..." value={reason} onChange={e => setReason(e.target.value)} className="min-h-[80px]" />
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-success text-success-foreground hover:bg-success/90" onClick={handleReasonConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ApprovalsPanel({ admin, canSeeUser }: { admin: any; canSeeUser: (id: string) => boolean }) {
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [selectedTimeEntries, setSelectedTimeEntries] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const employees = (admin.employees.data ?? []).filter((e: any) => canSeeUser(e.id));

  // Use all records (not just pending) so filters and export cover everything
  const allTravel = (admin.allTravel.data ?? []).filter((t: any) => canSeeUser(t.user_id));
  const allHours = (admin.allHours.data ?? []).filter((h: any) => canSeeUser(h.user_id));
  const allTimeEntries = (admin.allTimeEntriesWithNames.data ?? []).filter((te: any) => canSeeUser(te.user_id));

  const filterByEmployeeAndDate = (items: any[], dateField: string | ((item: any) => string)) => {
    return items.filter((item: any) => {
      if (showOnlyPending && item.status !== 'pending') return false;
      if (employeeFilter !== 'all' && item.user_id !== employeeFilter) return false;
      const d = typeof dateField === 'function' ? dateField(item) : item[dateField];
      if (!d) return false;
      const dateStr = d.slice(0, 10);
      if (dateFrom && dateStr < dateFrom) return false;
      if (dateTo && dateStr > dateTo) return false;
      return true;
    });
  };

  const filteredTimeEntries = filterByEmployeeAndDate(allTimeEntries, (te: any) => te.start_time);
  const filteredTravel = filterByEmployeeAndDate(allTravel, 'date');
  const filteredHours = filterByEmployeeAndDate(allHours, 'date');

  // Separate pending for action buttons
  const pendingTimeEntries = filteredTimeEntries.filter((te: any) => te.status === 'pending');
  const pendingTravel = filteredTravel.filter((t: any) => t.status === 'pending');
  const pendingHours = filteredHours.filter((h: any) => h.status === 'pending');

  const pendingTimeEntryIds = pendingTimeEntries.map((te: any) => te.id);
  const allPendingSelected = pendingTimeEntryIds.length > 0 && pendingTimeEntryIds.every((id: string) => selectedTimeEntries.has(id));
  const somePendingSelected = pendingTimeEntryIds.some((id: string) => selectedTimeEntries.has(id));

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedTimeEntries(new Set());
    } else {
      setSelectedTimeEntries(new Set(pendingTimeEntryIds));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedTimeEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (status: 'approved' | 'rejected') => {
    if (selectedTimeEntries.size === 0) return;
    setBulkProcessing(true);
    try {
      const promises = Array.from(selectedTimeEntries).map(id =>
        admin.approveTimeEntry.mutateAsync({ id, status })
      );
      await Promise.all(promises);
      toast.success(`${selectedTimeEntries.size} entries ${status}`);
      setSelectedTimeEntries(new Set());
    } catch {
      toast.error('Some entries failed to update');
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">Approvals</h2>
          <p className="text-sm text-muted-foreground">Review working hours, travel expenses and project hours</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Employee</Label>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All employees" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px] dark:[color-scheme:dark]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px] dark:[color-scheme:dark]" />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="show-pending" checked={showOnlyPending} onCheckedChange={(v) => setShowOnlyPending(!!v)} />
          <Label htmlFor="show-pending" className="text-xs cursor-pointer">Show only pending</Label>
        </div>
        {(employeeFilter !== 'all' || dateFrom || dateTo || !showOnlyPending) && (
          <Button variant="ghost" size="sm" onClick={() => { setEmployeeFilter('all'); setDateFrom(''); setDateTo(''); setShowOnlyPending(true); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Working Hours (Time Entries) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-display">Working Hours</CardTitle>
              <Badge variant="secondary">{pendingTimeEntries.length} pending</Badge>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => exportAdminWorkingHoursCSV(filteredTimeEntries)}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Bulk action bar */}
          {selectedTimeEntries.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-b">
              <span className="text-sm font-medium">{selectedTimeEntries.size} selected</span>
              <Button size="sm" variant="outline"
                className="gap-1 text-xs h-7 text-success hover:text-success border-success/30 hover:bg-success/10"
                disabled={bulkProcessing}
                onClick={() => handleBulkAction('approved')}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve All
              </Button>
              <Button size="sm" variant="outline"
                className="gap-1 text-xs h-7 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                disabled={bulkProcessing}
                onClick={() => handleBulkAction('rejected')}>
                <XCircle className="h-3.5 w-3.5" /> Reject All
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSelectedTimeEntries(new Set())}>
                Clear
              </Button>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allPendingSelected}
                      onCheckedChange={toggleSelectAll}
                      disabled={pendingTimeEntryIds.length === 0}
                      className={somePendingSelected && !allPendingSelected ? 'opacity-50' : ''}
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Start</TableHead>
                  <TableHead className="font-semibold">End</TableHead>
                  <TableHead className="font-semibold">Break</TableHead>
                  <TableHead className="font-semibold">Net Hours</TableHead>
                  <TableHead className="font-semibold">Project</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimeEntries.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No working hours found</TableCell></TableRow>
                ) : filteredTimeEntries.slice(0, 200).map((te: any) => {
                  const netMins = te.end_time ? differenceInMinutes(new Date(te.end_time), new Date(te.start_time)) - (te.break_minutes ?? 0) : 0;
                  const isPending = te.status === 'pending';
                  return (
                    <TableRow key={te.id} className={cn("hover:bg-muted/30", selectedTimeEntries.has(te.id) && "bg-primary/5")}>
                      <TableCell>
                        {isPending ? (
                          <Checkbox
                            checked={selectedTimeEntries.has(te.id)}
                            onCheckedChange={() => toggleSelectOne(te.id)}
                          />
                        ) : <div className="w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{te.users?.name ?? 'Unknown'}</TableCell>
                      <TableCell>{format(new Date(te.start_time), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="font-mono text-sm">{format(new Date(te.start_time), 'HH:mm')}</TableCell>
                      <TableCell className="font-mono text-sm">{te.end_time ? format(new Date(te.end_time), 'HH:mm') : '—'}</TableCell>
                      <TableCell className="text-sm">{te.break_minutes ?? 0}min</TableCell>
                      <TableCell className="font-medium">{te.end_time ? (Math.max(0, netMins) / 60).toFixed(1) + 'h' : '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{te.projects?.name ?? '—'}</TableCell>
                      <TableCell><StatusBadge status={te.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isPending ? (
                            <>
                              <EditTimeEntryDialog
                                entry={te}
                                onSave={(data) => admin.updateTimeEntry.mutate({ id: te.id, ...data })}
                              />
                              <ApproveRejectButtons
                                id={te.id}
                                onApprove={(id, status) => admin.approveTimeEntry.mutate({ id, status })}
                                isPending={admin.approveTimeEntry.isPending}
                              />
                            </>
                          ) : (
                            <EditTimeEntryHistoryDialog
                              entry={te}
                              isHistory
                              onSave={(data) => admin.updateTimeEntry.mutate({ id: te.id, ...data })}
                              onAuditReason={(tableName, recordId, oldData, newData, reason) =>
                                admin.insertAuditReason.mutate({ tableName, recordId, action: 'ADMIN_EDIT', oldData, newData, reason })
                              }
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Project Hours */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-display">Project Hours</CardTitle>
              <Badge variant="secondary">{pendingHours.length} pending</Badge>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => exportAdminProjectHoursCSV(filteredHours)}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Project</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Hours</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHours.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No project hours found</TableCell></TableRow>
                ) : filteredHours.slice(0, 200).map((h: any) => (
                  <TableRow key={h.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{h.users?.name ?? 'Unknown'}</TableCell>
                    <TableCell className="text-muted-foreground">{h.projects?.name ?? '—'}</TableCell>
                    <TableCell>{format(parseISO(h.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="font-medium">{h.hours}h</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{h.description || '—'}</TableCell>
                    <TableCell><StatusBadge status={h.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <EditProjectHoursDialog
                          entry={h}
                          isHistory={h.status !== 'pending'}
                          onSave={(data) => admin.updateProjectHours.mutate({ id: h.id, ...data })}
                          onAuditReason={(tableName, recordId, oldData, newData, reason) =>
                            admin.insertAuditReason.mutate({ tableName, recordId, action: 'ADMIN_EDIT', oldData, newData, reason })
                          }
                        />
                        {h.status === 'pending' && (
                          <ApproveRejectButtons id={h.id} onApprove={(id, status) => admin.approveHours.mutate({ id, status })} isPending={admin.approveHours.isPending} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Travel Expenses */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-display">Travel Expenses</CardTitle>
              <Badge variant="secondary">{pendingTravel.length} pending</Badge>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => exportAdminTravelExpensesCSV(filteredTravel)}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Project</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Kilometers</TableHead>
                  <TableHead className="font-semibold">Parking</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTravel.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No travel expenses found</TableCell></TableRow>
                ) : filteredTravel.slice(0, 200).map((t: any) => (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{t.users?.name ?? 'Unknown'}</TableCell>
                    <TableCell className="text-muted-foreground">{t.projects?.name ?? '—'}</TableCell>
                    <TableCell>{format(parseISO(t.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{t.kilometers ?? 0} km</TableCell>
                    <TableCell>€{Number(t.parking_cost ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{t.description || '—'}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <EditTravelExpenseDialog
                          entry={t}
                          isHistory={t.status !== 'pending'}
                          onSave={(data) => admin.updateTravelExpense.mutate({ id: t.id, ...data })}
                          onAuditReason={(tableName, recordId, oldData, newData, reason) =>
                            admin.insertAuditReason.mutate({ tableName, recordId, action: 'ADMIN_EDIT', oldData, newData, reason })
                          }
                        />
                        {t.status === 'pending' && (
                          <ApproveRejectButtons id={t.id} onApprove={(id, status) => admin.approveTravel.mutate({ id, status })} isPending={admin.approveTravel.isPending} />
                        )}
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

/* ===== VACATION APPROVALS ===== */

function VacationApprovalsPanel({ admin, canSeeUser }: { admin: any; canSeeUser: (id: string) => boolean }) {
  const companies = admin.companies.data ?? [];
  const companyCountry = companies[0]?.country ?? undefined;

  const filteredEmployees = (admin.employees.data ?? []).filter((e: any) => canSeeUser(e.id));
  const filteredVacations = (admin.vacationRequests.data ?? []).filter((v: any) => canSeeUser(v.user_id));

  return (
    <VacationTimeline
      employees={filteredEmployees}
      vacationRequests={filteredVacations}
      userManagers={admin.userManagers.data ?? []}
      companyCountry={companyCountry}
      onApprove={(id, status) => admin.approveVacation.mutate({ id, status })}
      isPending={admin.approveVacation.isPending}
    />
  );
}

/* ===== ABSENCES ===== */

function AbsencesPanel({ admin, canSeeUser }: { admin: any; canSeeUser: (id: string) => boolean }) {
  const { language, t } = useTranslation();
  const absences = (admin.absences.data ?? []).filter((a: any) => canSeeUser(a.user_id));
  const absenceReasons = admin.absenceReasons.data ?? [];
  const pending = absences.filter((a: any) => a.status === 'pending');
  const handled = absences.filter((a: any) => a.status !== 'pending');

  const reasonLabel = (reasonId: string | null) => {
    if (!reasonId) return null;
    const r = absenceReasons.find((ar: any) => ar.id === reasonId);
    if (!r) return null;
    return getLocalizedField(r, 'label', language);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold">Absences & Sick Leave</h2>
        <p className="text-sm text-muted-foreground">{absences.length} total records</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-display">Pending Review</CardTitle>
            <Badge variant="secondary">{pending.length} pending</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Reason</TableHead>
                  <TableHead className="font-semibold">Start Date</TableHead>
                  <TableHead className="font-semibold">End Date</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No pending absences</TableCell></TableRow>
                ) : pending.map((a: any) => (
                  <TableRow key={a.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{a.users?.name ?? 'Unknown'}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{a.type === 'sick' ? '🤒 Sick' : '📋 Absence'}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{reasonLabel(a.reason_id) || '—'}</TableCell>
                    <TableCell>{format(parseISO(a.start_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(parseISO(a.end_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-right">
                      {a.type === 'sick' ? (
                        <SickLeaveApproveButtons id={a.id} onApprove={(id, status) => admin.approveAbsence.mutate({ id, status })} isPending={admin.approveAbsence.isPending} />
                      ) : (
                        <ApproveRejectButtons id={a.id} onApprove={(id, status) => admin.approveAbsence.mutate({ id, status })} isPending={admin.approveAbsence.isPending} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {handled.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display">History</CardTitle>
              <Badge variant="secondary">{handled.length} processed</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Reason</TableHead>
                    <TableHead className="font-semibold">Start Date</TableHead>
                    <TableHead className="font-semibold">End Date</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {handled.map((a: any) => (
                    <TableRow key={a.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{a.users?.name ?? 'Unknown'}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{a.type === 'sick' ? '🤒 Sick' : '📋 Absence'}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{reasonLabel(a.reason_id) || '—'}</TableCell>
                      <TableCell>{format(parseISO(a.start_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(parseISO(a.end_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Absence Reasons Management */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-display">{t('absenceReasons.title')}</CardTitle>
              <CardDescription>{t('absenceReasons.description')}</CardDescription>
            </div>
            <AddAbsenceReasonDialog onCreate={(data) => { admin.createAbsenceReason.mutate(data); toast.success(t('common.added')); }} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">{t('absenceReasons.reason')}</TableHead>
                  <TableHead className="font-semibold">{t('absenceReasons.labelFi')}</TableHead>
                  <TableHead className="font-semibold">{t('projects.status')}</TableHead>
                  <TableHead className="font-semibold w-[100px]">{t('absenceReasons.active')}</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {absenceReasons.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t('absenceReasons.noReasons')}</TableCell></TableRow>
                ) : absenceReasons.map((r: any) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell className="text-muted-foreground">{r.label_fi || '—'}</TableCell>
                    <TableCell><Badge variant={r.active ? 'default' : 'secondary'}>{r.active ? t('absenceReasons.active') : t('absenceReasons.inactive')}</Badge></TableCell>
                    <TableCell><Switch checked={r.active} onCheckedChange={(active) => admin.toggleAbsenceReason.mutate({ id: r.id, active })} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <EditAbsenceReasonDialog reason={r} onSave={(data) => { admin.updateAbsenceReason.mutate({ id: r.id, ...data }); toast.success(t('common.updated')); }} />
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8"
                          onClick={() => { admin.deleteAbsenceReason.mutate(r.id); toast.success(t('common.deleted')); }}>
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

function AddAbsenceReasonDialog({ onCreate }: { onCreate: (data: { label: string; label_fi?: string }) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [labelFi, setLabelFi] = useState('');

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setLabel(''); setLabelFi(''); } }}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> {t('absenceReasons.add')}</Button></DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle className="font-display">{t('absenceReasons.add')}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label>{t('absenceReasons.labelEn')}</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Doctor appointment, Personal leave..." /></div>
          <div className="space-y-1.5"><Label>{t('absenceReasons.labelFi')}</Label><Input value={labelFi} onChange={(e) => setLabelFi(e.target.value)} placeholder="esim. Lääkärikäynti, Henkilökohtainen vapaa..." /></div>
          <Button className="w-full" disabled={!label.trim()} onClick={() => {
            onCreate({ label: label.trim(), label_fi: labelFi.trim() || undefined });
            setOpen(false); setLabel(''); setLabelFi('');
          }}>{t('absenceReasons.add')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditAbsenceReasonDialog({ reason, onSave }: { reason: any; onSave: (data: { label?: string; label_fi?: string | null }) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(reason.label);
  const [labelFi, setLabelFi] = useState(reason.label_fi || '');

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setLabel(reason.label); setLabelFi(reason.label_fi || ''); } }}>
      <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle className="font-display">{t('absenceReasons.edit')}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label>{t('absenceReasons.labelEn')}</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('absenceReasons.labelFi')}</Label><Input value={labelFi} onChange={(e) => setLabelFi(e.target.value)} placeholder="Suomenkielinen nimi" /></div>
          <Button className="w-full" disabled={!label.trim()} onClick={() => {
            onSave({ label: label.trim(), label_fi: labelFi.trim() || null });
            setOpen(false);
          }}>{t('common.save')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ===== PROJECTS ===== */

function ProjectsPanel({ admin }: { admin: any }) {
  const { t } = useTranslation();
  const projects = admin.projects.data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">{t('projects.title')}</h2>
          <p className="text-sm text-muted-foreground">{projects.length} {t('projects.title').toLowerCase()}</p>
        </div>
        <AddProjectDialog onCreate={(data) => { admin.createProject.mutate(data); toast.success(t('common.added')); }} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">{t('projects.name')}</TableHead>
                  <TableHead className="font-semibold">{t('projects.customer')}</TableHead>
                  <TableHead className="font-semibold">{t('projects.status')}</TableHead>
                  <TableHead className="font-semibold w-[100px]">{t('absenceReasons.active')}</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">{t('projects.noProjects')}</TableCell></TableRow>
                ) : projects.map((p: any) => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.customer || '—'}</TableCell>
                    <TableCell><Badge variant={p.active ? 'default' : 'secondary'}>{p.active ? t('absenceReasons.active') : t('absenceReasons.inactive')}</Badge></TableCell>
                    <TableCell><Switch checked={p.active} onCheckedChange={(active) => admin.toggleProject.mutate({ id: p.id, active })} /></TableCell>
                    <TableCell>
                      <EditProjectDialog project={p} onSave={(data) => { admin.updateProject.mutate({ id: p.id, ...data }); toast.success(t('common.updated')); }} />
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

/* ===== PROJECT MANAGEMENT ===== */

function ProjectManagementPanel({ admin }: { admin: any }) {
  const { t } = useTranslation();
  const projects = admin.projects.data ?? [];
  const allHours: any[] = admin.allHours.data ?? [];
  const employees = admin.employees.data ?? [];

  const [projectFilter, setProjectFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const nameMap = useMemo(() => {
    const map: Record<string, string> = {};
    employees.forEach((e: any) => { map[e.id] = e.name; });
    return map;
  }, [employees]);

  const projectMap = useMemo(() => {
    const map: Record<string, any> = {};
    projects.forEach((p: any) => { map[p.id] = p; });
    return map;
  }, [projects]);

  const rows = useMemo(() => {
    return allHours
      .filter((h: any) => {
        if (projectFilter !== 'all' && h.project_id !== projectFilter) return false;
        if (employeeFilter !== 'all' && h.user_id !== employeeFilter) return false;
        if (dateFrom && h.date < dateFrom) return false;
        if (dateTo && h.date > dateTo) return false;
        return true;
      })
      .map((h: any) => {
        const proj = projectMap[h.project_id];
        return {
          id: h.id,
          projectName: proj?.name ?? 'Unknown',
          employeeName: h.users?.name ?? nameMap[h.user_id] ?? 'Unknown',
          description: h.description ?? '',
          date: h.date,
          hoursUsed: Number(h.hours),
          targetHours: proj?.target_hours ? String(proj.target_hours) : '—',
          status: h.status,
          approvedHours: h.status === 'approved' ? Number(h.hours) : 0,
          unapprovedHours: h.status !== 'approved' ? Number(h.hours) : 0,
          projectId: h.project_id,
        };
      });
  }, [allHours, projectFilter, employeeFilter, dateFrom, dateTo, projectMap, nameMap]);

  // Per-project summary for progress
  const projectSummaries = useMemo(() => {
    const sums: Record<string, { name: string; target: number | null; approved: number; total: number }> = {};
    const sourceRows = projectFilter !== 'all' ? rows : allHours.map((h: any) => {
      const proj = projectMap[h.project_id];
      return { projectId: h.project_id, projectName: proj?.name ?? 'Unknown', target: proj?.target_hours ?? null, status: h.status, hours: Number(h.hours) };
    });
    sourceRows.forEach((r: any) => {
      const pid = r.projectId ?? r.project_id;
      if (!sums[pid]) {
        const proj = projectMap[pid];
        sums[pid] = { name: proj?.name ?? r.projectName ?? 'Unknown', target: proj?.target_hours ?? null, approved: 0, total: 0 };
      }
      sums[pid].total += Number(r.hours ?? r.hoursUsed ?? 0);
      if ((r.status) === 'approved') sums[pid].approved += Number(r.hours ?? r.hoursUsed ?? 0);
    });
    return Object.values(sums).filter(s => s.target !== null);
  }, [rows, allHours, projectMap, projectFilter]);

  const hasFilters = projectFilter !== 'all' || employeeFilter !== 'all' || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold">Project Management</h2>
        <p className="text-sm text-muted-foreground">Track project hours and progress per employee</p>
      </div>

      {/* Progress cards for projects with targets */}
      {projectSummaries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectSummaries.map((ps, i) => {
            const pct = ps.target ? Math.min(100, (ps.approved / ps.target) * 100) : 0;
            return (
              <Card key={i}>
                <CardContent className="pt-4 pb-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm truncate">{ps.name}</span>
                    <span className="text-xs text-muted-foreground">{ps.approved.toFixed(1)} / {ps.target}h</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-muted-foreground">{pct.toFixed(0)}% complete • {ps.total.toFixed(1)}h total logged</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Project</Label>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Employee</Label>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All employees" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px] dark:[color-scheme:dark]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px] dark:[color-scheme:dark]" />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setProjectFilter('all'); setEmployeeFilter('all'); setDateFrom(''); setDateTo(''); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">{rows.length} entries</span>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => exportProjectManagementCSV(rows)}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Project</TableHead>
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold text-right">Hours</TableHead>
                  <TableHead className="font-semibold text-right">Target</TableHead>
                  <TableHead className="font-semibold text-right">Approved</TableHead>
                  <TableHead className="font-semibold text-right">Unapproved</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">No project hours found</TableCell></TableRow>
                ) : rows.slice(0, 200).map((r: any) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{r.projectName}</TableCell>
                    <TableCell>{r.employeeName}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.description || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                    <TableCell className="text-right">{r.hoursUsed}</TableCell>
                    <TableCell className="text-right">{r.targetHours}</TableCell>
                    <TableCell className="text-right">{r.approvedHours || '—'}</TableCell>
                    <TableCell className="text-right">{r.unapprovedHours || '—'}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
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

/* ===== COMPANIES ===== */

function CompaniesPanel({ admin }: { admin: any }) {
  const companies = admin.companies.data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">Companies</h2>
          <p className="text-sm text-muted-foreground">{companies.length} companies</p>
        </div>
        <AddCompanyDialog onCreate={(data) => { admin.createCompany.mutate(data); toast.success('Company added'); }} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Company ID</TableHead>
                  <TableHead className="font-semibold">Address</TableHead>
                  <TableHead className="font-semibold">Country</TableHead>
                  <TableHead className="font-semibold">KM Rate</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No companies</TableCell></TableRow>
                ) : companies.map((c: any) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{c.company_id_code || '—'}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{c.address || '—'}</TableCell>
                    <TableCell>
                      {c.country ? (
                        <Badge variant="outline" className="text-xs">{c.country}</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>€{Number(c.km_rate).toFixed(2)}/km</TableCell>
                    <TableCell>
                      <EditCompanyDialog company={c} onSave={(data) => { admin.updateCompany.mutate({ id: c.id, ...data }); toast.success('Updated'); }} />
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

/* ===== GPS WORKPLACES ===== */

function WorkplacesPanel({ admin }: { admin: any }) {
  const workplaces = admin.workplaces.data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">GPS Workplace Locations</h2>
          <p className="text-sm text-muted-foreground">{workplaces.length} locations configured</p>
        </div>
        <AddWorkplaceDialog onCreate={(data) => { admin.createWorkplace.mutate(data); toast.success('Workplace added'); }} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Latitude</TableHead>
                  <TableHead className="font-semibold">Longitude</TableHead>
                  <TableHead className="font-semibold">Radius</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workplaces.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">No workplace locations configured</TableCell></TableRow>
                ) : workplaces.map((w: any) => (
                  <TableRow key={w.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary shrink-0" />{w.name}</div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{w.latitude.toFixed(5)}</TableCell>
                    <TableCell className="font-mono text-sm">{w.longitude.toFixed(5)}</TableCell>
                    <TableCell>{w.radius_meters}m</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8"
                        onClick={() => { admin.deleteWorkplace.mutate(w.id); toast.success('Deleted'); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

/* ===== REMINDERS ===== */

function RemindersPanel({ admin }: { admin: any }) {
  const { language, t } = useTranslation();
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

/* ===== SUB-DIALOGS ===== */

function ImportEmployeesDialog({ onCreate, companies }: { onCreate: (data: any) => void; companies: any[] }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Array<{ firstName: string; lastName: string; email: string; company: string; employeeNumber: string; contractDate: string; companyId: string; error?: string }>>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const parseDate = (val: string): string | null => {
    if (!val) return null;
    const m = val.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const iso = val.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return val.trim();
    return null;
  };

  const resolveCompany = (name: string): string => {
    if (!name || !name.trim()) return companies.length > 0 ? companies[0].id : '';
    const found = companies.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
    return found ? found.id : (companies.length > 0 ? companies[0].id : '');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV must have a header row and at least one data row'); return; }
      // Detect separator
      const sep = lines[0].includes(';') ? ';' : ',';
      const rows = lines.slice(1).map(line => {
        const cols = line.split(sep).map(c => c.replace(/^"|"$/g, '').trim());
        const companyId = resolveCompany(cols[3] || '');
        const contractDate = parseDate(cols[5] || '');
        return {
          firstName: cols[0] || '',
          lastName: cols[1] || '',
          email: cols[2] || '',
          company: cols[3] || '',
          employeeNumber: cols[4] || '',
          contractDate: contractDate || '',
          companyId,
          error: !cols[0] ? 'Missing first name' : !cols[1] ? 'Missing last name' : !cols[2] ? 'Missing email' : !companyId ? 'No valid company' : undefined,
        };
      });
      setPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const valid = preview.filter(r => !r.error);
    if (valid.length === 0) { toast.error('No valid rows to import'); return; }
    valid.forEach(r => {
      onCreate({
        name: `${r.firstName} ${r.lastName}`,
        email: r.email,
        employee_number: r.employeeNumber || null,
        company_id: r.companyId,
        role: 'employee' as const,
        contract_start_date: r.contractDate || null,
      });
    });
    toast.success(`Imported ${valid.length} employee(s)`);
    setPreview([]);
    setOpen(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPreview([]); if (fileRef.current) fileRef.current.value = ''; } }}>
      <DialogTrigger asChild><Button variant="outline" className="gap-1.5"><Upload className="h-4 w-4" /> Import CSV</Button></DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Import Employees from CSV</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>CSV File</Label>
            <Input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} />
            <p className="text-xs text-muted-foreground">Columns: first name, last name, email, company, employee number, contract start date (dd.mm.yyyy)</p>
          </div>
          {preview.length > 0 && (
            <>
              <div className="text-sm text-muted-foreground">
                {preview.filter(r => !r.error).length} valid / {preview.filter(r => r.error).length} errors / {preview.length} total
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Emp #</TableHead>
                      <TableHead>Contract Start</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((r, i) => (
                      <TableRow key={i} className={r.error ? 'bg-destructive/10' : ''}>
                        <TableCell>{r.firstName}</TableCell>
                        <TableCell>{r.lastName}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>{r.company || '(default)'}</TableCell>
                        <TableCell>{r.employeeNumber}</TableCell>
                        <TableCell>{r.contractDate}</TableCell>
                        <TableCell>{r.error ? <span className="text-destructive text-xs">{r.error}</span> : <CheckCircle2 className="h-4 w-4 text-success" />}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button className="w-full" disabled={preview.filter(r => !r.error).length === 0} onClick={handleImport}>
                Import {preview.filter(r => !r.error).length} Employee(s)
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FennoaImportDialog({ onCreate, companies }: { onCreate: (data: any) => void; companies: any[] }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Array<{ firstName: string; lastName: string; email: string; employeeNumber: string; contractDate: string; companyId: string; error?: string }>>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const parseDate = (val: string): string | null => {
    if (!val) return null;
    const str = String(val).trim();
    const m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return str;
    // Handle Excel serial date number
    const num = Number(str);
    if (!isNaN(num) && num > 30000 && num < 60000) {
      const d = new Date((num - 25569) * 86400 * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return null;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { read, utils } = await import('xlsx');
    const data = await file.arrayBuffer();
    const wb = read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = utils.sheet_to_json(ws, { header: 1 });
    if (rows.length < 2) { toast.error('File must have at least 2 rows'); return; }
    const defaultCompanyId = companies.length > 0 ? companies[0].id : '';
    const parsed = rows.slice(1).filter((r: any[]) => r.some(c => c != null && String(c).trim())).map((r: any[]) => {
      const empNum = String(r[0] ?? '').trim();
      const firstName = String(r[1] ?? '').trim();
      const lastName = String(r[2] ?? '').trim();
      const email = String(r[10] ?? '').trim(); // Column K = index 10
      const contractDateRaw = r[15]; // Column P = index 15
      const contractDate = parseDate(contractDateRaw != null ? String(contractDateRaw) : '') || '';
      return {
        firstName,
        lastName,
        email,
        employeeNumber: empNum,
        contractDate,
        companyId: defaultCompanyId,
        error: !firstName ? 'Missing first name' : !lastName ? 'Missing last name' : !email ? 'Missing email' : !defaultCompanyId ? 'No company' : undefined,
      };
    });
    setPreview(parsed);
  };

  const handleImport = () => {
    const valid = preview.filter(r => !r.error);
    if (valid.length === 0) { toast.error('No valid rows to import'); return; }
    valid.forEach(r => {
      onCreate({
        name: `${r.firstName} ${r.lastName}`,
        email: r.email,
        employee_number: r.employeeNumber || null,
        company_id: r.companyId,
        role: 'employee' as const,
        contract_start_date: r.contractDate || null,
        annual_vacation_days: 0,
        daily_work_hours: 8,
        auto_subtract_lunch: true,
        lunch_threshold_hours: 6,
      });
    });
    toast.success(`Imported ${valid.length} employee(s) from Fennoa`);
    setPreview([]);
    setOpen(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPreview([]); if (fileRef.current) fileRef.current.value = ''; } }}>
      <DialogTrigger asChild><Button variant="outline" className="gap-1.5"><Upload className="h-4 w-4" /> Fennoa Imp.</Button></DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Import Employees from Fennoa (XLSX)</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>XLSX File</Label>
            <Input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} />
            <p className="text-xs text-muted-foreground">Columns: A=Emp#, B=First name, C=Last name, K=Email, P=Contract start. Row 1 is ignored. Vacation days=0, work hours=8h, auto lunch 30min if &gt;6h.</p>
          </div>
          {preview.length > 0 && (
            <>
              <div className="text-sm text-muted-foreground">
                {preview.filter(r => !r.error).length} valid / {preview.filter(r => r.error).length} errors / {preview.length} total
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Emp #</TableHead>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Contract Start</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((r, i) => (
                      <TableRow key={i} className={r.error ? 'bg-destructive/10' : ''}>
                        <TableCell>{r.employeeNumber}</TableCell>
                        <TableCell>{r.firstName}</TableCell>
                        <TableCell>{r.lastName}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>{r.contractDate}</TableCell>
                        <TableCell>{r.error ? <span className="text-destructive text-xs">{r.error}</span> : <CheckCircle2 className="h-4 w-4 text-success" />}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button className="w-full" disabled={preview.filter(r => !r.error).length === 0} onClick={handleImport}>
                Import {preview.filter(r => !r.error).length} Employee(s)
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddEmployeeDialog({ onCreate, companies }: { onCreate: (data: any) => void; companies: any[] }) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [role, setRole] = useState<'employee' | 'manager' | 'admin'>('employee');
  const [contractDate, setContractDate] = useState('');
  const [vacationDays, setVacationDays] = useState('25');
  const [dailyWorkHours, setDailyWorkHours] = useState('7.5');
  const [autoSubtractLunch, setAutoSubtractLunch] = useState(false);
  const [lunchThreshold, setLunchThreshold] = useState('5');
  const reset = () => { setFirstName(''); setLastName(''); setEmail(''); setEmployeeNumber(''); setCompanyId(companies.length === 1 ? companies[0].id : ''); setRole('employee'); setContractDate(''); setVacationDays('25'); setDailyWorkHours('7.5'); setAutoSubtractLunch(false); setLunchThreshold('5'); };

  React.useEffect(() => {
    if (companies.length === 1 && !companyId) setCompanyId(companies[0].id);
  }, [companies, companyId]);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Employee</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Add Employee</DialogTitle></DialogHeader>
        <div className="grid gap-4 mt-2 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>First Name</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" /></div>
          <div className="space-y-1.5"><Label>Last Name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Company *</Label>
            {companies.length === 1 ? (
              <Input value={companies[0].name} disabled className="bg-muted" />
            ) : (
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5"><Label>Employee Number</Label><Input value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} placeholder="EMP-001" /></div>
          <div className="space-y-1.5"><Label>Role</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Contract Start</Label><Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Vacation Days/Year</Label><Input type="number" value={vacationDays} onChange={(e) => setVacationDays(e.target.value)} min="0" max="50" /></div>
          <div className="space-y-1.5"><Label>Daily Working Hours</Label><Input type="number" step="0.5" value={dailyWorkHours} onChange={(e) => setDailyWorkHours(e.target.value)} min="1" max="24" /></div>
          <div className="sm:col-span-2 space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-subtract 30 min lunch</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Automatically deduct lunch break from daily hours</p>
              </div>
              <Switch checked={autoSubtractLunch} onCheckedChange={setAutoSubtractLunch} />
            </div>
            {autoSubtractLunch && (
              <div className="space-y-1.5">
                <Label className="text-xs">If daily work exceeds (hours)</Label>
                <Input type="number" step="0.5" value={lunchThreshold} onChange={(e) => setLunchThreshold(e.target.value)} min="1" max="12" />
              </div>
            )}
          </div>
        </div>
        <Button className="w-full mt-2" disabled={!firstName.trim() || !lastName.trim() || !email.trim() || !companyId} onClick={() => {
          const fullName = `${firstName.trim()} ${lastName.trim()}`;
          onCreate({ name: fullName, email: email.trim(), employee_number: employeeNumber.trim() || null, company_id: companyId, role, contract_start_date: contractDate || null, annual_vacation_days: parseInt(vacationDays) || 25, daily_work_hours: parseFloat(dailyWorkHours) || 7.5, auto_subtract_lunch: autoSubtractLunch, lunch_threshold_hours: parseFloat(lunchThreshold) || 5 });
          setOpen(false); reset();
        }}>Add Employee</Button>
      </DialogContent>
    </Dialog>
  );
}

function EditEmployeeDialog({ employee, allEmployees, currentManagerIds, onSave, onBankAdjust, onSetBankBalance, currentAdjustment = 0 }: {
  employee: any;
  allEmployees: any[];
  currentManagerIds: string[];
  onSave: (data: any, managerIds: string[]) => void;
  onBankAdjust?: (userId: string, hours: number) => void;
  onSetBankBalance?: (userId: string, desiredBalance: number) => void;
  currentAdjustment?: number;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(employee.role);
  const [employeeNumber, setEmployeeNumber] = useState(employee.employee_number || '');
  const [contractDate, setContractDate] = useState(employee.contract_start_date || '');
  const [vacationDays, setVacationDays] = useState(String(employee.annual_vacation_days ?? 25));
  const [dailyWorkHours, setDailyWorkHours] = useState(String(employee.daily_work_hours ?? 7.5));
  const [autoSubtractLunch, setAutoSubtractLunch] = useState(employee.auto_subtract_lunch ?? false);
  const [lunchThreshold, setLunchThreshold] = useState(String(employee.lunch_threshold_hours ?? 5));
  const [selectedManagers, setSelectedManagers] = useState<string[]>(currentManagerIds);
  const [bankAdjustment, setBankAdjustment] = useState('');
  const [bankSetValue, setBankSetValue] = useState('');

  const availableManagers = allEmployees.filter(
    (e: any) => (e.role === 'manager' || e.role === 'admin') && e.id !== employee.id
  );

  const toggleManager = (id: string) => {
    setSelectedManagers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) {
        setSelectedManagers(currentManagerIds);
        setDailyWorkHours(String(employee.daily_work_hours ?? 7.5));
        setAutoSubtractLunch(employee.auto_subtract_lunch ?? false);
        setLunchThreshold(String(employee.lunch_threshold_hours ?? 5));
        setVacationDays(String(employee.annual_vacation_days ?? 25));
        setContractDate(employee.contract_start_date || '');
        setBankAdjustment('');
        setBankSetValue(String(currentAdjustment));
      }
    }}>
      <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{t('common.edit')} {employee.name}</DialogTitle></DialogHeader>
        <div className="grid gap-4 mt-2 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>{t('common.name')}</Label><Input value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} placeholder="EMP-001" /></div>
          <div className="space-y-1.5"><Label>{t('common.role')}</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Contract Start</Label><Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Vacation Days/Year</Label><Input type="number" value={vacationDays} onChange={(e) => setVacationDays(e.target.value)} min="0" max="50" /></div>
          <div className="space-y-1.5"><Label>Daily Working Hours</Label><Input type="number" step="0.5" value={dailyWorkHours} onChange={(e) => setDailyWorkHours(e.target.value)} min="1" max="24" /></div>
          <div className="sm:col-span-2 space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-subtract 30 min lunch</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Automatically deduct lunch break from daily hours</p>
              </div>
              <Switch checked={autoSubtractLunch} onCheckedChange={setAutoSubtractLunch} />
            </div>
            {autoSubtractLunch && (
              <div className="space-y-1.5">
                <Label className="text-xs">If daily work exceeds (hours)</Label>
                <Input type="number" step="0.5" value={lunchThreshold} onChange={(e) => setLunchThreshold(e.target.value)} min="1" max="12" />
              </div>
            )}
          </div>
          {(onBankAdjust || onSetBankBalance) && (
            <div className="sm:col-span-2 space-y-3 rounded-lg border border-border p-3">
              <div>
                <Label>{t('employee.workBankAdjustment')}</Label>
                <p className="text-xs text-muted-foreground mb-2">{t('employee.workBankAdjustmentHelp')}</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">{t('employee.currentBankBalance')}</Label>
                    <div className={cn("text-lg font-semibold", currentAdjustment >= 0 ? 'text-success' : 'text-destructive')}>
                      {currentAdjustment >= 0 ? '+' : ''}{currentAdjustment.toFixed(1)}h
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">{t('employee.setBalanceTo')}</Label>
                    <Input type="number" step="0.5" value={bankSetValue} onChange={(e) => setBankSetValue(e.target.value)} placeholder="e.g. 5.0" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Managers</Label>
            {availableManagers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No managers/admins available</p>
            ) : (
              <div className="space-y-2 max-h-[120px] overflow-y-auto border border-border rounded-lg p-2">
                {availableManagers.map((mgr: any) => (
                  <label key={mgr.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                    <Checkbox
                      checked={selectedManagers.includes(mgr.id)}
                      onCheckedChange={() => toggleManager(mgr.id)}
                    />
                    <span className="text-sm">{mgr.name}</span>
                    <Badge variant="outline" className="text-[10px] capitalize ml-auto">{mgr.role}</Badge>
                  </label>
                ))}
              </div>
            )}
            {selectedManagers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedManagers.map(id => {
                  const mgr = allEmployees.find((e: any) => e.id === id);
                  return mgr ? (
                    <Badge key={id} variant="secondary" className="text-xs gap-1">
                      {mgr.name}
                      <button onClick={() => toggleManager(id)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
        <Button className="w-full mt-2" onClick={() => {
          onSave({ role, employee_number: employeeNumber.trim() || null, contract_start_date: contractDate || null, annual_vacation_days: parseInt(vacationDays) || 25, daily_work_hours: parseFloat(dailyWorkHours) || 7.5, auto_subtract_lunch: autoSubtractLunch, lunch_threshold_hours: parseFloat(lunchThreshold) || 5 }, selectedManagers);
          // Set absolute balance if changed
          if (onSetBankBalance && bankSetValue !== '' && parseFloat(bankSetValue) !== currentAdjustment) {
            onSetBankBalance(employee.id, parseFloat(bankSetValue));
          }
          setOpen(false);
        }}>{t('common.save')}</Button>
      </DialogContent>
    </Dialog>
  );
}

function AddProjectDialog({ onCreate }: { onCreate: (data: { name: string; customer: string | null; target_hours: number | null }) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');
  const [targetHours, setTargetHours] = useState('');

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setName(''); setCustomer(''); setTargetHours(''); } }}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> {t('projects.add')}</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">{t('projects.add')}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label>{t('projects.name')}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" /></div>
          <div className="space-y-1.5"><Label>{t('projects.customerOptional')}</Label><Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" /></div>
          <div className="space-y-1.5"><Label>{t('projects.targetHours')}</Label><Input type="number" min="0" step="1" value={targetHours} onChange={(e) => setTargetHours(e.target.value)} placeholder="Leave empty for no target" /></div>
          <Button className="w-full" disabled={!name.trim()} onClick={() => {
            onCreate({ name: name.trim(), customer: customer.trim() || null, target_hours: targetHours ? parseFloat(targetHours) : null });
            setOpen(false); setName(''); setCustomer(''); setTargetHours('');
          }}>{t('projects.add')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditProjectDialog({ project, onSave }: { project: any; onSave: (data: { name?: string; customer?: string | null; target_hours?: number | null }) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [customer, setCustomer] = useState(project.customer || '');
  const [targetHours, setTargetHours] = useState(String(project.target_hours ?? ''));

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setName(project.name); setCustomer(project.customer || ''); setTargetHours(String(project.target_hours ?? '')); } }}>
      <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">{t('projects.edit')}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label>{t('projects.name')}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('projects.customerOptional')}</Label><Input value={customer} onChange={(e) => setCustomer(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('projects.targetHours')}</Label><Input type="number" min="0" step="1" value={targetHours} onChange={(e) => setTargetHours(e.target.value)} placeholder="Leave empty for no target" /></div>
          <Button className="w-full" disabled={!name.trim()} onClick={() => {
            onSave({ name: name.trim(), customer: customer.trim() || null, target_hours: targetHours ? parseFloat(targetHours) : null });
            setOpen(false);
          }}>{t('common.save')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddCompanyDialog({ onCreate }: { onCreate: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [companyIdCode, setCompanyIdCode] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [kmRate, setKmRate] = useState('0.25');
  const reset = () => { setName(''); setCompanyIdCode(''); setAddress(''); setCountry(''); setKmRate('0.25'); };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Company</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">Add Company</DialogTitle></DialogHeader>
        <div className="grid gap-4 mt-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>Company Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" /></div>
          <div className="space-y-1.5"><Label>Company ID</Label><Input value={companyIdCode} onChange={(e) => setCompanyIdCode(e.target.value)} placeholder="e.g. 1234567-8" /></div>
          <div className="space-y-1.5"><Label>Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Finland">Finland</SelectItem>
                <SelectItem value="Sweden">Sweden</SelectItem>
                <SelectItem value="Norway">Norway</SelectItem>
                <SelectItem value="Denmark">Denmark</SelectItem>
                <SelectItem value="Estonia">Estonia</SelectItem>
                <SelectItem value="Germany">Germany</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Main Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, Postal Code" /></div>
          <div className="space-y-1.5"><Label>KM Rate (€)</Label><Input type="number" step="0.01" value={kmRate} onChange={(e) => setKmRate(e.target.value)} placeholder="0.25" /></div>
        </div>
        <Button className="w-full mt-2" disabled={!name.trim()} onClick={() => {
          onCreate({ name: name.trim(), company_id_code: companyIdCode.trim() || null, address: address.trim() || null, country: country || null, km_rate: parseFloat(kmRate) || 0.25 });
          setOpen(false); reset();
        }}>Add Company</Button>
      </DialogContent>
    </Dialog>
  );
}

function EditCompanyDialog({ company, onSave }: { company: any; onSave: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(company.name);
  const [companyIdCode, setCompanyIdCode] = useState(company.company_id_code || '');
  const [address, setAddress] = useState(company.address || '');
  const [country, setCountry] = useState(company.country || '');
  const [kmRate, setKmRate] = useState(String(company.km_rate));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">Edit {company.name}</DialogTitle></DialogHeader>
        <div className="grid gap-4 mt-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>Company Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Company ID</Label><Input value={companyIdCode} onChange={(e) => setCompanyIdCode(e.target.value)} placeholder="e.g. 1234567-8" /></div>
          <div className="space-y-1.5"><Label>Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Finland">Finland</SelectItem>
                <SelectItem value="Sweden">Sweden</SelectItem>
                <SelectItem value="Norway">Norway</SelectItem>
                <SelectItem value="Denmark">Denmark</SelectItem>
                <SelectItem value="Estonia">Estonia</SelectItem>
                <SelectItem value="Germany">Germany</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Main Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, Postal Code" /></div>
          <div className="space-y-1.5"><Label>KM Rate (€)</Label><Input type="number" step="0.01" value={kmRate} onChange={(e) => setKmRate(e.target.value)} /></div>
        </div>
        <Button className="w-full mt-2" onClick={() => {
          onSave({ name: name.trim(), company_id_code: companyIdCode.trim() || null, address: address.trim() || null, country: country || null, km_rate: parseFloat(kmRate) || 0.25 });
          setOpen(false);
        }}>Save Changes</Button>
      </DialogContent>
    </Dialog>
  );
}

function AddWorkplaceDialog({ onCreate }: { onCreate: (data: { name: string; latitude: number; longitude: number; radius_meters: number }) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('200');

  const useCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); toast.success('Location captured'); },
      () => toast.error('Could not get location'),
      { timeout: 5000 }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setName(''); setLat(''); setLng(''); setRadius('200'); } }}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Workplace</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">Add Workplace Location</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Office, Warehouse..." /></div>
          <Button type="button" variant="outline" className="w-full gap-1.5" onClick={useCurrentLocation}>
            <MapPin className="h-4 w-4" /> Use Current Location
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Latitude</Label><Input type="number" step="0.000001" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="60.1699" /></div>
            <div className="space-y-1.5"><Label>Longitude</Label><Input type="number" step="0.000001" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="24.9384" /></div>
          </div>
          <div className="space-y-1.5"><Label>Radius (meters)</Label><Input type="number" value={radius} onChange={(e) => setRadius(e.target.value)} min="50" max="5000" /></div>
          <Button className="w-full" disabled={!name.trim() || !lat || !lng} onClick={() => {
            onCreate({ name: name.trim(), latitude: parseFloat(lat), longitude: parseFloat(lng), radius_meters: parseInt(radius) || 200 });
            setOpen(false); setName(''); setLat(''); setLng(''); setRadius('200');
          }}>Add Workplace</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddReminderDialog({ onCreate }: { onCreate: (data: { type: string; time: string; message: string; message_fi?: string; day_of_month?: number; resend_after_days?: number }) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('clock_in');
  const [time, setTime] = useState('08:30');
  const [message, setMessage] = useState('');
  const [messageFi, setMessageFi] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [resendAfterDays, setResendAfterDays] = useState('3');

  const defaultMessages: Record<string, string> = {
    clock_in: "Don't forget to start your workday!",
    clock_out: 'Still working? Remember to clock out.',
    vacation_approval: 'You have vacation requests to review.',
    manager_approval: 'You have pending approvals.',
    hours_approval: 'Please review and approve employee working hours for last month.',
  };

  const isMonthly = type === 'hours_approval';

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setType('clock_in'); setTime('08:30'); setMessage(''); setMessageFi(''); setDayOfMonth('1'); setResendAfterDays('3'); } }}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> {t('reminders.add')}</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">{t('reminders.add')}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>{t('reminders.type')}</Label>
            <Select value={type} onValueChange={(v) => { setType(v); setMessage(defaultMessages[v] || ''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="clock_in">{t('reminders.clockIn')}</SelectItem>
                <SelectItem value="clock_out">{t('reminders.clockOut')}</SelectItem>
                <SelectItem value="vacation_approval">{t('reminders.vacationApproval')}</SelectItem>
                <SelectItem value="manager_approval">{t('reminders.managerApproval')}</SelectItem>
                <SelectItem value="hours_approval">{t('reminders.hoursApproval')}</SelectItem>
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
          <div className="space-y-1.5"><Label>{t('reminders.messageEn')}</Label><Input value={message || defaultMessages[type]} onChange={(e) => setMessage(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('reminders.messageFi')}</Label><Input value={messageFi} onChange={(e) => setMessageFi(e.target.value)} placeholder="Viesti suomeksi" /></div>
          <Button className="w-full" onClick={() => {
            onCreate({
              type, time: isMonthly ? '09:00' : time,
              message: message || defaultMessages[type],
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
                <SelectItem value="clock_in">{t('reminders.clockIn')}</SelectItem>
                <SelectItem value="clock_out">{t('reminders.clockOut')}</SelectItem>
                <SelectItem value="vacation_approval">{t('reminders.vacationApproval')}</SelectItem>
                <SelectItem value="manager_approval">{t('reminders.managerApproval')}</SelectItem>
                <SelectItem value="hours_approval">{t('reminders.hoursApproval')}</SelectItem>
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

/* ===== AUDIT TRAIL ===== */

function AuditTrailPanel({ admin }: { admin: any }) {
  const [tableFilter, setTableFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const logs = admin.auditLog.data ?? [];
  const employees = admin.employees.data ?? [];

  const nameMap = useMemo(() => {
    const map: Record<string, string> = {};
    employees.forEach((e: any) => { map[e.id] = e.name; });
    return map;
  }, [employees]);

  const tables = useMemo(() => {
    const set = new Set(logs.map((l: any) => l.table_name));
    return Array.from(set).sort() as string[];
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l: any) => {
      if (tableFilter !== 'all' && l.table_name !== tableFilter) return false;
      if (actionFilter !== 'all' && l.action !== actionFilter) return false;
      if (dateFrom && l.created_at && l.created_at.slice(0, 10) < dateFrom) return false;
      if (dateTo && l.created_at && l.created_at.slice(0, 10) > dateTo) return false;
      return true;
    });
  }, [logs, tableFilter, actionFilter, dateFrom, dateTo]);

  const formatChanges = (log: any) => {
    if (log.action === 'INSERT') {
      const d = log.new_data;
      if (d?.name) return `Created "${d.name}"`;
      if (d?.status) return `Status: ${d.status}`;
      return 'New record';
    }
    if (log.action === 'DELETE') {
      const d = log.old_data;
      if (d?.name) return `Deleted "${d.name}"`;
      return 'Record deleted';
    }
    if (log.action === 'UPDATE' && log.old_data && log.new_data) {
      const changes: string[] = [];
      for (const key of Object.keys(log.new_data)) {
        if (key === 'created_at' || key === 'id') continue;
        if (JSON.stringify(log.old_data[key]) !== JSON.stringify(log.new_data[key])) {
          const oldVal = log.old_data[key];
          const newVal = log.new_data[key];
          changes.push(`${key}: ${oldVal} → ${newVal}`);
        }
      }
      return changes.length > 0 ? changes.join(', ') : 'No visible changes';
    }
    return '';
  };

  const actionColor: Record<string, string> = {
    INSERT: 'bg-success/15 text-success border-success/30',
    UPDATE: 'bg-warning/15 text-warning border-warning/30',
    DELETE: 'bg-destructive/15 text-destructive border-destructive/30',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold">Audit Trail</h2>
        <p className="text-sm text-muted-foreground">Track all changes across the system</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All tables" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tables</SelectItem>
            {tables.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="INSERT">Insert</SelectItem>
            <SelectItem value="UPDATE">Update</SelectItem>
            <SelectItem value="DELETE">Delete</SelectItem>
          </SelectContent>
        </Select>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px] dark:[color-scheme:dark]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px] dark:[color-scheme:dark]" />
        </div>
        {(tableFilter !== 'all' || actionFilter !== 'all' || dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setTableFilter('all'); setActionFilter('all'); setDateFrom(''); setDateTo(''); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">{filtered.length} entries</span>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => exportAuditTrailCSV(filtered)}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No audit entries found</TableCell></TableRow>
              ) : filtered.slice(0, 100).map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {format(parseISO(log.created_at), 'dd.MM.yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="text-xs">{log.table_name.replace(/_/g, ' ')}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", actionColor[log.action])}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-[300px] truncate">{formatChanges(log)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.changed_by === 'system' ? 'System' : log.changed_by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
