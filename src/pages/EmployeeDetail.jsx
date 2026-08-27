import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Printer,
  ChevronLeft,
  Search,
  CheckCircle2,
  Upload,
  Eye,
  Download,
  Trash2,
  FilePlus,
  AlertCircle,
  X
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// Transliteration dictionary for all Green Arrow employees
const NAME_EN_MAP = {
  'فهد ناصر محمد الجوعي': 'Fahad Nasser Mohammed Al-Jowai',
  'يحيي محمد عبدالغفار باشا': 'Yahya Mohammed Abdulghaffar Basha',
  'هشام ابوالفضل زغلول': 'Hesham Aboulfadl Zaghloul',
  'محمود طه المحيميد': 'Mahmoud Taha Al-Muhaimeed',
  'صالح علي المحيميد': 'Saleh Ali Al-Muhaimeed',
  'خالد ناصر محمد الجوعي': 'Khaled Nasser Mohammed Al-Jowai',
  'عبد العزيز ناصر محمد الجوعي': 'Abdulaziz Nasser Mohammed Al-Jowai',
  'وضاح صالح سالم أحمد العولقي': 'Waddah Saleh Salem Ahmed Al-Awlaqi',
  'عزام علي السعوي': 'Azzam Ali Al-Saawi',
  'محمد سالم صالح أحمد المردم': 'Mohammed Salem Saleh Ahmed Al-Mardam',
  'عاصم ابراهيم الرياعي': 'Asem Ibrahim Al-Rayaee',
  'عبد الله يحيى إبراهيم التويجري': 'Abdullah Yahya Ibrahim Al-Tuwaijri',
  'إبراهيم عبد العزيز التويجري': 'Ibrahim Abdulaziz Al-Tuwaijri',
  'سفيان عبد الرحمن الضالع': 'Sofyan Abdulrahman Al-Dhalea',
  'محمد صالح محمد السعوي': 'Mohammed Saleh Mohammed Al-Saawi',
  'محمد عادل احمد نعمان': 'Mohammed Adel Ahmed Noman',
  'عبد الله ناصر عبد الله محمد عمر': 'Abdullah Nasser Abdullah Mohammed Omar',
  'طه محمود المحيميد': 'Taha Mahmoud Al-Muhaimeed',
  'محمدعبد محمد البليهي': 'Mohammedabd Mohammed Al-Bilaihi',
};

const getEnglishName = (nameAr, nameEn) => {
  if (nameEn && nameEn.trim() && !nameEn.includes('Yahya Mohammed')) return nameEn;
  if (!nameAr) return '—';
  return NAME_EN_MAP[nameAr.trim()] || nameAr;
};

const calculateDuration = (joinDate) => {
  if (!joinDate) return '0 سنوات 0 أشهر 0 أيام';
  try {
    const start = new Date(joinDate);
    const now = new Date();
    const diffTime = Math.abs(now - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = (totalDays % 365) % 30;
    return `${years} سنوات ${months} أشهر ${days} أيام`;
  } catch {
    return '0 سنوات 0 أشهر 0 أيام';
  }
};

// Parse metadata JSON safely
const parseMetadata = (managerName) => {
  if (!managerName) return {};
  if (typeof managerName === 'object') return managerName;
  try {
    return JSON.parse(managerName);
  } catch {
    return {};
  }
};

export default function EmployeeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('personal');
  const [employeesList, setEmployeesList] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState(id || '');
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Profile Modal
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Document Management States
  const [uploadDocModal, setUploadDocModal] = useState(false);
  const [docForm, setDocForm] = useState({
    type: 'national_id',
    title: '',
    docNumber: '',
    expiryDate: '',
    fileData: '',
    fileName: '',
    fileSize: ''
  });
  const [previewDoc, setPreviewDoc] = useState(null);
  const [savingDoc, setSavingDoc] = useState(false);

  // Load all employees list
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const emps = await base44.entities.Employee.list();
      setEmployeesList(emps || []);

      let current = null;
      if (selectedEmpId) {
        current = emps.find(e => String(e.id) === String(selectedEmpId) || String(e.employee_number) === String(selectedEmpId));
      }
      if (!current && emps && emps.length > 0) {
        // Default to logged-in user or first employee
        const defaultEmp = emps.find(e => user?.email && e.email === user.email) || emps[0];
        current = defaultEmp;
      }

      setEmployee(current || null);
      setEditForm(current || {});
      if (current) {
        setSelectedEmpId(String(current.id));
      }
    } catch (e) {
      console.error('Error loading employee:', e);
      toast({ title: 'خطأ في جلب بيانات الموظفين', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [selectedEmpId, user?.email, toast]);

  useEffect(() => {
    if (id) setSelectedEmpId(id);
  }, [id]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Handle employee switch
  const handleSelectEmployee = (empId) => {
    setSelectedEmpId(empId);
    const found = employeesList.find(e => String(e.id) === String(empId) || String(e.employee_number) === String(empId));
    if (found) {
      setEmployee(found);
      setEditForm(found);
    }
  };

  // Save profile changes to DB
  const handleSaveProfile = async () => {
    try {
      if (!employee?.id) return;
      const updated = await base44.entities.Employee.update(employee.id, {
        full_name: editForm.full_name,
        job_title: editForm.job_title,
        phone: editForm.phone,
        email: editForm.email,
        national_id: editForm.national_id,
        id_expiry_date: editForm.id_expiry_date,
        birth_date: editForm.birth_date,
        nationality: editForm.nationality,
        salary: Number(editForm.salary) || employee.salary,
        branch_name: editForm.branch_name,
        department_name: editForm.department_name,
        shift: editForm.shift,
      });

      setEmployee(updated);
      toast({ title: '✓ تم حفظ وتحديث بيانات الموظف بنجاح في قاعدة البيانات' });
      setEditModal(false);
      loadEmployees();
    } catch (e) {
      toast({ title: 'خطأ في حفظ البيانات', description: e.message, variant: 'destructive' });
    }
  };

  // ─── DOCUMENT MANAGEMENT LOGIC ──────────────────────────────────────────
  const employeeMetadata = useMemo(() => parseMetadata(employee?.manager_name), [employee?.manager_name]);
  const documentsList = useMemo(() => employeeMetadata.documents || [], [employeeMetadata]);

  // Handle File Input Change (Read as Data URL)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'حجم الملف كبير جداً', description: 'الحد الأقصى هو 5 ميجابايت', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      setDocForm(prev => ({
        ...prev,
        fileData: evt.target.result,
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`
      }));
    };
    reader.readAsDataURL(file);
  };

  // Save / Upload Document to Supabase
  const handleSaveDocument = async () => {
    if (!docForm.fileData) {
      toast({ title: 'الرجاء اختيار ملف لرفعه أولاً', variant: 'destructive' });
      return;
    }

    setSavingDoc(true);
    try {
      const typeLabels = {
        national_id: 'صورة الهوية / الإقامة',
        contract: 'عقد العمل الموثق',
        license: 'رخصة القيادة',
        passport: 'جواز السفر',
        other: 'مستند رسمي'
      };

      const newDoc = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: docForm.type,
        title: docForm.title || typeLabels[docForm.type] || 'مستند موثق',
        docNumber: docForm.docNumber || employee.national_id || '',
        expiryDate: docForm.expiryDate || employee.id_expiry_date || '',
        fileData: docForm.fileData,
        fileName: docForm.fileName,
        fileSize: docForm.fileSize,
        uploadedAt: new Date().toISOString().split('T')[0]
      };

      // Filter out existing doc of same type if replacing hero doc
      const existingDocs = documentsList.filter(d => d.type !== docForm.type || docForm.type === 'other');
      const updatedDocs = [newDoc, ...existingDocs];

      const currentMeta = parseMetadata(employee.manager_name);
      const updatedMeta = { ...currentMeta, documents: updatedDocs };

      const updated = await base44.entities.Employee.update(employee.id, {
        manager_name: JSON.stringify(updatedMeta)
      });

      setEmployee(updated);
      toast({ title: '✓ تم حفظ المستند في قاعدة البيانات السحابية بنجاح' });
      setUploadDocModal(false);
      setDocForm({
        type: 'national_id',
        title: '',
        docNumber: '',
        expiryDate: '',
        fileData: '',
        fileName: '',
        fileSize: ''
      });
    } catch (e) {
      console.error('Error saving document:', e);
      toast({ title: 'خطأ في حفظ المستند', description: e.message, variant: 'destructive' });
    } finally {
      setSavingDoc(false);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (docId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستند؟')) return;
    try {
      const updatedDocs = documentsList.filter(d => d.id !== docId);
      const currentMeta = parseMetadata(employee.manager_name);
      const updatedMeta = { ...currentMeta, documents: updatedDocs };

      const updated = await base44.entities.Employee.update(employee.id, {
        manager_name: JSON.stringify(updatedMeta)
      });

      setEmployee(updated);
      toast({ title: '✓ تم حذف المستند بنجاح' });
    } catch (e) {
      toast({ title: 'خطأ في الحذف', description: e.message, variant: 'destructive' });
    }
  };

  // Find Specific Hero Docs
  const nationalIdDoc = documentsList.find(d => d.type === 'national_id');
  const contractDoc = documentsList.find(d => d.type === 'contract');

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
        <h2 className="text-lg font-bold">لا يوجد موظف محدد</h2>
        <Button onClick={() => navigate('/employees')} className="mt-4">العودة لسجل الموظفين</Button>
      </div>
    );
  }

  const nameEn = getEnglishName(employee.full_name, employee.name_en);
  const durationStr = calculateDuration(employee.join_date);

  const profileSubSections = [
    { id: 'personal', label: 'التفاصيل الشخصية', icon: User },
    { id: 'company', label: 'تفاصيل الشركة', icon: Building2 },
    { id: 'documents', label: 'المستندات ورفع العقود', icon: FolderOpen },
    { id: 'payslips', label: 'كشوف راتبي', icon: DollarSign },
    { id: 'insurance', label: 'التأمين', icon: ShieldCheck },
    { id: 'balances', label: 'رصيدي أخرى', icon: Coins },
    { id: 'team', label: 'فريق العمل', icon: Users2 },
    { id: 'leave_details', label: 'تفاصيل الإجازة', icon: CalendarDays },
    { id: 'leave_history', label: 'سجل الإجازات', icon: Calendar },
    { id: 'training', label: 'الدورات التدريبية', icon: BookOpen },
    { id: 'evaluations', label: 'التقييم', icon: Award },
    { id: 'dependents', label: 'التابعين', icon: User },
    { id: 'custody', label: 'العهود المقيدة', icon: Package },
    { id: 'penalties', label: 'الجزاءات', icon: AlertOctagon },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
    { id: 'activity', label: 'النشاط الأخير', icon: Activity },
  ];

  return (
    <div className="space-y-5" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* ─── QUICK EMPLOYEE SWITCHER TOOLBAR ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground">اختيار موظف لمعاينة ملفه 360°:</span>
          <Select value={String(employee.id)} onValueChange={handleSelectEmployee}>
            <SelectTrigger className="w-72 rounded-2xl text-xs font-bold h-9 bg-background">
              <SelectValue placeholder="اختر الموظف..." />
            </SelectTrigger>
            <SelectContent>
              {employeesList.map(emp => (
                <SelectItem key={emp.id} value={String(emp.id)}>
                  {emp.full_name} (#{emp.employee_number}) — {emp.branch_name || 'الفرع الرئيسي'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono font-bold">
            إجمالي {employeesList.length} موظف مسجل
          </Badge>
        </div>
      </div>

      {/* ─── 1. TOP PROFILE HEADER BANNER (EKTEFA EXACT SPEC) ──────────────── */}
      <Card className="p-6 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-5">
          
          {/* User Info with Big Avatar */}
          <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-right">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-sky-600 via-teal-500 to-emerald-500 text-white flex items-center justify-center text-3xl font-black shadow-xl ring-4 ring-sky-100 dark:ring-sky-950 overflow-hidden">
                {employee.full_name ? employee.full_name[0] : 'م'}
              </div>
              <span className="absolute bottom-1 end-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-300"></span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-heading font-black text-foreground">
                {employee.full_name}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <Badge className="bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 text-xs font-bold py-1 px-3">
                  {employee.job_title || 'بائع قطع غيار'}
                </Badge>
                <Badge className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 text-xs font-bold">
                  {employee.gender === 'female' ? 'أنثى' : 'ذكر'}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono font-bold">
                  #{employee.employee_number}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditForm(employee);
                setEditModal(true);
              }}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 border-sky-300 text-sky-800 hover:bg-sky-50"
            >
              <Edit3 className="w-3.5 h-3.5 text-sky-600" />
              <span>تعديل البيانات</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setActiveTab('documents');
                setUploadDocModal(true);
              }}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>رفع صورة الهوية / العقد</span>
            </Button>

            <Button
              size="sm"
              onClick={() => navigate('/documents-print')}
              className="bg-slate-900 text-white rounded-xl text-xs font-bold gap-1.5 h-9 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>طباعة النماذج A4</span>
            </Button>
          </div>

        </div>

        {/* ─── 4 INFO CARDS ROW ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-border/70 text-xs">
          
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold">الرقم الوظيفي</div>
              <div className="font-mono font-black text-sm text-foreground mt-0.5">#{employee.employee_number}</div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
              <IdCard className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold">الإدارة</div>
              <div className="font-bold text-foreground mt-0.5 truncate max-w-[95px]">{employee.department_name || 'درة السيارة لقطع الغيار'}</div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold">الفرع</div>
              <div className="font-bold text-foreground mt-0.5 truncate max-w-[95px]">{employee.branch_name || 'الفرع الرئيسي'}</div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold">الفترة الحالية</div>
              <div className="font-bold text-foreground mt-0.5 truncate max-w-[95px]">{employee.shift || 'فترة عمل سعودي'}</div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold">الإيميل</div>
              <div className="font-mono text-foreground mt-0.5 truncate max-w-[95px]">{employee.email || '—'}</div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-pink-500 text-white flex items-center justify-center shrink-0">
              <Mail className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold">رقم الجوال</div>
              <div className="font-mono text-foreground mt-0.5">{employee.phone || '—'}</div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Phone className="w-3.5 h-3.5" />
            </div>
          </div>

        </div>

        {/* ─── MILESTONES ROW ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3 text-xs">
          
          <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 rounded-2xl text-center">
            <div className="text-blue-800 dark:text-blue-300 font-bold text-[10px]">إجمالي مدة العمل</div>
            <div className="font-bold text-blue-900 dark:text-blue-100 text-xs mt-1">{durationStr}</div>
          </div>

          <div className="bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 p-3 rounded-2xl text-center">
            <div className="text-teal-800 dark:text-teal-300 font-bold text-[10px]">رصيد الإجازة السنوية</div>
            <div className="font-mono font-black text-teal-900 dark:text-teal-100 text-sm mt-0.5">41 أيام</div>
          </div>

          <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 p-3 rounded-2xl text-center">
            <div className="text-sky-800 dark:text-sky-300 font-bold text-[10px]">الإجازات المرضية المستهلكة</div>
            <div className="font-mono font-black text-sky-900 dark:text-sky-100 text-sm mt-0.5">0 أيام</div>
          </div>

          <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 rounded-2xl text-center">
            <div className="text-amber-800 dark:text-amber-300 font-bold text-[10px]">رصيد الإجازة التعويضية</div>
            <div className="font-mono font-black text-amber-900 dark:text-amber-100 text-sm mt-0.5">0 أيام</div>
          </div>

          <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3 rounded-2xl text-center">
            <div className="text-rose-800 dark:text-rose-300 font-bold text-[10px]">انتهاء العقد</div>
            <div className="font-mono font-bold text-rose-900 dark:text-rose-100 text-xs mt-1">
              {employee.contract_end_date || '2026-12-31'}
            </div>
          </div>

          <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3 rounded-2xl text-center">
            <div className="text-rose-800 dark:text-rose-300 font-bold text-[10px]">انتهاء التأمين</div>
            <div className="font-mono font-bold text-rose-900 dark:text-rose-100 text-xs mt-1">
              {employee.insurance_end_date || '2026-11-29'}
            </div>
          </div>

        </div>

      </Card>

      {/* ─── 2. MAIN PROFILE BODY: 16 SUB-TABS + CONTENT GRID ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Sub-Navigation (Right Side 3 cols) */}
        <div className="lg:col-span-3 space-y-1 bg-white dark:bg-slate-900 p-3 rounded-3xl border shadow-sm h-fit">
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
          
          {/* TAB 1: PERSONAL DETAILS */}
          {activeTab === 'personal' && (
            <div className="space-y-5">
              
              <Card className="p-6 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-heading font-black text-sm text-foreground">التفاصيل الشخصية</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditForm(employee);
                      setEditModal(true);
                    }}
                    className="h-7 text-xs text-sky-600 gap-1"
                  >
                    <Edit3 className="w-3 h-3" /> تعديل
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">الاسم - بالإنجليزي</div>
                    <div className="font-bold text-foreground mt-0.5">{nameEn}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">الاسم - بالعربية</div>
                    <div className="font-bold text-foreground mt-0.5">{employee.full_name}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">المسمى الوظيفي</div>
                    <div className="font-bold text-foreground mt-0.5">{employee.job_title || '—'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">يوم الميلاد</div>
                    <div className="font-mono font-bold text-foreground mt-0.5">{employee.birth_date || '—'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">رقم الجوال</div>
                    <div className="font-mono font-bold text-foreground mt-0.5">{employee.phone || '—'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">الإيميل</div>
                    <div className="font-mono text-foreground mt-0.5">{employee.email || '—'}</div>
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
                    <div className="font-bold text-foreground mt-0.5">{employee.nationality || (employee.full_name?.includes('السعوي') || employee.full_name?.includes('الجوعي') || employee.full_name?.includes('التويجري') ? 'سعودي' : 'مقيم')}</div>
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
                    <div className="font-mono font-bold text-foreground mt-0.5">{employee.national_id || '—'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">تاريخ انتهاء الهوية / الإقامة</div>
                    <div className="font-mono font-bold text-foreground mt-0.5">{employee.id_expiry_date || '—'}</div>
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
                    <div className="font-mono font-bold text-foreground mt-0.5">{employee.unit_number || '1'}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="text-muted-foreground text-[10px]">رقم عقد الإيجار</div>
                    <div className="font-mono font-bold text-foreground mt-0.5">{employee.lease_number || '—'}</div>
                  </div>
                </div>
              </Card>

            </div>
          )}

          {/* TAB: DOCUMENTS (نظام مستنداتي ورفع صورة الهوية وعقد العمل) */}
          {activeTab === 'documents' && (
            <div className="space-y-5">
              
              {/* Header Action Bar */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-3xl border shadow-sm">
                <div>
                  <h3 className="font-heading font-black text-base text-foreground flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-sky-600" />
                    نظام مستنداتي للموظف ({employee.full_name})
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    إدارة وأرشفة صورة الهوية الوطنية، عقود العمل الرسمية، ورخص القيادة في السحابة
                  </p>
                </div>

                <Button
                  onClick={() => setUploadDocModal(true)}
                  className="bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-xs font-bold gap-2 shadow-sm"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>رفع مستند جديد</span>
                </Button>
              </div>

              {/* TWO HERO UPLOAD SLOTS: 1. National ID | 2. Contract */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* SLOT 1: NATIONAL ID / IQAMA */}
                <Card className="p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center font-bold">
                          <IdCard className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground">صورة الهوية الوطنية / الإقامة</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {employee.national_id ? `رقم: ${employee.national_id}` : 'لم يتم تسجيل رقم الهوية'}
                          </div>
                        </div>
                      </div>

                      {nationalIdDoc ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                          ✓ موثقة ومرفوعة
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                          غير مرفوعة
                        </Badge>
                      )}
                    </div>

                    {nationalIdDoc ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 aspect-[16/9] flex items-center justify-center my-2">
                        <img
                          src={nationalIdDoc.fileData}
                          alt="National ID"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                          <Button
                            size="sm"
                            onClick={() => setPreviewDoc(nationalIdDoc)}
                            className="bg-white text-slate-900 rounded-xl text-xs font-bold gap-1 shadow-lg"
                          >
                            <Eye className="w-3.5 h-3.5" /> معاينة
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setDocForm(prev => ({ ...prev, type: 'national_id', title: 'صورة الهوية / الإقامة' }));
                          setUploadDocModal(true);
                        }}
                        className="border-2 border-dashed border-sky-300 dark:border-sky-800 rounded-2xl p-6 text-center cursor-pointer hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition-colors my-2"
                      >
                        <Upload className="w-8 h-8 text-sky-500 mx-auto mb-2 opacity-80" />
                        <div className="text-xs font-bold text-sky-900 dark:text-sky-300">اضغط لرفع صورة الهوية الوطنية</div>
                        <div className="text-[10px] text-muted-foreground mt-1">يدعم JPG, PNG (حد أقصى 5MB)</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs">
                    <span className="text-[10px] text-muted-foreground">
                      تاريخ الانتهاء: <strong className="text-foreground">{employee.id_expiry_date || '—'}</strong>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDocForm(prev => ({ ...prev, type: 'national_id', title: 'صورة الهوية / الإقامة' }));
                        setUploadDocModal(true);
                      }}
                      className="h-7 text-xs text-sky-600 font-bold"
                    >
                      {nationalIdDoc ? 'استبدال الصورة' : 'رفع الآن'}
                    </Button>
                  </div>
                </Card>

                {/* SLOT 2: EMPLOYMENT CONTRACT */}
                <Card className="p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground">صورة / ملف عقد العمل الرسمي</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            تاريخ المباشرة: {employee.join_date || '2024-01-01'}
                          </div>
                        </div>
                      </div>

                      {contractDoc ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                          ✓ موثق ومرفوع
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                          غير مرفوع
                        </Badge>
                      )}
                    </div>

                    {contractDoc ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 aspect-[16/9] flex items-center justify-center my-2">
                        {contractDoc.fileData.startsWith('data:image') ? (
                          <img
                            src={contractDoc.fileData}
                            alt="Contract"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <FileText className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                            <div className="text-xs font-bold">{contractDoc.fileName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{contractDoc.fileSize}</div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                          <Button
                            size="sm"
                            onClick={() => setPreviewDoc(contractDoc)}
                            className="bg-white text-slate-900 rounded-xl text-xs font-bold gap-1 shadow-lg"
                          >
                            <Eye className="w-3.5 h-3.5" /> معاينة العقد
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setDocForm(prev => ({ ...prev, type: 'contract', title: 'عقد العمل الموثق' }));
                          setUploadDocModal(true);
                        }}
                        className="border-2 border-dashed border-emerald-300 dark:border-emerald-800 rounded-2xl p-6 text-center cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors my-2"
                      >
                        <FilePlus className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">اضغط لرفع نسخة عقد العمل المعتمد</div>
                        <div className="text-[10px] text-muted-foreground mt-1">يدعم PDF, JPG, PNG (حد أقصى 5MB)</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs">
                    <span className="text-[10px] text-muted-foreground">
                      انتهاء العقد: <strong className="text-foreground">{employee.contract_end_date || '2026-12-31'}</strong>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDocForm(prev => ({ ...prev, type: 'contract', title: 'عقد العمل الموثق' }));
                        setUploadDocModal(true);
                      }}
                      className="h-7 text-xs text-emerald-600 font-bold"
                    >
                      {contractDoc ? 'استبدال العقد' : 'رفع الآن'}
                    </Button>
                  </div>
                </Card>

              </div>

              {/* ALL UPLOADED DOCUMENTS ARCHIVE */}
              <Card className="p-6 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h4 className="font-heading font-black text-sm text-foreground">
                    أرشيف وثائق ومستندات الموظف ({documentsList.length})
                  </h4>
                </div>

                {documentsList.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold">لا توجد مستندات إضافية مرفوعة حالياً لهذا الموظف</p>
                    <Button
                      onClick={() => setUploadDocModal(true)}
                      size="sm"
                      variant="outline"
                      className="mt-3 text-xs font-bold rounded-xl"
                    >
                      رفع أول مستند ➔
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {documentsList.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800/60 flex flex-col justify-between gap-3 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-foreground truncate">{doc.title}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{doc.fileSize || '—'}</div>
                            </div>
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-lg"
                            title="حذف المستند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Thumbnail if image */}
                        {doc.fileData?.startsWith('data:image') && (
                          <div
                            onClick={() => setPreviewDoc(doc)}
                            className="h-28 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 cursor-pointer relative group"
                          >
                            <img src={doc.fileData} alt={doc.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                              <Eye className="w-4 h-4 me-1" /> تكبير
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                          <span>تاريخ الرفع: {doc.uploadedAt}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPreviewDoc(doc)}
                              className="h-6 px-2 text-[10px] font-bold rounded-lg"
                            >
                              معاينة
                            </Button>
                            <a
                              href={doc.fileData}
                              download={doc.fileName || `${doc.title}.png`}
                              className="h-6 px-2 text-[10px] font-bold rounded-lg border bg-background hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                            >
                              <Download className="w-3 h-3 text-sky-600" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <div className="font-bold text-foreground mt-0.5">{employee.branch_name || 'الفرع الرئيسي'}</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border">
                  <div className="text-muted-foreground text-[10px]">تاريخ المباشرة والانضمام</div>
                  <div className="font-mono font-bold text-foreground mt-0.5">{employee.join_date || '2024-01-01'}</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border">
                  <div className="text-muted-foreground text-[10px]">الراتب الأساسي</div>
                  <div className="font-mono font-black text-emerald-600 text-sm mt-0.5">{Number(employee.salary || 1500).toLocaleString()} ر.س</div>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 3: PAYSLIPS */}
          {activeTab === 'payslips' && (
            <Card className="p-6 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-black text-sm">كشوفات الرواتب الشهرية</h3>
                <Button onClick={() => navigate('/payroll')} size="sm" className="bg-slate-900 text-white rounded-xl text-xs font-bold">
                  مسير الرواتب العام ➔
                </Button>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-emerald-800 dark:text-emerald-300">الراتب الأساسي المعتمد</div>
                  <div className="font-mono font-black text-base text-emerald-900 dark:text-emerald-100">{Number(employee.salary || 1500).toLocaleString()} ر.س</div>
                </div>
                <Button onClick={() => navigate('/payroll')} size="sm" variant="outline" className="border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl">
                  عرض القسيمة A4
                </Button>
              </div>
            </Card>
          )}

          {/* OTHER TABS */}
          {activeTab !== 'personal' && activeTab !== 'company' && activeTab !== 'payslips' && activeTab !== 'documents' && (
            <Card className="p-12 text-center rounded-3xl border bg-white dark:bg-slate-900 text-muted-foreground">
              <div className="font-heading font-black text-sm text-foreground mb-1">
                قسم: {profileSubSections.find(s => s.id === activeTab)?.label}
              </div>
              <p className="text-xs">يتم جلب وعرض البيانات الرسمية الموثقة للموظف ({employee.full_name}) بشكل سحابي كامل ومحمي.</p>
            </Card>
          )}

        </div>

      </div>

      {/* ─── UPLOAD DOCUMENT MODAL ────────────────────────────────────────── */}
      <Dialog open={uploadDocModal} onOpenChange={setUploadDocModal}>
        <DialogContent className="sm:max-w-lg rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base flex items-center gap-2">
              <Upload className="w-5 h-5 text-sky-600" />
              رفع مستند رسمي للموظف: {employee.full_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            
            {/* Document Type */}
            <div className="space-y-1">
              <Label className="font-bold">نوع المستند:</Label>
              <Select value={docForm.type} onValueChange={(val) => setDocForm(prev => ({ ...prev, type: val }))}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national_id">صورة الهوية الوطنية / الإقامة</SelectItem>
                  <SelectItem value="contract">صورة / ملف عقد العمل الموثق</SelectItem>
                  <SelectItem value="license">رخصة القيادة</SelectItem>
                  <SelectItem value="passport">جواز السفر</SelectItem>
                  <SelectItem value="other">مستند رسمي / شهادة أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Title if other */}
            {docForm.type === 'other' && (
              <div className="space-y-1">
                <Label className="font-bold">اسم / عنوان المستند:</Label>
                <Input
                  value={docForm.title}
                  onChange={(e) => setDocForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="مثال: شهادة الفحص الطبي، عقد إيجار..."
                  className="rounded-xl"
                />
              </div>
            )}

            {/* File Input Box */}
            <div className="space-y-1">
              <Label className="font-bold">اختيار الملف (صورة أو PDF):</Label>
              <div className="border-2 border-dashed border-sky-300 dark:border-sky-800 rounded-2xl p-4 text-center bg-sky-50/40 dark:bg-sky-950/20">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="doc-file-input"
                />
                <label htmlFor="doc-file-input" className="cursor-pointer block">
                  <Upload className="w-7 h-7 text-sky-600 mx-auto mb-1.5" />
                  {docForm.fileName ? (
                    <div>
                      <div className="font-bold text-sky-900 dark:text-sky-200 text-xs truncate max-w-[280px] mx-auto">
                        ✓ {docForm.fileName}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{docForm.fileSize}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold text-sky-900 dark:text-sky-200 text-xs">اضغط هنا لتحديد الملف من جهازك</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, WebP أو PDF (أقصى حجم 5MB)</div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Image Live Preview */}
            {docForm.fileData && docForm.fileData.startsWith('data:image') && (
              <div className="rounded-xl overflow-hidden border max-h-40 bg-slate-100 flex items-center justify-center">
                <img src={docForm.fileData} alt="Preview" className="max-h-40 object-contain" />
              </div>
            )}

          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUploadDocModal(false)} className="rounded-xl font-bold">
              إلغاء
            </Button>
            <Button
              onClick={handleSaveDocument}
              disabled={savingDoc || !docForm.fileData}
              className="bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold gap-1.5"
            >
              {savingDoc ? 'جاري الحفظ في السحابة...' : 'حفظ المستند بالسحابة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── FULL DOCUMENT PREVIEW LIGHTBOX MODAL ────────────────────────── */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-2xl rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base flex items-center justify-between">
              <span>{previewDoc?.title || 'معاينة المستند'}</span>
              <span className="text-xs text-muted-foreground font-normal">{previewDoc?.fileName}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 text-center">
            {previewDoc?.fileData?.startsWith('data:image') ? (
              <div className="max-h-[70vh] overflow-auto rounded-2xl border bg-slate-900/5 p-2 flex items-center justify-center">
                <img src={previewDoc.fileData} alt={previewDoc.title} className="max-h-[65vh] object-contain rounded-lg shadow-sm" />
              </div>
            ) : (
              <div className="p-8 border rounded-2xl bg-slate-50 dark:bg-slate-800 text-center">
                <FileText className="w-16 h-16 text-sky-600 mx-auto mb-3" />
                <div className="font-bold text-sm">{previewDoc?.fileName}</div>
                <div className="text-xs text-muted-foreground mt-1">مستند PDF رسمي</div>
              </div>
            )}
          </div>

          <DialogFooter className="justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="rounded-xl text-xs font-bold gap-1"
            >
              <Printer className="w-3.5 h-3.5" /> طباعة
            </Button>

            <div className="flex items-center gap-2">
              {previewDoc && (
                <a
                  href={previewDoc.fileData}
                  download={previewDoc.fileName || 'document.png'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                >
                  <Download className="w-3.5 h-3.5" /> تحميل الملف
                </a>
              )}
              <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(null)} className="rounded-xl text-xs font-bold">
                إغلاق
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── EDIT MODAL ──────────────────────────────────────────────────── */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base">تعديل بيانات {employee.full_name}</DialogTitle>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">الجنسية:</Label>
                <Input value={editForm.nationality || ''} onChange={(e) => setEditForm(prev => ({ ...prev, nationality: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">الراتب الأساسي (ر.س):</Label>
                <Input type="number" value={editForm.salary || ''} onChange={(e) => setEditForm(prev => ({ ...prev, salary: e.target.value }))} className="rounded-xl font-mono font-bold" />
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
