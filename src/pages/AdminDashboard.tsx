import { useState, useMemo } from 'react';
import { format, parseISO, differenceInBusinessDays, differenceInHours, differenceInMinutes, eachDayOfInterval, isWeekend } from 'date-fns';
import {
  ArrowLeft, Users, Briefcase, Car, Clock, CalendarOff,
  CalendarDays, Plus, Pencil, MapPin, Bell, Building2, Trash2, CheckCircle2, XCircle, X, BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminData } from '@/hooks/useAdminData';
import { VacationTimeline } from '@/components/admin/VacationTimeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

const navItems = [
  { key: 'statistics', label: 'Statistics', icon: BarChart3, description: 'Overview & metrics' },
  { key: 'approvals', label: 'Approvals', icon: Clock, description: 'Travel & project hours' },
  { key: 'vacation-approvals', label: 'Vacation Approvals', icon: CalendarDays, description: 'Review vacation requests' },
  { key: 'absences', label: 'Absences', icon: CalendarOff, description: 'Sick leave & absences' },
  { key: 'projects', label: 'Projects', icon: Briefcase, description: 'Manage projects' },
  { key: 'workplaces', label: 'GPS Workplaces', icon: MapPin, description: 'Geofence locations' },
  { key: 'reminders', label: 'Reminders', icon: Bell, description: 'Notification rules' },
  { key: 'employees', label: 'Employees', icon: Users, description: 'Manage team members' },
  { key: 'companies', label: 'Companies', icon: Building2, description: 'Company settings' },
];

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

export default function AdminDashboard() {
  const admin = useAdminData();
  const [activeTab, setActiveTab] = useState('statistics');

  const pendingCounts = {
    approvals: (admin.pendingTravel.data?.length ?? 0) + (admin.pendingHours.data?.length ?? 0),
    'vacation-approvals': admin.vacationRequests.data?.filter((v: any) => v.status === 'pending').length ?? 0,
    absences: admin.absences.data?.filter((a: any) => a.status === 'pending').length ?? 0,
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 lg:px-6 h-14 flex items-center gap-3">
        <Link to="/" className="flex items-center justify-center rounded-lg hover:bg-muted p-2 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-base lg:text-lg font-display font-bold">Admin Panel</h1>
      </header>

      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-60 lg:w-72 border-r border-border bg-card shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <nav className="p-2 space-y-0.5">
            {navItems.map((item) => {
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
                    <span className="font-medium block">{item.label}</span>
                    <span className={cn(
                      "text-[11px] block truncate",
                      activeTab === item.key ? "text-primary-foreground/70" : "text-muted-foreground/70"
                    )}>{item.description}</span>
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
            {navItems.map((item) => {
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
                  {item.label}
                  {count > 0 && <Badge variant="default" className="text-[10px] h-4 px-1 ml-0.5">{count}</Badge>}
                </button>
              );
            })}
          </div>
          <main className="p-4">
            <AdminContent activeTab={activeTab} admin={admin} />
          </main>
        </div>

        {/* Desktop content */}
        <main className="hidden md:block flex-1 p-6 lg:p-8 overflow-auto max-w-6xl">
          <AdminContent activeTab={activeTab} admin={admin} />
        </main>
      </div>
    </div>
  );
}

function AdminContent({ activeTab, admin }: { activeTab: string; admin: any }) {
  switch (activeTab) {
    case 'statistics': return <StatisticsPanel admin={admin} />;
    case 'employees': return <EmployeesPanel admin={admin} />;
    case 'approvals': return <ApprovalsPanel admin={admin} />;
    case 'projects': return <ProjectsPanel admin={admin} />;
    case 'absences': return <AbsencesPanel admin={admin} />;
    case 'vacation-approvals': return <VacationApprovalsPanel admin={admin} />;
    case 'companies': return <CompaniesPanel admin={admin} />;
    case 'workplaces': return <WorkplacesPanel admin={admin} />;
    case 'reminders': return <RemindersPanel admin={admin} />;
    default: return null;
  }
}

/* ===== STATISTICS ===== */

function countBusinessDays(startDate: string, endDate: string): number {
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
  return days.filter(d => !isWeekend(d)).length;
}

function StatisticsPanel({ admin }: { admin: any }) {
  const employees = admin.employees.data ?? [];
  const timeEntries = admin.allTimeEntries.data ?? [];
  const absences = admin.absences.data ?? [];
  const vacationRequests = admin.vacationRequests.data ?? [];
  const workBank = admin.allWorkBank.data ?? [];
  const projectHours = admin.pendingHours.data ?? [];

  const stats = useMemo(() => {
    const perUser: Record<string, {
      name: string; role: string;
      workedHours: number; projectHours: number;
      vacationDaysUsed: number; vacationDaysTotal: number;
      sickDays: number; absenceDays: number;
      bankBalance: number;
    }> = {};

    // Init per user
    employees.forEach((emp: any) => {
      perUser[emp.id] = {
        name: emp.name,
        role: emp.role,
        workedHours: 0,
        projectHours: 0,
        vacationDaysUsed: 0,
        vacationDaysTotal: emp.annual_vacation_days ?? 25,
        sickDays: 0,
        absenceDays: 0,
        bankBalance: 0,
      };
    });

    // Time entries (clock in/out)
    timeEntries.forEach((te: any) => {
      if (!te.end_time || !perUser[te.user_id]) return;
      const mins = differenceInMinutes(new Date(te.end_time), new Date(te.start_time)) - (te.break_minutes ?? 0);
      perUser[te.user_id].workedHours += Math.max(0, mins / 60);
    });

    // Approved vacation days
    vacationRequests.forEach((vr: any) => {
      if (vr.status !== 'approved' || !perUser[vr.user_id]) return;
      perUser[vr.user_id].vacationDaysUsed += countBusinessDays(vr.start_date, vr.end_date);
    });

    // Absences (sick & other)
    absences.forEach((ab: any) => {
      if (!perUser[ab.user_id]) return;
      const days = countBusinessDays(ab.start_date, ab.end_date);
      if (ab.type === 'sick') {
        perUser[ab.user_id].sickDays += days;
      } else {
        perUser[ab.user_id].absenceDays += days;
      }
    });

    // Work bank
    workBank.forEach((wb: any) => {
      if (!perUser[wb.user_id]) return;
      perUser[wb.user_id].bankBalance += Number(wb.hours);
    });

    return perUser;
  }, [employees, timeEntries, absences, vacationRequests, workBank]);

  const userList = Object.values(stats);
  const managersData = userList.filter((u: any) => u.role === 'manager' || u.role === 'admin');
  const employeesData = userList.filter((u: any) => u.role === 'employee');

  const totalWorkedHours = userList.reduce((s, u) => s + u.workedHours, 0);
  const totalVacationDays = userList.reduce((s, u) => s + u.vacationDaysUsed, 0);
  const totalSickDays = userList.reduce((s, u) => s + u.sickDays, 0);
  const totalAbsenceDays = userList.reduce((s, u) => s + u.absenceDays, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold">Statistics Overview</h2>
        <p className="text-sm text-muted-foreground">Company-wide metrics and per-employee breakdown</p>
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
          <CardTitle className="text-base font-display">Employee & Manager Breakdown</CardTitle>
          <CardDescription>Individual statistics for all team members</CardDescription>
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
                {userList.length === 0 && (
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

function EmployeesPanel({ admin }: { admin: any }) {
  const employees = admin.employees.data ?? [];
  const userManagers = admin.userManagers.data ?? [];
  const managerNames = (userId: string) => {
    const mgrIds = userManagers.filter((um: any) => um.user_id === userId).map((um: any) => um.manager_id);
    return employees.filter((e: any) => mgrIds.includes(e.id)).map((e: any) => e.name);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">Employees</h2>
          <p className="text-sm text-muted-foreground">{employees.length} team members</p>
        </div>
        <AddEmployeeDialog onCreate={(data) => { admin.createEmployee.mutate(data); toast.success('Employee added'); }} />
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
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No employees found. Add your first team member above.</TableCell></TableRow>
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

/* ===== APPROVALS (Travel + Project Hours) ===== */

function ApprovalsPanel({ admin }: { admin: any }) {
  const travel = admin.pendingTravel.data ?? [];
  const hours = admin.pendingHours.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold">Approvals</h2>
        <p className="text-sm text-muted-foreground">Review pending travel expenses and project hours</p>
      </div>

      {/* Travel Expenses */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-display">Travel Expenses</CardTitle>
            </div>
            <Badge variant="secondary">{travel.length} pending</Badge>
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
                {travel.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No pending travel expenses</TableCell></TableRow>
                ) : travel.map((t: any) => (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{t.users?.name ?? 'Unknown'}</TableCell>
                    <TableCell className="text-muted-foreground">{t.projects?.name ?? '—'}</TableCell>
                    <TableCell>{format(parseISO(t.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{t.kilometers ?? 0} km</TableCell>
                    <TableCell>€{Number(t.parking_cost ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{t.description || '—'}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-right">
                      {t.status === 'pending' && (
                        <ApproveRejectButtons id={t.id} onApprove={(id, status) => admin.approveTravel.mutate({ id, status })} isPending={admin.approveTravel.isPending} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
            </div>
            <Badge variant="secondary">{hours.length} pending</Badge>
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
                {hours.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No pending project hours</TableCell></TableRow>
                ) : hours.map((h: any) => (
                  <TableRow key={h.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{h.users?.name ?? 'Unknown'}</TableCell>
                    <TableCell className="text-muted-foreground">{h.projects?.name ?? '—'}</TableCell>
                    <TableCell>{format(parseISO(h.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="font-medium">{h.hours}h</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{h.description || '—'}</TableCell>
                    <TableCell><StatusBadge status={h.status} /></TableCell>
                    <TableCell className="text-right">
                      {h.status === 'pending' && (
                        <ApproveRejectButtons id={h.id} onApprove={(id, status) => admin.approveHours.mutate({ id, status })} isPending={admin.approveHours.isPending} />
                      )}
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

function VacationApprovalsPanel({ admin }: { admin: any }) {
  return (
    <VacationTimeline
      employees={admin.employees.data ?? []}
      vacationRequests={admin.vacationRequests.data ?? []}
      userManagers={admin.userManagers.data ?? []}
      onApprove={(id, status) => admin.approveVacation.mutate({ id, status })}
      isPending={admin.approveVacation.isPending}
    />
  );
}

/* ===== ABSENCES ===== */

function AbsencesPanel({ admin }: { admin: any }) {
  const absences = admin.absences.data ?? [];
  const pending = absences.filter((a: any) => a.status === 'pending');
  const handled = absences.filter((a: any) => a.status !== 'pending');

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
                  <TableHead className="font-semibold">Start Date</TableHead>
                  <TableHead className="font-semibold">End Date</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No pending absences</TableCell></TableRow>
                ) : pending.map((a: any) => (
                  <TableRow key={a.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{a.users?.name ?? 'Unknown'}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{a.type === 'sick' ? '🤒 Sick' : '📋 Absence'}</Badge></TableCell>
                    <TableCell>{format(parseISO(a.start_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(parseISO(a.end_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-right">
                      <ApproveRejectButtons id={a.id} onApprove={(id, status) => admin.approveAbsence.mutate({ id, status })} isPending={admin.approveAbsence.isPending} />
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
    </div>
  );
}

/* ===== PROJECTS ===== */

function ProjectsPanel({ admin }: { admin: any }) {
  const projects = admin.projects.data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">Projects</h2>
          <p className="text-sm text-muted-foreground">{projects.length} projects</p>
        </div>
        <AddProjectDialog onCreate={(data) => { admin.createProject.mutate(data); toast.success('Project added'); }} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold w-[100px]">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-12">No projects yet</TableCell></TableRow>
                ) : projects.map((p: any) => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.customer || '—'}</TableCell>
                    <TableCell><Badge variant={p.active ? 'default' : 'secondary'}>{p.active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell><Switch checked={p.active} onCheckedChange={(active) => admin.toggleProject.mutate({ id: p.id, active })} /></TableCell>
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
  const reminders = admin.reminderRules.data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">Reminder Rules</h2>
          <p className="text-sm text-muted-foreground">{reminders.length} rules configured</p>
        </div>
        <AddReminderDialog onCreate={(data) => { admin.createReminder.mutate(data); toast.success('Reminder added'); }} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Time</TableHead>
                  <TableHead className="font-semibold">Message</TableHead>
                  <TableHead className="font-semibold">Enabled</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">No reminder rules configured</TableCell></TableRow>
                ) : reminders.map((r: any) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium capitalize">{r.type.replace('_', ' ')}</TableCell>
                    <TableCell className="font-mono">{r.time}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">{r.message}</TableCell>
                    <TableCell><Switch checked={r.enabled} onCheckedChange={(enabled) => admin.toggleReminder.mutate({ id: r.id, enabled })} /></TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8"
                        onClick={() => { admin.deleteReminder.mutate(r.id); toast.success('Deleted'); }}>
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

/* ===== SUB-DIALOGS ===== */

function AddEmployeeDialog({ onCreate }: { onCreate: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [role, setRole] = useState<'employee' | 'manager' | 'admin'>('employee');
  const [contractDate, setContractDate] = useState('');
  const [vacationDays, setVacationDays] = useState('25');
  const reset = () => { setName(''); setEmail(''); setEmployeeNumber(''); setRole('employee'); setContractDate(''); setVacationDays('25'); };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Employee</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">Add Employee</DialogTitle></DialogHeader>
        <div className="grid gap-4 mt-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" /></div>
          <div className="space-y-1.5"><Label>Employee Number</Label><Input value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} placeholder="EMP-001" /></div>
          <div className="space-y-1.5"><Label>Role</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Contract Start</Label><Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Vacation Days/Year</Label><Input type="number" value={vacationDays} onChange={(e) => setVacationDays(e.target.value)} min="0" max="50" /></div>
        </div>
        <Button className="w-full mt-2" disabled={!name.trim() || !email.trim()} onClick={() => {
          onCreate({ name: name.trim(), email: email.trim(), employee_number: employeeNumber.trim() || null, role, contract_start_date: contractDate || null, annual_vacation_days: parseInt(vacationDays) || 25 });
          setOpen(false); reset();
        }}>Add Employee</Button>
      </DialogContent>
    </Dialog>
  );
}

function EditEmployeeDialog({ employee, allEmployees, currentManagerIds, onSave }: {
  employee: any;
  allEmployees: any[];
  currentManagerIds: string[];
  onSave: (data: any, managerIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(employee.role);
  const [employeeNumber, setEmployeeNumber] = useState(employee.employee_number || '');
  const [contractDate, setContractDate] = useState(employee.contract_start_date || '');
  const [vacationDays, setVacationDays] = useState(String(employee.annual_vacation_days ?? 25));
  const [selectedManagers, setSelectedManagers] = useState<string[]>(currentManagerIds);

  // Available managers: anyone who is manager/admin and not this employee
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
      if (o) setSelectedManagers(currentManagerIds); // Reset on open
    }}>
      <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">Edit {employee.name}</DialogTitle></DialogHeader>
        <div className="grid gap-4 mt-2 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Employee Number</Label><Input value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} placeholder="EMP-001" /></div>
          <div className="space-y-1.5"><Label>Role</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Contract Start</Label><Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Vacation Days/Year</Label><Input type="number" value={vacationDays} onChange={(e) => setVacationDays(e.target.value)} min="0" max="50" /></div>
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
          onSave({ role, employee_number: employeeNumber.trim() || null, contract_start_date: contractDate || null, annual_vacation_days: parseInt(vacationDays) || 25 }, selectedManagers);
          setOpen(false);
        }}>Save Changes</Button>
      </DialogContent>
    </Dialog>
  );
}

function AddProjectDialog({ onCreate }: { onCreate: (data: { name: string; customer: string | null }) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setName(''); setCustomer(''); } }}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Project</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">Add Project</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label>Project Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" /></div>
          <div className="space-y-1.5"><Label>Customer (optional)</Label><Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" /></div>
          <Button className="w-full" disabled={!name.trim()} onClick={() => {
            onCreate({ name: name.trim(), customer: customer.trim() || null });
            setOpen(false); setName(''); setCustomer('');
          }}>Add Project</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddCompanyDialog({ onCreate }: { onCreate: (data: { name: string; km_rate: number }) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kmRate, setKmRate] = useState('0.25');

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setName(''); setKmRate('0.25'); } }}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Company</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">Add Company</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label>Company Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" /></div>
          <div className="space-y-1.5"><Label>KM Rate (€)</Label><Input type="number" step="0.01" value={kmRate} onChange={(e) => setKmRate(e.target.value)} placeholder="0.25" /></div>
          <Button className="w-full" disabled={!name.trim()} onClick={() => {
            onCreate({ name: name.trim(), km_rate: parseFloat(kmRate) || 0.25 });
            setOpen(false); setName(''); setKmRate('0.25');
          }}>Add Company</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditCompanyDialog({ company, onSave }: { company: any; onSave: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(company.name);
  const [kmRate, setKmRate] = useState(String(company.km_rate));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">Edit {company.name}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label>Company Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>KM Rate (€)</Label><Input type="number" step="0.01" value={kmRate} onChange={(e) => setKmRate(e.target.value)} /></div>
          <Button className="w-full" onClick={() => {
            onSave({ name: name.trim(), km_rate: parseFloat(kmRate) || 0.25 });
            setOpen(false);
          }}>Save Changes</Button>
        </div>
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

function AddReminderDialog({ onCreate }: { onCreate: (data: { type: string; time: string; message: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('clock_in');
  const [time, setTime] = useState('08:30');
  const [message, setMessage] = useState('');

  const defaultMessages: Record<string, string> = {
    clock_in: "Don't forget to start your workday!",
    clock_out: 'Still working? Remember to clock out.',
    vacation_approval: 'You have vacation requests to review.',
    manager_approval: 'You have pending approvals.',
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setType('clock_in'); setTime('08:30'); setMessage(''); } }}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Reminder</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">Add Reminder Rule</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => { setType(v); setMessage(defaultMessages[v] || ''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="clock_in">Clock-In Reminder</SelectItem>
                <SelectItem value="clock_out">Clock-Out Reminder</SelectItem>
                <SelectItem value="vacation_approval">Vacation Approval</SelectItem>
                <SelectItem value="manager_approval">Manager Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Time</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Message</Label><Input value={message || defaultMessages[type]} onChange={(e) => setMessage(e.target.value)} /></div>
          <Button className="w-full" onClick={() => {
            onCreate({ type, time, message: message || defaultMessages[type] });
            setOpen(false); setType('clock_in'); setTime('08:30'); setMessage('');
          }}>Add Reminder</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
