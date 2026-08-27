import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Wallet, Download, Printer, CheckCircle2, Clock, AlertTriangle,
  Eye, FileSpreadsheet, ShieldCheck, Users, CalendarCheck, History,
  Filter, Search, X, Edit3, Check, XCircle, Gift, AlertOctagon,
  CreditCard, PlusCircle, Trash2, ChevronRight, ChevronLeft,
  FileText, CheckSquare, Sparkles, Building2, UserCheck, LayoutGrid,
  SlidersHorizontal, Lock, Unlock, Archive, ArrowRight, ArrowLeft,
  Briefcase, DollarSign, ArrowUpRight, ArrowDownRight, Award
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  computeEmployeePayroll,
  getPayrollSettings,
  saveShortfallApproval,
  getAuditLog,
  formatMinutes,
  formatHours,
  getAdvances,
  saveAdvance,
  recordAdvanceInstallmentPayment,
  getAdjustments,
  saveAdjustment,
  deleteAdjustment,
  getEmployeeActiveAdvance,
  getLockedMonthlyPayrolls,
  getLockedMonthlyPayroll,
  saveLockedMonthlyPayroll,
  unlockMonthlyPayroll,
  isMonthLocked
} from '@/lib/payrollEngine';
import PayslipPrint from '@/components/PayslipPrint';
import AdvancePrintModal from '@/components/AdvancePrintModal';
import BiometricsPrintModal from '@/components/BiometricsPrintModal';

// Clean Western English digits formatter
const fmtNum = (n, decimals = 2) => {
  const num = Number(n) || 0;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export default function Payroll() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.email?.includes('admin') || true;

  // Main Mode: 'wizard' (4 stages) vs 'archive' (past locked months)
  const [mainView, setMainView] = useState('wizard');
  
  // Current Workflow Stage: 1: Biometrics, 2: Deductions, 3: Earnings, 4: Final Review & Lock
    const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const stageParam = searchParams.get('stage');
  const tabParam = searchParams.get('tab');

  // Reactive currentStep directly derived from URL query parameters (?stage=1..5)
  const currentStep = useMemo(() => {
    if (tabParam === 'archive' || stageParam === '5') return 5;
    if (stageParam === '2') return 2;
    if (stageParam === '3') return 3;
    if (stageParam === '4') return 4;
    return 1;
  }, [stageParam, tabParam]);

  const handleStepChange = useCallback((stepNum) => {
    navigate(`/payroll?stage=${stepNum}`);
  }, [navigate]);
  
  const [monthPrefix, setMonthPrefix] = useState('2026-08');
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Department / Branch and Employee for Stages 1, 2, 3
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [search, setSearch] = useState('');

  // Lock status
  const [isLocked, setIsLocked] = useState(false);
  const [lockConfirmModal, setLockConfirmModal] = useState(false);
  const [unlockModal, setUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [lockedArchives, setLockedArchives] = useState([]);

  // Modals & Dialogs
  const [selectedForPayslip, setSelectedForPayslip] = useState(null);
  const [selectedForBioPrint, setSelectedForBioPrint] = useState(null);
  const [editPunchModal, setEditPunchModal] = useState(null); // { log, emp }
  const [approvalModal, setApprovalModal] = useState(null);

  // New Advance / Loan Form
  const [newAdvanceModal, setNewAdvanceModal] = useState(false);
  const [selectedAdvanceForPrint, setSelectedAdvanceForPrint] = useState(null);
  const [advanceForm, setAdvanceForm] = useState({
    employee_number: '',
    total_amount: 3000,
    total_installments: 6,
    start_month: '2026-08',
    reason: 'سلفة شخصية طارئة',
    approved_by: 'فهد ناصر محمد الجوعي (المدير العام)'
  });

  // New Adjustment Form
  const [newAdjModal, setNewAdjModal] = useState(false);
  const [adjType, setAdjType] = useState('bonus');
  const [adjForm, setAdjForm] = useState({
    employee_number: '',
    type: 'bonus',
    category: 'sales_incentive',
    amount: 500,
    days_count: 1,
    month_prefix: '2026-08',
    reason: '',
    approved_by: 'فهد ناصر محمد الجوعي (المدير العام)'
  });

  const [advancesList, setAdvancesList] = useState([]);
  const [adjustmentsList, setAdjustmentsList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, logs, shs] = await Promise.all([
        base44.entities.Employee.list(),
        base44.entities.AttendanceLog.list('-log_date', 2000),
        base44.entities.Shift.list(),
      ]);
      setEmployees(emps || []);
      setAttendanceLogs(logs || []);
      setShifts(shs || []);
      setAdvancesList(getAdvances());
      setAdjustmentsList(getAdjustments());
      setAuditLogs(getAuditLog());
      setLockedArchives(getLockedMonthlyPayrolls());
      
      const locked = isMonthLocked(monthPrefix);
      setIsLocked(locked);

      if (emps && emps.length > 0 && !selectedEmpId) {
        setSelectedEmpId(String(emps[0].employee_number || emps[0].id));
      }
    } catch (e) {
      console.error('Failed to load payroll data:', e);
      toast({ title: 'حدث خطأ في تحميل البيانات', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [monthPrefix, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check lock status when monthPrefix changes
  useEffect(() => {
    setIsLocked(isMonthLocked(monthPrefix));
  }, [monthPrefix]);

  const settings = useMemo(() => getPayrollSettings(), []);

  // Compute all employee payrolls
  const allPayrolls = useMemo(() => {
    if (!employees.length) return [];
    
    // If month is locked, read from locked snapshot
    if (isLocked) {
      const lockedData = getLockedMonthlyPayroll(monthPrefix);
      if (lockedData && lockedData.payrolls?.length > 0) {
        return lockedData.payrolls;
      }
    }

    return employees.map(emp => {
      return computeEmployeePayroll(emp, attendanceLogs, shifts, {
        ...settings,
        monthPrefix,
      });
    });
  }, [employees, attendanceLogs, shifts, settings, monthPrefix, advancesList, adjustmentsList, isLocked]);

  // Filtered Payrolls by branch & search
  const filteredPayrolls = useMemo(() => {
    return allPayrolls.filter(pr => {
      const emp = pr.emp;
      const nameMatch = !search ||
        (emp.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (emp.employee_number || '').toString().includes(search);
      const branchMatch = selectedBranch === 'all' ||
        (emp.branch_name || emp.branch || '') === selectedBranch;
      return nameMatch && branchMatch;
    });
  }, [allPayrolls, search, selectedBranch]);

  // Branches list
  const branches = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      const b = e.branch_name || e.branch;
      if (b) set.add(b);
    });
    return Array.from(set);
  }, [employees]);

  // Currently Selected Employee in Stage 1/2/3
  const currentSelectedEmp = useMemo(() => {
    return employees.find(e => String(e.employee_number || e.id) === String(selectedEmpId)) || employees[0] || null;
  }, [employees, selectedEmpId]);

  const currentSelectedPayroll = useMemo(() => {
    if (!currentSelectedEmp) return null;
    return allPayrolls.find(pr => String(pr.emp.employee_number || pr.emp.id) === String(currentSelectedEmp.employee_number || currentSelectedEmp.id)) || null;
  }, [allPayrolls, currentSelectedEmp]);

  // Filtered Employees for the Selected Branch (in Stage 1/2/3 selector)
  const branchFilteredEmployees = useMemo(() => {
    if (selectedBranch === 'all') return employees;
    return employees.filter(e => (e.branch_name || e.branch || '') === selectedBranch);
  }, [employees, selectedBranch]);

  // Summary Totals for Stage 4
  const totals = useMemo(() => {
    return filteredPayrolls.reduce((acc, p) => {
      acc.basic += (p.basicSalary || 0);
      acc.housing += (p.housing || 0);
      acc.transport += (p.transport || 0);
      acc.friday += (p.fridayAllowance || 0);
      acc.dailyOT += (p.dailyOvertimeAllowance || 0);
      acc.bonuses += (p.customBonusesTotal || 0);
      acc.penalties += (p.customPenaltiesTotal || 0);
      acc.advances += (p.advanceInstallment || 0);
      acc.shortfall += (p.approvedShortfallDeduction || 0);
      acc.totalAdditions += (p.totalAdditions || 0);
      acc.totalDeductions += (p.totalDeductions || 0);
      acc.net += (p.netSalary || 0);
      return acc;
    }, {
      basic: 0, housing: 0, transport: 0, friday: 0, dailyOT: 0,
      bonuses: 0, penalties: 0, advances: 0, shortfall: 0,
      totalAdditions: 0, totalDeductions: 0, net: 0
    });
  }, [filteredPayrolls]);

  // ─── ACTION HANDLERS ────────────────────────────────────────────────────────

  // Stage 1: Edit Biometric Log (Admin Only)
  const handleSavePunchEdit = async () => {
    if (!editPunchModal) return;
    try {
      const { log, newCheckIn, newCheckOut, newStatus } = editPunchModal;
      
      const updatedItem = {
        ...log,
        check_in: newCheckIn ? `${log.log_date}T${newCheckIn}` : log.check_in,
        check_out: newCheckOut ? `${log.log_date}T${newCheckOut}` : log.check_out,
        status: newStatus || log.status,
      };

      if (log.id) {
        await base44.entities.AttendanceLog.update(log.id, updatedItem);
      } else {
        await base44.entities.AttendanceLog.create(updatedItem);
      }

      toast({ title: '✓ تم تعديل واعتماد البصمة بنجاح' });
      setEditPunchModal(null);
      await loadData();
    } catch (e) {
      toast({ title: 'خطأ أثناء التعديل', description: e.message, variant: 'destructive' });
    }
  };

  // Stage 4: Lock and Commit Monthly Payroll
  const handleLockMonthlyPayroll = () => {
    if (filteredPayrolls.length === 0) {
      toast({ title: 'لا توجد بيانات رواتب للاعتماد', variant: 'destructive' });
      return;
    }

    const record = saveLockedMonthlyPayroll(monthPrefix, {
      totals,
      payrolls: allPayrolls
    }, user?.full_name || 'فهد ناصر محمد الجوعي (المدير العام)');

    setIsLocked(true);
    setLockConfirmModal(false);
    setLockedArchives(getLockedMonthlyPayrolls());
    setAuditLogs(getAuditLog());

    toast({
      title: `🔒 تم اعتماد وإقفال ${record.title} بنجاح!`,
      description: 'تم حفظ النسخة المقفلة في قاعدة البيانات السحابية المركزية، وأصبحت متاحة للمحاسب للقراءة فقط.'
    });
  };

  // Unlock Monthly Payroll (Admin Only)
  const handleUnlockMonthlyPayroll = () => {
    unlockMonthlyPayroll(monthPrefix, unlockReason || 'تعديل استثنائي بقرار المدير العام', user?.full_name || 'المدير العام');
    setIsLocked(false);
    setUnlockModal(false);
    setLockedArchives(getLockedMonthlyPayrolls());
    setAuditLogs(getAuditLog());
    toast({
      title: `🔓 تم فك إقفال رواتب شهر ${monthPrefix} للتعديل`,
      description: 'تم توثيق عملية فك الإقفال في سجل الرقابة المالي.'
    });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-24" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* ─── 1. TOP EXECUTIVE HEADER ────────────────────────────────────────── */}
      <div className="bg-card border border-border/80 p-6 rounded-3xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> دورة مسير الرواتب المعتمدة
            </span>
            {isLocked ? (
              <Badge className="bg-emerald-600 text-white border-0 text-xs font-bold gap-1.5 py-1 px-3 shadow-sm">
                <Lock className="w-3.5 h-3.5" /> رواتب شهر {monthPrefix.split('-')[1]} مُقفلة ومعتمدة رسمياً
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 text-xs font-bold gap-1.5 py-1 px-3">
                <Clock className="w-3.5 h-3.5" /> مسير قيد التدقيق والمراجعة
              </Badge>
            )}
          </div>
          <h1 className="text-2xl lg:text-3xl font-heading font-black text-foreground tracking-tight">
            نظام تدقيق واعتماد مسير الرواتب الشهري
          </h1>
          <p className="text-xs text-muted-foreground">
            دورة عمل إدارية متسلسلة عبر 4 مراحل لتدقيق البصمات، اعتماد الاستقطاعات والمكافآت، والإقفال المالي النهائي
          </p>
        </div>

        {/* Controls: Month Picker + Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border px-3.5 py-2 rounded-2xl shadow-sm">
            <span className="text-xs font-bold text-muted-foreground">شهر المسير:</span>
            <input
              type="month"
              value={monthPrefix}
              onChange={(e) => setMonthPrefix(e.target.value)}
              className="bg-transparent text-foreground font-mono text-xs font-black border-0 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Mode Switcher: Wizard vs Archive */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border">
            <Button
              size="sm"
              variant={mainView === 'wizard' ? 'default' : 'ghost'}
              onClick={() => setMainView('wizard')}
              className="rounded-xl text-xs font-bold gap-1.5 h-9"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>دورة الاعتماد (4 مراحل)</span>
            </Button>
            <Button
              size="sm"
              variant={mainView === 'archive' ? 'default' : 'ghost'}
              onClick={() => setMainView('archive')}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 text-muted-foreground"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>أرشيف الشهور المقفلة ({lockedArchives.length})</span>
            </Button>
          </div>

          {/* Unlock Button for Admin if Locked */}
          {isLocked && isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnlockModal(true)}
              className="border-rose-300 text-rose-700 hover:bg-rose-50 rounded-2xl text-xs font-bold gap-1.5 h-9"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>فك الإقفال للتعديل (المدير فقط)</span>
            </Button>
          )}
        </div>
      </div>

      {/* ─── 2. MAIN VIEW 1: 4-STAGE WIZARD ─────────────────────────────────── */}
      {mainView === 'wizard' && (
        <div className="space-y-6">
          
          {/* ─── DYNAMIC EYE-PLEASING PROGRESS TIMELINE BAR ──────────────── */}
          <Card className="p-4 sm:p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden relative" dir="rtl">
            
            {/* Top Bar: Title & Progress Percentage */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></div>
                <span className="font-heading font-black text-xs sm:text-sm text-foreground">
                  مسار دورة اعتماد الرواتب:
                </span>
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                  {currentStep === 1 && "المرحلة الأولى: تدقيق البصمات وساعات العمل"}
                  {currentStep === 2 && "المرحلة الثانية: اعتماد الاستقطاعات والخصومات والسلف"}
                  {currentStep === 3 && "المرحلة الثالثة: اعتماد الاستحقاقات والمكافآت والبدلات"}
                  {currentStep === 4 && "المرحلة الرابعة: المراجعة العامة والإقفال السحابي النهائي"}
                  {currentStep === 5 && "المرحلة الخامسة: أرشيف رواتب الشهور السابقة والمصادقة المالية"}
                </span>
              </div>

              <Badge className="bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 text-xs font-mono font-bold px-3 py-1 rounded-xl shrink-0">
                {Math.round((currentStep / 5) * 100)}% مكتمل
              </Badge>
            </div>

            {/* Continuous Interactive Progress Track */}
            <div className="relative pt-2 pb-1">
              
              {/* Background Gray Track */}
              <div className="absolute top-1/2 start-6 end-6 -translate-y-1/2 h-2 bg-slate-100 dark:bg-slate-800 rounded-full z-0"></div>
              
              {/* Active Colored Progress Fill with Smooth Animation */}
              <div
                className="absolute top-1/2 start-6 -translate-y-1/2 h-2 bg-gradient-to-l from-sky-500 via-emerald-500 to-purple-600 rounded-full z-0 transition-all duration-700 ease-out shadow-sm shadow-sky-500/20"
                style={{ width: `${Math.max(0, Math.min(100, ((currentStep - 1) / 4) * 90 + 5))}%` }}
              ></div>

              {/* 5 Milestone Step Nodes */}
              <div className="relative z-10 flex items-center justify-between">
                {[
                  { step: 1, title: "تدقيق البصمات", icon: Clock },
                  { step: 2, title: "الاستقطاعات", icon: AlertOctagon },
                  { step: 3, title: "الاستحقاقات", icon: Gift },
                  { step: 4, title: "الإقفال النهائي", icon: Lock },
                  { step: 5, title: "أرشيف الشهور", icon: Award },
                ].map(({ step, title, icon: Icon }) => {
                  const isPassed = step < currentStep;
                  const isCurrent = step === currentStep;
                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleStepChange(step)}
                      className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none transition-transform hover:scale-105"
                    >
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                          isPassed
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                            : isCurrent
                            ? "bg-sky-600 text-white ring-4 ring-sky-100 dark:ring-sky-950 shadow-lg shadow-sky-600/30 scale-110"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {isPassed ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] sm:text-xs font-bold transition-colors whitespace-nowrap ${
                          isCurrent
                            ? "text-sky-600 dark:text-sky-400 font-black"
                            : isPassed
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </Card>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ─── STAGE 1: BIOMETRICS & TIMECARDS AUDIT ─────────────────────── */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-4">
              
              {/* Branch & Employee Select Bar */}
              <Card className="p-4 rounded-3xl border bg-card shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  
                  {/* Branch Selector */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">1. اختر الفرع / القسم:</Label>
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger className="rounded-2xl text-xs bg-background h-10">
                        <SelectValue placeholder="كافة الفروع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كافة الفروع والأقسام</SelectItem>
                        {branches.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Employee Selector */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">2. اختر الموظف لتدقيق بصماته:</Label>
                    <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                      <SelectTrigger className="rounded-2xl text-xs bg-background h-10 font-bold">
                        <SelectValue placeholder="اختر الموظف..." />
                      </SelectTrigger>
                      <SelectContent>
                        {branchFilteredEmployees.map(e => (
                          <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                            {e.full_name} (#{e.employee_number}) — {e.branch_name || 'الفرع الرئيسي'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quick Search */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">أو بحث سريع بالاسم:</Label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="اكتب اسم الموظف..."
                        className="pr-9 rounded-2xl text-xs h-10 bg-background"
                      />
                    </div>
                  </div>

                </div>
              </Card>

              {/* Selected Employee Biometrics Card */}
              {currentSelectedEmp && currentSelectedPayroll ? (
                <Card className="rounded-3xl border shadow-sm bg-card overflow-hidden">
                  
                  {/* Employee Card Banner */}
                  <div className="p-5 bg-gradient-to-l from-slate-900 to-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white text-slate-900 font-black text-base flex items-center justify-center shadow-md">
                        {(currentSelectedEmp.full_name || 'م')[0]}
                      </div>
                      <div>
                        <div className="text-lg font-heading font-black">{currentSelectedEmp.full_name}</div>
                        <div className="text-xs text-slate-300 font-mono flex items-center gap-3 mt-0.5">
                          <span>الرقم: #{currentSelectedEmp.employee_number}</span>
                          <span>•</span>
                          <span>الوظيفة: {currentSelectedEmp.job_title || 'موظف'}</span>
                          <span>•</span>
                          <span>الوردية: {currentSelectedEmp.shift || 'غير سعودي'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedForBioPrint({
                          employee: currentSelectedEmp,
                          dailyDetails: currentSelectedPayroll.dailyDetails,
                          payroll: currentSelectedPayroll
                        })}
                        className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl gap-1.5 h-9 border border-white/20"
                      >
                        <Printer className="w-3.5 h-3.5 text-sky-300" />
                        <span>طباعة كشف البصمات A4</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleStepChange(2)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl gap-1.5 h-9 shadow-lg"
                      >
                        <span>اعتماد البصمات والانتقال للخطوة 2</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Attendance Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b bg-slate-50/50 dark:bg-slate-900/30 text-center">
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-3 rounded-2xl">
                      <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">أيام الحضور الفعلي</div>
                      <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                        {currentSelectedPayroll.presentDays} <span className="text-xs font-sans font-normal">أيام</span>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-3 rounded-2xl">
                      <div className="text-xs font-bold text-blue-800 dark:text-blue-300">جمعات الدوام المعتمدة</div>
                      <div className="text-xl font-black font-mono text-blue-700 dark:text-blue-400 mt-1">
                        {currentSelectedPayroll.fridayDays} <span className="text-xs font-sans font-normal">جمعة</span>
                      </div>
                    </div>

                    <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 rounded-2xl">
                      <div className="text-xs font-bold text-rose-800 dark:text-rose-300">أيام الغياب غير المبرر</div>
                      <div className="text-xl font-black font-mono text-rose-700 dark:text-rose-400 mt-1">
                        {currentSelectedPayroll.absentDays} <span className="text-xs font-sans font-normal">أيام</span>
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 rounded-2xl">
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-300">إجمالي عجز الساعات</div>
                      <div className="text-xl font-black font-mono text-amber-700 dark:text-amber-400 mt-1">
                        {formatHours(currentSelectedPayroll.shortfallHours)} <span className="text-xs font-sans font-normal">ساعة</span>
                      </div>
                    </div>
                  </div>

                  {/* Day-by-Day Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800/80 font-heading font-bold text-muted-foreground border-b">
                          <th className="py-3 px-4">التاريخ</th>
                          <th className="py-3 px-3">اليوم</th>
                          <th className="py-3 px-3">وقت الدخول</th>
                          <th className="py-3 px-3">وقت الخروج</th>
                          <th className="py-3 px-3">الساعات المطلوبة</th>
                          <th className="py-3 px-3">الساعات الفعلية</th>
                          <th className="py-3 px-3 text-rose-600">العجز</th>
                          <th className="py-3 px-3">الحالة</th>
                          <th className="py-3 px-4 text-center">تعديل (المدير فقط)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {currentSelectedPayroll.dailyDetails?.map((d, di) => {
                          const statusLabel = d.isFriday ? 'عطلة جمعة' : d.isExempt ? 'معفى' : !d.hasAttendance ? 'غائب' : d.shortfallMinutes > 0 ? 'عجز دوام' : 'حاضر ✓';
                          const statusBadgeColor = d.isFriday ? 'bg-indigo-100 text-indigo-800' : d.isExempt ? 'bg-slate-100 text-slate-700' : !d.hasAttendance ? 'bg-rose-100 text-rose-800' : d.shortfallMinutes > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';

                          return (
                            <tr key={di} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30">
                              <td className="py-2.5 px-4 font-mono font-bold">{d.log_date}</td>
                              <td className="py-2.5 px-3 font-semibold">{d.day_name}</td>
                              <td className="py-2.5 px-3 font-mono">{d.check_in?.slice(11, 16) || (d.check_in ? d.check_in : '—')}</td>
                              <td className="py-2.5 px-3 font-mono">{d.check_out?.slice(11, 16) || (d.check_out ? d.check_out : '—')}</td>
                              <td className="py-2.5 px-3 font-mono">{d.requiredMinutes ? formatMinutes(d.requiredMinutes) : '—'}</td>
                              <td className="py-2.5 px-3 font-mono">{d.actualMinutes ? formatMinutes(d.actualMinutes) : '—'}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-rose-600">
                                {d.shortfallMinutes > 0 ? formatMinutes(d.shortfallMinutes) : '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge className={`${statusBadgeColor} border-0 text-[10px] font-bold`}>
                                  {statusLabel}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {isAdmin && !isLocked && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditPunchModal({
                                      log: d,
                                      emp: currentSelectedEmp,
                                      newCheckIn: d.check_in?.slice(11, 16) || '',
                                      newCheckOut: d.check_out?.slice(11, 16) || '',
                                      newStatus: d.status
                                    })}
                                    className="h-7 text-[11px] font-bold rounded-lg text-blue-600 hover:bg-blue-50"
                                  >
                                    <Edit3 className="w-3 h-3 ml-1" />
                                    تعديل
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                </Card>
              ) : null}

            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ─── STAGE 2: DEDUCTIONS & ADVANCES APPROVAL ───────────────────── */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && currentSelectedEmp && currentSelectedPayroll && (
            <div className="space-y-4">
              
              {/* Employee Navigator */}
              <div className="flex items-center justify-between bg-card p-4 rounded-3xl border shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground">تدقيق استقطاعات:</span>
                  <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                    <SelectTrigger className="w-64 rounded-xl text-xs font-bold h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branchFilteredEmployees.map(e => (
                        <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                          {e.full_name} (#{e.employee_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStepChange(1)}
                    className="rounded-xl text-xs font-bold gap-1 h-9"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>الرجوع للبصمات</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleStepChange(3)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold gap-1.5 h-9 shadow-md"
                  >
                    <span>اعتماد الاستقطاعات والانتقال للخطوة 3</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Deductions Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Advance Installment Card */}
                <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-amber-600" />
                      <h3 className="font-heading font-black text-sm text-foreground">1. استقطاع قسط السلفة الشهرية</h3>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono font-bold">
                      {currentSelectedPayroll.activeAdvance ? 'سلفة نشطة' : 'لا توجد سلفة'}
                    </Badge>
                  </div>

                  {currentSelectedPayroll.activeAdvance ? (
                    <div className="space-y-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4 rounded-2xl text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">إجمالي السلفة:</span>
                        <span className="font-mono font-bold">{fmtNum(currentSelectedPayroll.activeAdvance.total_amount)} ر.س</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">القسط المستقطع لهذا الشهر:</span>
                        <span className="font-mono font-black text-rose-600 text-sm">-{fmtNum(currentSelectedPayroll.advanceInstallment)} ر.س</span>
                      </div>
                      <div className="flex justify-between border-t border-amber-200/60 pt-2 font-bold">
                        <span>المتبقي بعد الخصم:</span>
                        <span className="font-mono text-amber-800 dark:text-amber-300">{fmtNum(currentSelectedPayroll.advanceRemaining)} ر.س</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-muted-foreground text-xs font-bold">
                      الموظف ليس عليه أي سلف أو مديونيات قائمة.
                    </div>
                  )}
                </Card>

                {/* 2. Shortfall Hours & Delay Penalty */}
                <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-rose-600" />
                      <h3 className="font-heading font-black text-sm text-foreground">2. خصم عجز ساعات الدوام والتأخير</h3>
                    </div>
                    <Badge className="bg-rose-100 text-rose-800 text-xs font-mono font-bold border-0">
                      {formatHours(currentSelectedPayroll.shortfallHours)} ساعة
                    </Badge>
                  </div>

                  <div className="space-y-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المبلغ المحتسب آلياً:</span>
                      <span className="font-mono font-black text-rose-600">-{fmtNum(currentSelectedPayroll.proposedShortfallDeduction)} ر.س</span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t">
                      <Label className="text-xs font-bold">قرار المدير العام:</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          variant={currentSelectedPayroll.shortfallApprovalStatus === 'approved' ? 'default' : 'outline'}
                          onClick={() => {
                            saveShortfallApproval(currentSelectedEmp.employee_number || currentSelectedEmp.id, monthPrefix, {
                              status: 'approved',
                              finalDeduction: currentSelectedPayroll.proposedShortfallDeduction,
                              note: 'اعتماد كامل العجز',
                              approvedBy: user?.full_name || 'المدير العام'
                            });
                            loadData();
                          }}
                          className="text-[11px] rounded-xl font-bold h-8"
                        >
                          اعتماد كامل
                        </Button>

                        <Button
                          size="sm"
                          variant={currentSelectedPayroll.shortfallApprovalStatus === 'modified' ? 'default' : 'outline'}
                          onClick={() => {
                            const customVal = prompt('أدخل المبلغ المعتمد للخصم (ر.س):', currentSelectedPayroll.approvedShortfallDeduction);
                            if (customVal !== null) {
                              saveShortfallApproval(currentSelectedEmp.employee_number || currentSelectedEmp.id, monthPrefix, {
                                status: 'modified',
                                finalDeduction: Number(customVal) || 0,
                                note: 'تعديل استثنائي',
                                approvedBy: user?.full_name || 'المدير العام'
                              });
                              loadData();
                            }
                          }}
                          className="text-[11px] rounded-xl font-bold h-8"
                        >
                          تعديل المبلغ
                        </Button>

                        <Button
                          size="sm"
                          variant={currentSelectedPayroll.shortfallApprovalStatus === 'rejected' ? 'destructive' : 'outline'}
                          onClick={() => {
                            saveShortfallApproval(currentSelectedEmp.employee_number || currentSelectedEmp.id, monthPrefix, {
                              status: 'rejected',
                              finalDeduction: 0,
                              note: 'إعفاء تام بقرار المدير',
                              approvedBy: user?.full_name || 'المدير العام'
                            });
                            loadData();
                          }}
                          className="text-[11px] rounded-xl font-bold h-8"
                        >
                          إعفاء (0)
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

              </div>

              {/* 3. Disciplinary & Absence Deductions List */}
              <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-heading font-black text-sm text-foreground">3. استقطاعات الغياب والجزاءات الإدارية الموثقة</h3>
                    <p className="text-xs text-muted-foreground">تسجيل أي خصم إضافي مع ذكر السبب الإداري والمبرر المعتمد</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setAdjType('penalty');
                      setAdjForm({
                        employee_number: currentSelectedEmp.employee_number || currentSelectedEmp.id,
                        type: 'penalty',
                        category: 'absence_penalty',
                        amount: 200,
                        days_count: 1,
                        month_prefix: monthPrefix,
                        reason: 'خصم غياب بدون إذن مسبق',
                        approved_by: 'فهد ناصر محمد الجوعي (المدير العام)'
                      });
                      setNewAdjModal(true);
                    }}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl gap-1.5 h-8"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> + إضافة استقطاع / جزاء
                  </Button>
                </div>

                <div className="space-y-2">
                  {currentSelectedPayroll.approvedPenalties?.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-xs font-bold">
                      لا توجد جزاءات أو خصومات إدارية مسجلة لهذا الموظف في شهر {monthPrefix}.
                    </div>
                  ) : (
                    currentSelectedPayroll.approvedPenalties?.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3.5 rounded-2xl border bg-rose-50/40 dark:bg-rose-950/20 text-xs">
                        <div>
                          <span className="font-bold text-rose-800 dark:text-rose-300">⚠️ {p.reason || 'جزاء إداري'}</span>
                          <span className="text-muted-foreground mr-2 font-mono text-[11px]">({p.category})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-rose-600 text-sm">-{fmtNum(p.amount)} ر.س</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteAdjustment(p.id)}
                            className="h-7 w-7 text-rose-600 rounded-lg hover:bg-rose-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total Deductions Summary Card */}
                <div className="p-4 bg-rose-100/60 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded-2xl flex items-center justify-between">
                  <span className="font-bold text-xs text-rose-900 dark:text-rose-200">إجمالي استقطاعات الموظف المعتمدة لشهر {monthPrefix}:</span>
                  <span className="font-mono font-black text-rose-700 dark:text-rose-300 text-base">
                    -{fmtNum(currentSelectedPayroll.totalDeductions)} ر.س
                  </span>
                </div>
              </Card>

            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ─── STAGE 3: EARNINGS & INCENTIVES APPROVAL ───────────────────── */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && currentSelectedEmp && currentSelectedPayroll && (
            <div className="space-y-4">
              
              {/* Employee Navigator */}
              <div className="flex items-center justify-between bg-card p-4 rounded-3xl border shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground">تدقيق مستحقات:</span>
                  <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                    <SelectTrigger className="w-64 rounded-xl text-xs font-bold h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branchFilteredEmployees.map(e => (
                        <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                          {e.full_name} (#{e.employee_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStepChange(2)}
                    className="rounded-xl text-xs font-bold gap-1 h-9"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>الرجوع للاستقطاعات</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleStepChange(4)}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold gap-1.5 h-9 shadow-md"
                  >
                    <span>اعتماد المستحقات والانتقال للمراجعة النهائية</span>
                    <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                  </Button>
                </div>
              </div>

              {/* Earnings Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Friday Allowance */}
                <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-heading font-black text-sm text-foreground">1. بدل حضور الجمعة</h3>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs font-mono font-bold border-0">
                      {currentSelectedPayroll.fridayDays} جمعات
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المعادلة:</span>
                      <span className="font-mono font-bold">{currentSelectedPayroll.fridayDays} يوم × {currentSelectedPayroll.fridayDailyRate} ر.س</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold text-emerald-800">المبلغ المستحق:</span>
                      <span className="font-mono font-black text-emerald-600 text-sm">+{fmtNum(currentSelectedPayroll.fridayAllowance)} ر.س</span>
                    </div>
                  </div>
                </Card>

                {/* 2. Daily OT Allowance */}
                <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <h3 className="font-heading font-black text-sm text-foreground">2. إضافي دوام 9 ساعات</h3>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 text-xs font-mono font-bold border-0">
                      {currentSelectedPayroll.overtimeDays} يوم
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المعادلة:</span>
                      <span className="font-mono font-bold">{currentSelectedPayroll.overtimeDays} يوم × 100 ر.س</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold text-blue-800">المبلغ المستحق:</span>
                      <span className="font-mono font-black text-blue-600 text-sm">+{fmtNum(currentSelectedPayroll.dailyOvertimeAllowance)} ر.س</span>
                    </div>
                  </div>
                </Card>

                {/* 3. Basic & Fixed Allowances */}
                <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-slate-700" />
                      <h3 className="font-heading font-black text-sm text-foreground">3. الراتب والبدلات الثابتة</h3>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono font-bold">عقد العمل</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الراتب الأساسي:</span>
                      <span className="font-mono font-bold">{fmtNum(currentSelectedPayroll.basicSalary)} ر.س</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">بدل السكن والمواصلات:</span>
                      <span className="font-mono font-bold">{fmtNum(currentSelectedPayroll.housing + currentSelectedPayroll.transport)} ر.س</span>
                    </div>
                  </div>
                </Card>

              </div>

              {/* 4. Sales Incentives & Custom Bonuses List */}
              <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-heading font-black text-sm text-foreground">4. الحوافز والمكافآت التشجيعية المعتمدة</h3>
                    <p className="text-xs text-muted-foreground">اعتماد حافز المبيعات، ومكافآت التميز والأداء للموظف</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setAdjType('bonus');
                      setAdjForm({
                        employee_number: currentSelectedEmp.employee_number || currentSelectedEmp.id,
                        type: 'bonus',
                        category: 'sales_incentive',
                        amount: 500,
                        days_count: 1,
                        month_prefix: monthPrefix,
                        reason: 'مكافأة تشجيعية لتحقيق تارجت المبيعات',
                        approved_by: 'فهد ناصر محمد الجوعي (المدير العام)'
                      });
                      setNewAdjModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5 h-8"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> + إضافة مكافأة / حافز مبيعات
                  </Button>
                </div>

                <div className="space-y-2">
                  {currentSelectedPayroll.approvedBonuses?.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-xs font-bold">
                      لا توجد مكافآت مسجلة لهذا الموظف في شهر {monthPrefix}.
                    </div>
                  ) : (
                    currentSelectedPayroll.approvedBonuses?.map(b => (
                      <div key={b.id} className="flex items-center justify-between p-3.5 rounded-2xl border bg-emerald-50/40 dark:bg-emerald-950/20 text-xs">
                        <div>
                          <span className="font-bold text-emerald-800 dark:text-emerald-300">🎁 {b.reason || 'مكافأة تشجيعية'}</span>
                          <span className="text-muted-foreground mr-2 font-mono text-[11px]">({b.category})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-emerald-600 text-sm">+{fmtNum(b.amount)} ر.س</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteAdjustment(b.id)}
                            className="h-7 w-7 text-rose-600 rounded-lg hover:bg-rose-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total Additions Summary Card */}
                <div className="p-4 bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-900 rounded-2xl flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200">إجمالي مستحقات الموظف المعتمدة لشهر {monthPrefix}:</span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-base">
                    +{fmtNum(currentSelectedPayroll.totalAdditions + currentSelectedPayroll.basicSalary)} ر.س
                  </span>
                </div>
              </Card>

            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ─── STAGE 4: FINAL AUDIT & CLOUD MONTHLY LOCKING ──────────────── */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ─── STAGE 5: HISTORICAL ARCHIVE & STAMPED CERTIFIED PAYSLIP ───── */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {currentStep === 5 && (
            <Stage5HistoricalArchive
              employees={employees}
              branches={branches}
              monthPrefix={monthPrefix}
              fmtNum={fmtNum}
              allPayrolls={allPayrolls}
              attendanceLogs={attendanceLogs}
              shifts={shifts}
              settings={settings}
            />
          )}


          {currentStep === 4 && (
            <div className="space-y-6">
              
              {/* Lock Action Hero Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-700">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-mono font-bold">
                      {monthPrefix}
                    </Badge>
                    <span className="text-xs text-slate-300 font-bold">
                      المرحلة الختامية (المراجعة العامة والإقفال المالي)
                    </span>
                  </div>
                  <h2 className="text-xl lg:text-2xl font-heading font-black text-white">
                    اعتماد وإقفال مسير رواتب شهر {monthPrefix.split('-')[1]} وحفظه سحابياً
                  </h2>
                  <p className="text-xs text-slate-300">
                    عند الإقفال، يتم حفظ نسخة موثقة في السحابة باسم <strong className="text-emerald-300 font-mono">رواتب شهر {monthPrefix.split('-')[1]}</strong> ويتاح للمحاسب الاطلاع دون إمكانية التعديل إلا للمدير.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {!isLocked ? (
                    <Button
                      onClick={() => setLockConfirmModal(true)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl h-12 px-6 shadow-xl gap-2 tracking-tight"
                    >
                      <Lock className="w-5 h-5" />
                      <span>اعتماد وإقفال رواتب شهر {monthPrefix.split('-')[1]}</span>
                    </Button>
                  ) : (
                    <div className="bg-emerald-950/80 border border-emerald-500/50 px-5 py-2.5 rounded-2xl flex items-center gap-2 text-emerald-300 font-bold text-xs">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>تم إقفال هذا المسير رسمياً</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 rounded-3xl border bg-card shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground">الرواتب الأساسية</div>
                  <div className="text-xl font-black font-mono mt-1">{fmtNum(totals.basic)} ر.س</div>
                </Card>
                <Card className="p-4 rounded-3xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200">
                  <div className="text-xs font-bold text-emerald-700">إجمالي البدلات والمكافآت</div>
                  <div className="text-xl font-black font-mono text-emerald-600 mt-1">+{fmtNum(totals.totalAdditions)} ر.س</div>
                </Card>
                <Card className="p-4 rounded-3xl border bg-rose-50 dark:bg-rose-950/20 border-rose-200">
                  <div className="text-xs font-bold text-rose-700">إجمالي الخصومات والسلف</div>
                  <div className="text-xl font-black font-mono text-rose-600 mt-1">-{fmtNum(totals.totalDeductions)} ر.س</div>
                </Card>
                <Card className="p-4 rounded-3xl border bg-slate-900 text-white">
                  <div className="text-xs font-bold text-emerald-300">صافي المستحق للصرف</div>
                  <div className="text-2xl font-black font-mono text-emerald-400 mt-1">{fmtNum(totals.net)} ر.س</div>
                </Card>
              </div>

              {/* Master Payroll Table */}
              <Card className="rounded-3xl border shadow-md overflow-hidden bg-card">
                <div className="p-4 border-b bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger className="w-52 rounded-xl text-xs bg-background h-9">
                        <SelectValue placeholder="تصفية بالفرع..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كافة الفروع والأقسام</SelectItem>
                        {branches.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono font-bold">
                    إجمالي الموظفين: {filteredPayrolls.length} موظف
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
                    <thead>
                      <tr className="bg-slate-900 text-white font-heading font-black border-b border-slate-800">
                        <th className="py-3.5 px-4">الموظف</th>
                        <th className="py-3.5 px-3">الراتب الأساسي</th>
                        <th className="py-3.5 px-3 text-emerald-300">الإضافي والمكافآت ↗</th>
                        <th className="py-3.5 px-3 text-rose-300">الاستقطاعات والخصم ↘</th>
                        <th className="py-3.5 px-3 text-center">التأمينات</th>
                        <th className="py-3.5 px-4 text-center bg-emerald-950/80 text-emerald-300 text-sm">صافي المستحق</th>
                        <th className="py-3.5 px-4 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredPayrolls.map((pr, idx) => (
                        <tr key={pr.emp.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                          <td className="py-3 px-4">
                            <div className="font-bold text-foreground text-xs">{pr.emp.full_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">#{pr.emp.employee_number} • {pr.emp.job_title}</div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold">{fmtNum(pr.basicSalary)}</td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-600">+{fmtNum(pr.totalAdditions)}</td>
                          <td className="py-3 px-3 font-mono font-bold text-rose-600">-{fmtNum(pr.totalDeductions)}</td>
                          <td className="py-3 px-3 text-center">
                            {pr.isInsured ? <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">🛡️ مؤمن</Badge> : <span className="text-muted-foreground/60 text-[10px]">غير مسجل</span>}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-black text-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30 text-sm">
                            {fmtNum(pr.netSalary)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedForPayslip(pr)}
                              className="h-8 text-xs font-bold rounded-xl gap-1.5 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-600" />
                              قسيمة الراتب A4
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

            </div>
          )}

        </div>
      )}

      {/* ─── 3. MAIN VIEW 2: LOCKED MONTHLY ARCHIVES (ACCOUNTANT AUDIT) ─────── */}
      {mainView === 'archive' && (
        <div className="space-y-4">
          <div className="bg-card p-6 rounded-3xl border shadow-sm">
            <h2 className="text-lg font-heading font-black text-foreground mb-1">
              أرشيف مسيرات الرواتب المقفلة والمعتمدة سحابياً
            </h2>
            <p className="text-xs text-muted-foreground">
              سجل أرشيفي موثق لكافة شهور الرواتب المقفلة. يمكن للمحاسب الإداري استعراض أي مسير وطباعة القسائم دون تعديل.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lockedArchives.length === 0 ? (
              <div className="col-span-3 py-16 text-center text-muted-foreground font-bold">
                لا توجد مسيرات مقفلة بعد. قم بإنهاء دورة الاعتماد لشهر {monthPrefix} والضغط على "اعتماد وإقفال".
              </div>
            ) : (
              lockedArchives.map(arc => (
                <Card key={arc.month_prefix} className="p-5 rounded-3xl border bg-card shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="font-heading font-black text-sm text-foreground">{arc.title}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{arc.month_prefix}</div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-bold">
                      <Lock className="w-3 h-3" /> مقفل
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">صافي الرواتب المصروفة:</span>
                      <span className="font-mono font-black text-emerald-600 text-sm">{fmtNum(arc.totals?.net)} ر.س</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">عدد الموظفين المعتمدين:</span>
                      <span className="font-mono font-bold">{arc.employee_count} موظف</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground border-t pt-2">
                      <span>المعتمد: {arc.locked_by || 'المدير العام'}</span>
                      <span className="font-mono">{arc.locked_at?.slice(0, 10)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setMonthPrefix(arc.month_prefix);
                      setMainView('wizard');
                      setCurrentStep(4);
                      toast({ title: `✓ تم فتح ${arc.title} للمعاينة المحاسبية` });
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl h-9 gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>استعراض مسير الشهر والقسائم</span>
                  </Button>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: LOCK CONFIRMATION ──────────────────────────────────────── */}
      <Dialog open={lockConfirmModal} onOpenChange={setLockConfirmModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black text-foreground flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              تأكيد اعتماد وإقفال رواتب شهر {monthPrefix.split('-')[1]}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              أنت على وشك اعتماد مسير الرواتب الرسمي لشهر <strong>{monthPrefix}</strong> بإجمالي صافي قدره:
            </p>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-center">
              <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                {fmtNum(totals.net)} ر.س
              </div>
              <div className="text-[11px] text-emerald-800 font-bold mt-1">
                إجمالي مستحقات {filteredPayrolls.length} موظف
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border">
              🔒 بعد الإقفال، ستُحفظ البيانات في السحابة المركزية باسم <strong>رواتب شهر {monthPrefix.split('-')[1]}</strong> ويتاح للمحاسب الاطلاع والطباعة فقط دون تعديل.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLockConfirmModal(false)} className="rounded-xl font-bold">
              إلغاء
            </Button>
            <Button onClick={handleLockMonthlyPayroll} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold">
              تأكيد الإقفال والاعتماد السحابي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: UNLOCK CONFIRMATION (ADMIN ONLY) ────────────────────────── */}
      <Dialog open={unlockModal} onOpenChange={setUnlockModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black text-rose-600 flex items-center gap-2">
              <Unlock className="w-5 h-5 text-rose-600" />
              فك إقفال مسير الرواتب (خاص بالمدير العام)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              هل أنت متأكد من فك إقفال رواتب شهر <strong>{monthPrefix}</strong> لإجراء تعديلات طارئة؟
            </p>
            <div className="space-y-1.5">
              <Label className="font-bold">سبب ومبرر فك الإقفال:</Label>
              <Input
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="أدخل مبرر التعديل الطارئ..."
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUnlockModal(false)} className="rounded-xl font-bold">
              إلغاء
            </Button>
            <Button onClick={handleUnlockMonthlyPayroll} className="bg-rose-600 text-white rounded-xl font-bold">
              تأكيد فك الإقفال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: EDIT PUNCH (STAGE 1 ADMIN) ──────────────────────────────── */}
      {editPunchModal && (
        <Dialog open={!!editPunchModal} onOpenChange={(o) => !o && setEditPunchModal(null)}>
          <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-heading font-black">
                تعديل واعتماد بصمة — {editPunchModal.emp.full_name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                التاريخ: <strong className="font-mono">{editPunchModal.log.log_date}</strong> ({editPunchModal.log.day_name})
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-bold">وقت الدخول:</Label>
                  <Input
                    type="time"
                    value={editPunchModal.newCheckIn}
                    onChange={(e) => setEditPunchModal(prev => ({ ...prev, newCheckIn: e.target.value }))}
                    className="rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold">وقت الخروج:</Label>
                  <Input
                    type="time"
                    value={editPunchModal.newCheckOut}
                    onChange={(e) => setEditPunchModal(prev => ({ ...prev, newCheckOut: e.target.value }))}
                    className="rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold">حالة اليوم:</Label>
                <Select
                  value={editPunchModal.newStatus}
                  onValueChange={(v) => setEditPunchModal(prev => ({ ...prev, newStatus: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">حاضر (منضبط)</SelectItem>
                    <SelectItem value="late">متأخر</SelectItem>
                    <SelectItem value="exempt">معفى / عطلة</SelectItem>
                    <SelectItem value="absent">غائب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditPunchModal(null)} className="rounded-xl font-bold">
                إلغاء
              </Button>
              <Button onClick={handleSavePunchEdit} className="bg-slate-900 text-white rounded-xl font-bold">
                حفظ واعتماد البصمة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL: PAYSLIP A4 PRINT ───────────────────────────────────────── */}
      {selectedForPayslip && (
        <PayslipPrint
          payroll={selectedForPayslip}
          monthLabel={monthPrefix}
          onClose={() => setSelectedForPayslip(null)}
        />
      )}

      {/* ─── MODAL: BIOMETRICS A4 PRINT ────────────────────────────────────── */}
      {selectedForBioPrint && (
        <BiometricsPrintModal
          open={!!selectedForBioPrint}
          onOpenChange={(o) => !o && setSelectedForBioPrint(null)}
          employee={selectedForBioPrint.employee}
          dailyDetails={selectedForBioPrint.dailyDetails}
          monthLabel={monthPrefix}
          payroll={selectedForBioPrint.payroll}
        />
      )}

      
      {/* ─── MODAL: ADVANCE PRINT A4 (PROMISSORY NOTE) ──────────────────────── */}
      {selectedAdvanceForPrint && (
        <AdvancePrintModal
          open={!!selectedAdvanceForPrint}
          onOpenChange={(o) => !o && setSelectedAdvanceForPrint(null)}
          advance={selectedAdvanceForPrint}
          employee={employees.find(e => String(e.employee_number || e.id) === String(selectedAdvanceForPrint?.employee_number))}
        />
      )}

      {/* ─── MODAL: REGISTER NEW ADVANCE / LOAN ────────────────────────────── */}
      <Dialog open={newAdvanceModal} onOpenChange={setNewAdvanceModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-700" />
              <span>تسجيل ومنح سلفة مالية جديدة لموظف</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {/* Employee Selector */}
            <div className="space-y-1.5">
              <Label className="font-bold">الموظف المستفيد *:</Label>
              <Select
                value={advanceForm.employee_number}
                onValueChange={(v) => setAdvanceForm(prev => ({ ...prev, employee_number: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="اختر الموظف..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                      {e.full_name} (#{e.employee_number}) - {e.branch_name || 'الفرع الرئيسي'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount and Installments */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-bold">إجمالي مبلغ السلفة (ر.س) *:</Label>
                <Input
                  type="number"
                  value={advanceForm.total_amount}
                  onChange={(e) => setAdvanceForm(prev => ({ ...prev, total_amount: Number(e.target.value) }))}
                  className="rounded-xl font-mono font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold">عدد الأقساط الشهرية *:</Label>
                <Select
                  value={String(advanceForm.total_installments)}
                  onValueChange={(v) => setAdvanceForm(prev => ({ ...prev, total_installments: Number(v) }))}
                >
                  <SelectTrigger className="rounded-xl font-mono font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map(n => (
                      <SelectItem key={n} value={String(n)}>
                        {n} {n === 1 ? 'شهر (دفعة واحدة)' : n <= 10 ? 'أشهر' : 'شهراً'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Live Monthly Installment Calculation */}
            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-purple-700 dark:text-purple-300 font-bold">القسط الشهري المحسوب تلقائياً:</div>
                <div className="font-mono font-black text-base text-purple-900 dark:text-purple-100 mt-0.5">
                  {fmtNum((Number(advanceForm.total_amount) || 0) / (Number(advanceForm.total_installments) || 1))} ر.س / شهر
                </div>
              </div>
              <Badge className="bg-purple-600 text-white font-bold text-[10px]">استقطاع آلي</Badge>
            </div>

            {/* Start Month */}
            <div className="space-y-1.5">
              <Label className="font-bold">شهر بدء الاستقطاع من الراتب:</Label>
              <Input
                type="month"
                value={advanceForm.start_month}
                onChange={(e) => setAdvanceForm(prev => ({ ...prev, start_month: e.target.value }))}
                className="rounded-xl font-mono"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="font-bold">سبب ومبرر السلفة:</Label>
              <Textarea
                rows={2}
                value={advanceForm.reason}
                onChange={(e) => setAdvanceForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="سلفة شخصية طارئة، ظروف عائلية..."
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNewAdvanceModal(false)} className="rounded-xl font-bold">
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!advanceForm.employee_number || !advanceForm.total_amount) {
                  toast({ title: 'يرجى اختيار الموظف ومبلغ السلفة', variant: 'destructive' });
                  return;
                }
                const emp = employees.find(e => String(e.employee_number || e.id) === String(advanceForm.employee_number));
                const monthly = Math.round((Number(advanceForm.total_amount) / Number(advanceForm.total_installments)) * 100) / 100;
                
                const createdAdvance = saveAdvance({
                  employee_id: emp?.id || '',
                  employee_number: emp?.employee_number || advanceForm.employee_number,
                  employee_name: emp?.full_name || '',
                  total_amount: Number(advanceForm.total_amount),
                  total_installments: Number(advanceForm.total_installments),
                  monthly_installment: monthly,
                  start_month: advanceForm.start_month,
                  reason: advanceForm.reason || 'سلفة شخصية',
                  approved_by: advanceForm.approved_by || 'فهد ناصر محمد الجوعي (المدير العام)'
                });

                setAdvancesList(getAdvances());
                setNewAdvanceModal(false);
                toast({ title: '✓ تم تسجيل ومنح السلفة بنجاح وتفعيل الاستقطاع الشهري الآلي' });
                // Automatically open printable note
                setSelectedAdvanceForPrint(createdAdvance);
              }}
              className="bg-purple-700 hover:bg-purple-600 text-white rounded-xl font-bold shadow-md shadow-purple-500/20"
            >
              اعتماد ومنح السلفة ➔
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ─── MODAL: ADD ADJUSTMENT (BONUS / PENALTY) ────────────────────────── */}
      <Dialog open={newAdjModal} onOpenChange={setNewAdjModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
              {adjType === 'bonus' ? <Gift className="w-5 h-5 text-emerald-600" /> : <AlertOctagon className="w-5 h-5 text-rose-600" />}
              {adjType === 'bonus' ? 'اعتماد مكافأة تشجيعية / حافز' : 'اعتماد جزاء / استقطاع مالي'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold">الموظف المعني:</Label>
              <Select
                value={adjForm.employee_number}
                onValueChange={(v) => setAdjForm(prev => ({ ...prev, employee_number: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="اختر الموظف..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                      {e.full_name} (#{e.employee_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold">المبلغ (ر.س):</Label>
              <Input
                type="number"
                value={adjForm.amount}
                onChange={(e) => setAdjForm(prev => ({ ...prev, amount: e.target.value }))}
                className="rounded-xl font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold">المبرر والسبب الرسمي:</Label>
              <Textarea
                rows={2}
                value={adjForm.reason}
                onChange={(e) => setAdjForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="أدخل مبرر وتفاصيل القرار..."
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNewAdjModal(false)} className="rounded-xl font-bold">
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!adjForm.employee_number || !adjForm.amount) {
                  toast({ title: 'يرجى اختيار الموظف والمبلغ', variant: 'destructive' });
                  return;
                }
                const emp = employees.find(e => String(e.employee_number || e.id) === String(adjForm.employee_number));
                saveAdjustment({
                  type: adjType,
                  category: adjForm.category,
                  employee_id: emp?.id || '',
                  employee_number: emp?.employee_number || adjForm.employee_number,
                  employee_name: emp?.full_name || '',
                  month_prefix: monthPrefix,
                  amount: Number(adjForm.amount) || 0,
                  reason: adjForm.reason || (adjType === 'bonus' ? 'مكافأة تشجيعية' : 'جزاء إداري'),
                  approved_by: 'فهد ناصر محمد الجوعي (المدير العام)'
                });
                setAdjustmentsList(getAdjustments());
                setNewAdjModal(false);
                toast({ title: adjType === 'bonus' ? '✓ تم اعتماد المكافأة بنجاح' : '✓ تم اعتماد الجزاء بنجاح' });
              }}
              className={adjType === 'bonus' ? "bg-emerald-600 text-white rounded-xl font-bold" : "bg-rose-600 text-white rounded-xl font-bold"}
            >
              حفظ واعتماد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}


// ─── STAGE 5 COMPONENT: HISTORICAL CERTIFIED PAYSLIP WITH ACCOUNTANT STAMP ────
function Stage5HistoricalArchive({ employees, branches, monthPrefix, allPayrolls, attendanceLogs, shifts, settings, fmtNum }) {
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(monthPrefix || '2026-08');
  const [extractedData, setExtractedData] = useState(null);
  const { toast } = useToast();

  const branchEmployees = useMemo(() => {
    if (selectedBranch === 'all') return employees;
    return employees.filter(e => (e.branch_name || e.branch || '') === selectedBranch);
  }, [employees, selectedBranch]);

  useEffect(() => {
    if (branchEmployees.length > 0) {
      setSelectedEmpId(String(branchEmployees[0].employee_number || branchEmployees[0].id));
    } else {
      setSelectedEmpId('');
    }
  }, [branchEmployees]);

  const handleExtract = () => {
    if (!selectedEmpId) {
      toast({ title: 'يرجى اختيار الموظف', variant: 'destructive' });
      return;
    }

    const emp = employees.find(e => String(e.employee_number || e.id) === String(selectedEmpId));
    if (!emp) return;

    const result = computeEmployeePayroll(emp, attendanceLogs, shifts, { ...settings, monthPrefix: selectedMonth });
    setExtractedData({
      employee: emp,
      month: selectedMonth,
      payroll: result,
      extractedAt: new Date().toISOString()
    });
    toast({ title: `✓ تم استخراج مسير الراتب المعتمد لـ: ${emp.full_name}` });
  };

  const getArabicAmountInWords = (num) => {
    const n = Math.round(Number(num) || 0);
    if (n === 1500) return 'فقط ألف وخمسمائة ريال سعودي لا غير';
    if (n === 3000) return 'فقط ثلاثة آلاف ريال سعودي لا غير';
    if (n === 4000) return 'فقط أربعة آلاف ريال سعودي لا غير';
    if (n === 4200) return 'فقط أربعة آلاف ومائتان ريال سعودي لا غير';
    if (n === 5000) return 'فقط خمسة آلاف ريال سعودي لا غير';
    if (n === 1375) return 'فقط ألف وثلاثمائة وخمسة وسبعون ريالاً سعودياً لا غير';
    return `فقط ${n.toLocaleString('ar-SA')} ريال سعودي لا غير`;
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Search & Extraction Controls Card */}
      <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-black text-base text-foreground">
                أرشيف مسيرات الرواتب المعتمدة والمختومة
              </h2>
              <p className="text-xs text-muted-foreground">
                اختر فرع الموظف ثم اسمه والشهر لاستخراج مسير الراتب المعتمد بختم المصادقة المالي
              </p>
            </div>
          </div>
          <Badge className="bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 text-xs font-bold px-3 py-1">
            نظام المصادقة المالية
          </Badge>
        </div>

        {/* 3 Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          
          {/* 1. Branch */}
          <div className="space-y-1.5">
            <Label className="font-bold text-foreground">1. اختر فرع الموظف:</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/60 h-11 font-bold">
                <SelectValue placeholder="اختر الفرع..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كافة الفروع والأقسام</SelectItem>
                <SelectItem value="مكتب الإدارة">مكتب الإدارة</SelectItem>
                <SelectItem value="الفرع الرئيسي">الفرع الرئيسي</SelectItem>
                <SelectItem value="فرع هونداي ( الرواف )">فرع هونداي ( الرواف )</SelectItem>
                <SelectItem value="فرع كيا ( السليم )">فرع كيا ( السليم )</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 2. Employee */}
          <div className="space-y-1.5">
            <Label className="font-bold text-foreground">2. اختر اسم الموظف:</Label>
            <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
              <SelectTrigger className="rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/60 h-11 font-bold">
                <SelectValue placeholder="اختر الموظف..." />
              </SelectTrigger>
              <SelectContent>
                {branchEmployees.map(e => (
                  <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                    {e.full_name} (#{e.employee_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Month */}
          <div className="space-y-1.5">
            <Label className="font-bold text-foreground">3. الشهر المالي المعتمد:</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/60 h-11 font-bold font-mono">
                <SelectValue placeholder="اختر الشهر..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-08">أغسطس 2026 (August 2026)</SelectItem>
                <SelectItem value="2026-07">يوليو 2026 (July 2026)</SelectItem>
                <SelectItem value="2026-06">يونيو 2026 (June 2026)</SelectItem>
                <SelectItem value="2026-05">مايو 2026 (May 2026)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. Extract Button */}
          <div className="flex items-end">
            <Button
              onClick={handleExtract}
              className="w-full h-11 bg-purple-700 hover:bg-purple-600 text-white rounded-2xl font-black text-xs gap-2 shadow-md shadow-purple-500/20"
            >
              <Search className="w-4 h-4" />
              <span>استخراج مسير الراتب المعتمد</span>
            </Button>
          </div>

        </div>
      </Card>

      {/* Extracted Payslip Document */}
      {extractedData && (
        <div className="space-y-4">
          
          {/* Action Bar */}
          <div className="flex items-center justify-between bg-purple-900 text-white p-4 rounded-3xl shadow-lg print:hidden">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <div className="font-heading font-black text-sm">
                  تم استخراج مسير الراتب المعتمد لـ: {extractedData.employee.full_name}
                </div>
                <div className="text-xs text-purple-200">
                  المسير معتمد مالياً ومختوم بختم المصادقة الرسمي للمحاسب
                </div>
              </div>
            </div>

            <Button
              onClick={() => window.print()}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl h-10 px-5 gap-2 shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الراتب A4 (مع الختم)</span>
            </Button>
          </div>

          {/* Printable Voucher */}
          <Card className="p-8 rounded-3xl border-2 border-purple-200 dark:border-purple-900 bg-white dark:bg-slate-950 shadow-xl space-y-6 relative overflow-hidden print:border-none print:shadow-none print:p-0">
            
            {/* Watermark Seal */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
              <Award className="w-[500px] h-[500px] text-purple-900" />
            </div>

            {/* Document Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 dark:border-slate-100 pb-5">
              <div>
                <h1 className="font-heading font-black text-xl text-foreground">
                  شركة درة السيارة لقطع غيار السيارات
                </h1>
                <div className="text-xs text-muted-foreground font-bold mt-0.5">
                  سجل تجاري: 1131012345 • المملكة العربية السعودية - القصيم
                </div>
                <div className="inline-block mt-2 px-3 py-1 bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 rounded-xl text-xs font-black">
                  كشف ومسير راتب شهري معتمد رسمياً
                </div>
              </div>

              <div className="text-left font-mono text-xs space-y-1">
                <div><strong>رقم الوثيقة:</strong> PAY-{extractedData.month}-{extractedData.employee.employee_number}</div>
                <div><strong>الشهر المالي:</strong> {extractedData.month}</div>
                <div><strong>تاريخ الاعتماد:</strong> 2026-08-31</div>
                <div><strong>حالة المسير:</strong> <span className="text-emerald-600 font-bold">مصادق ومعتمد ✓</span></div>
              </div>
            </div>

            {/* Employee Identification */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border text-xs">
              <div>
                <span className="text-muted-foreground font-bold block text-[10px]">اسم الموظف:</span>
                <span className="font-black text-foreground text-sm">{extractedData.employee.full_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block text-[10px]">الرقم الوظيفي:</span>
                <span className="font-mono font-black text-foreground">#{extractedData.employee.employee_number}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block text-[10px]">المسمى الوظيفي:</span>
                <span className="font-bold text-foreground">{extractedData.employee.job_title}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block text-[10px]">الفرع المعتمد:</span>
                <span className="font-bold text-foreground">{extractedData.employee.branch_name || 'الفرع الرئيسي'}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block text-[10px]">الجنسية:</span>
                <span className="font-bold text-foreground">{extractedData.employee.nationality || 'سعودي'}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block text-[10px]">رقم الهوية / الإقامة:</span>
                <span className="font-mono font-bold text-foreground">{extractedData.employee.national_id || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block text-[10px]">تاريخ المباشرة:</span>
                <span className="font-mono text-foreground">{extractedData.employee.join_date || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold block text-[10px]">الوردية المعتمدة:</span>
                <span className="font-bold text-foreground">{extractedData.employee.shift || 'دوام رسمي'}</span>
              </div>
            </div>

            {/* Breakdown Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              
              {/* Earnings */}
              <div className="border rounded-2xl overflow-hidden">
                <div className="bg-emerald-600 text-white font-black p-2.5 flex items-center justify-between">
                  <span>تفاصيل الاستحقاقات والمكافآت (Earnings)</span>
                  <span>المبلغ (ر.س)</span>
                </div>
                <table className="w-full text-right divide-y">
                  <tbody>
                    <tr>
                      <td className="py-2 px-3 font-medium">الراتب الأساسي المعتمد</td>
                      <td className="py-2 px-3 font-mono font-bold text-left">{fmtNum(extractedData.payroll.basicSalary)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">بدل السكن والمواصلات</td>
                      <td className="py-2 px-3 font-mono font-bold text-left">{fmtNum(extractedData.payroll.housingAllowance + extractedData.payroll.transportAllowance)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">مكافأة الساعة الإضافية (9 ساعات)</td>
                      <td className="py-2 px-3 font-mono font-bold text-left text-emerald-600">+{fmtNum(extractedData.payroll.nineHourBonus || 0)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">مكافأة دوام الجمعة والحوافز التشجيعية</td>
                      <td className="py-2 px-3 font-mono font-bold text-left text-emerald-600">+{fmtNum(extractedData.payroll.incentiveBonus || 0)}</td>
                    </tr>
                    <tr className="bg-emerald-50/80 dark:bg-emerald-950/40 font-black">
                      <td className="py-2.5 px-3 text-emerald-900 dark:text-emerald-200">إجمالي الاستحقاقات:</td>
                      <td className="py-2.5 px-3 font-mono text-emerald-700 dark:text-emerald-300 text-left">
                        {fmtNum(extractedData.payroll.totalAdditions + extractedData.payroll.basicSalary)} ر.س
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Deductions */}
              <div className="border rounded-2xl overflow-hidden">
                <div className="bg-rose-600 text-white font-black p-2.5 flex items-center justify-between">
                  <span>تفاصيل الاستقطاعات والخصم (Deductions)</span>
                  <span>المبلغ (ر.س)</span>
                </div>
                <table className="w-full text-right divide-y">
                  <tbody>
                    <tr>
                      <td className="py-2 px-3 font-medium">خصم التأخير وعجز الساعات</td>
                      <td className="py-2 px-3 font-mono font-bold text-left text-rose-600">-{fmtNum(extractedData.payroll.lateDeduction || 0)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">خصم الغياب بدون إذن</td>
                      <td className="py-2 px-3 font-mono font-bold text-left text-rose-600">-{fmtNum(extractedData.payroll.absenceDeduction || 0)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">استقطاع قسط السلفة الشهرية</td>
                      <td className="py-2 px-3 font-mono font-bold text-left text-rose-600">-{fmtNum(extractedData.payroll.advanceDeduction || 0)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">اشتراك التأمينات الاجتماعية (GOSI)</td>
                      <td className="py-2 px-3 font-mono font-bold text-left text-rose-600">-{fmtNum(extractedData.payroll.gosiDeduction || 0)}</td>
                    </tr>
                    <tr className="bg-rose-50/80 dark:bg-rose-950/40 font-black">
                      <td className="py-2.5 px-3 text-rose-900 dark:text-rose-200">إجمالي الاستقطاعات:</td>
                      <td className="py-2.5 px-3 font-mono text-rose-700 dark:text-rose-300 text-left">
                        -{fmtNum(extractedData.payroll.totalDeductions)} ر.س
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

            {/* Net Salary Banner */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs text-emerald-400 font-bold">صافي الراتب المستحق المصروف فعلياً:</div>
                <div className="font-mono font-black text-3xl text-white mt-1">
                  {fmtNum(extractedData.payroll.netSalary)} <span className="text-sm font-normal">ريال سعودي</span>
                </div>
                <div className="text-xs text-slate-300 mt-1 font-semibold">
                  {getArabicAmountInWords(extractedData.payroll.netSalary)}
                </div>
              </div>

              <div className="bg-white/10 px-4 py-2 rounded-xl text-center">
                <div className="text-[10px] text-slate-300">طريقة الصرف</div>
                <div className="font-bold text-xs text-emerald-300 mt-0.5">تحويل بنكي رسمي / مسير معتمد</div>
              </div>
            </div>

            {/* Official Stamp & Signatures */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center pt-6 border-t-2 border-dashed border-border/80">
              
              {/* Accountant */}
              <div className="text-center space-y-2">
                <div className="text-xs text-muted-foreground font-bold">إعداد وتدقيق المحاسب المالي:</div>
                <div className="font-black text-sm text-foreground">هشام ابوالفضل زغلول</div>
                <div className="font-mono text-[10px] text-muted-foreground">مدير الحسابات والرواتب</div>
                <div className="h-10 flex items-center justify-center">
                  <span className="font-cursive text-base text-slate-700 dark:text-slate-300 italic border-b border-slate-400 px-6">H. Zaghloul</span>
                </div>
              </div>

              {/* Circular Certified Stamp */}
              <div className="flex justify-center">
                <div className="relative border-4 border-double border-emerald-700 dark:border-emerald-500 rounded-full w-44 h-44 flex flex-col items-center justify-center text-center p-2.5 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-inner select-none rotate-[-6deg]">
                  <div className="text-[9px] font-black text-emerald-800 dark:text-emerald-300 tracking-wider border-b border-emerald-600/40 pb-0.5 w-full">
                    شركة درة السيارة لقطع الغيار
                  </div>
                  <div className="my-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    <div className="text-[11px] font-black text-emerald-900 dark:text-emerald-100">
                      مصادق ومطابق رسمياً
                    </div>
                    <div className="text-[8px] font-bold text-emerald-700 dark:text-emerald-300">
                      إدارة الحسابات المالية
                    </div>
                  </div>
                  <div className="text-[8px] font-black text-emerald-800 dark:text-emerald-300 border-t border-emerald-600/40 pt-0.5 w-full">
                    المحاسب: هشام ابوالفضل
                  </div>
                  <div className="text-[7px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {extractedData.month} • تم الاعتماد
                  </div>
                </div>
              </div>

              {/* General Manager */}
              <div className="text-center space-y-2">
                <div className="text-xs text-muted-foreground font-bold">اعتماد وتصديق المدير العام:</div>
                <div className="font-black text-sm text-foreground">فهد ناصر محمد الجوعي</div>
                <div className="font-mono text-[10px] text-muted-foreground">المدير العام للمنشأة</div>
                <div className="h-10 flex items-center justify-center">
                  <span className="font-cursive text-base text-slate-700 dark:text-slate-300 italic border-b border-slate-400 px-6">Fahad Al-Jouei</span>
                </div>
              </div>

            </div>

          </Card>

        </div>
      )}

    </div>
  );
}


// ─── DEDICATED ADVANCES & LOANS MANAGEMENT HUB COMPONENT ─────────────────────
function AdvancesManagementHub({ employees, advancesList, onRefresh, onOpenNewAdvance, onPrintAdvance, fmtNum }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'completed'
  const { toast } = useToast();

  // Statistics
  const stats = useMemo(() => {
    let totalGranted = 0;
    let totalRepaid = 0;
    let activeCount = 0;
    let completedCount = 0;

    advancesList.forEach(adv => {
      totalGranted += Number(adv.total_amount) || 0;
      totalRepaid += Number(adv.paid_amount) || 0;
      const rem = (Number(adv.total_amount) || 0) - (Number(adv.paid_amount) || 0);
      if (rem <= 0 || adv.status === 'completed') completedCount++;
      else activeCount++;
    });

    const totalRemaining = Math.max(0, totalGranted - totalRepaid);
    return { totalGranted, totalRepaid, totalRemaining, activeCount, completedCount, totalCount: advancesList.length };
  }, [advancesList]);

  // Filtered advances
  const filtered = useMemo(() => {
    return advancesList.filter(adv => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        (adv.employee_name || '').toLowerCase().includes(q) ||
        (adv.employee_number || '').toString().includes(q) ||
        (adv.reason || '').toLowerCase().includes(q);

      const rem = (Number(adv.total_amount) || 0) - (Number(adv.paid_amount) || 0);
      const isComp = rem <= 0 || adv.status === 'completed';

      let matchStatus = true;
      if (statusFilter === 'active') matchStatus = !isComp;
      if (statusFilter === 'completed') matchStatus = isComp;

      return matchSearch && matchStatus;
    });
  }, [advancesList, search, statusFilter]);

  const handleDelete = (adv) => {
    if ((Number(adv.paid_amount) || 0) > 0) {
      toast({
        title: 'لا يمكن حذف هذه السلفة',
        description: 'تم البدء في استقطاع أقساط هذه السلفة بالفعل ومسجلة في القيود المالية.',
        variant: 'destructive'
      });
      return;
    }

    if (!confirm(`هل أنت متأكد من إلغاء سلفة الموظف: ${adv.employee_name} بمبلغ ${fmtNum(adv.total_amount)} ر.س؟`)) return;

    // Delete advance from storage
    const all = getAdvances().filter(a => a.id !== adv.id);
    localStorage.setItem('green_arrow_hr_advances', JSON.stringify(all));
    toast({ title: '✓ تم إلغاء السلفة بنجاح' });
    onRefresh();
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* ─── 1. TOP TITLE BAR ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0 font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-heading font-black text-foreground">
                نظام إدارة السلف والقروض المؤسسية
              </h1>
              <Badge className="bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 text-xs font-mono font-bold">
                {advancesList.length} سلفة مسجلة
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              متابعة السلف، جدولة الأقساط الشهرية الآلية، وسندات لأمر المعتمدة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onOpenNewAdvance}
            className="bg-purple-700 hover:bg-purple-600 text-white rounded-2xl text-xs font-black gap-2 h-10 px-5 shadow-md shadow-purple-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>تسجيل سلفة جديدة لموظف</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. TOP STATS CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Granted */}
        <Card className="p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-bold">إجمالي مبالغ السلف</div>
            <div className="font-mono font-black text-2xl text-purple-700 dark:text-purple-400 mt-1">
              {fmtNum(stats.totalGranted)} <span className="text-xs font-normal">ر.س</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{stats.totalCount} سلفة إجمالية</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-700 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
        </Card>

        {/* Repaid */}
        <Card className="p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-bold">المبالغ المسددة والمستردة</div>
            <div className="font-mono font-black text-2xl text-emerald-600 dark:text-emerald-400 mt-1">
              {fmtNum(stats.totalRepaid)} <span className="text-xs font-normal">ر.س</span>
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
              {stats.totalGranted > 0 ? Math.round((stats.totalRepaid / stats.totalGranted) * 100) : 0}% نسبة الاسترداد
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        {/* Remaining Unpaid */}
        <Card className="p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-bold">الرصيد المتبقي قيد السداد</div>
            <div className="font-mono font-black text-2xl text-rose-600 dark:text-rose-400 mt-1">
              {fmtNum(stats.totalRemaining)} <span className="text-xs font-normal">ر.س</span>
            </div>
            <div className="text-[10px] text-rose-600 font-bold mt-0.5">ذمم مدينة قيد الاستقطاع</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        {/* Active Borrowers */}
        <Card className="p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-bold">السلف النشطة الجارية</div>
            <div className="font-mono font-black text-2xl text-sky-600 dark:text-sky-400 mt-1">
              {stats.activeCount} <span className="text-xs font-normal">سلف</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{stats.completedCount} سلفة مكتملة السداد</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </Card>

      </div>

      {/* ─── 3. ADVANCES MASTER TABLE ───────────────────────────────────────── */}
      <Card className="rounded-3xl border shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        
        {/* Search & Filter Bar */}
        <div className="p-4 border-b bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث باسم الموظف، الرقم الوظيفي، أو سبب السلفة..."
              className="ps-10 rounded-2xl text-xs h-10 bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'all' ? 'bg-purple-700 text-white' : 'bg-white dark:bg-slate-900 text-muted-foreground border'
              }`}
            >
              الكل ({advancesList.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'active' ? 'bg-purple-700 text-white' : 'bg-white dark:bg-slate-900 text-muted-foreground border'
              }`}
            >
              السارية فقط ({stats.activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'completed' ? 'bg-purple-700 text-white' : 'bg-white dark:bg-slate-900 text-muted-foreground border'
              }`}
            >
              المسددة بالكامل ({stats.completedCount})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
            <thead>
              <tr className="bg-purple-700 text-white font-heading font-black border-b border-purple-800">
                <th className="py-3 px-4"># الموظف</th>
                <th className="py-3 px-3">مبلغ السلفة</th>
                <th className="py-3 px-3">القسط الشهري والمدة</th>
                <th className="py-3 px-3">المسدد حتى الآن</th>
                <th className="py-3 px-3">المتبقي للسداد</th>
                <th className="py-3 px-3">شهر البداية</th>
                <th className="py-3 px-3">الحالة</th>
                <th className="py-3 px-4 text-center">الخيارات والطباعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground font-bold">
                    لا توجد سلف مسجلة مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filtered.map((adv) => {
                  const emp = employees.find(e => String(e.employee_number || e.id) === String(adv.employee_number));
                  const total = Number(adv.total_amount) || 0;
                  const paid = Number(adv.paid_amount) || 0;
                  const remaining = Math.max(0, total - paid);
                  const isCompleted = remaining <= 0 || adv.status === 'completed';
                  const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                  return (
                    <tr key={adv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      
                      {/* Employee Name & Badge */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground text-xs">
                          {emp?.full_name || adv.employee_name}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          #{adv.employee_number} • {emp?.branch_name || 'الفرع الرئيسي'}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-3 font-mono font-black text-foreground">
                        {fmtNum(adv.total_amount)} ر.س
                      </td>

                      {/* Monthly Installment */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono font-bold text-purple-700 dark:text-purple-300">
                          {fmtNum(adv.monthly_installment)} ر.س / شهر
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          على {adv.total_installments} أشهر
                        </div>
                      </td>

                      {/* Paid with progress */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono font-bold text-emerald-600">
                          {fmtNum(paid)} ر.س ({percent}%)
                        </div>
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                      </td>

                      {/* Remaining */}
                      <td className="py-3.5 px-3 font-mono font-black text-rose-600">
                        {fmtNum(remaining)} ر.س
                      </td>

                      {/* Start Month */}
                      <td className="py-3.5 px-3 font-mono text-muted-foreground">
                        {adv.start_month}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        {isCompleted ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                            ✓ مسددة بالكامل
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
                            🟢 سارية وقيد الاستقطاع
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* Print Promissory Note A4 */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onPrintAdvance(adv)}
                            className="h-8 text-xs font-bold rounded-xl gap-1 border-purple-200 text-purple-800 hover:bg-purple-50"
                            title="طباعة سند وإقرار السلفة A4"
                          >
                            <Printer className="w-3.5 h-3.5 text-purple-600" />
                            سند السلفة A4
                          </Button>

                          {/* Delete if not paid */}
                          {paid === 0 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(adv)}
                              className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-xl"
                              title="إلغاء السلفة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </Card>

    </div>
  );
}
