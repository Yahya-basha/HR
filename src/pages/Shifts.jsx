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

const typeColor = (tp) => ({
  flexible: 'bg-slate-200 text-slate-700',
  morning: 'bg-amber-100 text-amber-700',
  evening: 'bg-indigo-100 text-indigo-700',
  multi: 'bg-purple-100 text-purple-700',
  ramadan: 'bg-emerald-100 text-emerald-700',
}[tp] || 'bg-slate-100 text-slate-600');

export default function Shifts() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.role === 'admin';
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
      setShifts(s); setEmployees(e);
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
      toast({ title: t('shifts.hasEmployees'), description: `${count} ${t('shifts.employees')}`, variant: 'destructive' });
      return;
    }
    if (!confirm(t('shifts.deleteConfirm', { name: s.name }))) return;
    try {
      await base44.entities.Shift.delete(s.id);
      toast({ title: t('shifts.deleted') });
      load();
    } catch (e) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    }
  };

  if (!isAdmin) {
    return <div className="text-center py-20"><p className="text-muted-foreground">{t('common.noAccess')}</p></div>;
  }

  const fmtRange = (s) => {
    if (!s.start_time && !s.end_time) return t('shifts.flexibleNote');
    return `${s.start_time || '—'} → ${s.end_time || '—'}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">{t('shifts.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('shifts.subtitle')}</p>
        </div>
        <Button onClick={openAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="w-4 h-4 me-2" /> {t('shifts.add')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-44 rounded-2xl bg-secondary animate-pulse" />)
        ) : shifts.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-10">{t('shifts.noShifts')}</p>
        ) : shifts.map((s) => {
          const count = employees.filter((e) => e.shift === s.name).length;
          return (
            <Card key={s.id} className="p-6 border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Clock className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h3 className="font-heading font-semibold text-lg">{s.name}</h3>
                    <Badge className={`mt-0.5 ${typeColor(s.type)}`}>{t('shifts.type' + s.type.charAt(0).toUpperCase() + s.type.slice(1))}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(s)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t('shifts.range')}</span><span className="font-medium">{fmtRange(s)}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t('shifts.workingHours')}</span><span className="font-medium">{s.working_hours ? `${s.working_hours} ${t('shifts.hoursUnit')}` : '—'}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t('shifts.grace')}</span><span className="font-medium">{s.grace_minutes ? `${s.grace_minutes} ${t('shifts.minUnit')}` : '—'}</span></div>
              </div>
              {s.description && <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">{s.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('shifts.employees')}</span>
                <Badge className="bg-primary/10 text-primary">{count}</Badge>
              </div>
            </Card>
          );
        })}
      </div>

      <ShiftForm open={formOpen} onOpenChange={setFormOpen} shift={editing} onSaved={load} />
    </div>
  );
}