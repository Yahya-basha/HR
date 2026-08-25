import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';

const empty = { name: '', type: 'morning', start_time: '08:00', end_time: '16:00', working_hours: 8, grace_minutes: 15, description: '' };

const types = [
  { value: 'morning', label: 'دوام صباحي' },
  { value: 'evening', label: 'دوام مسائي' },
  { value: 'flexible', label: 'دوام مرن' },
  { value: 'multi', label: 'دوام فترتين' },
  { value: 'ramadan', label: 'دوام شهر رمضان' }
];

export default function ShiftForm({ open, onOpenChange, shift, onSaved }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const isEdit = !!shift;
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(shift ? { ...empty, ...shift } : empty);
  }, [open, shift]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name) {
      toast({ title: 'يرجى إدخال مسمى الوردية *', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = { 
        ...form, 
        working_hours: Number(form.working_hours) || 8, 
        total_hours: Number(form.working_hours) || 8,
        grace_minutes: Number(form.grace_minutes) || 15 
      };
      if (isEdit) await base44.entities.Shift.update(shift.id, payload);
      else await base44.entities.Shift.create(payload);
      toast({ title: isEdit ? 'تم تحديث الوردية بنجاح' : 'تمت إضافة الوردية بنجاح' });
      onOpenChange(false);
      onSaved && onSaved();
    } catch (e) {
      toast({ title: 'حدث خطأ أثناء الحفظ', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل بيانات الوردية' : 'إضافة وردية عمل جديدة'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>مسمى الوردية *</Label>
            <Input placeholder="مثال: الدوام الصباحي" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>نوع الوردية</Label>
            <Select value={form.type || 'morning'} onValueChange={(v) => set('type', v)}>
              <SelectTrigger><SelectValue placeholder="اختر نوع الوردية" /></SelectTrigger>
              <SelectContent>
                {types.map((tp) => <SelectItem key={tp.value} value={tp.value}>{tp.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>بداية الدوام</Label><Input type="time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>نهاية الدوام</Label><Input type="time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>إجمالي الساعات</Label><Input type="number" value={form.working_hours} onChange={(e) => set('working_hours', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>فترة السماح (دقائق)</Label><Input type="number" value={form.grace_minutes} onChange={(e) => set('grace_minutes', e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>الوصف أو الملاحظات</Label><Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground">{saving ? 'جاري الحفظ...' : 'حفظ الوردية'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
