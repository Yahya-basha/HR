import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Plus, Pencil, Trash2, Building2, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import BranchForm from '@/components/BranchForm';
import { useToast } from '@/components/ui/use-toast';

export default function Branches() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [b, e, c] = await Promise.all([
        base44.entities.Branch.list(),
        base44.entities.Employee.list(),
        base44.entities.Company.list(),
      ]);
      setBranches(b); setEmployees(e); setCompanies(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (b) => { setEditing(b); setFormOpen(true); };

  const remove = async (b) => {
    const count = employees.filter((e) => e.branch === b.name).length;
    if (count > 0) {
      toast({ title: t('branches.hasEmployees'), description: `${count} ${t('branches.employees')}`, variant: 'destructive' });
      return;
    }
    if (!confirm(t('branches.deleteConfirm', { name: b.name }))) return;
    try {
      await base44.entities.Branch.delete(b.id);
      toast({ title: t('branches.deleted') });
      load();
    } catch (e) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    }
  };

  if (!isAdmin) {
    return <div className="text-center py-20"><p className="text-muted-foreground">{t('common.noAccess')}</p></div>;
  }

  const unassigned = employees.filter((e) => !e.branch);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">{t('branches.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('branches.subtitle')}</p>
        </div>
        <Button onClick={openAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="w-4 h-4 me-2" /> {t('branches.add')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-5 border-border/60 shadow-sm"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Building2 className="w-5 h-5" /></div><div><p className="text-2xl font-heading font-bold">{branches.length}</p><p className="text-xs text-muted-foreground">{t('branches.title')}</p></div></div></Card>
        <Card className="p-5 border-border/60 shadow-sm"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><Users className="w-5 h-5" /></div><div><p className="text-2xl font-heading font-bold">{employees.length - unassigned.length}</p><p className="text-xs text-muted-foreground">{t('branches.assignedEmployees')}</p></div></div></Card>
        <Card className="p-5 border-border/60 shadow-sm"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Users className="w-5 h-5" /></div><div><p className="text-2xl font-heading font-bold">{unassigned.length}</p><p className="text-xs text-muted-foreground">{t('branches.unassigned')}</p></div></div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {loading ? (
          [...Array(2)].map((_, i) => <div key={i} className="h-44 rounded-2xl bg-secondary animate-pulse" />)
        ) : branches.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-10">{t('branches.noBranches')}</p>
        ) : branches.map((b) => {
          const branchEmps = employees.filter((e) => e.branch === b.name);
          return (
            <Card key={b.id} className="p-6 border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h3 className="font-heading font-semibold text-lg">{b.name}</h3>
                    <p className="text-xs text-muted-foreground">{b.company || '—'}{b.code ? ` · ${b.code}` : ''}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(b)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              {b.address && <p className="text-xs text-muted-foreground mt-3">{b.address}</p>}
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-muted-foreground">{t('branches.employees')}</span>
                  <Badge className="bg-primary/10 text-primary">{branchEmps.length}</Badge>
                </div>
                {branchEmps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">—</p>
                ) : (
                  <div className="space-y-2">
                    {branchEmps.slice(0, 4).map((e) => (
                      <div key={e.id} className="flex items-center gap-2">
                        <Avatar className="w-7 h-7"><AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{e.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                        <div className="min-w-0"><p className="text-sm font-medium truncate">{e.full_name}</p><p className="text-xs text-muted-foreground truncate">{e.job_title}</p></div>
                      </div>
                    ))}
                    {branchEmps.length > 4 && <p className="text-xs text-muted-foreground">+{branchEmps.length - 4}</p>}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <BranchForm open={formOpen} onOpenChange={setFormOpen} branch={editing} companies={companies} onSaved={load} />
    </div>
  );
}