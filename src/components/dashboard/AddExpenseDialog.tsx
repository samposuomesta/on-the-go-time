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
  const [customerName, setCustomerName] = useState('');
  const [route, setRoute] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [parkingCost, setParkingCost] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSave = async () => {
    setSaving(true);

    let receiptUrl: string | null = null;
    if (mode === 'receipt' && receiptFile) {
      receiptUrl = await uploadReceipt();
      if (!receiptUrl) {
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase.from('travel_expenses').insert({
      user_id: userId,
      project_id: projectId || null,
      customer_name: mode === 'kilometers' ? (customerName || null) : null,
      route: mode === 'kilometers' ? (route || null) : null,
      date,
      kilometers: mode === 'kilometers' ? parseFloat(kilometers.replace(',', '.')) || 0 : 0,
      parking_cost: mode === 'parking' ? parseFloat(parkingCost.replace(',', '.')) || 0 : 0,
      description: description || null,
      receipt_image: receiptUrl,
    } as any);
    setSaving(false);
    if (error) {
      toast.error(t('expense.failedToSave'));
      return;
    }
    toast.success(t('expense.added'));
    onOpenChange(false);
    setKilometers(''); setParkingCost(''); setDescription('');
    setCustomerName(''); setRoute('');
    clearReceipt();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{t(titleKeys[mode])}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {mode === 'kilometers' ? (
            <div>
              <Label>{t('expense.customer')}</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={t('expense.customerPlaceholder')} />
            </div>
          ) : (
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
          )}
          <div>
            <Label>{t('expense.date')}</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          {mode === 'kilometers' && (
            <div>
              <Label>{t('expense.kilometers')} *</Label>
              <Input type="number" step="0.1" min="0" value={kilometers} onChange={e => setKilometers(e.target.value)} placeholder="0" />
            </div>
          )}
          {mode === 'parking' && (
            <div>
              <Label>{t('expense.parkingCost')} *</Label>
              <Input type="number" step="0.01" min="0" value={parkingCost} onChange={e => setParkingCost(e.target.value)} placeholder="0.00" />
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
