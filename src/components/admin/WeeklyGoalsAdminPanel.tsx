import { useEffect, useState } from 'react';
import { useUserId } from '@/contexts/AuthContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Edit, Users, Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

interface Team { id: string; name: string; description: string | null; }
interface Member { id: string; name: string; email: string; }
interface GoalTemplate { id: string; name: string; description: string | null; }

export function WeeklyGoalsAdminPanel() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{t('admin.weeklyGoals')}</h2>
        <p className="text-sm text-muted-foreground">{t('admin.weeklyGoalsDesc')}</p>
      </div>
      <Tabs defaultValue="teams">
        <TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
          <TabsTrigger value="teams" className="data-[state=active]:bg-background"><Users className="w-4 h-4 mr-2" />{t('admin.weeklyGoalsTeams')}</TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-background"><Target className="w-4 h-4 mr-2" />{t('admin.weeklyGoalsTemplates')}</TabsTrigger>
        </TabsList>
        <TabsContent value="teams"><TeamManagement /></TabsContent>
        <TabsContent value="templates"><GoalTemplateManagement /></TabsContent>
      </Tabs>
    </div>
  );
}

function TeamManagement() {
  const { data: currentUser } = useCurrentUser();
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberDialog, setMemberDialog] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const [teamsRes, membersRes, utRes] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('users').select('id, name, email').order('name'),
      supabase.from('user_teams').select('team_id, user_id'),
    ]);
    setTeams(teamsRes.data ?? []);
    setMembers(membersRes.data ?? []);
    const counts: Record<string, number> = {};
    (utRes.data ?? []).forEach((ut: any) => { counts[ut.team_id] = (counts[ut.team_id] ?? 0) + 1; });
    setMemberCounts(counts);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openDialog = (team?: Team) => {
    setEditing(team ?? null);
    setName(team?.name ?? '');
    setDescription(team?.description ?? '');
    setDialogOpen(true);
  };

  const save = async () => {
    if (!name.trim() || !currentUser) return;
    if (editing) {
      const { error } = await supabase.from('teams').update({ name: name.trim(), description: description.trim() || null }).eq('id', editing.id);
      if (error) return toast.error(error.message);
      toast.success('Team updated');
    } else {
      const { error } = await supabase.from('teams').insert({ name: name.trim(), description: description.trim() || null, company_id: currentUser.company_id });
      if (error) return toast.error(error.message);
      toast.success('Team created');
    }
    setDialogOpen(false);
    fetchData();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Team deleted');
    fetchData();
  };

  const openMembers = async (team: Team) => {
    const { data } = await supabase.from('user_teams').select('user_id').eq('team_id', team.id);
    setTeamMembers((data ?? []).map((d: any) => d.user_id));
    setMemberDialog(team);
  };

  const toggleMember = async (userId: string, checked: boolean) => {
    if (!memberDialog) return;
    if (checked) {
      const { error } = await supabase.from('user_teams').insert({ team_id: memberDialog.id, user_id: userId });
      if (error) return toast.error(error.message);
      setTeamMembers([...teamMembers, userId]);
    } else {
      const { error } = await supabase.from('user_teams').delete().eq('team_id', memberDialog.id).eq('user_id', userId);
      if (error) return toast.error(error.message);
      setTeamMembers(teamMembers.filter((id) => id !== userId));
    }
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Teams</CardTitle>
          <CardDescription>Create teams and manage members</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} className="bg-success text-success-foreground hover:bg-success/90"><Plus className="w-4 h-4 mr-2" />Add team</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit team' : 'New team'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={save} className="bg-success text-success-foreground hover:bg-success/90">Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No teams yet</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Members</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell className="text-muted-foreground">{team.description ?? '-'}</TableCell>
                  <TableCell><Button variant="outline" size="sm" onClick={() => openMembers(team)}>{memberCounts[team.id] ?? 0}</Button></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(team)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(team.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!memberDialog} onOpenChange={(o) => !o && setMemberDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{memberDialog?.name} — members</DialogTitle>
            <DialogDescription>Toggle membership</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                <Checkbox checked={teamMembers.includes(m.id)} onCheckedChange={(c) => toggleMember(m.id, !!c)} />
                <div>
                  <div className="text-sm font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                </div>
              </label>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function GoalTemplateManagement() {
  const userId = useUserId();
  const { data: currentUser } = useCurrentUser();
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GoalTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('goal_templates').select('*').order('name');
    setTemplates(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openDialog = (tpl?: GoalTemplate) => {
    setEditing(tpl ?? null);
    setName(tpl?.name ?? '');
    setDescription(tpl?.description ?? '');
    setDialogOpen(true);
  };

  const save = async () => {
    if (!name.trim() || !currentUser) return;
    if (editing) {
      const { error } = await supabase.from('goal_templates').update({ name: name.trim(), description: description.trim() || null }).eq('id', editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from('goal_templates').insert({ name: name.trim(), description: description.trim() || null, company_id: currentUser.company_id, created_by: userId });
      if (error) return toast.error(error.message);
    }
    toast.success('Saved');
    setDialogOpen(false);
    fetchData();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('goal_templates').delete().eq('id', id);
    if (error) return toast.error(error.message);
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5" />Goal templates</CardTitle>
          <CardDescription>Reusable goal sets</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} className="bg-success text-success-foreground hover:bg-success/90"><Plus className="w-4 h-4 mr-2" />Add template</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Edit template' : 'New template'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={save} className="bg-success text-success-foreground hover:bg-success/90">Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No templates yet</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {templates.map((tpl) => (
                <TableRow key={tpl.id}>
                  <TableCell className="font-medium">{tpl.name}</TableCell>
                  <TableCell className="text-muted-foreground">{tpl.description ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(tpl)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(tpl.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
