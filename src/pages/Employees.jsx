import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { 
  Plus, 
  Search, 
  Eye, 
  Pencil, 
  Trash2, 
  Building2, 
  Clock, 
  IdCard, 
  Phone, 
  Mail, 
  DollarSign, 
  ShieldCheck, 
  UserCheck,
  Globe
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import EmployeeForm from '@/components/EmployeeForm';
import { useToast } from '@/components/ui/use-toast';

const nationalityBadge = (nat) => {
  const map = {
    'سعودي': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200',
    'مصري': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200',
    'يمني': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200',
    'سوري': 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200',
  };
  return map[nat] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

export default function Employees() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
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
        base44.entities.Employee.list(),
        base44.entities.Department.list(),
      ]);
      setEmployees(emps || []);
      setDepartments(depts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      e.employee_number?.toString().includes(q) ||
      e.full_name?.toLowerCase().includes(q) ||
      e.job_title?.toLowerCase().includes(q) ||
      e.department_name?.toLowerCase().includes(q) ||
      e.branch_name?.toLowerCase().includes(q) ||
      e.nationality?.toLowerCase().includes(q) ||
      e.phone?.includes(q) ||
      e.email?.toLowerCase().includes(q)
    );
  });

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (emp) => { setEditing(emp); setFormOpen(true); };

  const handleDelete = async (emp) => {
    if (!confirm(`هل أنت متأكد من حذف الموظف ${emp.full_name} (${emp.employee_number})؟`)) return;
    try {
      await base44.entities.Employee.delete(emp.id);
      toast({ title: 'تم حذف الموظف بنجاح' });
      load();
    } catch (err) {
      toast({ title: 'خطأ أثناء الحذف', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">دليل الموظفين وسجلات الكادر ({employees.length} موظف)</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة بيانات الموظفين، الأرقام الوظيفية، الفروع، والرواتب</p>
        </div>
        <Button onClick={openAdd} className="bg-primary text-primary-foreground shadow-sm">
          <Plus className="w-4 h-4 me-2" /> إضافة موظف جديد
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="p-4 border-border/60 shadow-sm rounded-2xl">
        <div className="relative">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="البحث بالرقم الوظيفي (مثال: 1001, 1022), الاسم, المسمى الوظيفي, الفرع, أو الجنسية..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10 h-12 rounded-xl bg-secondary/30 text-sm"
          />
        </div>
      </Card>

      {/* Employees Table */}
      <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40 hover:bg-secondary/40">
              <TableHead className="font-bold text-xs">الرقم الوظيفي</TableHead>
              <TableHead className="font-bold text-xs">الموظف والبيانات</TableHead>
              <TableHead className="font-bold text-xs">المسمى الوظيفي</TableHead>
              <TableHead className="font-bold text-xs">الفرع / القسم</TableHead>
              <TableHead className="font-bold text-xs">فترة العمل (الوردية)</TableHead>
              <TableHead className="font-bold text-xs">الراتب والبدلات</TableHead>
              <TableHead className="font-bold text-xs">الجنسية</TableHead>
              <TableHead className="font-bold text-xs text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8} className="h-14 bg-secondary/20 animate-pulse" />
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-medium">
                  لا توجد نتائج مطابقة لبحثك
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-secondary/20 transition-colors">
                  {/* Employee Number #ID */}
                  <TableCell className="font-mono font-bold">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold px-2.5 py-1 text-xs">
                      #{emp.employee_number || emp.id}
                    </Badge>
                  </TableCell>

                  {/* Name, Phone, Email */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-border shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {emp.full_name?.slice(0, 2) || 'HR'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link to={`/employees/${emp.id}`} className="font-bold text-sm text-foreground hover:text-primary transition-colors block">
                          {emp.full_name}
                        </Link>
                        <span className="text-xs text-muted-foreground font-mono ltr-nums block" dir="ltr" style={{direction: "ltr", unicodeBidi: "embed"}}>{emp.phone || emp.email}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Job Title */}
                  <TableCell className="font-medium text-xs text-foreground">
                    {emp.job_title || 'بائع قطع غيار'}
                  </TableCell>

                  {/* Branch & Department */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{emp.branch_name || emp.department_name || 'الفرع الرئيسي'}</span>
                    </div>
                  </TableCell>

                  {/* Shift */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate max-w-[140px]">{emp.shift || 'دوام رسمي'}</span>
                    </div>
                  </TableCell>

                  {/* Salary & Allowances */}
                  <TableCell>
                    <div className="text-xs font-bold text-foreground">
                      {Number(emp.salary || 0).toLocaleString()} ر.س
                    </div>
                    {(emp.housing_allowance > 0 || emp.transport_allowance > 0) && (
                      <div className="text-[10px] text-muted-foreground">
                        بدلات: +{Number(emp.housing_allowance || 0) + Number(emp.transport_allowance || 0)} ر.س
                      </div>
                    )}
                  </TableCell>

                  {/* Nationality */}
                  <TableCell>
                    <Badge variant="outline" className={`text-[11px] font-bold px-2 py-0.5 border ${nationalityBadge(emp.nationality)}`}>
                      {emp.nationality || 'سعودي'}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Link to={`/employees/${emp.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-secondary">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(emp)} className="h-8 w-8 hover:bg-secondary">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(emp)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <EmployeeForm open={formOpen} onOpenChange={setFormOpen} employee={editing} departments={departments} onSaved={load} />
    </div>
  );
}
