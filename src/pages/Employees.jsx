import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Plus, Search, Eye, Pencil } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import EmployeeForm from '@/components/EmployeeForm';

const statusBadge = (s) => {
  const map = { active: 'bg-emerald-100 text-emerald-700', on_leave: 'bg-amber-100 text-amber-700', inactive: 'bg-slate-200 text-slate-600' };
  return map[s] || 'bg-slate-100 text-slate-600';
};

export default function Employees() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.role === 'admin';
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [emps, depts] = await Promise.all([
        base44.entities.Employee.list('-created_date'),
        base44.entities.Department.list(),
      ]);
      setEmployees(emps);
      setDepartments(depts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return !q || e.full_name?.toLowerCase().includes(q) || e.job_title?.toLowerCase().includes(q) || e.department?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q);
  });

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (emp) => { setEditing(emp); setFormOpen(true); };

  if (!isAdmin) {
    return <div className="text-center py-20"><p className="text-muted-foreground">{t('common.noAccess')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">{t('employees.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('employees.subtitle', { n: employees.length, m: departments.length })}</p>
        </div>
        <Button onClick={openAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="w-4 h-4 me-2" /> {t('employees.add')}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder={t('employees.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60">
                <TableHead>{t('common.employee')}</TableHead>
                <TableHead>{t('common.jobTitle')}</TableHead>
                <TableHead>{t('common.department')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><div className="h-6 bg-secondary rounded animate-pulse" /></TableCell></TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">{t('employees.noEmployees')}</TableCell></TableRow>
              ) : filtered.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-secondary/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9 bg-primary/10">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{emp.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{emp.job_title}</TableCell>
                  <TableCell className="text-sm">{emp.department}</TableCell>
                  <TableCell><Badge className={statusBadge(emp.status)}>{t('status.' + emp.status)}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/employees/${emp.id}`}><Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button></Link>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}><Pencil className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <EmployeeForm open={formOpen} onOpenChange={setFormOpen} employee={editing} departments={departments} onSaved={load} />
    </div>
  );
}