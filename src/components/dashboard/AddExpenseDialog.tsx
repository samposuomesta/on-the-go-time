import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useUserId } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import { Camera, X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'kilometers' | 'parking' | 'receipt';
}

export function AddExpenseDialog({ open, onOpenChange, mode }: Props) {
  const userId = useUserId();
  const projects = useProjects();
  const { t } = useTranslation();
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [route, setRoute] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [parkingCost, setParkingCost] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const nowLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  const [vehicleType, setVehicleType] = useState<'car' | 'benefit_car' | 'trailer' | 'company_car'>('car');
  const [tripStart, setTripStart] = useState(nowLocal());
  const [tripEnd, setTripEnd] = useState(nowLocal());
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const titleKeys: Record<string, 'expense.addKilometers' | 'expense.addParking' | 'expense.uploadReceipt'> = {
    kilometers: 'expense.addKilometers',
    parking: 'expense.addParking',
    receipt: 'expense.uploadReceipt',
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('expense.selectImage'));
      return;
    }
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadReceipt = async (): Promise<string | null> => {
    if (!receiptFile) return null;
    const ext = receiptFile.name.split('.').pop() || 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('receipts')
      .upload(path, receiptFile, { contentType: receiptFile.type });
    if (error) {
      console.error('Upload error:', error);
      toast.error(t('expense.failedToSave'));
      return null;
    }
    // Store the path for later signed URL generation
    return path;
  };

  const handleSave = async () => {
    if (mode === 'receipt' && !title.trim()) {
      toast.error(t('expense.titleRequired'));
      return;
    }
    setSaving(true);

    let receiptUrl: string | null = null;
    if (mode === 'receipt' && receiptFile) {
      receiptUrl = await uploadReceipt();
      if (!receiptUrl) {
        setSaving(false);
        return;
      }
    }

    const isKm = mode === 'kilometers';
    const tripStartIso = isKm && tripStart ? new Date(tripStart).toISOString() : null;
    const tripEndIso = isKm && tripEnd ? new Date(tripEnd).toISOString() : null;
    const effectiveDate = isKm && tripStart ? tripStart.slice(0, 10) : date;
    const km = isKm ? parseFloat(kilometers.replace(',', '.')) || 0 : 0;
    // 'company_car' = no compensation: store 0 km regardless of input
    const kmStored = isKm && vehicleType === 'company_car' ? 0 : km;

    const { error } = await supabase.from('travel_expenses').insert({
      user_id: userId,
      project_id: projectId || null,
      title: mode === 'receipt' ? title.trim() : null,
      customer_name: (mode === 'kilometers' || mode === 'parking') ? (customerName || null) : null,
      route: isKm ? (route || null) : null,
      date: effectiveDate,
      kilometers: kmStored,
      parking_cost: mode === 'parking' ? parseFloat(parkingCost.replace(',', '.')) || 0 : 0,
      description: description || null,
      receipt_image: receiptUrl,
      vehicle_type: isKm ? vehicleType : 'none',
      trip_start: tripStartIso,
      trip_end: tripEndIso,
    } as any);
    setSaving(false);
    if (error) {
      toast.error(t('expense.failedToSave'));
      return;
    }
    toast.success(t('expense.added'));
    onOpenChange(false);
    setKilometers(''); setParkingCost(''); setDescription(''); setTitle('');
    setCustomerName(''); setRoute('');
    setVehicleType('car');
    setTripStart(nowLocal()); setTripEnd(nowLocal());
    clearReceipt();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{t(titleKeys[mode])}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {mode === 'kilometers' || mode === 'parking' ? (
            <div>
              <Label>{t('expense.customer')}</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={t('expense.customerPlaceholder')} />
            </div>
          ) : (
            <>
              <div>
                <Label>{t('expense.title')} *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('expense.titlePlaceholder')} maxLength={120} />
              </div>
              <div>
                <Label>{t('expense.project')}</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder={t('expense.selectProject')} /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
            </>
          )}
          <div>
            <Label>{t('expense.date')}</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          {mode === 'kilometers' && (
            <>
              <div>
                <Label>{t('expense.kilometers')} *</Label>
                <Input type="text" inputMode="decimal" value={kilometers} onChange={e => setKilometers(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>{t('expense.route')}</Label>
                <Input value={route} onChange={e => setRoute(e.target.value)} placeholder={t('expense.routePlaceholder')} />
              </div>
            </>
          )}
          {mode === 'parking' && (
            <div>
              <Label>{t('expense.parkingCost')} *</Label>
              <Input type="text" inputMode="decimal" value={parkingCost} onChange={e => setParkingCost(e.target.value)} placeholder="0,00" />
            </div>
          )}
          {mode === 'receipt' && (
            <div>
              <Label>{t('expense.receiptPhoto')}</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
              {receiptPreview ? (
                <div className="relative">
                  <img src={receiptPreview} alt="Receipt" className="w-full h-40 object-cover rounded-lg border border-border" />
                  <button
                    onClick={clearReceipt}
                    className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed border-border bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                >
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-1">{t('expense.tapToPhoto')}</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG</p>
                </button>
              )}
            </div>
          )}
          <div>
            <Label>{t('expense.description')}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t('expense.descriptionPlaceholder')} />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full touch-target">
            {saving ? t('expense.saving') : t('expense.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
