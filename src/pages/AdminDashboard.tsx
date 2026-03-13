import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  ArrowLeft, Users, Briefcase, Car, Clock, CalendarOff, 
  CalendarDays, FileText, Plus, Shield, Pencil
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminData } from '@/hooks/useAdminData';
import { ApprovalCard } from '@/components/admin/ApprovalCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const admin = useAdminData();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/" className="touch-target flex items-center justify-center rounded-lg hover:bg-muted p-2 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-display font-bold">Admin Panel</h1>
          <p className="text-xs text-muted-foreground">Manage company</p>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full">
        <Tabs defaultValue="employees" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-3 h-auto">
            <TabsTrigger value="employees" className="text-xs py-2 gap-1 flex-col h-auto">
              <Users className="h-4 w-4" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs py-2 gap-1 flex-col h-auto">
              <Clock className="h-4 w-4" />
              Approvals
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-xs py-2 gap-1 flex-col h-auto">
              <Briefcase className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="absences" className="text-xs py-2 gap-1 flex-col h-auto">
              <CalendarOff className="h-4 w-4" />
              Absences
            </TabsTrigger>
          </TabsList>

          {/* EMPLOYEES TAB */}
          <TabsContent value="employees" className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold font-display">Employees</h2>
              <AddEmployeeDialog onCreate={(data) => { admin.createEmployee.mutate(data); toast.success('Employee added'); }} />
            </div>
            {(admin.employees.data ?? []).map((emp: any) => (
              <div key={emp.id} className="bg-card rounded-lg border border-border p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{emp.role}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Contract: </span>
                    {emp.contract_start_date ? format(parseISO(emp.contract_start_date), 'MMM d, yyyy') : 'Not set'}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Vacation: </span>
                    {emp.annual_vacation_days ?? 25} days/year
                  </div>
                </div>
                <EditEmployeeDialog
                  employee={emp}
                  onSave={(data) => { admin.updateEmployee.mutate({ id: emp.id, ...data }); toast.success('Updated'); }}
                />
              </div>
            ))}
          </TabsContent>

          {/* APPROVALS TAB */}
          <TabsContent value="approvals" className="space-y-4">
            {/* Travel Expenses */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5" /> Travel Expenses ({admin.pendingTravel.data?.length ?? 0})
              </h3>
              <div className="space-y-2">
                {(admin.pendingTravel.data ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No pending travel expenses</p>
                ) : (
                  (admin.pendingTravel.data ?? []).map((t: any) => (
                    <ApprovalCard
                      key={t.id}
                      id={t.id}
                      title={`${t.users?.name ?? 'Unknown'} — ${t.kilometers ?? 0} km, €${Number(t.parking_cost ?? 0).toFixed(2)} parking`}
                      subtitle={`${t.projects?.name ?? 'No project'} · ${format(parseISO(t.date), 'MMM d, yyyy')}`}
                      detail={t.description}
                      status={t.status}
                      onApprove={(id, status) => admin.approveTravel.mutate({ id, status })}
                      isPending={admin.approveTravel.isPending}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Project Hours */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Project Hours ({admin.pendingHours.data?.length ?? 0})
              </h3>
              <div className="space-y-2">
                {(admin.pendingHours.data ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No pending project hours</p>
                ) : (
                  (admin.pendingHours.data ?? []).map((h: any) => (
                    <ApprovalCard
                      key={h.id}
                      id={h.id}
                      title={`${h.users?.name ?? 'Unknown'} — ${h.hours}h`}
                      subtitle={`${h.projects?.name ?? 'No project'} · ${format(parseISO(h.date), 'MMM d, yyyy')}`}
                      detail={h.description}
                      status={h.status}
                      onApprove={(id, status) => admin.approveHours.mutate({ id, status })}
                      isPending={admin.approveHours.isPending}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Vacation Requests */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Vacation Requests ({admin.vacationRequests.data?.filter((v: any) => v.status === 'pending').length ?? 0} pending)
              </h3>
              <div className="space-y-2">
                {(admin.vacationRequests.data ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No vacation requests</p>
                ) : (
                  (admin.vacationRequests.data ?? []).map((v: any) => (
                    <ApprovalCard
                      key={v.id}
                      id={v.id}
                      title={`${v.users?.name ?? 'Unknown'}`}
                      subtitle={`${format(parseISO(v.start_date), 'MMM d')} — ${format(parseISO(v.end_date), 'MMM d, yyyy')}`}
                      detail={v.comment}
                      status={v.status}
                      onApprove={(id, status) => admin.approveVacation.mutate({ id, status })}
                      isPending={admin.approveVacation.isPending}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* PROJECTS TAB */}
          <TabsContent value="projects" className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold font-display">Projects</h2>
              <AddProjectDialog onCreate={(data) => { admin.createProject.mutate(data); toast.success('Project added'); }} />
            </div>
            {(admin.projects.data ?? []).map((p: any) => (
              <div key={p.id} className="bg-card rounded-lg border border-border p-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.customer || 'No customer'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{p.active ? 'Active' : 'Inactive'}</span>
                  <Switch
                    checked={p.active}
                    onCheckedChange={(active) => admin.toggleProject.mutate({ id: p.id, active })}
                  />
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ABSENCES TAB */}
          <TabsContent value="absences" className="space-y-3">
            <h2 className="text-sm font-semibold font-display">Absences & Sick Leave</h2>
            {(admin.absences.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No absences recorded</p>
            ) : (
              (admin.absences.data ?? []).map((a: any) => (
                <ApprovalCard
                  key={a.id}
                  id={a.id}
                  title={`${a.users?.name ?? 'Unknown'} — ${a.type === 'sick' ? '🤒 Sick' : '📋 Absence'}`}
                  subtitle={`${format(parseISO(a.start_date), 'MMM d')} — ${format(parseISO(a.end_date), 'MMM d, yyyy')}`}
                  status={a.status}
                  onApprove={(id, status) => admin.approveAbsence.mutate({ id, status })}
                  isPending={admin.approveAbsence.isPending}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
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
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-display">Add Employee</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Contract Start Date</Label>
            <Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Annual Vacation Days</Label>
            <Input type="number" value={vacationDays} onChange={(e) => setVacationDays(e.target.value)} min="0" max="50" />
          </div>
          <Button
            className="w-full"
            disabled={!name.trim() || !email.trim()}
            onClick={() => {
              onCreate({
                name: name.trim(),
                email: email.trim(),
                role,
                contract_start_date: contractDate || null,
                annual_vacation_days: parseInt(vacationDays) || 25,
              });
              setOpen(false);
              reset();
            }}
          >
            Add Employee
          </Button>
        </div>
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
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="mt-2 w-full text-xs gap-1">
          <Pencil className="h-3 w-3" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-display">Edit {employee.name}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Contract Start Date</Label>
            <Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Annual Vacation Days</Label>
            <Input type="number" value={vacationDays} onChange={(e) => setVacationDays(e.target.value)} min="0" max="50" />
          </div>
          <Button
            className="w-full"
            onClick={() => {
              onSave({
                role,
                contract_start_date: contractDate || null,
                annual_vacation_days: parseInt(vacationDays) || 25,
              });
              setOpen(false);
            }}
          >
            Save Changes
          </Button>
        </div>
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
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-display">Add Project</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label>Project Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
          </div>
          <div className="space-y-1.5">
            <Label>Customer (optional)</Label>
            <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" />
          </div>
          <Button
            className="w-full"
            disabled={!name.trim()}
            onClick={() => {
              onCreate({ name: name.trim(), customer: customer.trim() || null });
              setOpen(false);
              setName('');
              setCustomer('');
            }}
          >
            Add Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
