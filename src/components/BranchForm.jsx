import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';

const empty = { name: '', code: '', company: '', address: '' };

export default function BranchForm({ open, onOpenChange, branch, companies, onSaved }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const isEdit = !!branch;
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(branch ? { ...empty, ...branch } : empty);
  }, [open, branch]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name) {
      toast({ title: t('branches.name') + ' *', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await base44.entities.Branch.update(branch.id, form);
      else await base44.entities.Branch.create(form);
      toast({ title: isEdit ? t('employeeForm.updated') : t('employeeForm.added') });
      onOpenChange(false);
      onSaved && onSaved();
    } catch (e) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('branches.editTitle') : t('branches.addTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>{t('branches.name')} *</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('branches.code')}</Label><Input value={form.code} onChange={(e) => set('code', e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>{t('branches.company')}</Label>
            <Select value={form.company} onValueChange={(v) => set('company', v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {(companies || []).map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>{t('branches.address')}</Label><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={save} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">{saving ? t('employeeForm.saving') : t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}