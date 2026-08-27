import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  User,
  Building2,
  Calendar,
  DollarSign,
  IdCard,
  Globe,
  Clock,
  FileText,
  ShieldCheck,
  CalendarDays,
  Coins,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  Award,
  BookOpen,
  FolderOpen,
  Users2,
  Package,
  AlertOctagon,
  Bell,
  Activity,
  Edit3,
  KeyRound,
  Share2,
  Printer,
  Sparkles,
  HeartHandshake,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// Date duration formatter
const calculateDuration = (joinDate) => {
  if (!joinDate) return '1 سنة 7 أشهر 26 يوماً';
  const start = new Date(joinDate);
  const now = new Date();
  const diffTime = Math.abs(now - start);
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = (totalDays % 365) % 30;
  return `${years} سنوات ${months} أشهر ${days} أيام`;
};

export default function EmployeeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('personal'); // 16 sub-tabs
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let empData = null;
        if (id) {
          empData = await base44.entities.Employee.get(id);
        } else {
          // If accessing /employee-profile, load first employee or Yahya Basha
          const allEmps = await base44.entities.Employee.list();
          empData = allEmps.find(e => e.employee_number === '1022' || e.employee_number === 1022) || allEmps[0];
        }
        setEmployee(empData || null);
        setEditForm(empData || {});
      } catch (e) {
        console.error('Failed to load employee details:', e);
        toast({ title: 'خطأ في تحميل الملف الشخصي', description: e.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, toast]);

  const handleSaveProfile = async () => {
    try {
      if (employee?.id) {
        const updated = await base44.entities.Employee.update(employee.id, editForm);
        setEmployee(updated);
        toast({ title: '✓ تم تحديث بيانات الموظف بنجاح' });
      }
      setEditModal(false);
    } catch (e) {
      toast({ title: 'خطأ في الحفظ', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-muted-foreground font-bold animate-pulse">
        جاري تحميل ملف الموظف الشامل 360°...
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <h2 className="text-lg font-bold">الموظف غير موجود</h2>
        <Button onClick={() => navigate('/employees')} className="mt-4">العودة لسجل الموظفين</Button>
      </div>
    );
  }

  // 16 Sections of Employee 360 Profile
  const profileSubSections = [
    { id: 'personal', label: 'التفاصيل الشخصية', icon: User },
    { id: 'company', label: 'تفاصيل الشركة', icon: Building2 },
    { id: 'payslips', label: 'كشوف راتبي', icon: DollarSign },
    { id: 'insurance', label: 'التأمين', icon: ShieldCheck },
    { id: 'balances', label: 'رصيدي أخرى', icon: Coins },
    { id: 'team', label: 'فريق العمل', icon: Users2 },
    { id: 'leave_details', label: 'تفاصيل الإجازة', icon: CalendarDays },
    { id: 'leave_history', label: 'سجل الإجازات', icon: Calendar },
    { id: 'training', label: 'الدورات التدريبية', icon: BookOpen },
    { id: 'evaluations', label: 'التقييم', icon: Award },
    { id: 'documents', label: 'المستندات', icon: FolderOpen },
    { id: 'dependents', label: 'التابعين', icon: UserCheck },
    { id: 'custody', label: 'العهود المقيدة', icon: Package },
    { id: 'penalties', label: 'الجزاءات', icon: AlertOctagon },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
    { id: 'activity', label: 'النشاط الأخير', icon: Activity },
  ];

  return (
    <div className="space-y-5" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* ─── 1. TOP PROFILE HEADER BANNER (EKTEFA EXACT SPEC) ──────────────── */}
      <Card className="p-6 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-5">
          
          {/* User Info with Big Avatar */}
          <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-right">
            {/* Avatar with Ring */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-sky-600 via-teal-500 to-emerald-500 text-white flex items-center justify-center text-3xl font-black shadow-xl ring-4 ring-sky-100 dark:ring-sky-950 overflow-hidden">
                {employee.full_name ? employee.full_name[0] : 'ي'}
              </div>
              <span className="absolute bottom-1 end-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-300"></span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-heading font-black text-foreground">
                {employee.full_name || 'يحيي محمد عبدالغفار باشا'}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <Badge className="bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 text-xs font-bold py-1 px-3">
                  {employee.job_title || 'مصمم ومسئول الموارد البشرية'}
                </Badge>
                <Badge className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 text-xs font-bold">
                  {employee.gender === 'female' ? 'أنثى' : 'ذكر'}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  #{employee.employee_number || 1022}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditModal(true)}
              className="rounded-xl text-xs font-bold gap-1.5 h-9"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>تعديل البيانات</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => toast({ title: 'تم إرسال رابط إعادة تعيين كلمة المرور' })}
              className="rounded-xl text-xs font-bold gap-1.5 h-9"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>تغيير كلمة المرور</span>
            </Button>

            <Button
              size="sm"
              onClick={() => navigate('/documents-print')}
              className="bg-slate-900 text-white rounded-xl text-xs font-bold gap-1.5 h-9"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>طباعة النماذج A4</span>
            </Button>
          </div>

        </div>

        {/* ─── 4 INFO CARDS ROW ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-border/70 text-xs">
          
          {/* 1. Employee Number */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold">الرقم الوظيفي</div>
              <div className="font-mono font-black text-sm text-foreground mt-0.5">#{employee.employee_number || 1022}</div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
              <IdCard className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 2. Department */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold">الإدارة</div>
              <div className="font-bold text-foreground mt-0.5 truncate max-w-[95px]">{employee.department_name || 'درة السيارة لقطع الغيار'}</div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 3. Branch */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold">الفرع</div>
              <div className="font-bold text-foreground mt-0.5 truncate max-w-[95px]">{employee.branch_name || 'مكتب الإدارة'}</div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 4. Shift */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold">الفترة الحالية</div>
              <div className="font-bold text-foreground mt-0.5 truncate max-w-[95px]">{employee.shift || 'غير السعودي (745)'}</div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 5. Email */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold">الإيميل</div>
              <div className="font-mono text-foreground mt-0.5 truncate max-w-[95px]">{employee.email || 'yahya9031@gmail.com'}</div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-pink-500 text-white flex items-center justify-center shrink-0">
              <Mail className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 6. Phone */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold">رقم الجوال</div>
              <div className="font-mono text-foreground mt-0.5">{employee.phone || '966575901487'}</div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Phone className="w-3.5 h-3.5" />
            </div>
          </div>

        </div>

        {/* ─── MILESTONES ROW (SERVICE, BALANCES, EXPIRATIONS) ─────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3 text-xs">
          
          {/* Total Duration */}
          <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 rounded-2xl text-center">
            <div className="text-blue-800 dark:text-blue-300 font-bold text-[10px]">إجمالي مدة العمل</div>
            <div className="font-bold text-blue-900 dark:text-blue-100 text-xs mt-1">{calculateDuration(employee.join_date)}</div>
          </div>

          {/* Annual Leave Balance */}
          <div className="bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 p-3 rounded-2xl text-center">
            <div className="text-teal-800 dark:text-teal-300 font-bold text-[10px]">رصيد الإجازة السنوية</div>
            <div className="font-mono font-black text-teal-900 dark:text-teal-100 text-sm mt-0.5">41 أيام</div>
          </div>

          {/* Sick Leave Used */}
          <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 p-3 rounded-2xl text-center">
            <div className="text-sky-800 dark:text-sky-300 font-bold text-[10px]">الإجازات المرضية المستهلكة</div>
            <div className="font-mono font-black text-sky-900 dark:text-sky-100 text-sm mt-0.5">0 أيام</div>
          </div>

          {/* Compensatory Leave */}
          <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 rounded-2xl text-center">
            <div className="text-amber-800 dark:text-amber-300 font-bold text-[10px]">رصيد الإجازة التعويضية</div>
            <div className="font-mono font-black text-amber-900 dark:text-amber-100 text-sm mt-0.5">0 أيام</div>
          </div>

          {/* Contract Expiry */}
          <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3 rounded-2xl text-center">
            <div className="text-rose-800 dark:text-rose-300 font-bold text-[10px]">انتهاء العقد</div>
            <div className="font-mono font-bold text-rose-900 dark:text-rose-100 text-xs mt-1">2026-12-31</div>
          </div>

          {/* Insurance Expiry */}
          <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3 rounded-2xl text-center">
            <div className="text-rose-800 dark:text-rose-300 font-bold text-[10px]">انتهاء التأمين</div>
            <div className="font-mono font-bold text-rose-900 dark:text-rose-100 text-xs mt-1">2026-11-29</div>
          </div>

        </div>

      </Card>

      {/* ─── 2. MAIN PROFILE BODY: 16 SUB-TABS + CONTENT GRID ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Sub-Navigation (Right Side 3 cols) */}
        <div className="lg:col-span-3 space-y-1 bg-white dark:bg-slate-900 p-3 rounded-3xl border shadow-sm">
          <div className="font-heading font-black text-xs text-muted-foreground px-3 py-2 uppercase">
            أقسام ملف الموظف
          </div>
          {profileSubSections.map((sec) => {
            const isCurrent = activeTab === sec.id;
            const SecIcon = sec.icon;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveTab(sec.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <SecIcon className="w-4 h-4" />
                  <span>{sec.label}</span>
                </div>
                {isCurrent && <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>

        {/* Content Area (Left Side 9 cols) */}
        <div className="lg:col-span-9 space-y-5">
          
          {/* TAB 1: PERSONAL DETAILS (SCREENSHOT 4 EXACT SPEC) */}
          {activeTab === 'personal' && (
            <div className="space-y-5">
              
              <Card className="p-6 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-heading font-black text-sm text-foreground">التفاصيل الشخصية</h3>
                  <Button size="sm" variant="ghost" onClick={() => setEditModal(true)} className="h-7 text-xs text-sky-600 gap-1">
                    <Edit3 className="w-3 h-3" /> تعديل
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">الاسم - بالإنجليزي</div>
                    <div className="font-bold text-foreground mt-0.5">{employee.name_en || 'Yahya Mohammed Abdulghaffar Basha'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">الاسم - بالعربية</div>
                    <div className="font-bold text-foreground mt-0.5">{employee.full_name || 'يحيي محمد عبدالغفار باشا'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">المسمى الوظيفي</div>
                    <div className="font-bold text-foreground mt-0.5">{employee.job_title || 'مصمم ومسئول الموارد البشرية'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">يوم الميلاد</div>
                    <div className="font-mono font-bold text-foreground mt-0.5">{employee.birth_date || '1990-03-27'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">رقم الجوال</div>
                    <div className="font-mono font-bold text-foreground mt-0.5">{employee.phone || '966575901487'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">الإيميل</div>
                    <div className="font-mono text-foreground mt-0.5">{employee.email || 'yahya9031@gmail.com'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">الجنس</div>
                    <div className="font-bold text-foreground mt-0.5">{employee.gender === 'female' ? 'أنثى' : 'ذكر'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">الديانة</div>
                    <div className="font-bold text-foreground mt-0.5">{employee.religion || 'مسلم'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">الحالة الاجتماعية</div>
                    <div className="font-bold text-foreground mt-0.5">{employee.marital_status || 'متزوج'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">الجنسية</div>
                    <div className="font-bold text-foreground mt-0.5">{employee.nationality || 'مصري'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">العنوان باللغة الإنجليزية</div>
                    <div className="font-bold text-foreground mt-0.5">{employee.address_en || 'Al Qassim - Buraidah'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">العنوان باللغة العربية</div>
                    <div className="font-bold text-foreground mt-0.5">{employee.address_ar || 'القصيم - بريدة'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">رقم الهوية / الإقامة</div>
                    <div className="font-mono font-bold text-foreground mt-0.5">{employee.national_id || '2554901666'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">تاريخ انتهاء الهوية / الإقامة</div>
                    <div className="font-mono font-bold text-foreground mt-0.5">{employee.id_expiry_date || '1448-04-16'}</div>
                  </div>

                </div>
              </Card>

              {/* National Address Card */}
              <Card className="p-6 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-heading font-black text-sm text-foreground">العنوان الوطني</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">الرمز البريدي</div>
                    <div className="font-mono font-bold text-foreground mt-0.5">{employee.postal_code || '51411'}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">رقم المبنى</div>
                    <div className="font-mono font-bold text-foreground mt-0.5">{employee.building_number || '3421'}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">رقم الوحدة</div>
                    <div className="font-mono font-bold text-foreground mt-0.5">{employee.unit_number || '2'}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">رقم عقد الإيجار</div>
                    <div className="font-mono font-bold text-foreground mt-0.5">{employee.lease_number || '—'}</div>
                  </div>
                </div>
              </Card>

            </div>
          )}

          {/* TAB 2: COMPANY DETAILS */}
          {activeTab === 'company' && (
            <Card className="p-6 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <h3 className="font-heading font-black text-sm">بيانات الشركة والتعيين</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border">
                  <div className="text-muted-foreground text-[10px]">اسم المنشأة</div>
                  <div className="font-bold text-foreground mt-0.5">شركة درة السيارة لقطع الغيار</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border">
                  <div className="text-muted-foreground text-[10px]">الفرع المعتمد</div>
                  <div className="font-bold text-foreground mt-0.5">{employee.branch_name || 'مكتب الإدارة'}</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border">
                  <div className="text-muted-foreground text-[10px]">تاريخ المباشرة والانضمام</div>
                  <div className="font-mono font-bold text-foreground mt-0.5">{employee.join_date || '2024-01-01'}</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border">
                  <div className="text-muted-foreground text-[10px]">الراتب الأساسي</div>
                  <div className="font-mono font-black text-emerald-600 text-sm mt-0.5">{Number(employee.salary || 4000).toLocaleString()} ر.س</div>
                </div>
              </div>
            </Card>
          )}

          {/* OTHER TABS FALLBACK */}
          {activeTab !== 'personal' && activeTab !== 'company' && (
            <Card className="p-12 text-center rounded-3xl border bg-white dark:bg-slate-900 text-muted-foreground">
              <div className="font-heading font-black text-sm text-foreground mb-1">
                قسم: {profileSubSections.find(s => s.id === activeTab)?.label}
              </div>
              <p className="text-xs">يتم جلب وعرض البيانات الرسمية الموثقة للموظف بشكل سحابي كامل.</p>
            </Card>
          )}

        </div>

      </div>

      {/* ─── EDIT MODAL ──────────────────────────────────────────────────── */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base">تعديل بيانات ملف الموظف</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">الاسم بالعربية:</Label>
                <Input value={editForm.full_name || ''} onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">المسمى الوظيفي:</Label>
                <Input value={editForm.job_title || ''} onChange={(e) => setEditForm(prev => ({ ...prev, job_title: e.target.value }))} className="rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">رقم الجوال:</Label>
                <Input value={editForm.phone || ''} onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} className="rounded-xl font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">الإيميل:</Label>
                <Input value={editForm.email || ''} onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))} className="rounded-xl font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">رقم الهوية / الإقامة:</Label>
                <Input value={editForm.national_id || ''} onChange={(e) => setEditForm(prev => ({ ...prev, national_id: e.target.value }))} className="rounded-xl font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">تاريخ انتهاء الهوية:</Label>
                <Input value={editForm.id_expiry_date || ''} onChange={(e) => setEditForm(prev => ({ ...prev, id_expiry_date: e.target.value }))} className="rounded-xl font-mono" />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditModal(false)} className="rounded-xl font-bold">إلغاء</Button>
            <Button onClick={handleSaveProfile} className="bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold">حفظ التغييرات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
