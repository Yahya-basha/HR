import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ShiftForm from '@/components/ShiftForm';
import { useToast } from '@/components/ui/use-toast';

const typeColor = (tp = 'morning') => ({
  flexible: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  morning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200',
  evening: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200',
  multi: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200',
  ramadan: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200',
}[tp] || 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200');

export default function Shifts() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, e] = await Promise.all([
        base44.entities.Shift.list(),
        base44.entities.Employee.list(),
      ]);
      setShifts(s && s.length > 0 ? s : [
        { id: 'sh_1', name: 'الدوام الصباحي (8 ص - 4 م)', type: 'morning', start_time: '08:00', end_time: '16:00', total_hours: 8, grace_minutes: 15, description: 'فترة العمل الصباحية الرسمية' },
        { id: 'sh_2', name: 'الدوام المسائي (4 م - 12 ص)', type: 'evening', start_time: '16:00', end_time: '00:00', total_hours: 8, grace_minutes: 15, description: 'فترة العمل المسائية' }
      ]);
      setEmployees(e || []);
    } catch (err) {
      console.error('Error loading shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (s) => { setEditing(s); setFormOpen(true); };

  const remove = async (s) => {
    const count = employees.filter((e) => e.shift === s.name).length;
    if (count > 0) {
      toast({ title: t('shifts.hasEmployees') || 'لا يمكن حذف الوردية', description: `يوجد ${count} موظف مسجل بها`, variant: 'destructive' });
      return;
    }
    if (!confirm(t('shifts.deleteConfirm', { name: s.name }) || `هل أنت متأكد من حذف وردية ${s.name}؟`)) return;
    try {
      await base44.entities.Shift.delete(s.id);
      toast({ title: t('shifts.deleted') || 'تم حذف الوردية بنجاح' });
      load();
    } catch (e) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    }
  };

  const fmtRange = (s) => {
    if (!s.start_time && !s.end_time) return t('shifts.flexibleNote') || 'دوام مرن';
    return `${s.start_time || '--:--'} - ${s.end_time || '--:--'}`;
  };

  const getShiftTypeLabel = (type = 'morning') => {
    const map = {
      morning: 'دوام صباحي',
      evening: 'دوام مسائي',
      flexible: 'دوام مرن',
      multi: 'دوام فترتين',
      ramadan: 'دوام شهر رمضان'
    };
    return map[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">{t('shifts.title') || 'إدارة الورديات ومواعيد العمل'}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('shifts.subtitle') || 'تحديد فترات العمل الصباحية والمسائية وساعات الدوام وفترات السماح'}</p>
        </div>
        <Button onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
          <Plus className="w-4 h-4 me-2" /> {t('shifts.add') || 'إضافة وردية جديدة'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-48 rounded-2xl bg-secondary animate-pulse" />)
        ) : shifts.length === 0 ? (
          <Card className="p-12 text-center col-span-full border-dashed border-2">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground font-medium mb-4">{t('shifts.noShifts') || 'لا توجد ورديات عمل مضافة حتى الآن'}</p>
            <Button onClick={openAdd} variant="outline"><Plus className="w-4 h-4 me-2" /> {t('shifts.add') || 'إضافة وردية'}</Button>
          </Card>
        ) : shifts.map((s) => {
          const count = employees.filter((e) => e.shift === s.name).length;
          const shiftType = s.type || 'morning';
          return (
            <Card key={s.id} className="p-6 border-border/60 shadow-sm hover:shadow-md transition-all rounded-2xl relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg text-foreground">{s.name}</h3>
                    <Badge className={`mt-1 text-xs font-semibold ${typeColor(shiftType)}`}>
                      {getShiftTypeLabel(shiftType)}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="hover:bg-secondary"><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(s)} className="text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              
              <div className="mt-5 space-y-2.5 text-sm bg-secondary/30 p-3.5 rounded-xl border border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('shifts.range') || 'فترة الدوام'}:</span>
                  <span className="font-bold text-foreground dir-ltr font-mono">{fmtRange(s)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('shifts.workingHours') || 'ساعات العمل'}:</span>
                  <span className="font-semibold text-foreground">{s.total_hours || s.working_hours || 8} {t('shifts.hoursUnit') || 'ساعات'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('shifts.grace') || 'فترة السماح'}:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{s.grace_minutes || 15} {t('shifts.minUnit') || 'دقيقة'}</span>
                </div>
              </div>

              {s.description && <p className="text-xs text-muted-foreground mt-3 pt-2.5 border-t border-border/40">{s.description}</p>}
              
              <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{t('shifts.employees') || 'الموظفون المسجلون'}:</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold px-2.5 py-0.5">
                  {count} موظف
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>

      <ShiftForm open={formOpen} onOpenChange={setFormOpen} shift={editing} onSaved={load} />
    </div>
  );
}
