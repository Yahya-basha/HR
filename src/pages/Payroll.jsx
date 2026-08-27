import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Wallet, Download, Printer, CheckCircle2, Clock, AlertTriangle,
  Eye, FileSpreadsheet, ShieldCheck, Users,
  CalendarCheck, History, Filter, Search, X, Edit3, Check, XCircle,
  Gift, AlertOctagon, CreditCard, PlusCircle, Trash2, ChevronRight,
  FileText, CheckSquare, Sparkles, Building2, UserCheck, LayoutGrid,
  ListFilter, ArrowUpRight, ArrowDownRight, MoreHorizontal, SlidersHorizontal
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
  getEmployeeActiveAdvance
} from '@/lib/payrollEngine';
import PayslipPrint from '@/components/PayslipPrint';
import AdvancePrintModal from '@/components/AdvancePrintModal';

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

  const [activeTab, setActiveTab] = useState('sheet');
  const [viewMode, setViewMode] = useState('executive'); // 'executive' (clean & spacious) | 'detailed' (full breakdown)
  const [monthPrefix, setMonthPrefix] = useState('2026-08');
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Modals & Detail Viewer
  const [selectedForPayslip, setSelectedForPayslip] = useState(null);
  const [selectedForDetails, setSelectedForDetails] = useState(null);
  const [approvalModal, setApprovalModal] = useState(null);
  
  // Advance/Loan Modals
  const [advancesList, setAdvancesList] = useState([]);
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

  // Adjustments (Bonuses & Penalties) Modals
  const [adjustmentsList, setAdjustmentsList] = useState([]);
  const [newAdjModal, setNewAdjModal] = useState(false);
  const [adjType, setAdjType] = useState('bonus'); // 'bonus' or 'penalty'
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

  // Audit Logs
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
    } catch (e) {
      console.error('Failed to load payroll data:', e);
      toast({ title: 'حدث خطأ في تحميل البيانات', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute full payrolls for all employees
  const settings = useMemo(() => getPayrollSettings(), []);
  const allPayrolls = useMemo(() => {
    if (!employees.length) return [];
    return employees.map(emp => {
      return computeEmployeePayroll(emp, attendanceLogs, shifts, {
        ...settings,
        monthPrefix,
      });
    });
  }, [employees, attendanceLogs, shifts, settings, monthPrefix, advancesList, adjustmentsList]);

  // Filtered Payrolls
  const filteredPayrolls = useMemo(() => {
    return allPayrolls.filter(pr => {
      const nameMatch = !search ||
        (pr.emp.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (pr.emp.employee_number || '').toString().includes(search);
      const branchMatch = selectedBranch === 'all' ||
        (pr.emp.branch_name || pr.emp.branch || '') === selectedBranch;
      return nameMatch && branchMatch;
    });
  }, [allPayrolls, search, selectedBranch]);

  // Summary Totals
  const totals = useMemo(() => {
    return filteredPayrolls.reduce((acc, p) => {
      acc.basic += p.basicSalary;
      acc.housing += p.housing;
      acc.transport += p.transport;
      acc.friday += p.fridayAllowance;
      acc.dailyOT += p.dailyOvertimeAllowance;
      acc.bonuses += (p.customBonusesTotal || 0);
      acc.penalties += (p.customPenaltiesTotal || 0);
      acc.advances += (p.advanceInstallment || 0);
      acc.shortfall += (p.approvedShortfallDeduction || 0);
      acc.totalAdditions += p.totalAdditions;
      acc.totalDeductions += p.totalDeductions;
      acc.net += p.netSalary;
      return acc;
    }, {
      basic: 0, housing: 0, transport: 0, friday: 0, dailyOT: 0,
      bonuses: 0, penalties: 0, advances: 0, shortfall: 0,
      totalAdditions: 0, totalDeductions: 0, net: 0
    });
  }, [filteredPayrolls]);

  const branches = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      const b = e.branch_name || e.branch;
      if (b) set.add(b);
    });
    return Array.from(set);
  }, [employees]);

  // Handlers for Shortfall Approval
  const handleSaveApproval = () => {
    if (!approvalModal) return;
    const { emp, finalDeduction, note, status } = approvalModal;
    saveShortfallApproval(emp.employee_number || emp.id, monthPrefix, {
      status,
      finalDeduction: Number(finalDeduction) || 0,
      note,
      approvedBy: user?.full_name || 'المدير العام',
    });
    toast({
      title: 'تم اعتماد قرار الخصم بنجاح ✅',
      description: `الموظف: ${emp.full_name} — المبلغ المعتمد: ${fmtNum(finalDeduction)} ر.س`
    });
    setApprovalModal(null);
    setAuditLogs(getAuditLog());
  };

  // Handlers for Advances / Loans
  const handleCreateAdvance = () => {
    if (!advanceForm.employee_number || !advanceForm.total_amount || !advanceForm.total_installments) {
      toast({ title: 'يرجى ملء جميع بيانات السلفة بدقة', variant: 'destructive' });
      return;
    }
    const emp = employees.find(e => String(e.employee_number || e.id) === String(advanceForm.employee_number));
    if (!emp) {
      toast({ title: 'الموظف غير موجود', variant: 'destructive' });
      return;
    }

    const totalAmt = Number(advanceForm.total_amount) || 0;
    const totalInst = Number(advanceForm.total_installments) || 1;
    const monthlyInst = Math.round((totalAmt / totalInst) * 100) / 100;

    const newAdv = saveAdvance({
      employee_id: emp.id,
      employee_number: emp.employee_number,
      employee_name: emp.full_name,
      total_amount: totalAmt,
      monthly_installment: monthlyInst,
      total_installments: totalInst,
      paid_installments: 0,
      paid_amount: 0,
      remaining_balance: totalAmt,
      start_month: advanceForm.start_month,
      reason: advanceForm.reason,
      approved_by: advanceForm.approved_by
    });

    setAdvancesList(getAdvances());
    setAuditLogs(getAuditLog());
    setNewAdvanceModal(false);
    toast({
      title: '🎉 تم إنشاء واعتماد السلفة بنجاح!',
      description: `الموظف: ${emp.full_name} — السلفة: ${fmtNum(totalAmt)} ر.س بقسط شهري ${fmtNum(monthlyInst)} ر.س`
    });

    setSelectedAdvanceForPrint({ advance: newAdv, employee: emp });
  };

  // Handlers for Adjustments (Bonuses / Penalties)
  const handleCreateAdjustment = () => {
    if (!adjForm.employee_number || !adjForm.amount) {
      toast({ title: 'يرجى اختيار الموظف والمبلغ', variant: 'destructive' });
      return;
    }
    const emp = employees.find(e => String(e.employee_number || e.id) === String(adjForm.employee_number));
    if (!emp) {
      toast({ title: 'الموظف غير موجود', variant: 'destructive' });
      return;
    }

    saveAdjustment({
      type: adjType,
      category: adjForm.category,
      employee_id: emp.id,
      employee_number: emp.employee_number,
      employee_name: emp.full_name,
      month_prefix: adjForm.month_prefix || monthPrefix,
      amount: Number(adjForm.amount) || 0,
      days_count: Number(adjForm.days_count) || 0,
      reason: adjForm.reason || (adjType === 'bonus' ? 'مكافأة تشجيعية' : 'جزاء إداري'),
      approved_by: adjForm.approved_by || 'المدير العام'
    });

    setAdjustmentsList(getAdjustments());
    setAuditLogs(getAuditLog());
    setNewAdjModal(false);
    toast({
      title: adjType === 'bonus' ? '🎉 تم اعتماد المكافأة بنجاح!' : '⚠️ تم اعتماد الجزاء بنجاح!',
      description: `الموظف: ${emp.full_name} — المبلغ: ${fmtNum(adjForm.amount)} ر.س`
    });
  };

  const handleDeleteAdjustment = (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاعتماد المالي؟')) return;
    deleteAdjustment(id);
    setAdjustmentsList(getAdjustments());
    setAuditLogs(getAuditLog());
    toast({ title: 'تم حذف الاعتماد المالي' });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-20" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* ─── 1. SLEEK, ELEGANT HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/70 p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" /> نظام الرواتب التنفيذي
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Green Arrow HR Flow
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-heading font-black text-foreground tracking-tight flex items-center gap-2.5">
            مسير الرواتب والاستحقاقات
          </h1>
          <p className="text-xs text-muted-foreground">
            كشف مالي معتمد لشهر <strong className="text-foreground">{monthPrefix}</strong> يشمل البدلات، المكافآت، السلف، وحساب ساعات الدوام
          </p>
        </div>

        {/* Executive Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/90 border border-border/80 px-3.5 py-2 rounded-2xl shadow-sm">
            <span className="text-xs font-bold text-muted-foreground">الشهر:</span>
            <input
              type="month"
              value={monthPrefix}
              onChange={(e) => setMonthPrefix(e.target.value)}
              className="bg-transparent text-foreground font-mono text-xs font-black border-0 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Unified Add Action Dropdown */}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl gap-2 h-10 px-4 shadow-md">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>إضافة اعتماد مالي</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl">
              <DropdownMenuItem
                onClick={() => {
                  setAdjType('bonus');
                  setAdjForm({
                    employee_number: employees[0]?.employee_number || '',
                    type: 'bonus',
                    category: 'sales_incentive',
                    amount: 500,
                    days_count: 1,
                    month_prefix: monthPrefix,
                    reason: 'مكافأة تشجيعية للمبيعات',
                    approved_by: 'فهد ناصر محمد الجوعي (المدير العام)'
                  });
                  setNewAdjModal(true);
                }}
                className="rounded-xl py-2.5 text-xs font-bold gap-2 cursor-pointer text-emerald-700 hover:bg-emerald-50"
              >
                <Gift className="w-4 h-4 text-emerald-600" />
                <span>+ اعتماد مكافأة / حافز</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  setAdjType('penalty');
                  setAdjForm({
                    employee_number: employees[0]?.employee_number || '',
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
                className="rounded-xl py-2.5 text-xs font-bold gap-2 cursor-pointer text-rose-700 hover:bg-rose-50"
              >
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>+ اعتماد جزاء / استقطاع</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  setAdvanceForm({
                    employee_number: employees[0]?.employee_number || '',
                    total_amount: 3000,
                    total_installments: 6,
                    start_month: monthPrefix,
                    reason: 'سلفة شخصية طارئة',
                    approved_by: 'فهد ناصر محمد الجوعي (المدير العام)'
                  });
                  setNewAdvanceModal(true);
                }}
                className="rounded-xl py-2.5 text-xs font-bold gap-2 cursor-pointer text-amber-700 hover:bg-amber-50"
              >
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>+ طلب سلفة جديدة للموظف</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ─── 2. REFINED 4-KPI EXECUTIVE CARDS ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Basic */}
        <Card className="p-5 rounded-3xl border bg-card shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">الرواتب الأساسية</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-foreground">
              {fmtNum(totals.basic)} <span className="text-xs font-sans text-muted-foreground font-normal">ر.س</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              إجمالي {filteredPayrolls.length} موظف مسجل
            </div>
          </div>
        </Card>

        {/* Card 2: Total Additions (Friday OT, Daily OT, Bonuses) */}
        <Card className="p-5 rounded-3xl border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">إجمالي البدلات والمكافآت</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
              +{fmtNum(totals.totalAdditions)} <span className="text-xs font-sans text-emerald-600 font-normal">ر.س</span>
            </div>
            <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 flex gap-2 font-mono">
              <span>جمعة: +{fmtNum(totals.friday)}</span>
              <span>•</span>
              <span>مكافآت: +{fmtNum(totals.bonuses)}</span>
            </div>
          </div>
        </Card>

        {/* Card 3: Total Deductions (Penalties, Advances, Shortfall) */}
        <Card className="p-5 rounded-3xl border bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300">إجمالي الخصومات والسلف</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/60 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-rose-700 dark:text-rose-400">
              -{fmtNum(totals.totalDeductions)} <span className="text-xs font-sans text-rose-600 font-normal">ر.س</span>
            </div>
            <div className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-0.5 flex gap-2 font-mono">
              <span>جزاءات: -{fmtNum(totals.penalties)}</span>
              <span>•</span>
              <span>سلف: -{fmtNum(totals.advances)}</span>
            </div>
          </div>
        </Card>

        {/* Card 4: Net Payable (HERO) */}
        <Card className="p-5 rounded-3xl border-0 bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-100">صافي المستحق للصرف</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-white">
              {fmtNum(totals.net)} <span className="text-xs font-sans text-emerald-200 font-normal">ر.س</span>
            </div>
            <div className="text-[11px] text-emerald-100/90 mt-0.5">
              المبلغ الإجمالي المعتمد للتحويل البنكي
            </div>
          </div>
        </Card>

      </div>

      {/* ─── 3. NAVIGATION TABS & VIEW TOGGLE ─────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border flex flex-wrap gap-1">
            <TabsTrigger value="sheet" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              كشف المسير المالي ({filteredPayrolls.length})
            </TabsTrigger>

            <TabsTrigger value="adjustments" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
              <Gift className="w-4 h-4 text-purple-600" />
              المكافآت والجزاءات ({adjustmentsList.filter(a => a.month_prefix === monthPrefix).length})
            </TabsTrigger>

            <TabsTrigger value="advances" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
              <CreditCard className="w-4 h-4 text-amber-600" />
              السلف والقروض ({advancesList.length})
            </TabsTrigger>

            <TabsTrigger value="shortfall" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
              <Clock className="w-4 h-4 text-rose-600" />
              عجز الساعات
            </TabsTrigger>
          </TabsList>

          {/* View Mode Toggle: Executive vs Detailed Breakdown */}
          {activeTab === 'sheet' && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border">
              <Button
                size="sm"
                variant={viewMode === 'executive' ? 'default' : 'ghost'}
                onClick={() => setViewMode('executive')}
                className="h-8 rounded-xl text-xs font-bold gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>العرض الأنيق المنظم</span>
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                onClick={() => setViewMode('detailed')}
                className="h-8 rounded-xl text-xs font-bold gap-1.5 text-muted-foreground"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>العرض التفصيلي الكامل</span>
              </Button>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: EXECUTIVE PAYROLL TABLE                                    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="sheet" className="space-y-4">
          
          {/* Search & Branch Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3.5 rounded-2xl border shadow-sm">
            <div className="flex flex-1 items-center gap-3 w-full">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث سريع بالاسم أو الرقم الوظيفي..."
                  className="pr-10 rounded-xl text-xs bg-background h-9"
                />
              </div>

              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-48 rounded-xl text-xs bg-background h-9">
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
              المعروض: {filteredPayrolls.length} موظف
            </div>
          </div>

          {/* ─── ELEGANT / CLEAN VIEW (EXECUTIVE) ────────────────────────── */}
          {viewMode === 'executive' ? (
            <Card className="rounded-3xl border shadow-md overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
                  <thead>
                    <tr className="bg-slate-900 text-white font-heading font-black border-b border-slate-800">
                      <th className="py-4 px-4 text-right">الموظف</th>
                      <th className="py-4 px-3 text-right">الراتب الأساسي</th>
                      <th className="py-4 px-3 text-right text-emerald-300">الإضافي والمكافآت ↗</th>
                      <th className="py-4 px-3 text-right text-rose-300">الاستقطاعات والخصم ↘</th>
                      <th className="py-4 px-3 text-center">التأمينات</th>
                      <th className="py-4 px-5 text-center bg-emerald-950/80 text-emerald-300 font-bold text-sm">صافي المستحق</th>
                      <th className="py-4 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground animate-pulse font-bold">
                          جاري تحميل واحتساب مسير الرواتب السحابي...
                        </td>
                      </tr>
                    ) : filteredPayrolls.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground font-bold">
                          لا توجد سجلات رواتب مطابقة للبحث أو الشهر المحدد.
                        </td>
                      </tr>
                    ) : (
                      filteredPayrolls.map((pr, idx) => {
                        const emp = pr.emp;
                        const hasAdditions = pr.totalAdditions > 0;
                        const hasDeductions = pr.totalDeductions > 0;

                        // Build additions badges
                        const additionsBadges = [];
                        if (pr.fridayAllowance > 0) additionsBadges.push(`+${fmtNum(pr.fridayAllowance)} جمعة (${pr.fridayDays})`);
                        if (pr.dailyOvertimeAllowance > 0) additionsBadges.push(`+${fmtNum(pr.dailyOvertimeAllowance)} إضافي 9س`);
                        if (pr.customBonusesTotal > 0) additionsBadges.push(`+${fmtNum(pr.customBonusesTotal)} مكافأة`);

                        // Build deductions badges
                        const deductionsBadges = [];
                        if (pr.approvedShortfallDeduction > 0) deductionsBadges.push(`-${fmtNum(pr.approvedShortfallDeduction)} عجز ساعات`);
                        if (pr.customPenaltiesTotal > 0) deductionsBadges.push(`-${fmtNum(pr.customPenaltiesTotal)} جزاء`);
                        if (pr.advanceInstallment > 0) deductionsBadges.push(`-${fmtNum(pr.advanceInstallment)} قسط سلفة`);

                        return (
                          <tr
                            key={emp.id || idx}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                          >
                            {/* Employee Block */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                                  {(emp.full_name || 'م')[0]}
                                </div>
                                <div>
                                  <div className="font-bold text-foreground text-sm">{emp.full_name}</div>
                                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                    #{emp.employee_number || emp.id} • <span className="font-sans">{emp.job_title || 'موظف'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Basic Salary */}
                            <td className="py-3.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                              {fmtNum(pr.basicSalary)} <span className="text-[10px] font-sans text-muted-foreground font-normal">ر.س</span>
                            </td>

                            {/* Additions Block (Friday OT, Bonuses, Daily OT) */}
                            <td className="py-3.5 px-3">
                              {hasAdditions ? (
                                <div className="space-y-1">
                                  <div className="font-mono font-black text-emerald-600 text-sm">
                                    +{fmtNum(pr.totalAdditions)} <span className="text-[10px] font-sans font-normal">ر.س</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1 max-w-xs">
                                    {additionsBadges.map((b, bi) => (
                                      <span key={bi} className="inline-block bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">
                                        {b}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40 font-mono">0.00</span>
                              )}
                            </td>

                            {/* Deductions Block (Shortfall, Penalties, Advances) */}
                            <td className="py-3.5 px-3">
                              {hasDeductions ? (
                                <div className="space-y-1">
                                  <div className="font-mono font-black text-rose-600 text-sm">
                                    -{fmtNum(pr.totalDeductions)} <span className="text-[10px] font-sans font-normal">ر.س</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1 max-w-xs">
                                    {deductionsBadges.map((b, bi) => (
                                      <span key={bi} className="inline-block bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">
                                        {b}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40 font-mono">0.00</span>
                              )}
                            </td>

                            {/* GOSI Insurance Status */}
                            <td className="py-3.5 px-3 text-center">
                              {pr.isInsured ? (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px] font-bold py-0.5 px-2">
                                  🛡️ مؤمن
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground/60 text-[11px]">غير مسجل</span>
                              )}
                            </td>

                            {/* Net Salary (Emerald Prominent Box) */}
                            <td className="py-3.5 px-5 text-center bg-emerald-50/70 dark:bg-emerald-950/40">
                              <div className="font-mono font-black text-base text-emerald-700 dark:text-emerald-400">
                                {fmtNum(pr.netSalary)}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-sans font-bold">ريال سعودي</div>
                            </td>

                            {/* Actions Button */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedForPayslip(pr)}
                                  className="h-8 text-xs font-bold rounded-xl gap-1.5 border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 shadow-sm"
                                >
                                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                  قسيمة الراتب A4
                                </Button>

                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setSelectedForDetails(pr)}
                                  className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                                  title="عرض كشف التفاصيل اليومية"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
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
          ) : (
            /* ─── DETAILED VIEW (ALL 12 COLUMNS) ────────────────────────── */
            <Card className="rounded-3xl border shadow-md overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
                  <thead>
                    <tr className="bg-slate-900 text-white font-heading font-black">
                      <th className="py-3 px-3">الموظف</th>
                      <th className="py-3 px-3">الوردية</th>
                      <th className="py-3 px-3">الأساسي</th>
                      <th className="py-3 px-3">بدل جمعة</th>
                      <th className="py-3 px-3">إضافي يومي</th>
                      <th className="py-3 px-3 text-emerald-300">المكافآت</th>
                      <th className="py-3 px-3 text-rose-300">الجزاءات</th>
                      <th className="py-3 px-3 text-amber-300">قسط السلفة</th>
                      <th className="py-3 px-3 text-rose-300">عجز الحضور</th>
                      <th className="py-3 px-3">التأمينات</th>
                      <th className="py-3 px-4 text-center bg-emerald-950/80 text-emerald-300">صافي المستحق</th>
                      <th className="py-3 px-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredPayrolls.map((pr, idx) => (
                      <tr key={pr.emp.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                        <td className="py-3 px-3 font-bold">{pr.emp.full_name} (#{pr.emp.employee_number})</td>
                        <td className="py-3 px-3 text-muted-foreground">{pr.emp.shift || 'فترة عمل غير سعودي'}</td>
                        <td className="py-3 px-3 font-mono font-bold">{fmtNum(pr.basicSalary)}</td>
                        <td className="py-3 px-3 font-mono text-emerald-600">{pr.fridayAllowance > 0 ? `+${fmtNum(pr.fridayAllowance)}` : '—'}</td>
                        <td className="py-3 px-3 font-mono text-emerald-600">{pr.dailyOvertimeAllowance > 0 ? `+${fmtNum(pr.dailyOvertimeAllowance)}` : '—'}</td>
                        <td className="py-3 px-3 font-mono text-emerald-600">{pr.customBonusesTotal > 0 ? `+${fmtNum(pr.customBonusesTotal)}` : '—'}</td>
                        <td className="py-3 px-3 font-mono text-rose-600">{pr.customPenaltiesTotal > 0 ? `-${fmtNum(pr.customPenaltiesTotal)}` : '—'}</td>
                        <td className="py-3 px-3 font-mono text-amber-600">{pr.advanceInstallment > 0 ? `-${fmtNum(pr.advanceInstallment)}` : '—'}</td>
                        <td className="py-3 px-3 font-mono text-rose-600">{pr.approvedShortfallDeduction > 0 ? `-${fmtNum(pr.approvedShortfallDeduction)}` : '—'}</td>
                        <td className="py-3 px-3">{pr.isInsured ? <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">مؤمن</Badge> : '—'}</td>
                        <td className="py-3 px-4 text-center font-mono font-black text-emerald-700 bg-emerald-50/60 text-sm">{fmtNum(pr.netSalary)}</td>
                        <td className="py-3 px-3 text-center">
                          <Button size="sm" variant="outline" onClick={() => setSelectedForPayslip(pr)} className="h-7 text-xs font-bold rounded-xl">
                            قسيمة A4
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: BONUSES & PENALTIES APPROVAL TAB                           */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="adjustments" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-2xl border shadow-sm">
            <div>
              <h2 className="text-base font-heading font-black">إدارة واعتماد المكافآت التشجيعية والجزاءات الإدارية</h2>
              <p className="text-xs text-muted-foreground">صرف مكافآت المبيعات وساعات العمل، واعتماد استقطاعات الغياب والتأخير</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setAdjType('bonus');
                  setNewAdjModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5 shadow-sm"
              >
                <Gift className="w-4 h-4" /> + اعتماد مكافأة
              </Button>
              <Button
                onClick={() => {
                  setAdjType('penalty');
                  setNewAdjModal(true);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl gap-1.5 shadow-sm"
              >
                <AlertOctagon className="w-4 h-4" /> + اعتماد جزاء
              </Button>
            </div>
          </div>

          <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
                <thead>
                  <tr className="bg-slate-900 text-white font-heading font-black">
                    <th className="py-3.5 px-3">النوع</th>
                    <th className="py-3.5 px-3">الموظف</th>
                    <th className="py-3.5 px-3">الشهر</th>
                    <th className="py-3.5 px-3">التصنيف</th>
                    <th className="py-3.5 px-3">المبلغ</th>
                    <th className="py-3.5 px-3">المبرر والتفاصيل</th>
                    <th className="py-3.5 px-3">المعتمد</th>
                    <th className="py-3.5 px-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {adjustmentsList.filter(a => !monthPrefix || a.month_prefix === monthPrefix).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground font-bold">
                        لا توجد مكافآت أو جزاءات مسجلة لهذا الشهر ({monthPrefix}). اضغط على الأزرار أعلاه للإضافة.
                      </td>
                    </tr>
                  ) : (
                    adjustmentsList
                      .filter(a => !monthPrefix || a.month_prefix === monthPrefix)
                      .map(adj => (
                        <tr key={adj.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                          <td className="py-3.5 px-3">
                            {adj.type === 'bonus' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px] font-bold">
                                🎁 مكافأة / إضافة
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-0 text-[10px] font-bold">
                                ⚠️ جزاء / استقطاع
                              </Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-3 font-bold">{adj.employee_name} (#{adj.employee_number})</td>
                          <td className="py-3.5 px-3 font-mono font-bold">{adj.month_prefix}</td>
                          <td className="py-3.5 px-3 text-muted-foreground">{adj.category}</td>
                          <td className="py-3.5 px-3 font-mono font-black">
                            <span className={adj.type === 'bonus' ? 'text-emerald-600 text-sm' : 'text-rose-600 text-sm'}>
                              {adj.type === 'bonus' ? '+' : '-'}{fmtNum(adj.amount)} ر.س
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-muted-foreground max-w-xs">{adj.reason || '—'}</td>
                          <td className="py-3.5 px-3 text-xs font-medium text-slate-700 dark:text-slate-300">{adj.approved_by || 'المدير العام'}</td>
                          <td className="py-3.5 px-3 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteAdjustment(adj.id)}
                              className="h-7 w-7 text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: EMPLOYEE ADVANCES & LOANS TAB                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="advances" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-2xl border shadow-sm">
            <div>
              <h2 className="text-base font-heading font-black">نظام السلف والقروض الشهرية للموظفين</h2>
              <p className="text-xs text-muted-foreground">جدولة الأقساط، الخصم الآلي، وسندات الصرف الرسمية A4 مع قفل الحماية الصارم</p>
            </div>
            <Button
              onClick={() => setNewAdvanceModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl gap-1.5 shadow-md"
            >
              <CreditCard className="w-4 h-4" /> + طلب سلفة جديدة
            </Button>
          </div>

          <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
                <thead>
                  <tr className="bg-slate-900 text-white font-heading font-black">
                    <th className="py-3.5 px-3">الموظف</th>
                    <th className="py-3.5 px-3">إجمالي السلفة</th>
                    <th className="py-3.5 px-3">القسط الشهري</th>
                    <th className="py-3.5 px-3">الأقساط (مسدد / إجمالي)</th>
                    <th className="py-3.5 px-3">المبلغ المسدد</th>
                    <th className="py-3.5 px-3 text-rose-300">الرصيد المتبقي</th>
                    <th className="py-3.5 px-3">الحالة</th>
                    <th className="py-3.5 px-3 text-center">الإجراءات والطباعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {advancesList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground font-bold">
                        لا توجد سلف أو قروض مسجلة حالياً. اضغط على "+ طلب سلفة جديدة" لإنشاء سلفة موظف.
                      </td>
                    </tr>
                  ) : (
                    advancesList.map(adv => {
                      const emp = employees.find(e => String(e.employee_number) === String(adv.employee_number));
                      const progressPct = Math.min(100, Math.round(((adv.paid_amount || 0) / (adv.total_amount || 1)) * 100));

                      return (
                        <tr key={adv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-foreground text-xs">{adv.employee_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">#{adv.employee_number} • بدء: {adv.start_month}</div>
                          </td>
                          <td className="py-3.5 px-3 font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                            {fmtNum(adv.total_amount)} ر.س
                          </td>
                          <td className="py-3.5 px-3 font-mono font-bold text-rose-600">
                            {fmtNum(adv.monthly_installment)} ر.س/شهر
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs">{adv.paid_installments || 0}/{adv.total_installments}</span>
                              <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progressPct}%` }}></div>
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">{progressPct}%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-emerald-600 font-bold">
                            {fmtNum(adv.paid_amount)} ر.س
                          </td>
                          <td className="py-3.5 px-3 font-mono font-black text-rose-600 text-sm">
                            {fmtNum(adv.remaining_balance)} ر.س
                          </td>
                          <td className="py-3.5 px-3">
                            {adv.remaining_balance <= 0 || adv.status === 'completed' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]">
                                مسددة بالكامل ✓
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px]">
                                سارية (نشطة) 💳
                              </Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedAdvanceForPrint({ advance: adv, employee: emp })}
                                className="h-7 text-[11px] font-bold rounded-xl gap-1 border-slate-300 hover:bg-slate-900 hover:text-white"
                              >
                                <Printer className="w-3.5 h-3.5 text-blue-600" />
                                سند وعقد A4
                              </Button>

                              {adv.remaining_balance > 0 && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    recordAdvanceInstallmentPayment(adv.id, monthPrefix, adv.monthly_installment);
                                    setAdvancesList(getAdvances());
                                    toast({ title: '✓ تم تسجيل دفعة قسط بنجاح' });
                                  }}
                                  className="h-7 text-[10px] font-bold rounded-xl"
                                >
                                  تسجيل سداد قسط
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
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: SHORTFALL REVIEW TAB                                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="shortfall" className="space-y-4">
          <Card className="p-6 rounded-3xl border shadow-sm bg-card">
            <h2 className="text-base font-heading font-black mb-2">مراجعة واعتماد عجز ساعات الدوام لشهر {monthPrefix}</h2>
            <p className="text-xs text-muted-foreground mb-4">
              يمكن للإدارة العامة مراجعة حالات العجز واختيار إما اعتماد الخصم كاملاً، تعديل المبلغ، أو الإعفاء التام من الخصم.
            </p>

            <div className="space-y-3">
              {filteredPayrolls.filter(p => p.proposedShortfallDeduction > 0).map(pr => {
                const emp = pr.emp;
                return (
                  <div key={emp.id} className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl border bg-slate-50 dark:bg-slate-900/50 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-sm">
                        {(emp.full_name || 'م')[0]}
                      </div>
                      <div>
                        <div className="font-bold text-xs">{emp.full_name} (#{emp.employee_number})</div>
                        <div className="text-[11px] text-muted-foreground">
                          عجز الساعات: <strong className="text-rose-600 font-mono">{formatHours(pr.shortfallHours)} س</strong> • معدل الساعة: <span className="font-mono">{fmtNum(pr.hourlyRate)} ر.س</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-left font-mono">
                        <div className="text-xs text-muted-foreground">الخصم المقترح</div>
                        <div className="text-sm font-black text-rose-600">-{fmtNum(pr.proposedShortfallDeduction)} ر.س</div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setApprovalModal({
                          emp,
                          payroll: pr,
                          status: 'approved',
                          finalDeduction: pr.proposedShortfallDeduction,
                          note: ''
                        })}
                        className="h-8 text-xs font-bold rounded-xl bg-slate-900 text-white"
                      >
                        اتخاذ القرار والاعتماد
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

      </Tabs>

      {/* ─── MODAL 1: ADD NEW ADVANCE / LOAN ──────────────────────────────── */}
      <Dialog open={newAdvanceModal} onOpenChange={setNewAdvanceModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black text-foreground flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-600" />
              طلب واعتماد سلفة مالية جديدة للموظف
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold">الموظف المستفيد:</Label>
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
                      {e.full_name} (#{e.employee_number}) — الراتب: {fmtNum(e.salary)} ر.س
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-bold">إجمالي مبلغ السلفة (ر.س):</Label>
                <Input
                  type="number"
                  value={advanceForm.total_amount}
                  onChange={(e) => setAdvanceForm(prev => ({ ...prev, total_amount: e.target.value }))}
                  className="rounded-xl font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold">عدد الأقساط الشهرية:</Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={advanceForm.total_installments}
                  onChange={(e) => setAdvanceForm(prev => ({ ...prev, total_installments: e.target.value }))}
                  className="rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            {/* Calculated Monthly Installment Box */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 rounded-2xl flex items-center justify-between">
              <span className="font-bold text-amber-800 dark:text-amber-300">القسط الشهري المستقطع:</span>
              <span className="font-mono font-black text-amber-900 dark:text-amber-200 text-sm">
                {fmtNum((Number(advanceForm.total_amount) || 0) / (Number(advanceForm.total_installments) || 1))} ر.س / شهر
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold">شهر بدء الخصم:</Label>
              <Input
                type="month"
                value={advanceForm.start_month}
                onChange={(e) => setAdvanceForm(prev => ({ ...prev, start_month: e.target.value }))}
                className="rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold">سبب ومبرر السلفة:</Label>
              <Input
                value={advanceForm.reason}
                onChange={(e) => setAdvanceForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="مثال: سلفة طارئة لظروف عائلية..."
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNewAdvanceModal(false)} className="rounded-xl font-bold">
              إلغاء
            </Button>
            <Button onClick={handleCreateAdvance} className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-md">
              اعتماد وإصدار السند A4
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: ADD NEW BONUS OR PENALTY ────────────────────────────── */}
      <Dialog open={newAdjModal} onOpenChange={setNewAdjModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black text-foreground flex items-center gap-2">
              {adjType === 'bonus' ? (
                <>
                  <Gift className="w-5 h-5 text-emerald-600" />
                  اعتماد مكافأة / حافز تشجيعي للموظف
                </>
              ) : (
                <>
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  اعتماد جزاء / استقطاع مالي على الموظف
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-bold">تصنيف {adjType === 'bonus' ? 'المكافأة' : 'الجزاء'}:</Label>
                {adjType === 'bonus' ? (
                  <Select
                    value={adjForm.category}
                    onValueChange={(v) => setAdjForm(prev => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales_incentive">مكافأة تشجيعية (مبيعات)</SelectItem>
                      <SelectItem value="daily_overtime">مكافأة ساعات إضافية (9 ساعات)</SelectItem>
                      <SelectItem value="performance">مكافأة تميز وأداء استثنائي</SelectItem>
                      <SelectItem value="other_bonus">مكافأة أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={adjForm.category}
                    onValueChange={(v) => setAdjForm(prev => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="absence_penalty">خصم أيام غياب بدون إذن</SelectItem>
                      <SelectItem value="delay_penalty">خصم تأخير متكرر</SelectItem>
                      <SelectItem value="disciplinary">جزاء إداري / مخالفة</SelectItem>
                      <SelectItem value="other_penalty">استقطاع آخر</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold">المبلغ المستقطع / المضاف (ر.س):</Label>
                <Input
                  type="number"
                  value={adjForm.amount}
                  onChange={(e) => setAdjForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold">شهر التطبيق في المسير:</Label>
              <Input
                type="month"
                value={adjForm.month_prefix}
                onChange={(e) => setAdjForm(prev => ({ ...prev, month_prefix: e.target.value }))}
                className="rounded-xl font-mono"
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
              onClick={handleCreateAdjustment}
              className={adjType === 'bonus' ? "bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold" : "bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold"}
            >
              {adjType === 'bonus' ? 'اعتماد وصرف المكافأة' : 'اعتماد وتطبيق الجزاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: EMPLOYEE ATTENDANCE & SHORTFALL BREAKDOWN MODAL ──────── */}
      {selectedForDetails && (
        <Dialog open={!!selectedForDetails} onOpenChange={(o) => !o && setSelectedForDetails(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                تفاصيل الحضور وعجز الساعات — {selectedForDetails.emp.full_name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border">
                  <div className="text-muted-foreground text-[11px]">الراتب الأساسي</div>
                  <div className="font-mono font-black text-sm text-foreground mt-1">{fmtNum(selectedForDetails.basicSalary)} ر.س</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900">
                  <div className="text-emerald-700 dark:text-emerald-400 text-[11px]">إجمالي الإضافي والمكافآت</div>
                  <div className="font-mono font-black text-sm text-emerald-700 mt-1">+{fmtNum(selectedForDetails.totalAdditions)} ر.س</div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
                  <div className="text-rose-700 dark:text-rose-400 text-[11px]">إجمالي الاستقطاعات</div>
                  <div className="font-mono font-black text-sm text-rose-700 mt-1">-{fmtNum(selectedForDetails.totalDeductions)} ر.س</div>
                </div>
              </div>

              {/* Day-by-Day Table */}
              <div className="border rounded-2xl overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 p-2.5 font-bold text-xs border-b">
                  كشف الحضور اليومي لشهر {monthPrefix} ({selectedForDetails.dailyDetails?.length || 0} يوم)
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 text-muted-foreground font-bold border-b">
                        <th className="p-2">التاريخ</th>
                        <th className="p-2">اليوم</th>
                        <th className="p-2">الدخول</th>
                        <th className="p-2">الخروج</th>
                        <th className="p-2">العجز</th>
                        <th className="p-2">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {selectedForDetails.dailyDetails?.map((d, di) => (
                        <tr key={di} className="hover:bg-slate-50/50">
                          <td className="p-2 font-mono font-bold">{d.log_date}</td>
                          <td className="p-2">{d.day_name}</td>
                          <td className="p-2 font-mono">{d.check_in?.slice(11, 16) || '—'}</td>
                          <td className="p-2 font-mono">{d.check_out?.slice(11, 16) || '—'}</td>
                          <td className="p-2 font-mono font-bold text-rose-600">
                            {d.shortfallMinutes > 0 ? formatMinutes(d.shortfallMinutes) : '—'}
                          </td>
                          <td className="p-2 font-bold">
                            {d.isFriday ? <span className="text-indigo-600">جمعة</span> :
                             d.isExempt ? <span className="text-slate-500">معفى</span> :
                             !d.hasAttendance ? <span className="text-rose-600">غائب</span> :
                             d.shortfallMinutes > 0 ? <span className="text-amber-600">عجز دوام</span> :
                             <span className="text-emerald-600">حاضر ✓</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setSelectedForDetails(null)} className="rounded-xl font-bold text-xs">
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL 4: SHORTFALL APPROVAL MODAL ────────────────────────────── */}
      {approvalModal && (
        <Dialog open={!!approvalModal} onOpenChange={(open) => !open && setApprovalModal(null)}>
          <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-heading font-black">
                اعتماد قرار عجز الحضور — {approvalModal.emp.full_name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                <div className="text-muted-foreground">عجز الساعات المحسوب:</div>
                <div className="text-lg font-black text-rose-600 font-mono">
                  {formatHours(approvalModal.payroll.shortfallHours)} س
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  الخصم المقترح آلياً: <strong>{fmtNum(approvalModal.payroll.proposedShortfallDeduction)} ر.س</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold">القرار:</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={approvalModal.status === 'approved' ? 'default' : 'outline'}
                    onClick={() => setApprovalModal(prev => ({
                      ...prev,
                      status: 'approved',
                      finalDeduction: prev.payroll.proposedShortfallDeduction
                    }))}
                    className="text-xs rounded-xl font-bold"
                  >
                    اعتماد كامل
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={approvalModal.status === 'modified' ? 'default' : 'outline'}
                    onClick={() => setApprovalModal(prev => ({ ...prev, status: 'modified' }))}
                    className="text-xs rounded-xl font-bold"
                  >
                    تعديل المبلغ
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={approvalModal.status === 'rejected' ? 'destructive' : 'outline'}
                    onClick={() => setApprovalModal(prev => ({ ...prev, status: 'rejected', finalDeduction: 0 }))}
                    className="text-xs rounded-xl font-bold"
                  >
                    إعفاء تام (0)
                  </Button>
                </div>
              </div>

              {approvalModal.status !== 'rejected' && (
                <div className="space-y-1.5">
                  <Label className="font-bold">المبلغ النهائي المعتمد للخصم (ر.س):</Label>
                  <Input
                    type="number"
                    value={approvalModal.finalDeduction}
                    onChange={(e) => setApprovalModal(prev => ({ ...prev, finalDeduction: e.target.value }))}
                    className="rounded-xl font-mono font-bold"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="font-bold">ملاحظات ومبرر القرار:</Label>
                <Input
                  value={approvalModal.note}
                  onChange={(e) => setApprovalModal(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="سبب التعديل أو الإعفاء..."
                  className="rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setApprovalModal(null)} className="rounded-xl font-bold">
                إلغاء
              </Button>
              <Button onClick={handleSaveApproval} className="bg-slate-900 text-white rounded-xl font-bold">
                حفظ القرار والاعتماد
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL 5: PAYSLIP A4 PRINT MODAL ──────────────────────────────── */}
      {selectedForPayslip && (
        <PayslipPrint
          payroll={selectedForPayslip}
          monthLabel={monthPrefix}
          onClose={() => setSelectedForPayslip(null)}
        />
      )}

      {/* ─── MODAL 6: ADVANCE A4 PRINT MODAL ──────────────────────────────── */}
      {selectedAdvanceForPrint && (
        <AdvancePrintModal
          open={!!selectedAdvanceForPrint}
          onOpenChange={(o) => !o && setSelectedAdvanceForPrint(null)}
          advance={selectedAdvanceForPrint.advance}
          employee={selectedAdvanceForPrint.employee}
        />
      )}

    </div>
  );
}
