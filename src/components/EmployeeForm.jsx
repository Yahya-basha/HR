import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';

const empty = {
  full_name: '', email: '', phone: '', job_title: '', department: '',   branch: '', shift: '', leave_policy: '', hire_date: '', salary: '', status: 'active', user_id: '',
  employee_id: '', full_name_ar: '', full_name_en: '', national_id: '', id_expiry_date: '', passport_number: '', passport_expiry_date: '',
  nationality: '', gender: '', date_of_birth: '', marital_status: '', address: '', emergency_contact: '', manager: '', company: '',
};

export default function EmployeeForm({ open, onOpenChange, employee, departments, onSaved }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const isEdit = !!employee;
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [policies, setPolicies] = useState([]);

  useEffect(() => {
    if (open) {
      setForm(employee ? { ...empty, ...employee } : empty);
      setShowIdentity(false);
    }
  }, [open, employee]);

  useEffect(() => {
    base44.entities.Company.list().then(setCompanies).catch(() => {});
    base44.entities.Branch.list().then(setBranches).catch(() => {});
    base44.entities.Shift.list().then(setShifts).catch(() => {});
    base44.entities.LeavePolicy.list().then(setPolicies).catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.full_name || !form.email || !form.job_title || !form.department) {
      toast({ title: t('employeeForm.required'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, salary: Number(form.salary) || 0, employee_id: Number(form.employee_id) || null };
      if (isEdit) await base44.entities.Employee.update(employee.id, payload);
      else await base44.entities.Employee.create(payload);
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('employeeForm.editTitle') : t('employeeForm.addTitle')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5"><Label>{t('employeeForm.fullName')} *</Label><Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('employeeForm.email')} *</Label><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('employeeForm.phone')}</Label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('employeeForm.jobTitle')} *</Label><Input value={form.job_title} onChange={(e) => set('job_title', e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>{t('employeeForm.department')} *</Label>
            <Select value={form.department} onValueChange={(v) => set('department', v)}>
              <SelectTrigger><SelectValue placeholder={t('employeeForm.selectDepartment')} /></SelectTrigger>
              <SelectContent>
                {(departments || []).map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('emp.company')}</Label>
            <Select value={form.company} onValueChange={(v) => set('company', v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('employeeForm.branch')}</Label>
            <Select value={form.branch} onValueChange={(v) => set('branch', v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('emp.shift')}</Label>
            <Select value={form.shift} onValueChange={(v) => set('shift', v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.name}>
                    {s.name}{s.working_hours ? ` · ${s.working_hours} ${t('emp.shiftHours')}` : ''}{s.start_time && s.end_time ? ` (${s.start_time}–${s.end_time})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(() => {
              const sel = shifts.find((s) => s.name === form.shift);
              if (!sel) return null;
              return (
                <p className="text-xs text-muted-foreground bg-secondary/50 rounded-md px-3 py-2">
                  {t('emp.shiftInfo')}: {sel.working_hours ? `${sel.working_hours} ${t('emp.shiftHours')}` : '—'}
                  {sel.start_time && sel.end_time ? ` · ${sel.start_time}–${sel.end_time}` : ''}
                </p>
              );
            })()}
          </div>
          <div className="space-y-1.5">
            <Label>{t('emp.leavePolicy')}</Label>
            <Select value={form.leave_policy} onValueChange={(v) => set('leave_policy', v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {policies.map((p) => <SelectItem key={p.id} value={p.name}>{p.name} · {p.annual_days} {t('leave.days')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>{t('employeeForm.hireDate')}</Label><Input type="date" value={form.hire_date} onChange={(e) => set('hire_date', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('employeeForm.salary')}</Label><Input type="number" value={form.salary} onChange={(e) => set('salary', e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>{t('employeeForm.status')}</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('status.active')}</SelectItem>
                <SelectItem value="on_leave">{t('status.on_leave')}</SelectItem>
                <SelectItem value="inactive">{t('status.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <button type="button" onClick={() => setShowIdentity((s) => !s)} className="flex items-center gap-2 text-sm font-semibold text-primary mt-2">
          {showIdentity ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {t('emp.identity')}
        </button>
        {showIdentity && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            <div className="space-y-1.5"><Label>{t('emp.employeeId')}</Label><Input type="number" value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t('emp.fullNameAr')}</Label><Input value={form.full_name_ar} onChange={(e) => set('full_name_ar', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t('emp.fullNameEn')}</Label><Input value={form.full_name_en} onChange={(e) => set('full_name_en', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t('emp.nationalId')}</Label><Input value={form.national_id} onChange={(e) => set('national_id', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t('emp.idExpiry')}</Label><Input type="date" value={form.id_expiry_date} onChange={(e) => set('id_expiry_date', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t('emp.passportNumber')}</Label><Input value={form.passport_number} onChange={(e) => set('passport_number', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t('emp.passportExpiry')}</Label><Input type="date" value={form.passport_expiry_date} onChange={(e) => set('passport_expiry_date', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t('emp.nationality')}</Label><Input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>{t('emp.gender')}</Label>
              <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('gender.male')}</SelectItem>
                  <SelectItem value="female">{t('gender.female')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t('emp.dob')}</Label><Input type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>{t('emp.maritalStatus')}</Label>
              <Select value={form.marital_status} onValueChange={(v) => set('marital_status', v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">{t('marital.single')}</SelectItem>
                  <SelectItem value="married">{t('marital.married')}</SelectItem>
                  <SelectItem value="divorced">{t('marital.divorced')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t('emp.manager')}</Label><Input value={form.manager} onChange={(e) => set('manager', e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>{t('emp.address')}</Label><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>{t('emp.emergencyContact')}</Label><Input value={form.emergency_contact} onChange={(e) => set('emergency_contact', e.target.value)} /></div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={save} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? t('employeeForm.saving') : isEdit ? t('employeeForm.saveChanges') : t('employeeForm.addBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}