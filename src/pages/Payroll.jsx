import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Wallet, Download, Printer, CheckCircle2, Clock, AlertTriangle,
  Eye, ChevronDown, FileSpreadsheet, ShieldCheck, Users,
  CalendarCheck, RotateCcw, History, Filter, Search, X, Edit3, Check, XCircle
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
  appendAuditLog,
  formatMinutes,
  formatHours,
} from '@/lib/payrollEngine';
import PayslipPrint from '@/components/PayslipPrint';

const fmtSAR = (n) => (Number(n) || 0).toLocaleString('ar-SA');

const APPROVAL_BADGE = {
  pending: { label: 'قيد المراجعة', cls: 'bg-amber-100 text-amber-800' },
  approved: { label: 'معتمد', cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'مرفوض', cls: 'bg-slate-100 text-slate-600' },
  modified: { label: 'معتمد بتعديل', cls: 'bg-blue-100 text-blue-800' },
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
  const [approvalResult, setApprovalResult] = useState(null);
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
    const total = filteredPayrolls.reduce((acc, p) => ({
      basic: acc.basic + p.basicSalary,
      friday: acc.friday + p.fridayAllowance,
      overtime: acc.overtime + p.dailyOvertimeAllowance,
      deductions: acc.deductions + p.totalDeductions,
      net: acc.net + p.netSalary,
      shortfall: acc.shortfall + p.proposedShortfallDeduction,
    }), { basic: 0, friday: 0, overtime: 0, deductions: 0, net: 0, shortfall: 0 });
    return total;
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
    setApprovalResult(null);
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

    // Re-fetch to update state
    setLoading(true);
    base44.entities.AttendanceLog.list('-log_date', 800).then(logs => {
      setAttendanceLogs(logs || []);
    }).finally(() => setLoading(false));
  }, [approvalEmp, approvalAction, approvalCustomAmt, approvalNote, month, user]);

  const handleExportWPS = useCallback(() => {
    const headers = 'Employee_ID,Employee_Name,National_ID,Basic_Salary,Friday_OT,Daily_OT,GOSI,Shortfall_Deduction,Net_Salary';
    const rows = filteredPayrolls.map(p => {
      const e = p.emp;
      return `"${e.employee_number}","${e.full_name}","${e.national_id||''}",${p.basicSalary},${p.fridayAllowance},${p.dailyOvertimeAllowance},${p.gosiDeduction},${p.approvedShortfallDeduction},${p.netSalary}`;
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
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shadow-sm">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-foreground">مسير الرواتب والبدلات</h1>
            <p className="text-xs text-muted-foreground">محاسبة دقيقة: عجز الساعات | بدل الجمعة | الإضافي | اعتماد الخصومات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border/60 bg-white dark:bg-slate-900 text-sm font-bold" />
          <Button onClick={handleExportWPS} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-2 shadow-md">
            <Download className="w-4 h-4" /> تصدير WPS مدد
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {(alertCounts.shortfall > 0 || alertCounts.friday > 0 || alertCounts.overtime > 0) && (
        <div className="flex flex-wrap gap-2">
          {alertCounts.shortfall > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5" />
              {alertCounts.shortfall} موظف بعجز حضور يحتاج مراجعة واعتماد
            </div>
          )}
          {alertCounts.friday > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-800">
              <CalendarCheck className="w-3.5 h-3.5" />
              {alertCounts.friday} موظف لديه بدل حضور أيام الجمعة
            </div>
          )}
          {alertCounts.overtime > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl text-xs font-bold text-orange-800">
              <Clock className="w-3.5 h-3.5" />
              {alertCounts.overtime} موظف لديه إضافي ساعة يومياً
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'إجمالي الرواتب الأساسية', value: fmtSAR(summary.basic), sub: 'ريال', cls: 'text-foreground' },
          { label: 'بدل أيام الجمعة الفعلي', value: fmtSAR(summary.friday), sub: 'ريال', cls: 'text-emerald-600' },
          { label: 'إضافي الشفت اليومي', value: fmtSAR(summary.overtime), sub: 'ريال', cls: 'text-amber-600' },
          { label: 'خصومات مقترحة (عجز)', value: fmtSAR(summary.shortfall), sub: 'ريال', cls: 'text-red-600' },
          { label: 'صافي المسير الكلي', value: fmtSAR(summary.net), sub: 'ريال', cls: 'text-primary font-black' },
        ].map(c => (
          <Card key={c.label} className="p-4 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
            <p className="text-[11px] text-muted-foreground font-medium">{c.label}</p>
            <p className={`text-lg font-heading font-black mt-1 ${c.cls}`}>{c.value}</p>
            <p className="text-[10px] text-muted-foreground">{c.sub}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="payroll">
        <TabsList className="bg-secondary rounded-2xl p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="payroll" className="rounded-xl text-xs font-bold">مسير الرواتب</TabsTrigger>
          <TabsTrigger value="shortfall" className="rounded-xl text-xs font-bold">
            عجز الساعات
            {alertCounts.shortfall > 0 && <Badge className="mr-1 bg-amber-500 text-white text-[9px] px-1">{alertCounts.shortfall}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl text-xs font-bold">سجل التعديلات</TabsTrigger>
        </TabsList>

        {/* ── TAB: PAYROLL ──────────────────────────────────────────────── */}
        <TabsContent value="payroll" className="mt-4">
          {/* Filters */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="بحث باسم أو رقم الموظف..."
                className="pr-9 h-9 rounded-xl text-xs" />
            </div>
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border/60 bg-white dark:bg-slate-900 text-xs font-bold">
              <option value="">جميع الفروع</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {(searchQ || branchFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchQ(''); setBranchFilter(''); }} className="h-9 rounded-xl text-xs gap-1">
                <X className="w-3.5 h-3.5" /> مسح
              </Button>
            )}
          </div>

          <Card className="border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-border/40 bg-secondary/20 flex items-center justify-between">
              <h2 className="font-heading font-bold text-sm text-foreground">كشف مسير رواتب — {month}</h2>
              <Badge variant="outline" className="font-mono text-xs">{filteredPayrolls.length} موظف</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/60 text-[11px]">
                    <TableHead>الموظف</TableHead>
                    <TableHead>الشفت / ساعاته</TableHead>
                    <TableHead>الراتب الأساسي</TableHead>
                    <TableHead className="text-emerald-700 font-black">بدل الجمعة (فعلي بالبصمة)</TableHead>
                    <TableHead className="text-amber-700 font-black">إضافي يومي</TableHead>
                    <TableHead className="text-red-700 font-black">عجز / خصم</TableHead>
                    <TableHead className="text-amber-700">GOSI</TableHead>
                    <TableHead className="text-primary font-black">صافي الراتب</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayrolls.map(pr => {
                    const ab = APPROVAL_BADGE[pr.shortfallApprovalStatus] || APPROVAL_BADGE.pending;
                    return (
                      <TableRow key={pr.emp.id} className="hover:bg-secondary/40 text-[11px]">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            <div>
                              <p className="font-bold text-foreground">{pr.emp.full_name}</p>
                              <p className="text-[10px] text-muted-foreground">#{pr.emp.employee_number} | {pr.emp.job_title}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[10px]">
                          <div>{pr.shiftName || '—'}</div>
                          <div className="text-muted-foreground">{pr.shiftHours} س/يوم</div>
                        </TableCell>
                        <TableCell className="font-mono font-bold">{fmtSAR(pr.basicSalary)} ر.س</TableCell>
                        <TableCell>
                          {pr.fridayAllowance > 0 ? (
                            <div>
                              <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">+{fmtSAR(pr.fridayAllowance)} ر.س</span>
                              <p className="text-[9px] text-muted-foreground mt-0.5">{pr.fridayDays} أيام جمعة × {pr.fridayDailyRate}</p>
                            </div>
                          ) : <span className="text-muted-foreground text-[10px]">0 ر.س</span>}
                        </TableCell>
                        <TableCell>
                          {pr.dailyOvertimeAllowance > 0 ? (
                            <div>
                              <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">+{fmtSAR(pr.dailyOvertimeAllowance)} ر.س</span>
                              <p className="text-[9px] text-muted-foreground mt-0.5">{pr.overtimeDays} يوم</p>
                            </div>
                          ) : <span className="text-muted-foreground text-[10px]">—</span>}
                        </TableCell>
                        <TableCell>
                          {pr.proposedShortfallDeduction > 0 ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-red-700 text-[10px]">عجز: {formatHours(pr.shortfallHours)}س</span>
                              </div>
                              <span className="text-[10px] font-bold text-red-700">مقترح: -{fmtSAR(pr.proposedShortfallDeduction)} ر.س</span>
                              <div><Badge className={`text-[9px] ${ab.cls}`}>{ab.label}</Badge></div>
                              {pr.approvedShortfallDeduction > 0 && (
                                <span className="text-[9px] font-bold text-red-600">معتمد: -{fmtSAR(pr.approvedShortfallDeduction)} ر.س</span>
                              )}
                            </div>
                          ) : <span className="text-emerald-600 text-[10px] font-bold">لا عجز ✓</span>}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-amber-700">-{fmtSAR(pr.gosiDeduction)} ر.س</TableCell>
                        <TableCell className="font-mono font-black text-emerald-600 text-sm">{fmtSAR(pr.netSalary)} ر.س</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => handleViewPayslip(pr)}
                              className="h-7 px-2 text-[10px] font-bold rounded-lg gap-1 border-emerald-400/40 text-emerald-700">
                              <Eye className="w-3 h-3" /> قسيمة
                            </Button>
                            {pr.proposedShortfallDeduction > 0 && pr.shortfallApprovalStatus === 'pending' && (
                              <Button variant="outline" size="sm" onClick={() => handleOpenApproval(pr)}
                                className="h-7 px-2 text-[10px] font-bold rounded-lg gap-1 border-amber-400/40 text-amber-700">
                                <ShieldCheck className="w-3 h-3" /> اعتماد
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ── TAB: SHORTFALL ────────────────────────────────────────────── */}
        <TabsContent value="shortfall" className="mt-4">
          <Card className="border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-border/40 bg-amber-50/60 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="font-heading font-bold text-sm text-foreground">مراجعة واعتماد عجز الحضور</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/60 text-[11px]">
                    <TableHead>الموظف</TableHead>
                    <TableHead>الشفت</TableHead>
                    <TableHead>ساعات مطلوبة</TableHead>
                    <TableHead>ساعات فعلية</TableHead>
                    <TableHead className="text-red-700">إجمالي العجز</TableHead>
                    <TableHead>قيمة الساعة</TableHead>
                    <TableHead className="text-red-700 font-black">الخصم المقترح</TableHead>
                    <TableHead>حالة الاعتماد</TableHead>
                    <TableHead className="text-center">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayrolls.filter(p => p.proposedShortfallDeduction > 0).map(pr => {
                    const ab = APPROVAL_BADGE[pr.shortfallApprovalStatus] || APPROVAL_BADGE.pending;
                    return (
                      <TableRow key={pr.emp.id} className="hover:bg-secondary/40 text-[11px]">
                        <TableCell>
                          <p className="font-bold">{pr.emp.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">#{pr.emp.employee_number}</p>
                        </TableCell>
                        <TableCell className="text-[10px]">{pr.shiftName || '—'}</TableCell>
                        <TableCell className="font-mono">{formatMinutes(pr.totalRequiredMinutes)}</TableCell>
                        <TableCell className="font-mono">{formatMinutes(pr.totalActualMinutes)}</TableCell>
                        <TableCell className="font-mono font-bold text-red-700">
                          {formatMinutes(pr.totalShortfallMinutes)}
                          <span className="text-[9px] text-muted-foreground block">({formatHours(pr.shortfallHours)} ساعة)</span>
                        </TableCell>
                        <TableCell className="font-mono">{fmtSAR(pr.hourlyRate)} ريال/س</TableCell>
                        <TableCell className="font-mono font-black text-red-700">-{fmtSAR(pr.proposedShortfallDeduction)} ر.س</TableCell>
                        <TableCell><Badge className={`text-[9px] ${ab.cls}`}>{ab.label}</Badge></TableCell>
                        <TableCell className="text-center">
                          <Button onClick={() => handleOpenApproval(pr)} size="sm" variant="outline"
                            className="h-7 px-2 text-[10px] font-bold rounded-lg border-amber-400/40 text-amber-700 gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            {pr.shortfallApprovalStatus === 'pending' ? 'مراجعة' : 'تعديل'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredPayrolls.filter(p => p.proposedShortfallDeduction > 0).length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">✓ لا يوجد عجز حضور في هذه الفترة</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ── TAB: AUDIT LOG ────────────────────────────────────────────── */}
        <TabsContent value="audit" className="mt-4">
          <Card className="border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-border/40 bg-secondary/20 flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-heading font-bold text-sm text-foreground">سجل التعديلات المالية (Audit Log)</h2>
              <Badge variant="outline" className="text-[10px] mr-auto">للقراءة فقط — لا يمكن الحذف</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/60 text-[11px]">
                    <TableHead>التاريخ والوقت</TableHead>
                    <TableHead>الموظف</TableHead>
                    <TableHead>الشهر</TableHead>
                    <TableHead>الإجراء</TableHead>
                    <TableHead>القيمة المعتمدة</TableHead>
                    <TableHead>المعتمد بواسطة</TableHead>
                    <TableHead>الملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد سجلات بعد</TableCell></TableRow>
                  ) : auditLog.map(entry => {
                    const actionMap = {
                      shortfall_approved: { label: 'اعتماد خصم', cls: 'bg-emerald-100 text-emerald-800' },
                      shortfall_rejected: { label: 'رفض خصم', cls: 'bg-slate-100 text-slate-700' },
                      shortfall_modified: { label: 'تعديل خصم', cls: 'bg-blue-100 text-blue-800' },
                    };
                    const a = actionMap[entry.action] || { label: entry.action, cls: 'bg-gray-100 text-gray-700' };
                    return (
                      <TableRow key={entry.id} className="text-[11px]">
                        <TableCell className="font-mono text-[10px]">{new Date(entry.timestamp).toLocaleString('ar-SA')}</TableCell>
                        <TableCell className="font-bold">#{entry.employeeNumber}</TableCell>
                        <TableCell>{entry.monthPrefix}</TableCell>
                        <TableCell><Badge className={`text-[9px] ${a.cls}`}>{a.label}</Badge></TableCell>
                        <TableCell className="font-mono font-bold text-red-700">{fmtSAR(entry.finalDeduction)} ر.س</TableCell>
                        <TableCell className="font-bold">{entry.approvedBy}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.note || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── PAYSLIP DIALOG ────────────────────────────────────────────────── */}
      <Dialog open={payslipOpen} onOpenChange={setPayslipOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>قسيمة الراتب — {payslipEmp?.emp?.full_name}</DialogTitle>
          </DialogHeader>
          {payslipEmp && <PayslipPrint payrollResult={payslipEmp} month={month} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayslipOpen(false)} className="text-xs font-bold">إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── APPROVAL DIALOG ───────────────────────────────────────────────── */}
      <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              مراجعة واعتماد خصم عجز الحضور
            </DialogTitle>
          </DialogHeader>
          {approvalEmp && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-secondary/50 rounded-xl border border-border/60">
                <p className="font-bold text-sm">{approvalEmp.emp.full_name}</p>
                <p className="text-muted-foreground">#{approvalEmp.emp.employee_number} | {approvalEmp.shiftName}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div><p className="text-muted-foreground">إجمالي العجز</p><p className="font-black text-red-700">{formatMinutes(approvalEmp.totalShortfallMinutes)}</p></div>
                <div><p className="text-muted-foreground">قيمة الساعة</p><p className="font-black">{fmtSAR(approvalEmp.hourlyRate)} ريال/س</p></div>
                <div><p className="text-muted-foreground">الخصم المقترح</p><p className="font-black text-red-700">{fmtSAR(approvalEmp.proposedShortfallDeduction)} ر.س</p></div>
                <div><p className="text-muted-foreground">الساعات المطلوبة</p><p className="font-black">{formatMinutes(approvalEmp.totalRequiredMinutes)}</p></div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs">الإجراء المطلوب</Label>
                <div className="flex gap-2">
                  {[
                    { v: 'approved', l: 'اعتماد الخصم', icon: <Check className="w-3 h-3" />, cls: 'border-emerald-500 text-emerald-700 bg-emerald-50' },
                    { v: 'rejected', l: 'رفض الخصم', icon: <XCircle className="w-3 h-3" />, cls: 'border-slate-500 text-slate-700 bg-slate-50' },
                    { v: 'modified', l: 'تعديل المبلغ', icon: <Edit3 className="w-3 h-3" />, cls: 'border-blue-500 text-blue-700 bg-blue-50' },
                  ].map(opt => (
                    <button key={opt.v} onClick={() => setApprovalAction(opt.v)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-xl border font-bold text-[11px] transition-all ${approvalAction === opt.v ? opt.cls + ' ring-2 ring-offset-1 ring-current' : 'border-border/60 text-muted-foreground bg-white hover:bg-secondary/50'}`}>
                      {opt.icon} {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              {approvalAction === 'modified' && (
                <div className="space-y-1">
                  <Label className="font-bold text-xs">المبلغ المعدل (ريال)</Label>
                  <Input type="number" value={approvalCustomAmt} onChange={e => setApprovalCustomAmt(e.target.value)}
                    min="0" max={approvalEmp.proposedShortfallDeduction} step="0.5"
                    className="rounded-xl text-xs h-9" placeholder="أدخل المبلغ المعدل" />
                </div>
              )}
              <div className="space-y-1">
                <Label className="font-bold text-xs">سبب القرار (مطلوب للتوثيق)</Label>
                <Textarea value={approvalNote} onChange={e => setApprovalNote(e.target.value)} rows={2}
                  className="rounded-xl text-xs" placeholder="مثال: تصحيح بصمة يوم 15/8، أو إجازة غير مسجلة..." />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApprovalOpen(false)} className="text-xs font-bold">إلغاء</Button>
            <Button onClick={handleApprovalSubmit}
              className={`text-xs font-bold ${approvalAction === 'rejected' ? 'bg-slate-600' : approvalAction === 'modified' ? 'bg-blue-600' : 'bg-emerald-600'} text-white`}>
              {approvalAction === 'rejected' ? 'رفض الخصم' : approvalAction === 'modified' ? 'اعتماد المبلغ المعدل' : 'اعتماد الخصم'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
