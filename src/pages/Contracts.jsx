import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Plus, Pencil } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import ContractForm from '@/components/ContractForm';

const statusBadge = (s) => {
  const map = { active: 'bg-emerald-100 text-emerald-700', expired: 'bg-amber-100 text-amber-700', terminated: 'bg-red-100 text-red-700' };
  return map[s] || 'bg-slate-100 text-slate-600';
};

export default function Contracts() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.role === 'admin';
  const [contracts, setContracts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, comp] = await Promise.all([
        base44.entities.EmploymentContract.list('-created_date'),
        base44.entities.Company.list(),
      ]);
      setContracts(c);
      setCompanies(comp);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (c) => { setEditing(c); setFormOpen(true); };

  if (!isAdmin) {
    return <div className="text-center py-20"><p className="text-muted-foreground">{t('common.noAccess')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">{t('contracts.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('contracts.subtitle')}</p>
        </div>
        <Button onClick={openAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="w-4 h-4 me-2" /> {t('contracts.add')}
        </Button>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60">
                <TableHead>{t('contracts.contractId')}</TableHead>
                <TableHead>{t('contracts.employee')}</TableHead>
                <TableHead>{t('contracts.company')}</TableHead>
                <TableHead>{t('contracts.contractType')}</TableHead>
                <TableHead>{t('contracts.endDate')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(4)].map((_, i) => <TableRow key={i}><TableCell colSpan={7}><div className="h-6 bg-secondary rounded animate-pulse" /></TableCell></TableRow>)
              ) : contracts.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">{t('contracts.noContracts')}</TableCell></TableRow>
              ) : contracts.map((c) => (
                <TableRow key={c.id} className="hover:bg-secondary/40">
                  <TableCell className="font-medium text-sm">{c.contract_id || '—'}</TableCell>
                  <TableCell className="text-sm">{c.employee_name}</TableCell>
                  <TableCell className="text-sm">{c.company}</TableCell>
                  <TableCell className="text-sm">{t('contracts.type' + c.contract_type.charAt(0).toUpperCase() + c.contract_type.slice(1))}</TableCell>
                  <TableCell className="text-sm">{c.end_date || '—'}</TableCell>
                  <TableCell><Badge className={statusBadge(c.status)}>{t('contracts.status' + c.status.charAt(0).toUpperCase() + c.status.slice(1))}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ContractForm open={formOpen} onOpenChange={setFormOpen} contract={editing} companies={companies} onSaved={load} />
    </div>
  );
}