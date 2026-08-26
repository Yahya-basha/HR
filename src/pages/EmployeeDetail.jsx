import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/lib/i18n';
import { 
  ArrowRight, 
  Mail, 
  Phone, 
  Briefcase, 
  Building2, 
  Calendar, 
  DollarSign, 
  IdCard, 
  Globe, 
  User, 
  Clock, 
  FileText, 
  ShieldCheck, 
  CalendarDays,
  Coins
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export default function EmployeeDetail() {
  const { id } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const e = await base44.entities.Employee.get(id);
        setEmp(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="h-64 rounded-2xl bg-secondary animate-pulse" />;
  if (!emp) return (
    <Card className="p-12 text-center">
      <p className="text-muted-foreground mb-4">لم يتم العثور على ملف الموظف</p>
      <Button onClick={() => navigate('/employees')}>العودة لدليل الموظفين</Button>
    </Card>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Back Button */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/employees')} className="rounded-xl">
          <ArrowRight className="w-4 h-4 me-1.5" /> العودة للموظفين
        </Button>
      </div>

      {/* Main Profile Header Card */}
      <Card className="p-6 border-border/60 shadow-sm rounded-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-primary/20 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                {emp.full_name?.slice(0, 2) || 'HR'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-heading font-bold text-foreground">{emp.full_name}</h1>
                <Badge className="bg-primary/10 text-primary border-primary/30 font-mono font-bold px-2.5 py-0.5 text-sm">
                  #{emp.employee_number || emp.id}
                </Badge>
              </div>
              <p className="text-sm font-semibold text-muted-foreground mt-0.5">{emp.job_title || 'بائع قطع غيار'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-3 py-1">
              {emp.nationality || 'سعودي'}
            </Badge>
            <Badge className="bg-emerald-600 text-white font-bold px-3 py-1">
              على رأس العمل (نشط)
            </Badge>
          </div>
        </div>
      </Card>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: الوظيفة والفرع */}
        <Card className="p-6 border-border/60 shadow-sm rounded-2xl space-y-4">
          <h3 className="font-heading font-bold text-base text-foreground pb-2 border-b border-border/50 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> البيانات الوظيفية والفرع
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الرقم الوظيفي:</span>
              <span className="font-mono font-bold text-primary">#{emp.employee_number || emp.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">المسمى الوظيفي:</span>
              <span className="font-bold text-foreground">{emp.job_title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الفرع التابع له:</span>
              <span className="font-semibold text-foreground">{emp.branch_name || 'الفرع الرئيسي'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">القسم:</span>
              <span className="font-semibold text-foreground">{emp.department_name || 'مكتب الإدارة'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">فترة العمل (الوردية):</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">{emp.shift || 'شفت رسمي'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">تاريخ التعيين:</span>
              <span className="font-mono text-foreground">{emp.join_date || '2022-11-01'}</span>
            </div>
          </div>
        </Card>

        {/* Card 2: الهوية والبيانات الشخصية */}
        <Card className="p-6 border-border/60 shadow-sm rounded-2xl space-y-4">
          <h3 className="font-heading font-bold text-base text-foreground pb-2 border-b border-border/50 flex items-center gap-2">
            <IdCard className="w-5 h-5 text-primary" /> الهوية والاتصال
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الجنسية:</span>
              <span className="font-bold text-foreground">{emp.nationality || 'سعودي'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">رقم الهوية / الإقامة:</span>
              <span className="font-mono font-bold text-foreground">{emp.national_id || '--'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">رقم الجوال:</span>
              <span className="font-mono font-bold text-foreground dir-ltr"><span className="ltr-nums" dir="ltr" style={{direction: "ltr", unicodeBidi: "embed"}}>{emp.phone}</span></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">البريد الإلكتروني:</span>
              <span className="font-mono text-foreground">{emp.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">سياسة الإجازات:</span>
              <Badge variant="outline" className="font-semibold">{emp.leave_policy || 'الاجازة السنوية'}</Badge>
            </div>
          </div>
        </Card>

        {/* Card 3: الراتب والبدلات */}
        <Card className="p-6 border-border/60 shadow-sm rounded-2xl space-y-4 md:col-span-2">
          <h3 className="font-heading font-bold text-base text-foreground pb-2 border-b border-border/50 flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600" /> تفاصيل الراتب والبدلات الشهرية
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
            <div className="bg-secondary/40 p-4 rounded-xl text-center border">
              <span className="text-xs text-muted-foreground block mb-1">الراتب الأساسي</span>
              <span className="text-xl font-bold text-foreground font-mono">{Number(emp.salary || 0).toLocaleString()} ر.س</span>
            </div>

            <div className="bg-secondary/40 p-4 rounded-xl text-center border">
              <span className="text-xs text-muted-foreground block mb-1">بدل السكن</span>
              <span className="text-xl font-bold text-emerald-600 font-mono">+{Number(emp.housing_allowance || 0).toLocaleString()} ر.س</span>
            </div>

            <div className="bg-secondary/40 p-4 rounded-xl text-center border">
              <span className="text-xs text-muted-foreground block mb-1">بدل الانتقال</span>
              <span className="text-xl font-bold text-emerald-600 font-mono">+{Number(emp.transport_allowance || 0).toLocaleString()} ر.س</span>
            </div>

            <div className="bg-primary/10 p-4 rounded-xl text-center border border-primary/30">
              <span className="text-xs text-primary font-bold block mb-1">إجمالي المستحق الشهري</span>
              <span className="text-xl font-bold text-primary font-mono">
                {(Number(emp.salary || 0) + Number(emp.housing_allowance || 0) + Number(emp.transport_allowance || 0)).toLocaleString()} ر.س
              </span>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
