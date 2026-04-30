import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { useDateLocale } from '@/lib/date-locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const COUNTRY_OPTIONS = ['Finland', 'Sweden', 'Norway', 'Denmark', 'Estonia', 'Germany', 'Other'];

function AddCompanyDialog({ onCreate }: { onCreate: (data: any) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [companyIdCode, setCompanyIdCode] = useState('');
  const [street, setStreet] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('Europe/Helsinki');
  const reset = () => { setName(''); setCompanyIdCode(''); setStreet(''); setPostalCode(''); setCity(''); setCountry(''); setTimezone('Europe/Helsinki'); };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> {t('admin.addCompany')}</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">{t('admin.addCompany')}</DialogTitle></DialogHeader>
        <div className="grid gap-4 mt-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>{t('admin.companyName')}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('admin.companyName')} /></div>
          <div className="space-y-1.5"><Label>{t('admin.companyId')}</Label><Input value={companyIdCode} onChange={(e) => setCompanyIdCode(e.target.value)} placeholder={t('admin.companyId')} /></div>
          <div className="space-y-1.5"><Label>{t('admin.country')}</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger><SelectValue placeholder={t('admin.selectCountry')} /></SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{t('admin.street')}</Label><Input value={street} onChange={(e) => setStreet(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('admin.postalCode')}</Label><Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('admin.city')}</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{t('admin.timezone')}</Label><Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Europe/Helsinki" /></div>
        </div>
        <Button className="w-full mt-2" disabled={!name.trim()} onClick={() => {
          onCreate({
            name: name.trim(),
            company_id_code: companyIdCode.trim() || null,
            street: street.trim() || null,
            postal_code: postalCode.trim() || null,
            city: city.trim() || null,
            country: country || null,
            timezone: timezone.trim() || 'Europe/Helsinki',
          });
          setOpen(false); reset();
        }}>{t('admin.addCompany')}</Button>
      </DialogContent>
    </Dialog>
  );
}

function EditCompanyDialog({ company, onSave }: { company: any; onSave: (data: any) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(company.name);
  const [companyIdCode, setCompanyIdCode] = useState(company.company_id_code || '');
  const [street, setStreet] = useState(company.street || '');
  const [postalCode, setPostalCode] = useState(company.postal_code || '');
  const [city, setCity] = useState(company.city || '');
  const [country, setCountry] = useState(company.country || '');
  const [timezone, setTimezone] = useState(company.timezone || 'Europe/Helsinki');
  const [slackBotToken, setSlackBotToken] = useState('');
  const [slackDefaultChannel, setSlackDefaultChannel] = useState('');

  // Load slack secrets from the admin-only company_secrets table when the dialog opens.
  const loadSecrets = async () => {
    const { data } = await supabase
      .from('company_secrets')
      .select('slack_bot_token, slack_default_channel')
      .eq('company_id', company.id)
      .maybeSingle();
    setSlackBotToken(data?.slack_bot_token || '');
    setSlackDefaultChannel(data?.slack_default_channel || '');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) {
        setName(company.name);
        setCompanyIdCode(company.company_id_code || '');
        setStreet(company.street || '');
        setPostalCode(company.postal_code || '');
        setCity(company.city || '');
        setCountry(company.country || '');
        setTimezone(company.timezone || 'Europe/Helsinki');
        loadSecrets();
      }
    }}>
      <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{t('admin.editCompany')}</DialogTitle></DialogHeader>
        <div className="grid gap-4 mt-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>{t('admin.companyName')}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('admin.companyId')}</Label><Input value={companyIdCode} onChange={(e) => setCompanyIdCode(e.target.value)} placeholder={t('admin.companyId')} /></div>
          <div className="space-y-1.5"><Label>{t('admin.country')}</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger><SelectValue placeholder={t('admin.selectCountry')} /></SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{t('admin.street')}</Label><Input value={street} onChange={(e) => setStreet(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('admin.postalCode')}</Label><Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('admin.city')}</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{t('admin.timezone')}</Label><Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Europe/Helsinki" /></div>

          <div className="sm:col-span-2 pt-2 border-t border-border">
            <h4 className="text-sm font-display font-bold mb-2">{t('admin.slackIntegration')}</h4>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t('admin.slackBotToken')}</Label>
            <Input
              type="password"
              autoComplete="off"
              value={slackBotToken}
              onChange={(e) => setSlackBotToken(e.target.value)}
              placeholder="xoxb-..."
            />
            <p className="text-xs text-muted-foreground">{t('admin.slackBotTokenHint')}</p>
            <a
              href="/slack-app-manifest.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-block"
            >
              📘 Slack App -ohjeet (manifesti & asennus)
            </a>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t('admin.slackDefaultChannel')}</Label>
            <Input
              value={slackDefaultChannel}
              onChange={(e) => setSlackDefaultChannel(e.target.value)}
              placeholder="#general"
            />
          </div>
        </div>
        <Button className="w-full mt-2" onClick={async () => {
          onSave({
            name: name.trim(),
            company_id_code: companyIdCode.trim() || null,
            street: street.trim() || null,
            postal_code: postalCode.trim() || null,
            city: city.trim() || null,
            country: country || null,
            timezone: timezone.trim() || 'Europe/Helsinki',
          });
          // Upsert slack credentials into the admin-only company_secrets table.
          await supabase
            .from('company_secrets')
            .upsert({
              company_id: company.id,
              slack_bot_token: slackBotToken.trim() || null,
              slack_default_channel: slackDefaultChannel.trim() || null,
              updated_at: new Date().toISOString(),
            } as any, { onConflict: 'company_id' });
          setOpen(false);
        }}>{t('admin.saveChanges')}</Button>
      </DialogContent>
    </Dialog>
  );
}

export function CompaniesPanel({ admin }: { admin: any }) {
  const { t, language } = useTranslation();
  const dateLocale = useDateLocale();
  const companies = admin.companies.data ?? [];
  const primary = companies[0]; // single-tenant view: admin sees own company
  const [carRate, setCarRate] = useState<string>('');
  const [benefitCarRate, setBenefitCarRate] = useState<string>('');
  const [trailerRate, setTrailerRate] = useState<string>('');
  const [perDiemPartial, setPerDiemPartial] = useState<string>('');
  const [perDiemFull, setPerDiemFull] = useState<string>('');

  useEffect(() => {
    if (!primary) return;
    setCarRate(String(primary.car_km_rate ?? '0.55'));
    setBenefitCarRate(String(primary.benefit_car_km_rate ?? '0.12'));
    setTrailerRate(String(primary.trailer_km_rate ?? '0.09'));
    setPerDiemPartial(String(primary.per_diem_partial ?? '25'));
    setPerDiemFull(String(primary.per_diem_full ?? '54'));
  }, [primary?.id, primary?.car_km_rate, primary?.benefit_car_km_rate, primary?.trailer_km_rate, primary?.per_diem_partial, primary?.per_diem_full]);

  const saveCompensation = () => {
    if (!primary) return;
    admin.updateCompany.mutate({
      id: primary.id,
      car_km_rate: parseFloat(carRate.replace(',', '.')) || 0.55,
      benefit_car_km_rate: parseFloat(benefitCarRate.replace(',', '.')) || 0.12,
      trailer_km_rate: parseFloat(trailerRate.replace(',', '.')) || 0.09,
      per_diem_partial: parseFloat(perDiemPartial.replace(',', '.')) || 25,
      per_diem_full: parseFloat(perDiemFull.replace(',', '.')) || 54,
      compensation_updated_at: new Date().toISOString(),
    });
    toast.success(t('common.updated'));
  };

  const lastSavedAt = primary?.compensation_updated_at
    ? new Date(primary.compensation_updated_at)
    : null;
  const lastSavedLabel = lastSavedAt
    ? format(lastSavedAt, language === 'fi' ? 'd.M.yyyy HH:mm' : 'PPp', { locale: dateLocale })
    : t('admin.neverSaved');

  return (
    <div className="space-y-4">
      {primary && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <h3 className="font-display font-bold">{t('admin.compensationSettings')}</h3>
              <p className="text-xs text-muted-foreground">{t('admin.compensationSettingsDesc')}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="space-y-1.5"><Label className="text-xs">{t('admin.carKmRate')}</Label><Input type="text" inputMode="decimal" value={carRate} onChange={(e) => setCarRate(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">{t('admin.benefitCarKmRate')}</Label><Input type="text" inputMode="decimal" value={benefitCarRate} onChange={(e) => setBenefitCarRate(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">{t('admin.trailerKmRate')}</Label><Input type="text" inputMode="decimal" value={trailerRate} onChange={(e) => setTrailerRate(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">{t('admin.perDiemPartial')}</Label><Input type="text" inputMode="decimal" value={perDiemPartial} onChange={(e) => setPerDiemPartial(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">{t('admin.perDiemFull')}</Label><Input type="text" inputMode="decimal" value={perDiemFull} onChange={(e) => setPerDiemFull(e.target.value)} /></div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={saveCompensation}>{t('common.save')}</Button>
              <span className="text-xs text-muted-foreground">{t('admin.lastSaved')}: {lastSavedLabel}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">{t('admin.companiesTitle')}</h2>
          <p className="text-sm text-muted-foreground">{companies.length} {t('admin.companiesTitle').toLowerCase()}</p>
        </div>
        <AddCompanyDialog onCreate={(data) => { admin.createCompany.mutate(data); toast.success(t('admin.companyAdded')); }} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">{t('common.name')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.companyId')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.addressLabel')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.country')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.timezone')}</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">{t('admin.noCompanies')}</TableCell></TableRow>
                ) : companies.map((c: any) => {
                  const addressParts = [c.street, c.postal_code, c.city].filter(Boolean).join(', ') || c.address || '—';
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{c.company_id_code || '—'}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[240px] truncate">{addressParts}</TableCell>
                      <TableCell>{c.country ? (<Badge variant="outline" className="text-xs">{c.country}</Badge>) : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.timezone || 'Europe/Helsinki'}</TableCell>
                      <TableCell>
                        <EditCompanyDialog company={c} onSave={(data) => { admin.updateCompany.mutate({ id: c.id, ...data }); toast.success(t('common.updated')); }} />
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
