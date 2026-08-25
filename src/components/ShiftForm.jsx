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

const empty = { name: '', type: 'morning', start_time: '', end_time: '', working_hours: '', grace_minutes: 15, description: '' };

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
      toast({ title: t('shifts.name') + ' *', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, working_hours: Number(form.working_hours) || 0, grace_minutes: Number(form.grace_minutes) || 0 };
      if (isEdit) await base44.entities.Shift.update(shift.id, payload);
      else await base44.entities.Shift.create(payload);
      toast({ title: isEdit ? t('employeeForm.updated') : t('employeeForm.added') });
      onOpenChange(false);
      onSaved && onSaved();
    } catch (e) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const types = ['flexible', 'morning', 'evening', 'multi', 'ramadan'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('shifts.editTitle') : t('shifts.addTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>{t('shifts.name')} *</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>{t('shifts.type')}</Label>
            <Select value={form.type} onValueChange={(v) => set('type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {types.map((tp) => <SelectItem key={tp} value={tp}>{t('shifts.type' + tp.charAt(0).toUpperCase() + tp.slice(1))}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>{t('shifts.startTime')}</Label><Input type="time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t('shifts.endTime')}</Label><Input type="time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>{t('shifts.workingHours')}</Label><Input type="number" value={form.working_hours} onChange={(e) => set('working_hours', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t('shifts.grace')}</Label><Input type="number" value={form.grace_minutes} onChange={(e) => set('grace_minutes', e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>{t('shifts.description')}</Label><Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={save} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">{saving ? t('employeeForm.saving') : t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}