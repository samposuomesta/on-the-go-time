import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

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

export function ProjectsPanel({ admin }: { admin: any }) {
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
