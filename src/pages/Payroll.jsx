import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Wallet, Download, Printer, CheckCircle2, Clock, AlertTriangle,
  Eye, FileSpreadsheet, ShieldCheck, Users,
  CalendarCheck, History, Filter, Search, X, Edit3, Check, XCircle,
  Sun, Moon, Layers, FileText
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/lib/payrollEngine';
import PayslipPrint from '@/components/PayslipPrint';

// Standard Western English digits formatter with fixed decimals
const fmtNum = (n, decimals = 2) => {
  const num = Number(n) || 0;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const APPROVAL_BADGE = {
  pending: { label: 'قيد المراجعة', cls: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300' },
  approved: { label: 'معتمد', cls: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300' },
  rejected: { label: 'مرفوض / معفى', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300' },
  modified: { label: 'معتمد بتعديل', cls: 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-300' },
};

const getAvatarGradient = (name = '') => {
  const gradients = [
    'from-emerald-500 to-teal-700',
    'from-blue-500 to-indigo-700',
    'from-purple-500 to-indigo-700',
    'from-amber-500 to-orange-700',
    'from-rose-500 to-pink-700',
    'from-cyan-500 to-blue-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const idx = Math.abs(hash) % gradients.length;
  return gradients[idx];
};

const getInitials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'HR';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + ' ' + parts[parts.length - 1][0];
};

export default function Payroll() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [month, setMonth] = useState('2026-08');
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  // Payslip dialog
  const [payslipEmp, setPayslipEmp] = useState(null);
  const [payslipOpen, setPayslipOpen] = useState(false);

  // Approval dialog
  const [approvalEmp, setApprovalEmp] = useState(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState('approved');
  const [approvalCustomAmt, setApprovalCustomAmt] = useState('');
  const [approvalNote, setApprovalNote] = useState('');

  // Audit log
  const [auditLog, setAuditLog] = useState([]);

  const settings = useMemo(() => ({ ...getPayrollSettings(), monthPrefix: month }), [month]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.Employee.list(),
      base44.entities.AttendanceLog.list('-log_date', 800),
      base44.entities.Shift.list(),
    ]).then(([emps, logs, shfs]) => {
      setEmployees(emps || []);
      setAttendanceLogs(logs || []);
      setShifts(shfs || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setAuditLog(getAuditLog());
  }, []);

  // Compute all payrolls
  const allPayrolls = useMemo(() => {
    if (!employees.length) return [];
    return employees.map(emp =>
      computeEmployeePayroll(emp, attendanceLogs, shifts, settings)
    );
  }, [employees, attendanceLogs, shifts, settings]);

  // Filtered payrolls
  const filteredPayrolls = useMemo(() => {
    return allPayrolls.filter(p => {
      const name = (p.emp.full_name || '').toLowerCase();
      const empNum = (p.emp.employee_number || '').toString();
      const branch = p.emp.branch_name || p.emp.branch || '';
      if (searchQ && !name.includes(searchQ.toLowerCase()) && !empNum.includes(searchQ)) return false;
      if (branchFilter && branch !== branchFilter) return false;
      return true;
    });
  }, [allPayrolls, searchQ, branchFilter]);

  // Unique branches for filter
  const branches = useMemo(() => {
    const bSet = new Set(employees.map(e => e.branch_name || e.branch || '').filter(Boolean));
    return [...bSet];
  }, [employees]);

  // Summary totals
  const summary = useMemo(() => {
    return filteredPayrolls.reduce((acc, p) => ({
      basic: acc.basic + p.basicSalary,
      friday: acc.friday + p.fridayAllowance,
      overtime: acc.overtime + p.dailyOvertimeAllowance,
      deductions: acc.deductions + p.totalDeductions,
      net: acc.net + p.netSalary,
      shortfall: acc.shortfall + p.proposedShortfallDeduction,
      approvedShortfall: acc.approvedShortfall + p.approvedShortfallDeduction,
    }), { basic: 0, friday: 0, overtime: 0, deductions: 0, net: 0, shortfall: 0, approvedShortfall: 0 });
  }, [filteredPayrolls]);

  // Alert counts
  const alertCounts = useMemo(() => ({
    shortfall: filteredPayrolls.filter(p => p.shortfallHours > 0 && p.shortfallApprovalStatus === 'pending').length,
    friday: filteredPayrolls.filter(p => p.fridayDays > 0).length,
    overtime: filteredPayrolls.filter(p => p.dailyOvertimeAllowance > 0).length,
  }), [filteredPayrolls]);

  const handleViewPayslip = useCallback((pr) => {
    setPayslipEmp(pr);
    setPayslipOpen(true);
  }, []);

  const handleOpenApproval = useCallback((pr) => {
    setApprovalEmp(pr);
    setApprovalAction('approved');
    setApprovalCustomAmt(pr.proposedShortfallDeduction.toFixed(2));
    setApprovalNote('');
    setApprovalOpen(true);
  }, []);

  const handleApprovalSubmit = useCallback(() => {
    if (!approvalEmp) return;
    const finalDeduction = approvalAction === 'rejected' ? 0
      : approvalAction === 'modified' ? Number(approvalCustomAmt) || 0
      : approvalEmp.proposedShortfallDeduction;

    const decision = {
      status: approvalAction,
      finalDeduction,
      note: approvalNote,
      approvedBy: user?.full_name || 'المدير العام',
    };

    saveShortfallApproval(approvalEmp.emp.employee_number, month, decision);
    setAuditLog(getAuditLog());

    toast({
      title: approvalAction === 'approved' ? '✅ تم اعتماد الخصم' : approvalAction === 'rejected' ? '🚫 تم رفض الخصم' : '✏️ تم تعديل الخصم',
      description: approvalEmp.emp.full_name + ' — ' + (decision.note || ''),
    });

    setApprovalOpen(false);

    // Refresh attendance logs to trigger recalculation
    setLoading(true);
    base44.entities.AttendanceLog.list('-log_date', 800).then(logs => {
      setAttendanceLogs(logs || []);
    }).finally(() => setLoading(false));
  }, [approvalEmp, approvalAction, approvalCustomAmt, approvalNote, month, user]);

  const handleExportWPS = useCallback(() => {
    const headers = 'Employee_ID,Employee_Name,National_ID,Basic_Salary,Friday_OT,Daily_OT,GOSI_Status,Shortfall_Deduction,Net_Salary';
    const rows = filteredPayrolls.map(p => {
      const e = p.emp;
      const gosi = e.is_insured !== false ? 'Insured' : 'Not_Insured';
      return `"${e.employee_number}","${e.full_name}","${e.national_id||''}",${p.basicSalary},${p.fridayAllowance},${p.dailyOvertimeAllowance},"${gosi}",${p.approvedShortfallDeduction},${p.netSalary}`;
    });
    const csv = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'WPS_' + month + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'تم تصدير ملف WPS مدد بنجاح 📑' });
  }, [filteredPayrolls, month]);

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ direction: 'rtl' }}>
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-muted-foreground">جارِ احتساب مسير الرواتب ومطابقة البصمات...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto text-right" dir="rtl" style={{ direction: 'rtl' }}>
      
      {/* ─── PAGE HEADER (RTL) ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-border/60 shadow-sm" style={{ direction: 'rtl' }}>
        <div className="flex items-center gap-3.5 text-right">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black shadow-md shadow-emerald-500/20 shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-black text-foreground tracking-tight">مسير الرواتب والبدلات</h1>
            <p className="text-xs text-muted-foreground mt-0.5">محرك مالي دقيق: احتساب عجز الساعات • بدل الجمعة بالبصمة • إضافي الشفت • اعتماد الخصومات</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1.5 rounded-xl border border-border/60">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="bg-transparent text-xs font-bold font-mono outline-none text-foreground cursor-pointer"
              dir="ltr"
            />
          </div>

          <Button onClick={handleExportWPS} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-2 shadow-md shadow-emerald-600/20 h-9">
            <Download className="w-4 h-4" /> تصدير WPS مدد
          </Button>
        </div>
      </div>

      {/* ─── ALERTS / NOTICES ─────────────────────────────────────────── */}
      {(alertCounts.shortfall > 0 || alertCounts.friday > 0 || alertCounts.overtime > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ direction: 'rtl' }}>
          {alertCounts.shortfall > 0 && (
            <div className="flex items-center gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200 shadow-sm text-right">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-extrabold">{alertCounts.shortfall} موظف لديه عجز حضور</p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">يتطلب مراجعة واعتماد المدير العام للخصم</p>
              </div>
            </div>
          )}

          {alertCounts.friday > 0 && (
            <div className="flex items-center gap-3 p-3.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 shadow-sm text-right">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0 text-indigo-700 dark:text-indigo-400">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-extrabold">{alertCounts.friday} موظف استحق بدل الجمعة</p>
                <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80">محتسب فقط للموظفين أصحاب البصمات الفعلية</p>
              </div>
            </div>
          )}

          {alertCounts.overtime > 0 && (
            <div className="flex items-center gap-3 p-3.5 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 rounded-2xl text-xs text-orange-900 dark:text-orange-200 shadow-sm text-right">
              <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0 text-orange-700 dark:text-orange-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-extrabold">{alertCounts.overtime} موظف استحق إضافي يومي</p>
                <p className="text-[11px] text-orange-700/80 dark:text-orange-400/80">شفت 9 ساعات (100 ر.س يومياً)</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SUMMARY KPI CARDS (ORDERED RIGHT-TO-LEFT) ────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5" style={{ direction: 'rtl' }}>
        {[
          {
            label: 'إجمالي الرواتب الأساسية',
            value: fmtNum(summary.basic),
            prefix: '',
            sub: 'ريال سعودي',
            icon: <Wallet className="w-4 h-4 text-slate-700 dark:text-slate-300" />,
            border: 'border-slate-200 dark:border-slate-800',
            valColor: 'text-slate-900 dark:text-slate-100',
          },
          {
            label: 'بدل الجمعة الفعلي (بصمة)',
            value: fmtNum(summary.friday),
            prefix: '+',
            sub: 'ريال سعودي',
            icon: <CalendarCheck className="w-4 h-4 text-emerald-600" />,
            border: 'border-emerald-200 dark:border-emerald-900/60',
            valColor: 'text-emerald-700 dark:text-emerald-400',
          },
          {
            label: 'إضافي الشفت اليومي',
            value: fmtNum(summary.overtime),
            prefix: '+',
            sub: 'ريال سعودي',
            icon: <Clock className="w-4 h-4 text-amber-600" />,
            border: 'border-amber-200 dark:border-amber-900/60',
            valColor: 'text-amber-700 dark:text-amber-400',
          },
          {
            label: 'عجز الساعات المقترح',
            value: fmtNum(summary.shortfall),
            prefix: '-',
            sub: 'ريال (يحتاج اعتماد)',
            icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
            border: 'border-red-200 dark:border-red-900/60',
            valColor: 'text-red-700 dark:text-red-400',
          },
          {
            label: 'صافي المسير الكلي',
            value: fmtNum(summary.net),
            prefix: '',
            sub: 'ريال سعودي مستحق للصرف',
            icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
            border: 'border-emerald-500/40 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 dark:from-emerald-950/20 dark:via-slate-900 dark:to-teal-950/20',
            valColor: 'text-emerald-700 dark:text-emerald-300 font-black',
          },
        ].map((c) => (
          <Card key={c.label} className={`p-4 rounded-2xl border ${c.border} shadow-sm bg-white dark:bg-slate-900 text-right`} style={{ direction: 'rtl' }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground">{c.label}</span>
              <div className="p-1.5 rounded-lg bg-secondary/80">{c.icon}</div>
            </div>
            <div className="mt-2.5">
              <div className={`text-xl font-mono font-black tracking-tight ${c.valColor} flex items-center justify-start gap-1`} dir="ltr">
                {c.prefix && <span>{c.prefix}</span>}
                <span>{c.value}</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{c.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ─── TABS & TOOLBAR (RIGHT-TO-LEFT) ───────────────────────────── */}
      <Tabs defaultValue="payroll" className="space-y-4" style={{ direction: 'rtl' }}>
        
        {/* Navigation & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-border/60 shadow-sm" style={{ direction: 'rtl' }}>
          
          {/* Tabs List on the RIGHT */}
          <TabsList className="bg-secondary/70 rounded-xl p-1 h-auto gap-1">
            <TabsTrigger value="payroll" className="rounded-lg text-xs font-bold px-3 py-1.5 gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>كشف مسير الرواتب</span>
            </TabsTrigger>
            <TabsTrigger value="shortfall" className="rounded-lg text-xs font-bold px-3 py-1.5 gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>مراجعة عجز الساعات</span>
              {alertCounts.shortfall > 0 && (
                <Badge className="mr-1 bg-amber-600 text-white text-[10px] font-mono px-1.5 py-0 h-4">
                  {alertCounts.shortfall}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="audit" className="rounded-lg text-xs font-bold px-3 py-1.5 gap-1.5">
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>سجل التعديلات (Audit Log)</span>
            </TabsTrigger>
          </TabsList>

          {/* Search & Branch Filter on the LEFT */}
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="بحث باسم أو رقم الموظف..."
                className="pr-9 h-8 rounded-xl text-xs bg-secondary/40 border-border/60 text-right"
              />
            </div>

            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="h-8 px-3 rounded-xl border border-border/60 bg-secondary/40 text-xs font-bold cursor-pointer text-foreground text-right"
            >
              <option value="">جميع الفروع</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            {(searchQ || branchFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchQ(''); setBranchFilter(''); }} className="h-8 px-2 rounded-xl text-xs gap-1 text-muted-foreground">
                <X className="w-3.5 h-3.5" /> مسح
              </Button>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: PAYROLL STATEMENT (مسير الرواتب الرئيسي)                  */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <TabsContent value="payroll" className="mt-0">
          <Card className="border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden" style={{ direction: 'rtl' }}>
            
            <div className="p-4 border-b border-border/40 bg-secondary/20 flex items-center justify-between" style={{ direction: 'rtl' }}>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h2 className="font-heading font-black text-sm text-foreground">
                  كشف مسير رواتب الشهر — <span className="font-mono text-emerald-700 dark:text-emerald-400" dir="ltr">{month}</span>
                </h2>
              </div>
              <Badge variant="outline" className="font-mono text-xs font-bold px-2.5">
                {filteredPayrolls.length} موظف مسجل
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse" style={{ direction: 'rtl' }}>
                <thead>
                  <tr className="bg-secondary/70 text-[11px] font-extrabold border-b border-border/60 text-muted-foreground">
                    <th className="text-right p-3 pr-4 font-bold">الموظف وبيانات الهوية</th>
                    <th className="text-right p-3 font-bold">الوردية / ساعات العمل</th>
                    <th className="text-right p-3 font-bold">الراتب الأساسي</th>
                    <th className="text-right p-3 font-bold text-emerald-700 dark:text-emerald-400">بدل الجمعة (فعلي بالبصمة)</th>
                    <th className="text-right p-3 font-bold text-amber-700 dark:text-amber-400">إضافي يومي</th>
                    <th className="text-right p-3 font-bold text-red-700 dark:text-red-400">عجز الحضور / الخصم</th>
                    <th className="text-right p-3 font-bold text-blue-700 dark:text-blue-400">التأمينات (GOSI)</th>
                    <th className="text-right p-3 font-bold text-emerald-700 dark:text-emerald-400">صافي الراتب المستحق</th>
                    <th className="text-center p-3 pl-4 font-bold">الإجراءات</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/30">
                  {filteredPayrolls.map((pr) => {
                    const ab = APPROVAL_BADGE[pr.shortfallApprovalStatus] || APPROVAL_BADGE.pending;
                    const avatarGrad = getAvatarGradient(pr.emp.full_name);
                    const initials = getInitials(pr.emp.full_name);

                    return (
                      <tr key={pr.emp.id} className="hover:bg-secondary/30 transition-colors text-xs">
                        
                        {/* 1. EMPLOYEE PROFILE (RIGHT ALIGNED - أقصى اليمين) */}
                        <td className="p-3 pr-4 text-right">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${avatarGrad} text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0`}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-foreground text-[13px] truncate leading-tight">
                                {pr.emp.full_name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="font-mono font-bold text-[10px] bg-secondary px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300" dir="ltr">
                                  #{pr.emp.employee_number}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {pr.emp.job_title || pr.emp.department_name || 'موظف'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. SHIFT INFO */}
                        <td className="p-3 text-right">
                          <div className="space-y-0.5">
                            <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate">
                              {pr.shiftName || 'دوام أساسي'}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                              <span className="font-mono" dir="ltr">{pr.shiftHours}</span>
                              <span>ساعات / يوم</span>
                            </div>
                          </div>
                        </td>

                        {/* 3. BASIC SALARY */}
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <span className="font-mono font-extrabold text-[13px] text-slate-900 dark:text-slate-100" dir="ltr">
                              {fmtNum(pr.basicSalary)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-bold">ر.س</span>
                          </div>
                        </td>

                        {/* 4. FRIDAY ALLOWANCE (STRICT BIOMETRIC PUNCH ONLY) */}
                        <td className="p-3 text-right">
                          {pr.fridayAllowance > 0 ? (
                            <div className="space-y-0.5">
                              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                                <span className="font-mono font-black" dir="ltr">+{fmtNum(pr.fridayAllowance)}</span>
                                <span className="text-[9px] font-normal">ر.س</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono" dir="ltr">{pr.fridayDays}</span>
                                <span> جمعة × </span>
                                <span className="font-mono" dir="ltr">{pr.fridayDailyRate}</span>
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground font-mono text-[11px]" dir="ltr">0.00</span>
                          )}
                        </td>

                        {/* 5. DAILY OVERTIME */}
                        <td className="p-3 text-right">
                          {pr.dailyOvertimeAllowance > 0 ? (
                            <div className="space-y-0.5">
                              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold text-xs">
                                <span className="font-mono font-black" dir="ltr">+{fmtNum(pr.dailyOvertimeAllowance)}</span>
                                <span className="text-[9px] font-normal">ر.س</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                <span className="font-bold font-mono" dir="ltr">{pr.overtimeDays}</span>
                                <span> يوم</span>
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>

                        {/* 6. SHORTFALL DEFICIT & DEDUCTION */}
                        <td className="p-3 text-right">
                          {pr.proposedShortfallDeduction > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="text-muted-foreground text-[10px]">عجز:</span>
                                <span className="font-mono font-extrabold text-red-600 dark:text-red-400" dir="ltr">
                                  {formatHours(pr.shortfallHours)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">س</span>
                              </div>

                              <div className="inline-flex items-center gap-1 font-mono font-black text-xs text-red-700 dark:text-red-400">
                                <span className="text-[10px] font-sans font-normal text-muted-foreground">مقترح:</span>
                                <span dir="ltr">-{fmtNum(pr.proposedShortfallDeduction)}</span>
                                <span className="text-[9px] font-sans font-normal">ر.س</span>
                              </div>

                              <div>
                                <Badge className={`text-[9px] px-1.5 py-0 font-bold ${ab.cls}`}>
                                  {ab.label}
                                </Badge>
                                {pr.approvedShortfallDeduction > 0 && pr.shortfallApprovalStatus !== 'pending' && (
                                  <span className="text-[10px] font-mono font-bold text-red-700 dark:text-red-400 mr-1.5" dir="ltr">
                                    (-{fmtNum(pr.approvedShortfallDeduction)} ر.س)
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>حضور كامل ✓</span>
                            </div>
                          )}
                        </td>

                        {/* 7. GOSI INSURANCE STATUS (NO DEDUCTION) */}
                        <td className="p-3 text-right">
                          {pr.emp.is_insured !== false && pr.emp.is_insured !== 'false' ? (
                            <div className="space-y-0.5">
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                                <span>🛡️ مؤمن عليه</span>
                              </div>
                              <p className="text-[9px] text-muted-foreground font-mono truncate max-w-[100px]" title={pr.gosiNumber || 'اشتراك نشط'} dir="ltr">
                                {pr.emp.gosi_number ? '#' + pr.emp.gosi_number : 'تحمل المنشأة'}
                              </p>
                            </div>
                          ) : (
                            <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                              <span>غير مسجل</span>
                            </div>
                          )}
                        </td>

                        {/* 8. NET SALARY (PROMINENT LUXURY BADGE) */}
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border border-emerald-300 dark:border-emerald-700/60 shadow-xs">
                            <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300" dir="ltr">
                              {fmtNum(pr.netSalary)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400">ر.س</span>
                          </div>
                        </td>

                        {/* 9. ACTIONS (FAR LEFT - أقصى اليسار) */}
                        <td className="p-3 pl-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPayslip(pr)}
                              className="h-7 px-2.5 text-[11px] font-extrabold rounded-lg gap-1 border-emerald-400/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>قسيمة</span>
                            </Button>

                            {pr.proposedShortfallDeduction > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenApproval(pr)}
                                className="h-7 px-2.5 text-[11px] font-extrabold rounded-lg gap-1 border-amber-400/50 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 shadow-xs"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>{pr.shortfallApprovalStatus === 'pending' ? 'اعتماد' : 'تعديل'}</span>
                              </Button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: SHORTFALL REVIEW & APPROVAL (مراجعة واعتماد عجز الساعات)  */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <TabsContent value="shortfall" className="mt-0">
          <Card className="border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden" style={{ direction: 'rtl' }}>
            <div className="p-4 border-b border-border/40 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between" style={{ direction: 'rtl' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="font-heading font-black text-sm text-foreground">
                  مراجعة واعتماد عجز الحضور والانصراف للموظفين
                </h2>
              </div>
              <Badge variant="outline" className="text-xs font-mono font-bold">
                {filteredPayrolls.filter(p => p.proposedShortfallDeduction > 0).length} موظف بعجز حضور
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse" style={{ direction: 'rtl' }}>
                <thead>
                  <tr className="bg-secondary/70 text-[11px] font-extrabold border-b border-border/60 text-muted-foreground">
                    <th className="text-right p-3 pr-4 font-bold">الموظف</th>
                    <th className="text-right p-3 font-bold">الوردية</th>
                    <th className="text-right p-3 font-bold">الساعات المطلوبة</th>
                    <th className="text-right p-3 font-bold">الساعات الفعلية</th>
                    <th className="text-right p-3 font-bold text-red-700 dark:text-red-400">إجمالي عجز الساعات</th>
                    <th className="text-right p-3 font-bold">قيمة الساعة</th>
                    <th className="text-right p-3 font-bold text-red-700 dark:text-red-400">الخصم المقترح</th>
                    <th className="text-center p-3 font-bold">حالة الاعتماد</th>
                    <th className="text-center p-3 pl-4 font-bold">الإجراء</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/30">
                  {filteredPayrolls.filter(p => p.proposedShortfallDeduction > 0).map((pr) => {
                    const ab = APPROVAL_BADGE[pr.shortfallApprovalStatus] || APPROVAL_BADGE.pending;
                    return (
                      <tr key={pr.emp.id} className="hover:bg-secondary/30 text-xs">
                        <td className="p-3 pr-4 text-right">
                          <p className="font-extrabold text-foreground text-[13px]">{pr.emp.full_name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">#{pr.emp.employee_number} | {pr.emp.job_title}</p>
                        </td>
                        <td className="p-3 text-right font-bold text-[11px]">{pr.shiftName || 'دوام أساسي'}</td>
                        <td className="p-3 text-right font-mono font-bold" dir="ltr">{formatMinutes(pr.totalRequiredMinutes)}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400" dir="ltr">{formatMinutes(pr.totalActualMinutes)}</td>
                        <td className="p-3 text-right font-mono font-extrabold text-red-700 dark:text-red-400">
                          <div dir="ltr">{formatMinutes(pr.totalShortfallMinutes)}</div>
                          <span className="text-[10px] text-muted-foreground font-sans block">({formatHours(pr.shortfallHours)} س)</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                            <span dir="ltr">{fmtNum(pr.hourlyRate)}</span>
                            <span className="text-[10px] font-sans text-muted-foreground">ر.س/س</span>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1 font-mono font-black text-red-700 dark:text-red-400 text-[13px]">
                            <span dir="ltr">-{fmtNum(pr.proposedShortfallDeduction)}</span>
                            <span className="text-[10px] font-sans font-normal">ر.س</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={`text-[10px] font-bold ${ab.cls}`}>{ab.label}</Badge>
                        </td>
                        <td className="p-3 pl-4 text-center">
                          <Button
                            onClick={() => handleOpenApproval(pr)}
                            size="sm"
                            className="h-7 px-3 text-[11px] font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white gap-1 shadow-sm"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{pr.shortfallApprovalStatus === 'pending' ? 'مراجعة واعتماد' : 'تعديل القرار'}</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredPayrolls.filter(p => p.proposedShortfallDeduction > 0).length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-muted-foreground">
                        <div className="space-y-1">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                          <p className="font-bold text-sm text-foreground">لا يوجد عجز ساعات حضور لأي موظف في هذا الشهر</p>
                          <p className="text-xs">جميع الموظفين أتموا ساعات الدوام المطلوبة بالكامل ✓</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: AUDIT LOG (سجل التعديلات والقرارات المالية)              */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <TabsContent value="audit" className="mt-0">
          <Card className="border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden" style={{ direction: 'rtl' }}>
            <div className="p-4 border-b border-border/40 bg-secondary/20 flex items-center justify-between" style={{ direction: 'rtl' }}>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h2 className="font-heading font-black text-sm text-foreground">
                  سجل قرارات وتعديلات مسير الرواتب المعتمدة (Audit Trail)
                </h2>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold">
                سجل موثق للقراءة فقط — لا يمكن التعديل أو الحذف
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse" style={{ direction: 'rtl' }}>
                <thead>
                  <tr className="bg-secondary/70 text-[11px] font-extrabold border-b border-border/60 text-muted-foreground">
                    <th className="text-right p-3 pr-4 font-bold">التاريخ والوقت</th>
                    <th className="text-right p-3 font-bold">رقم الموظف</th>
                    <th className="text-right p-3 font-bold">شهر المسير</th>
                    <th className="text-center p-3 font-bold">نوع القرار</th>
                    <th className="text-right p-3 font-bold">القيمة النهائية المعتمدة</th>
                    <th className="text-right p-3 font-bold">المعتمد بواسطة</th>
                    <th className="text-right p-3 pl-4 font-bold">الملاحظات وسبب القرار</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/30">
                  {auditLog.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-muted-foreground">
                        لا توجد سجلات تعديل حتى الآن
                      </td>
                    </tr>
                  ) : (
                    auditLog.map((entry) => {
                      const actionMap = {
                        shortfall_approved: { label: 'اعتماد الخصم كاملاً', cls: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300' },
                        shortfall_rejected: { label: 'رفض وإعفاء الخصم', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
                        shortfall_modified: { label: 'تعديل مبلغ الخصم', cls: 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300' },
                      };
                      const a = actionMap[entry.action] || { label: entry.action, cls: 'bg-gray-100 text-gray-700' };

                      return (
                        <tr key={entry.id} className="text-xs">
                          <td className="p-3 pr-4 font-mono text-[11px]" dir="ltr">
                            {new Date(entry.timestamp).toLocaleString('en-US', { hour12: true })}
                          </td>
                          <td className="p-3 font-mono font-bold" dir="ltr">#{entry.employeeNumber}</td>
                          <td className="p-3 font-mono font-semibold" dir="ltr">{entry.monthPrefix}</td>
                          <td className="p-3 text-center">
                            <Badge className={`text-[10px] font-bold ${a.cls}`}>{a.label}</Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center gap-1 font-mono font-black text-red-700 dark:text-red-400">
                              <span dir="ltr">{fmtNum(entry.finalDeduction)}</span>
                              <span className="text-[9px] font-sans font-normal">ر.س</span>
                            </div>
                          </td>
                          <td className="p-3 font-extrabold text-foreground">{entry.approvedBy}</td>
                          <td className="p-3 pl-4 text-muted-foreground">{entry.note || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── PAYSLIP STATEMENT MODAL (A4 READY) ────────────────────────── */}
      <Dialog open={payslipOpen} onOpenChange={setPayslipOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-6 rounded-3xl" dir="rtl" style={{ direction: 'rtl' }}>
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black text-foreground text-right">
              قسيمة الراتب التفصيلية — {payslipEmp?.emp?.full_name}
            </DialogTitle>
          </DialogHeader>
          {payslipEmp && <PayslipPrint payrollResult={payslipEmp} month={month} />}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPayslipOpen(false)} className="text-xs font-bold rounded-xl px-5">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── APPROVAL WORKFLOW MODAL ──────────────────────────────────── */}
      <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl" dir="rtl" style={{ direction: 'rtl' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-heading font-black text-foreground text-right">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              مراجعة واعتماد خصم عجز الحضور
            </DialogTitle>
          </DialogHeader>

          {approvalEmp && (
            <div className="space-y-4 py-2 text-xs text-right">
              
              {/* Employee Card */}
              <div className="p-3.5 bg-secondary/50 rounded-2xl border border-border/60 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${getAvatarGradient(approvalEmp.emp.full_name)} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                  {getInitials(approvalEmp.emp.full_name)}
                </div>
                <div>
                  <p className="font-extrabold text-sm text-foreground">{approvalEmp.emp.full_name}</p>
                  <p className="text-muted-foreground font-mono text-[11px]" dir="ltr">#{approvalEmp.emp.employee_number} • {approvalEmp.shiftName}</p>
                </div>
              </div>

              {/* Deficit Numbers Card */}
              <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/60">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">إجمالي عجز الساعات</p>
                  <p className="font-mono font-black text-red-700 dark:text-red-400 text-sm mt-0.5">
                    <span dir="ltr">{formatHours(approvalEmp.shortfallHours)}</span> <span className="text-[10px] font-sans">ساعة</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">قيمة الساعة</p>
                  <p className="font-mono font-bold text-foreground text-sm mt-0.5">
                    <span dir="ltr">{fmtNum(approvalEmp.hourlyRate)}</span> <span className="text-[10px] font-sans text-muted-foreground">ر.س</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">الخصم المحتسب المقترح</p>
                  <p className="font-mono font-black text-red-700 dark:text-red-400 text-base mt-0.5">
                    <span dir="ltr">-{fmtNum(approvalEmp.proposedShortfallDeduction)}</span> <span className="text-[10px] font-sans">ر.س</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">الراتب الأساسي</p>
                  <p className="font-mono font-bold text-foreground text-sm mt-0.5">
                    <span dir="ltr">{fmtNum(approvalEmp.basicSalary)}</span> <span className="text-[10px] font-sans text-muted-foreground">ر.س</span>
                  </p>
                </div>
              </div>

              {/* Decision Action Selector */}
              <div className="space-y-2">
                <Label className="font-bold text-xs text-foreground">القرار المالي المطلوب:</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: 'approved', l: 'اعتماد الخصم', icon: <Check className="w-3.5 h-3.5" />, activeCls: 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 ring-2 ring-emerald-500' },
                    { v: 'rejected', l: 'إعفاء / رفض', icon: <XCircle className="w-3.5 h-3.5" />, activeCls: 'border-slate-500 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 ring-2 ring-slate-400' },
                    { v: 'modified', l: 'تعديل المبلغ', icon: <Edit3 className="w-3.5 h-3.5" />, activeCls: 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-blue-500' },
                  ].map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setApprovalAction(opt.v)}
                      className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-xs font-bold transition-all ${approvalAction === opt.v ? opt.activeCls : 'border-border/60 bg-white dark:bg-slate-900 text-muted-foreground hover:bg-secondary/50'}`}
                    >
                      {opt.icon}
                      <span>{opt.l}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Modified Amount Input */}
              {approvalAction === 'modified' && (
                <div className="space-y-1.5 p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                  <Label className="font-bold text-xs text-blue-900 dark:text-blue-200">المبلغ المعدل المعتمد للخصم (ريال):</Label>
                  <Input
                    type="number"
                    value={approvalCustomAmt}
                    onChange={e => setApprovalCustomAmt(e.target.value)}
                    min="0"
                    max={approvalEmp.proposedShortfallDeduction}
                    step="0.5"
                    className="rounded-xl font-mono font-black text-sm h-9 bg-white dark:bg-slate-900 text-right"
                    dir="ltr"
                    placeholder="أدخل القيمة المعدلة..."
                  />
                </div>
              )}

              {/* Approval Note */}
              <div className="space-y-1.5">
                <Label className="font-bold text-xs text-foreground">سبب ومبرر القرار (للتوثيق في سجل التدقيق):</Label>
                <Textarea
                  value={approvalNote}
                  onChange={e => setApprovalNote(e.target.value)}
                  rows={2}
                  className="rounded-xl text-xs text-right"
                  placeholder="مثال: تصحيح بصمة حضور غير مسجلة، استئذان رسمي مسبق، مهمة خارجية..."
                />
              </div>

            </div>
          )}

          <DialogFooter className="gap-2 mt-3">
            <Button variant="outline" onClick={() => setApprovalOpen(false)} className="text-xs font-bold rounded-xl">
              إلغاء
            </Button>
            <Button
              onClick={handleApprovalSubmit}
              className={`text-xs font-black rounded-xl text-white ${approvalAction === 'rejected' ? 'bg-slate-700 hover:bg-slate-800' : approvalAction === 'modified' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {approvalAction === 'rejected' ? 'تأكيد الإعفاء والرفض' : approvalAction === 'modified' ? 'اعتماد المبلغ المعدل' : 'تأكيد اعتماد الخصم'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
