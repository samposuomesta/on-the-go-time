import { useEffect, useState, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit, Users, Loader2, Target, BarChart3, User as UserIcon, Download, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { RATING_CLASSES } from '@/types/weekly-goals';
import { exportWeeklyGoalsCSV } from '../../lib/csv-export';
import { cn } from '@/lib/utils';

interface Team { id: string; name: string; description: string | null; }
interface Member { id: string; name: string; email: string; }
interface GoalTemplate { id: string; name: string; description: string | null; }

const getISOWeek = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

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
          <TabsTrigger value="team-summary" className="data-[state=active]:bg-background"><BarChart3 className="w-4 h-4 mr-2" />{t('admin.weeklyGoalsTeamSummary')}</TabsTrigger>
          <TabsTrigger value="user-summary" className="data-[state=active]:bg-background"><UserIcon className="w-4 h-4 mr-2" />{t('admin.weeklyGoalsUserSummary')}</TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-background"><Target className="w-4 h-4 mr-2" />{t('admin.weeklyGoalsTemplates')}</TabsTrigger>
          <TabsTrigger value="export" className="data-[state=active]:bg-background"><Download className="w-4 h-4 mr-2" />{t('admin.weeklyGoalsExport')}</TabsTrigger>
        </TabsList>
        <TabsContent value="teams"><TeamManagement /></TabsContent>
        <TabsContent value="team-summary"><TeamSummaryView /></TabsContent>
        <TabsContent value="user-summary"><UserSummaryView /></TabsContent>
        <TabsContent value="templates"><GoalTemplateManagement /></TabsContent>
        <TabsContent value="export"><DataExport /></TabsContent>
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
      if (error) return toast.error(sanitizeErrorMessage(error));
      toast.success('Team updated');
    } else {
      const { error } = await supabase.from('teams').insert({ name: name.trim(), description: description.trim() || null, company_id: currentUser.company_id });
      if (error) return toast.error(sanitizeErrorMessage(error));
      toast.success('Team created');
    }
    setDialogOpen(false);
    fetchData();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) return toast.error(sanitizeErrorMessage(error));
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
      if (error) return toast.error(sanitizeErrorMessage(error));
      setTeamMembers([...teamMembers, userId]);
    } else {
      const { error } = await supabase.from('user_teams').delete().eq('team_id', memberDialog.id).eq('user_id', userId);
      if (error) return toast.error(sanitizeErrorMessage(error));
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

interface GoalRow {
  user_id: string;
  user_name: string;
  team_ids: string[];
  weekly_goal_id: string;
  week_number: number;
  year: number;
  rated_at: string | null;
  goal_id: string;
  text: string;
  rating: number | null;
  comment: string | null;
  is_admin_assigned: boolean;
  template_name: string | null;
}

async function fetchGoalRows(companyId: string): Promise<GoalRow[]> {
  const [{ data: users }, { data: weeklyGoals }, { data: userTeams }] = await Promise.all([
    supabase.from('users').select('id, name, company_id').eq('company_id', companyId),
    supabase
      .from('weekly_goals')
      .select('id, user_id, week_number, year, rated_at, is_admin_assigned, template_name, goals(id, text, rating, comment)')
      .order('year', { ascending: false })
      .order('week_number', { ascending: false }),
    supabase.from('user_teams').select('user_id, team_id'),
  ]);

  const userMap = new Map<string, string>((users ?? []).map((u: any) => [u.id, u.name]));
  const teamsByUser = new Map<string, string[]>();
  (userTeams ?? []).forEach((ut: any) => {
    const arr = teamsByUser.get(ut.user_id) ?? [];
    arr.push(ut.team_id);
    teamsByUser.set(ut.user_id, arr);
  });

  const rows: GoalRow[] = [];
  (weeklyGoals ?? []).forEach((wg: any) => {
    if (!userMap.has(wg.user_id)) return; // company filter
    (wg.goals ?? []).forEach((g: any) => {
      rows.push({
        user_id: wg.user_id,
        user_name: userMap.get(wg.user_id) ?? 'Unknown',
        team_ids: teamsByUser.get(wg.user_id) ?? [],
        weekly_goal_id: wg.id,
        week_number: wg.week_number,
        year: wg.year,
        rated_at: wg.rated_at,
        goal_id: g.id,
        text: g.text,
        rating: g.rating,
        comment: g.comment,
        is_admin_assigned: wg.is_admin_assigned,
        template_name: wg.template_name,
      });
    });
  });
  return rows;
}

function TeamSummaryView() {
  const { data: currentUser } = useCurrentUser();
  const [teams, setTeams] = useState<Team[]>([]);
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.company_id) return;
    (async () => {
      setLoading(true);
      const [teamsRes, goalRows] = await Promise.all([
        supabase.from('teams').select('*').order('name'),
        fetchGoalRows(currentUser.company_id),
      ]);
      setTeams(teamsRes.data ?? []);
      setRows(goalRows);
      setLoading(false);
    })();
  }, [currentUser?.company_id]);

  const filtered = useMemo(() => {
    if (selectedTeam === 'all') return rows;
    return rows.filter((r) => r.team_ids.includes(selectedTeam));
  }, [rows, selectedTeam]);

  // Aggregate per team-week
  const summary = useMemo(() => {
    const map = new Map<string, { team: string; week: number; year: number; total: number; rated: number; avg: number }>();
    const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? '—';
    filtered.forEach((r) => {
      const teamIds = selectedTeam === 'all' ? (r.team_ids.length > 0 ? r.team_ids : ['__none__']) : [selectedTeam];
      teamIds.forEach((tid) => {
        const key = `${tid}_${r.year}_${r.week_number}`;
        const existing = map.get(key) ?? { team: tid === '__none__' ? '—' : teamName(tid), week: r.week_number, year: r.year, total: 0, rated: 0, avg: 0 };
        existing.total += 1;
        if (r.rating != null) {
          existing.rated += 1;
          existing.avg = ((existing.avg * (existing.rated - 1)) + r.rating) / existing.rated;
        }
        map.set(key, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.year - a.year || b.week - a.week);
  }, [filtered, teams, selectedTeam]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" />Team summary</CardTitle>
        <CardDescription>Weekly progress per team</CardDescription>
        <div className="pt-2">
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {summary.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No data</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Team</TableHead><TableHead>Year</TableHead><TableHead>Week</TableHead><TableHead>Goals</TableHead><TableHead>Rated</TableHead><TableHead>Avg rating</TableHead></TableRow></TableHeader>
            <TableBody>
              {summary.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{s.team}</TableCell>
                  <TableCell>{s.year}</TableCell>
                  <TableCell>{s.week}</TableCell>
                  <TableCell>{s.total}</TableCell>
                  <TableCell>{s.rated} / {s.total}</TableCell>
                  <TableCell>{s.rated > 0 ? s.avg.toFixed(2) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function UserSummaryView() {
  const { data: currentUser } = useCurrentUser();
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [users, setUsers] = useState<Member[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.company_id) return;
    (async () => {
      setLoading(true);
      const [usersRes, goalRows] = await Promise.all([
        supabase.from('users').select('id, name, email').eq('company_id', currentUser.company_id).order('name'),
        fetchGoalRows(currentUser.company_id),
      ]);
      setUsers(usersRes.data ?? []);
      setRows(goalRows);
      setLoading(false);
    })();
  }, [currentUser?.company_id]);

  const filtered = useMemo(() => selectedUser === 'all' ? rows : rows.filter((r) => r.user_id === selectedUser), [rows, selectedUser]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserIcon className="w-5 h-5" />User summary</CardTitle>
        <CardDescription>Per-user goal history</CardDescription>
        <div className="pt-2">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No goals</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Year</TableHead><TableHead>Week</TableHead><TableHead>Goal</TableHead><TableHead>Rating</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map((r) => (
                <TableRow key={r.goal_id}>
                  <TableCell className="font-medium">{r.user_name}</TableCell>
                  <TableCell>{r.year}</TableCell>
                  <TableCell>{r.week_number}</TableCell>
                  <TableCell className="max-w-md truncate">{r.text}</TableCell>
                  <TableCell>
                    {r.rating != null ? (
                      <span className={cn('px-2 py-0.5 rounded-full text-xs border', RATING_CLASSES[r.rating as 1|2|3|4])}>{r.rating}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs">{r.is_admin_assigned ? `admin (${r.template_name ?? '—'})` : 'self'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function GoalTemplateManagement() {
  const userId = useUserId();
  const { data: currentUser } = useCurrentUser();
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [users, setUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GoalTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleDialog, setScheduleDialog] = useState<GoalTemplate | null>(null);
  const [schedWeek, setSchedWeek] = useState<number>(getISOWeek(new Date()) + 1);
  const [schedYear, setSchedYear] = useState<number>(new Date().getFullYear());
  const [schedUserIds, setSchedUserIds] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    if (!currentUser?.company_id) return;
    const [tplRes, usersRes] = await Promise.all([
      supabase.from('goal_templates').select('*').order('name'),
      supabase.from('users').select('id, name, email').eq('company_id', currentUser.company_id).order('name'),
    ]);
    setTemplates(tplRes.data ?? []);
    setUsers(usersRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentUser?.company_id]);

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
      if (error) return toast.error(sanitizeErrorMessage(error));
    } else {
      const { error } = await supabase.from('goal_templates').insert({ name: name.trim(), description: description.trim() || null, company_id: currentUser.company_id, created_by: userId });
      if (error) return toast.error(sanitizeErrorMessage(error));
    }
    toast.success('Saved');
    setDialogOpen(false);
    fetchData();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('goal_templates').delete().eq('id', id);
    if (error) return toast.error(sanitizeErrorMessage(error));
    fetchData();
  };

  const openSchedule = (tpl: GoalTemplate) => {
    setScheduleDialog(tpl);
    setSchedUserIds([]);
    setSchedWeek(getISOWeek(new Date()) + 1);
    setSchedYear(new Date().getFullYear());
  };

  const assignSchedule = async () => {
    if (!scheduleDialog || schedUserIds.length === 0 || !userId) {
      toast.error('Pick at least one user');
      return;
    }
    const records = schedUserIds.map((uid) => ({
      template_id: scheduleDialog.id,
      user_id: uid,
      week_number: schedWeek,
      year: schedYear,
      created_by: userId,
    }));
    const { error } = await supabase.from('scheduled_goals').insert(records);
    if (error) return toast.error(sanitizeErrorMessage(error));
    toast.success(`Scheduled for ${schedUserIds.length} users`);
    setScheduleDialog(null);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5" />Goal templates</CardTitle>
          <CardDescription>Reusable goal sets and scheduling</CardDescription>
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
                    <Button variant="ghost" size="icon" onClick={() => openSchedule(tpl)} title="Schedule"><CalendarPlus className="w-4 h-4 text-primary" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openDialog(tpl)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(tpl.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!scheduleDialog} onOpenChange={(o) => !o && setScheduleDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule "{scheduleDialog?.name}"</DialogTitle>
            <DialogDescription>Assign template to users for a given week</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Year</Label><Input type="number" value={schedYear} onChange={(e) => setSchedYear(parseInt(e.target.value, 10))} /></div>
              <div className="space-y-1"><Label>Week</Label><Input type="number" min={1} max={53} value={schedWeek} onChange={(e) => setSchedWeek(parseInt(e.target.value, 10))} /></div>
            </div>
            <div className="space-y-1">
              <Label>Users</Label>
              <div className="max-h-64 overflow-y-auto border rounded p-2 space-y-1">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 p-1 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={schedUserIds.includes(u.id)}
                      onCheckedChange={(c) => setSchedUserIds(c ? [...schedUserIds, u.id] : schedUserIds.filter((id) => id !== u.id))}
                    />
                    <span className="text-sm">{u.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={assignSchedule} className="bg-success text-success-foreground hover:bg-success/90">Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DataExport() {
  const { data: currentUser } = useCurrentUser();
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (!currentUser?.company_id) return;
    setBusy(true);
    try {
      const rows = await fetchGoalRows(currentUser.company_id);
      exportWeeklyGoalsCSV(rows.map((r) => ({
        userName: r.user_name,
        weekNumber: r.week_number,
        year: r.year,
        goalText: r.text,
        rating: r.rating,
        comment: r.comment,
        isAdminAssigned: r.is_admin_assigned,
        templateName: r.template_name,
      })));
      toast.success('CSV exported');
    } catch (e: any) {
      toast.error(e.message ?? 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Download className="w-5 h-5" />Export weekly goals</CardTitle>
        <CardDescription>Download all weekly goals (employees, weeks, ratings, comments)</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleExport} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Export CSV
        </Button>
      </CardContent>
    </Card>
  );
}
