import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Wallet, Download, Printer, CheckCircle2, Clock, AlertTriangle,
  Eye, FileSpreadsheet, ShieldCheck, Users,
  CalendarCheck, History, Filter, Search, X, Edit3, Check, XCircle,
  Gift, AlertOctagon, CreditCard, PlusCircle, Trash2, ChevronRight,
  FileText, CheckSquare, Sparkles, Building2, UserCheck
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

// Standard English digits formatter
const fmtNum = (n, decimals = 2) => {
  const num = Number(n) || 0;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const fmtInt = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

export default function Payroll() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('sheet');
  const [monthPrefix, setMonthPrefix] = useState('2026-08');
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Modals
  const [selectedForPayslip, setSelectedForPayslip] = useState(null);
  const [approvalModal, setApprovalModal] = useState(null); // { emp, payroll, finalDeduction, note }
  
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

    // Auto open print modal
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
    <div className="space-y-6 pb-20" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* ─── TOP BAR & EXECUTIVE CONTROLS ─────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-l from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-bold px-2.5 py-0.5">
              نظام الرواتب والاعتمادات المالية
            </Badge>
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs font-mono px-2.5 py-0.5">
              {monthPrefix}
            </Badge>
          </div>
          <h1 className="text-2xl lg:text-3xl font-heading font-black tracking-tight text-white flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-emerald-400" />
            مسير الرواتب والمكافآت والسلف المعتمدة
          </h1>
          <p className="text-xs lg:text-sm text-slate-300 mt-1">
            إدارة شاملة لمستحقات الموظفين، مكافآت المبيعات وساعات العمل، السلف والقروض الشهرية، واعتماد الجزاءات
          </p>
        </div>

        {/* Month Selector & Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-2xl">
            <span className="text-xs font-bold text-slate-300">الشهر:</span>
            <input
              type="month"
              value={monthPrefix}
              onChange={(e) => setMonthPrefix(e.target.value)}
              className="bg-transparent text-white font-mono text-sm font-bold border-0 focus:outline-none cursor-pointer"
            />
          </div>

          <Button
            onClick={() => {
              setAdjType('bonus');
              setAdjForm({
                employee_number: employees[0]?.employee_number || '',
                type: 'bonus',
                category: 'sales_incentive',
                amount: 500,
                days_count: 1,
                month_prefix: monthPrefix,
                reason: 'مكافأة تشجيعية لمبيعات الشهر',
                approved_by: 'فهد ناصر محمد الجوعي (المدير العام)'
              });
              setNewAdjModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl gap-1.5 shadow-md shadow-emerald-900/30"
          >
            <Gift className="w-4 h-4" /> + اعتماد مكافأة
          </Button>

          <Button
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
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-2xl gap-1.5 shadow-md shadow-rose-900/30"
          >
            <AlertOctagon className="w-4 h-4" /> + اعتماد جزاء
          </Button>

          <Button
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
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-2xl gap-1.5 shadow-md shadow-amber-900/30"
          >
            <CreditCard className="w-4 h-4" /> + سلفة موظف
          </Button>
        </div>
      </div>

      {/* ─── SUMMARY KPI CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Basic Salary */}
        <Card className="p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-500" /> الرواتب الأساسية
          </div>
          <div className="mt-2 text-lg lg:text-xl font-black font-mono text-slate-800 dark:text-slate-100">
            {fmtNum(totals.basic)} <span className="text-[10px] font-sans font-normal text-muted-foreground">ر.س</span>
          </div>
        </Card>

        {/* Friday & Daily OT */}
        <Card className="p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" /> إضافي الجمعة واليومي
          </div>
          <div className="mt-2 text-lg lg:text-xl font-black font-mono text-emerald-600">
            +{fmtNum(totals.friday + totals.dailyOT)} <span className="text-[10px] font-sans font-normal text-muted-foreground">ر.س</span>
          </div>
        </Card>

        {/* Bonuses & Incentives */}
        <Card className="p-4 rounded-2xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-emerald-600" /> المكافآت والحوافز
          </div>
          <div className="mt-2 text-lg lg:text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
            +{fmtNum(totals.bonuses)} <span className="text-[10px] font-sans font-normal text-muted-foreground">ر.س</span>
          </div>
        </Card>

        {/* Penalties & Disciplinary */}
        <Card className="p-4 rounded-2xl border bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" /> الجزاءات والاستقطاعات
          </div>
          <div className="mt-2 text-lg lg:text-xl font-black font-mono text-rose-700 dark:text-rose-400">
            -{fmtNum(totals.penalties)} <span className="text-[10px] font-sans font-normal text-muted-foreground">ر.س</span>
          </div>
        </Card>

        {/* Loan Installments & Shortfall */}
        <Card className="p-4 rounded-2xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-amber-600" /> أقساط السلف والعجز
          </div>
          <div className="mt-2 text-lg lg:text-xl font-black font-mono text-amber-700 dark:text-amber-400">
            -{fmtNum(totals.advances + totals.shortfall)} <span className="text-[10px] font-sans font-normal text-muted-foreground">ر.س</span>
          </div>
        </Card>

        {/* Net Salary Payable */}
        <Card className="p-4 rounded-2xl border bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg flex flex-col justify-between">
          <div className="text-[11px] font-black text-emerald-100 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" /> صافي الراتب المستحق
          </div>
          <div className="mt-2 text-xl lg:text-2xl font-black font-mono text-white tracking-tight">
            {fmtNum(totals.net)} <span className="text-[10px] font-sans font-normal text-emerald-200">ر.س</span>
          </div>
        </Card>

      </div>

      {/* ─── NAVIGATION TABS ─────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border flex flex-wrap gap-1">
          <TabsTrigger value="sheet" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            كشف مسير الرواتب الرئيسي ({filteredPayrolls.length})
          </TabsTrigger>

          <TabsTrigger value="adjustments" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <Gift className="w-4 h-4 text-purple-600" />
            الجزاءات والمكافآت ({adjustmentsList.filter(a => a.month_prefix === monthPrefix).length})
          </TabsTrigger>

          <TabsTrigger value="advances" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <CreditCard className="w-4 h-4 text-amber-600" />
            نظام السلف والقروض ({advancesList.length})
          </TabsTrigger>

          <TabsTrigger value="shortfall" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <Clock className="w-4 h-4 text-rose-600" />
            اعتماد عجز الساعات
          </TabsTrigger>

          <TabsTrigger value="audit" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <History className="w-4 h-4 text-blue-600" />
            سجل القرارات والرقابة ({auditLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: PAYROLL STATEMENT TABLE (MAIN)                             */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="sheet" className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-sm">
            <div className="flex flex-1 items-center gap-3 w-full">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث باسم الموظف أو الرقم الوظيفي..."
                  className="pr-9 rounded-xl text-xs bg-background"
                />
              </div>

              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-48 rounded-xl text-xs bg-background">
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

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono px-3 py-1 font-bold">
                إجمالي المعروض: {filteredPayrolls.length} موظف
              </Badge>
            </div>
          </div>

          {/* Luxury Table */}
          <Card className="rounded-3xl border shadow-md overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
                <thead>
                  <tr className="bg-slate-900 text-white font-heading font-black border-b border-slate-800">
                    <th className="py-3.5 px-3 text-right">الموظف</th>
                    <th className="py-3.5 px-3 text-right">الوردية</th>
                    <th className="py-3.5 px-3 text-right">الأساسي</th>
                    <th className="py-3.5 px-3 text-right">بدل جمعة</th>
                    <th className="py-3.5 px-3 text-right">إضافي يومي</th>
                    <th className="py-3.5 px-3 text-right text-emerald-300">المكافآت 🎁</th>
                    <th className="py-3.5 px-3 text-right text-rose-300">الجزاءات ⚠️</th>
                    <th className="py-3.5 px-3 text-right text-amber-300">قسط السلفة 💳</th>
                    <th className="py-3.5 px-3 text-right text-rose-300">عجز الحضور</th>
                    <th className="py-3.5 px-3 text-right">التأمينات</th>
                    <th className="py-3.5 px-4 text-center bg-emerald-950/80 text-emerald-300">صافي المستحق</th>
                    <th className="py-3.5 px-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-muted-foreground animate-pulse font-bold">
                        جاري تحميل واحتساب مسير الرواتب السحابي...
                      </td>
                    </tr>
                  ) : filteredPayrolls.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-muted-foreground font-bold">
                        لا توجد سجلات رواتب مطابقة للبحث أو الشهر المحدد.
                      </td>
                    </tr>
                  ) : (
                    filteredPayrolls.map((pr, idx) => {
                      const emp = pr.emp;
                      const hasBonus = pr.customBonusesTotal > 0;
                      const hasPenalty = pr.customPenaltiesTotal > 0;
                      const hasAdvance = pr.advanceInstallment > 0;
                      const hasShortfall = pr.proposedShortfallDeduction > 0;

                      return (
                        <tr
                          key={emp.id || idx}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                        >
                          {/* Employee Name & Badge */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                                {(emp.full_name || 'م')[0]}
                              </div>
                              <div>
                                <div className="font-bold text-foreground text-xs">{emp.full_name}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  #{emp.employee_number || emp.id} • {emp.job_title || 'موظف'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Shift */}
                          <td className="py-3 px-3 text-muted-foreground text-[11px]">
                            {emp.shift || 'فترة عمل غير سعودي'}
                          </td>

                          {/* Basic Salary */}
                          <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {fmtNum(pr.basicSalary)}
                          </td>

                          {/* Friday Allowance */}
                          <td className="py-3 px-3 font-mono">
                            {pr.fridayAllowance > 0 ? (
                              <span className="text-emerald-600 font-bold">
                                +{fmtNum(pr.fridayAllowance)}
                                <span className="text-[9px] block text-muted-foreground font-sans">({pr.fridayDays} جمعة)</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>

                          {/* Daily OT */}
                          <td className="py-3 px-3 font-mono">
                            {pr.dailyOvertimeAllowance > 0 ? (
                              <span className="text-emerald-600 font-bold">
                                +{fmtNum(pr.dailyOvertimeAllowance)}
                                <span className="text-[9px] block text-muted-foreground font-sans">({pr.overtimeDays} يوم)</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>

                          {/* Bonuses */}
                          <td className="py-3 px-3 font-mono">
                            {hasBonus ? (
                              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-2 py-1 inline-block">
                                <span className="text-emerald-700 dark:text-emerald-300 font-black">
                                  +{fmtNum(pr.customBonusesTotal)}
                                </span>
                                <span className="text-[9px] block text-emerald-600/80 font-sans">
                                  {pr.approvedBonuses.length} مكافأة معتمدة
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>

                          {/* Penalties */}
                          <td className="py-3 px-3 font-mono">
                            {hasPenalty ? (
                              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-2 py-1 inline-block">
                                <span className="text-rose-700 dark:text-rose-300 font-black">
                                  -{fmtNum(pr.customPenaltiesTotal)}
                                </span>
                                <span className="text-[9px] block text-rose-600/80 font-sans">
                                  {pr.approvedPenalties.length} جزاء معتمد
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>

                          {/* Advance Installment */}
                          <td className="py-3 px-3 font-mono">
                            {hasAdvance ? (
                              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg px-2 py-1 inline-block">
                                <span className="text-amber-700 dark:text-amber-300 font-black">
                                  -{fmtNum(pr.advanceInstallment)}
                                </span>
                                <span className="text-[9px] block text-amber-600/80 font-sans">
                                  متبقي: {fmtNum(pr.advanceRemaining)} ر.س
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>

                          {/* Shortfall Deductions */}
                          <td className="py-3 px-3 font-mono">
                            {hasShortfall ? (
                              <div>
                                <span className={pr.approvedShortfallDeduction > 0 ? "text-rose-600 font-bold" : "text-slate-400 font-bold line-through"}>
                                  {pr.approvedShortfallDeduction > 0 ? '-' + fmtNum(pr.approvedShortfallDeduction) : '0.00'}
                                </span>
                                <span className="text-[9px] block text-muted-foreground font-sans">
                                  {pr.shortfallApprovalStatus === 'approved' ? '✓ معتمد' : pr.shortfallApprovalStatus === 'rejected' ? 'معفى' : 'قيد المراجعة'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-emerald-600 text-[10px] font-bold">ملتزم ✓</span>
                            )}
                          </td>

                          {/* GOSI */}
                          <td className="py-3 px-3 text-[11px]">
                            {pr.isInsured ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]">
                                🛡️ مؤمن عليه
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
                                غير مؤمن
                              </Badge>
                            )}
                          </td>

                          {/* Net Pay */}
                          <td className="py-3 px-4 text-center bg-emerald-50/60 dark:bg-emerald-950/30">
                            <div className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
                              {fmtNum(pr.netSalary)}
                            </div>
                            <div className="text-[9px] text-muted-foreground font-sans">ريال سعودي</div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedForPayslip(pr)}
                                className="h-7 text-[11px] font-bold rounded-xl gap-1 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                قسيمة A4
                              </Button>

                              {hasShortfall && pr.shortfallApprovalStatus === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => setApprovalModal({
                                    emp,
                                    payroll: pr,
                                    status: 'approved',
                                    finalDeduction: pr.proposedShortfallDeduction,
                                    note: ''
                                  })}
                                  className="h-7 text-[10px] font-bold rounded-xl bg-slate-800 text-white"
                                >
                                  اعتماد العجز
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
        {/* TAB 2: BONUSES & PENALTIES APPROVAL TAB                           */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="adjustments" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-2xl border shadow-sm">
            <div>
              <h2 className="text-base font-heading font-black">إدارة واعتماد المكافآت التشجيعية والجزاءات الإدارية</h2>
              <p className="text-xs text-muted-foreground">اعتماد وصرف المكافآت ومكافأة الـ 9 ساعات، وحسم جزاءات الغياب والتأخير</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setAdjType('bonus');
                  setNewAdjModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5"
              >
                <Gift className="w-4 h-4" /> + إضافة مكافأة
              </Button>
              <Button
                onClick={() => {
                  setAdjType('penalty');
                  setNewAdjModal(true);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl gap-1.5"
              >
                <AlertOctagon className="w-4 h-4" /> + إضافة جزاء
              </Button>
            </div>
          </div>

          <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
                <thead>
                  <tr className="bg-slate-900 text-white font-heading font-black">
                    <th className="py-3 px-3">النوع</th>
                    <th className="py-3 px-3">الموظف</th>
                    <th className="py-3 px-3">الشهر</th>
                    <th className="py-3 px-3">التصنيف</th>
                    <th className="py-3 px-3">المبلغ</th>
                    <th className="py-3 px-3">المبرر والتفاصيل</th>
                    <th className="py-3 px-3">المعتمد</th>
                    <th className="py-3 px-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {adjustmentsList.filter(a => !monthPrefix || a.month_prefix === monthPrefix).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-muted-foreground font-bold">
                        لا توجد مكافآت أو جزاءات مسجلة لهذا الشهر ({monthPrefix}). اضغط على الأزرار أعلاه للإضافة.
                      </td>
                    </tr>
                  ) : (
                    adjustmentsList
                      .filter(a => !monthPrefix || a.month_prefix === monthPrefix)
                      .map(adj => (
                        <tr key={adj.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                          <td className="py-3 px-3">
                            {adj.type === 'bonus' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]">
                                🎁 مكافأة / إضافة
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-0 text-[10px]">
                                ⚠️ جزاء / استقطاع
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 font-bold">{adj.employee_name} (#{adj.employee_number})</td>
                          <td className="py-3 px-3 font-mono">{adj.month_prefix}</td>
                          <td className="py-3 px-3 text-muted-foreground">{adj.category}</td>
                          <td className="py-3 px-3 font-mono font-black">
                            <span className={adj.type === 'bonus' ? 'text-emerald-600 text-sm' : 'text-rose-600 text-sm'}>
                              {adj.type === 'bonus' ? '+' : '-'}{fmtNum(adj.amount)} ر.س
                            </span>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground max-w-xs">{adj.reason || '—'}</td>
                          <td className="py-3 px-3 text-[11px] font-medium text-slate-700 dark:text-slate-300">{adj.approved_by || 'المدير العام'}</td>
                          <td className="py-3 px-3 text-center">
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
              <p className="text-xs text-muted-foreground">جدولة الأقساط الشهرية، السداد التلقائي من الراتب، وسندات الصرف A4 مع قفل حماية إخلاء الطرف</p>
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
                    <th className="py-3 px-3">الموظف</th>
                    <th className="py-3 px-3">إجمالي السلفة</th>
                    <th className="py-3 px-3">القسط الشهري</th>
                    <th className="py-3 px-3">الأقساط (مسدد / إجمالي)</th>
                    <th className="py-3 px-3">المبلغ المسدد</th>
                    <th className="py-3 px-3 text-rose-300">الرصيد المتبقي</th>
                    <th className="py-3 px-3">الحالة</th>
                    <th className="py-3 px-3 text-center">الإجراءات والطباعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {advancesList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-muted-foreground font-bold">
                        لا توجد سلف أو قروض مسجلة حالياً. اضغط على "+ طلب سلفة جديدة" لإنشاء سلفة موظف.
                      </td>
                    </tr>
                  ) : (
                    advancesList.map(adv => {
                      const emp = employees.find(e => String(e.employee_number) === String(adv.employee_number));
                      const progressPct = Math.min(100, Math.round(((adv.paid_amount || 0) / (adv.total_amount || 1)) * 100));

                      return (
                        <tr key={adv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                          <td className="py-3 px-3">
                            <div className="font-bold text-foreground text-xs">{adv.employee_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">#{adv.employee_number} • بدء: {adv.start_month}</div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                            {fmtNum(adv.total_amount)} ر.س
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-rose-600">
                            {fmtNum(adv.monthly_installment)} ر.س/شهر
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs">{adv.paid_installments || 0}/{adv.total_installments}</span>
                              <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progressPct}%` }}></div>
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">{progressPct}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-emerald-600 font-bold">
                            {fmtNum(adv.paid_amount)} ر.س
                          </td>
                          <td className="py-3 px-3 font-mono font-black text-rose-600 text-sm">
                            {fmtNum(adv.remaining_balance)} ر.س
                          </td>
                          <td className="py-3 px-3">
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
                          <td className="py-3 px-3 text-center">
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

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: AUDIT LOG TAB                                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="p-6 rounded-3xl border shadow-sm bg-card">
            <h2 className="text-base font-heading font-black mb-1">سجل القرارات والاعتمادات المالية والرقابة</h2>
            <p className="text-xs text-muted-foreground mb-4">توثيق زمني غير قابل للتعديل لكافة عمليات اعتماد الخصومات، المكافآت، والسلف</p>

            <div className="space-y-2.5">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs font-bold">
                  لا توجد سجلات اعتمادات سابقة بعد.
                </div>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/30 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground">
                        {log.action === 'bonus_approved' ? '🎁 اعتماد مكافأة' :
                         log.action === 'penalty_approved' ? '⚠️ اعتماد جزاء' :
                         log.action === 'advance_created' ? '💳 إنشاء سلفة جديدة' :
                         log.action?.includes('shortfall') ? '⏱️ قرار عجز ساعات' : log.action}
                      </span>
                      {log.employeeNumber && <span className="text-muted-foreground font-mono mr-2">#{log.employeeNumber}</span>}
                      {log.amount && <span className="font-mono font-bold text-emerald-600 mr-2">{fmtNum(log.amount)} ر.س</span>}
                      {log.note && <span className="text-muted-foreground mr-2">({log.note})</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {log.approvedBy || log.user || 'المدير العام'} • {new Date(log.timestamp).toLocaleString('ar-SA')}
                    </div>
                  </div>
                ))
              )}
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

      {/* ─── MODAL 3: SHORTFALL APPROVAL MODAL ────────────────────────────── */}
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

      {/* ─── MODAL 4: PAYSLIP A4 PRINT MODAL ──────────────────────────────── */}
      {selectedForPayslip && (
        <PayslipPrint
          payroll={selectedForPayslip}
          monthLabel={monthPrefix}
          onClose={() => setSelectedForPayslip(null)}
        />
      )}

      {/* ─── MODAL 5: ADVANCE A4 PRINT MODAL ──────────────────────────────── */}
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
