import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Plus, Copy, Key, Trash2, BookOpen, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ALL_RESOURCES = [
  'time_entries', 'absences', 'travel_expenses', 'vacation_requests',
  'project_hours', 'projects', 'absence_reasons', 'changes',
];

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `itk_${hex}`;
}

export function ApiKeysPanel() {
  const { t } = useTranslation();
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newRateLimit, setNewRateLimit] = useState(1000);
  const [readPerms, setReadPerms] = useState<string[]>([...ALL_RESOURCES]);
  const [writePerms, setWritePerms] = useState<string[]>(['time_entries', 'project_hours']);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const apiKeys = useQuery({
    queryKey: ['admin-api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const createKey = useMutation({
    mutationFn: async ({ label, permissions, rateLimit }: {
      label: string;
      permissions: { read: string[]; write: string[] };
      rateLimit: number;
    }) => {
      const rawKey = generateApiKey();
      const keyHash = await sha256(rawKey);
      const { error } = await supabase.from('api_keys' as any).insert({
        company_id: companyId,
        key_hash: keyHash,
        label,
        permissions,
        rate_limit: rateLimit,
      } as any);
      if (error) throw error;
      return rawKey;
    },
    onSuccess: (rawKey) => {
      setGeneratedKey(rawKey);
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] });
    },
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_keys' as any)
        .update({ active: false } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] });
      toast.success(t('apiKeys.revoked'));
    },
  });

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    await createKey.mutateAsync({
      label: newLabel,
      permissions: { read: readPerms, write: writePerms },
      rateLimit: newRateLimit,
    });
  };

  const handleCloseCreate = () => {
    setCreateOpen(false);
    setGeneratedKey(null);
    setNewLabel('');
    setNewRateLimit(1000);
    setReadPerms([...ALL_RESOURCES]);
    setWritePerms(['time_entries', 'project_hours']);
  };

  const togglePerm = (list: string[], setList: (v: string[]) => void, resource: string) => {
    if (list.includes(resource)) {
      setList(list.filter(r => r !== resource));
    } else {
      setList([...list, resource]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('apiKeys.copied'));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {t('apiKeys.title')}
            </CardTitle>
            <CardDescription>{t('apiKeys.description')}</CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> {t('apiKeys.create')}
          </Button>
        </CardHeader>
        <CardContent>
          {(!apiKeys.data || apiKeys.data.length === 0) ? (
            <p className="text-sm text-muted-foreground">{t('apiKeys.noKeys')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('apiKeys.label')}</TableHead>
                  <TableHead>{t('apiKeys.permissions')}</TableHead>
                  <TableHead>{t('apiKeys.rateLimit')}</TableHead>
                  <TableHead>{t('apiKeys.lastUsed')}</TableHead>
                  <TableHead>{t('admin.status')}</TableHead>
                  <TableHead>{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.data.map((key: any) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.label || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.permissions?.read?.length > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            R: {key.permissions.read.length}
                          </Badge>
                        )}
                        {key.permissions?.write?.length > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            W: {key.permissions.write.length}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{key.rate_limit}/h</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {key.last_used_at ? format(new Date(key.last_used_at), 'dd.MM.yyyy HH:mm') : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.active ? 'default' : 'secondary'}>
                        {key.active ? t('absenceReasons.active') : t('absenceReasons.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {key.active && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs h-7 text-destructive hover:text-destructive"
                          onClick={() => revokeKey.mutate(key.id)}
                          disabled={revokeKey.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                          {t('apiKeys.revoke')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && handleCloseCreate()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('apiKeys.createTitle')}</DialogTitle>
            <DialogDescription>{t('apiKeys.createDescription')}</DialogDescription>
          </DialogHeader>

          {generatedKey ? (
            <div className="space-y-4">
              <p className="text-sm text-destructive font-medium">{t('apiKeys.showOnce')}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-xs break-all font-mono">
                  {generatedKey}
                </code>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedKey)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseCreate}>{t('apiKeys.done')}</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>{t('apiKeys.label')}</Label>
                <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Payroll Integration" />
              </div>
              <div>
                <Label>{t('apiKeys.rateLimit')} ({t('apiKeys.perHour')})</Label>
                <Input type="number" value={newRateLimit} onChange={e => setNewRateLimit(Number(e.target.value))} />
              </div>
              <div>
                <Label className="mb-2 block">{t('apiKeys.readPermissions')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_RESOURCES.map(r => (
                    <label key={r} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={readPerms.includes(r)}
                        onCheckedChange={() => togglePerm(readPerms, setReadPerms, r)}
                      />
                      {r.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">{t('apiKeys.writePermissions')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['time_entries', 'project_hours'].map(r => (
                    <label key={r} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={writePerms.includes(r)}
                        onCheckedChange={() => togglePerm(writePerms, setWritePerms, r)}
                      />
                      {r.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseCreate}>{t('common.cancel')}</Button>
                <Button onClick={handleCreate} disabled={createKey.isPending || !newLabel.trim()}>
                  {t('apiKeys.generate')}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
