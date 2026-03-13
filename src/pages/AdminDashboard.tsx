import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  ArrowLeft, Users, Briefcase, Car, Clock, CalendarOff, 
  CalendarDays, Plus, Pencil, MapPin, Bell, Building2, Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminData } from '@/hooks/useAdminData';
import { ApprovalCard } from '@/components/admin/ApprovalCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const navItems = [
  { key: 'employees', label: 'Employees', icon: Users },
  { key: 'approvals', label: 'Approvals', icon: Clock },
  { key: 'projects', label: 'Projects', icon: Briefcase },
  { key: 'absences', label: 'Absences', icon: CalendarOff },
  { key: 'companies', label: 'Companies', icon: Building2 },
  { key: 'workplaces', label: 'GPS Workplaces', icon: MapPin },
  { key: 'reminders', label: 'Reminders', icon: Bell },
];

export default function AdminDashboard() {
  const admin = useAdminData();
  const [activeTab, setActiveTab] = useState('employees');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 lg:px-6 py-3 flex items-center gap-3">
        <Link to="/" className="flex items-center justify-center rounded-lg hover:bg-muted p-2 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg lg:text-xl font-display font-bold">Admin Panel</h1>
          <p className="text-xs lg:text-sm text-muted-foreground">Manage company settings and approvals</p>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar nav — hidden on mobile, shown on md+ */}
        <aside className="hidden md:flex flex-col w-56 lg:w-64 border-r border-border bg-card shrink-0">
          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                  activeTab === item.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar — visible on mobile only */}
        <div className="md:hidden w-full">
          <div className="flex overflow-x-auto border-b border-border bg-card px-2 gap-1">
            {navItems.map((item) => (
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
              </button>
            ))}
          </div>
          <main className="p-4">
            <AdminContent activeTab={activeTab} admin={admin} />
          </main>
        </div>

        {/* Desktop content area */}
        <main className="hidden md:block flex-1 p-6 lg:p-8 overflow-auto">
          <AdminContent activeTab={activeTab} admin={admin} />
        </main>
      </div>
    </div>
  );
}

function AdminContent({ activeTab, admin }: { activeTab: string; admin: any }) {
  switch (activeTab) {
    case 'employees': return <EmployeesPanel admin={admin} />;
    case 'approvals': return <ApprovalsPanel admin={admin} />;
    case 'projects': return <ProjectsPanel admin={admin} />;
    case 'absences': return <AbsencesPanel admin={admin} />;
    case 'companies': return <CompaniesPanel admin={admin} />;
    case 'workplaces': return <WorkplacesPanel admin={admin} />;
    case 'reminders': return <RemindersPanel admin={admin} />;
    default: return null;
  }
}

/* ===== PANELS ===== */

function EmployeesPanel({ admin }: { admin: any }) {
  const employees = admin.employees.data ?? [];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base lg:text-lg font-display">Employees ({employees.length})</CardTitle>
        <AddEmployeeDialog onCreate={(data) => { admin.createEmployee.mutate(data); toast.success('Employee added'); }} />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contract Start</TableHead>
                <TableHead>Vacation Days</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No employees found</TableCell></TableRow>
              ) : employees.map((emp: any) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{emp.role}</Badge></TableCell>
                  <TableCell>{emp.contract_start_date ? format(parseISO(emp.contract_start_date), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell>{emp.annual_vacation_days ?? 25}</TableCell>
                  <TableCell>
                    <EditEmployeeDialog
                      employee={emp}
                      onSave={(data) => { admin.updateEmployee.mutate({ id: emp.id, ...data }); toast.success('Updated'); }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalsPanel({ admin }: { admin: any }) {
  return (
    <div className="space-y-6">
      <ApprovalSection
        icon={Car} label="Travel Expenses" count={admin.pendingTravel.data?.length ?? 0}
        items={admin.pendingTravel.data ?? []}
        renderItem={(t: any) => (
          <ApprovalCard key={t.id} id={t.id}
            title={`${t.users?.name ?? 'Unknown'} — ${t.kilometers ?? 0} km, €${Number(t.parking_cost ?? 0).toFixed(2)} parking`}
            subtitle={`${t.projects?.name ?? 'No project'} · ${format(parseISO(t.date), 'MMM d, yyyy')}`}
            detail={t.description} status={t.status}
            onApprove={(id, status) => admin.approveTravel.mutate({ id, status })}
            isPending={admin.approveTravel.isPending} />
        )}
      />
      <ApprovalSection
        icon={Clock} label="Project Hours" count={admin.pendingHours.data?.length ?? 0}
        items={admin.pendingHours.data ?? []}
        renderItem={(h: any) => (
          <ApprovalCard key={h.id} id={h.id}
            title={`${h.users?.name ?? 'Unknown'} — ${h.hours}h`}
            subtitle={`${h.projects?.name ?? 'No project'} · ${format(parseISO(h.date), 'MMM d, yyyy')}`}
            detail={h.description} status={h.status}
            onApprove={(id, status) => admin.approveHours.mutate({ id, status })}
            isPending={admin.approveHours.isPending} />
        )}
      />
      <ApprovalSection
        icon={CalendarDays} label="Vacation Requests"
        count={admin.vacationRequests.data?.filter((v: any) => v.status === 'pending').length ?? 0}
        items={admin.vacationRequests.data ?? []}
        renderItem={(v: any) => (
          <ApprovalCard key={v.id} id={v.id}
            title={`${v.users?.name ?? 'Unknown'}`}
            subtitle={`${format(parseISO(v.start_date), 'MMM d')} — ${format(parseISO(v.end_date), 'MMM d, yyyy')}`}
            detail={v.comment} status={v.status}
            onApprove={(id, status) => admin.approveVacation.mutate({ id, status })}
            isPending={admin.approveVacation.isPending} />
        )}
      />
    </div>
  );
}

function ApprovalSection({ icon: Icon, label, count, items, renderItem }: {
  icon: any; label: string; count: number; items: any[]; renderItem: (item: any) => React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm lg:text-base font-display flex items-center gap-2">
          <Icon className="h-4 w-4" /> {label}
          <Badge variant="secondary" className="ml-auto">{count} pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No {label.toLowerCase()}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map(renderItem)}</div>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectsPanel({ admin }: { admin: any }) {
  const projects = admin.projects.data ?? [];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base lg:text-lg font-display">Projects ({projects.length})</CardTitle>
        <AddProjectDialog onCreate={(data) => { admin.createProject.mutate(data); toast.success('Project added'); }} />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No projects</TableCell></TableRow>
              ) : projects.map((p: any) => (
                <TableRow key={p.id}>
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
  );
}

function AbsencesPanel({ admin }: { admin: any }) {
  const absences = admin.absences.data ?? [];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base lg:text-lg font-display">Absences & Sick Leave ({absences.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {absences.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No absences recorded</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {absences.map((a: any) => (
              <ApprovalCard key={a.id} id={a.id}
                title={`${a.users?.name ?? 'Unknown'} — ${a.type === 'sick' ? '🤒 Sick' : '📋 Absence'}`}
                subtitle={`${format(parseISO(a.start_date), 'MMM d')} — ${format(parseISO(a.end_date), 'MMM d, yyyy')}`}
                status={a.status}
                onApprove={(id, status) => admin.approveAbsence.mutate({ id, status })}
                isPending={admin.approveAbsence.isPending} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompaniesPanel({ admin }: { admin: any }) {
  const companies = admin.companies.data ?? [];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base lg:text-lg font-display">Companies ({companies.length})</CardTitle>
        <AddCompanyDialog onCreate={(data) => { admin.createCompany.mutate(data); toast.success('Company added'); }} />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>KM Rate</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No companies</TableCell></TableRow>
              ) : companies.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>€{Number(c.km_rate).toFixed(2)}/km</TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(c.created_at), 'MMM d, yyyy')}</TableCell>
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
  );
}

function WorkplacesPanel({ admin }: { admin: any }) {
  const workplaces = admin.workplaces.data ?? [];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base lg:text-lg font-display">GPS Workplace Locations ({workplaces.length})</CardTitle>
        <AddWorkplaceDialog onCreate={(data) => { admin.createWorkplace.mutate(data); toast.success('Workplace added'); }} />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Latitude</TableHead>
                <TableHead>Longitude</TableHead>
                <TableHead>Radius</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workplaces.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No workplace locations configured</TableCell></TableRow>
              ) : workplaces.map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{w.name}</TableCell>
                  <TableCell>{w.latitude.toFixed(5)}</TableCell>
                  <TableCell>{w.longitude.toFixed(5)}</TableCell>
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
  );
}

function RemindersPanel({ admin }: { admin: any }) {
  const reminders = admin.reminderRules.data ?? [];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base lg:text-lg font-display">Reminder Rules ({reminders.length})</CardTitle>
        <AddReminderDialog onCreate={(data) => { admin.createReminder.mutate(data); toast.success('Reminder added'); }} />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reminders.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No reminder rules configured</TableCell></TableRow>
              ) : reminders.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium capitalize">{r.type.replace('_', ' ')}</TableCell>
                  <TableCell>{r.time}</TableCell>
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
  );
}

/* --- Sub-dialogs --- */

function AddEmployeeDialog({ onCreate }: { onCreate: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'employee' | 'manager' | 'admin'>('employee');
  const [contractDate, setContractDate] = useState('');
  const [vacationDays, setVacationDays] = useState('25');
  const reset = () => { setName(''); setEmail(''); setRole('employee'); setContractDate(''); setVacationDays('25'); };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Employee</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Add Employee</DialogTitle></DialogHeader>
        <div className="grid gap-4 mt-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" /></div>
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
          onCreate({ name: name.trim(), email: email.trim(), role, contract_start_date: contractDate || null, annual_vacation_days: parseInt(vacationDays) || 25 });
          setOpen(false); reset();
        }}>Add Employee</Button>
      </DialogContent>
    </Dialog>
  );
}

function EditEmployeeDialog({ employee, onSave }: { employee: any; onSave: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(employee.role);
  const [contractDate, setContractDate] = useState(employee.contract_start_date || '');
  const [vacationDays, setVacationDays] = useState(String(employee.annual_vacation_days ?? 25));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Edit {employee.name}</DialogTitle></DialogHeader>
        <div className="grid gap-4 mt-2 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Role</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Contract Start</Label><Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Vacation Days/Year</Label><Input type="number" value={vacationDays} onChange={(e) => setVacationDays(e.target.value)} min="0" max="50" /></div>
        </div>
        <Button className="w-full mt-2" onClick={() => {
          onSave({ role, contract_start_date: contractDate || null, annual_vacation_days: parseInt(vacationDays) || 25 });
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
      <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Project</Button></DialogTrigger>
      <DialogContent>
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
      <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Company</Button></DialogTrigger>
      <DialogContent>
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
      <DialogContent>
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
      <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Workplace</Button></DialogTrigger>
      <DialogContent>
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
      <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Reminder</Button></DialogTrigger>
      <DialogContent>
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
