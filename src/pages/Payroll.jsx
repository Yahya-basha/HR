import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Wallet, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  ShieldCheck, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Sparkles, 
  Eye, 
  DollarSign,
  ChevronLeft
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export default function Payroll() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [month, setMonth] = useState('2026-08');
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [payslipOpen, setPayslipOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Employee.list(),
      base44.entities.AttendanceLog.list('-log_date', 800)
    ]).then(([emps, logs]) => {
      setEmployees(emps || []);
      setAttendanceLogs(logs || []);
    }).catch(console.error);
  }, []);

  // Strict Calculation of Friday Attendance & Overtime for each employee
  const payrollData = useMemo(() => {
    const selectedMonthPrefix = month.substring(0, 7); // e.g. '2026-08'

    return employees.map((emp) => {
      // 1. Filter logs strictly for this employee AND strictly for the selected month
      const empLogs = attendanceLogs.filter(l => {
        const isThisEmp = l.user_id === emp.id || 
                          (l.employee_number && l.employee_number.toString() === emp.employee_number?.toString()) || 
                          (l.employee_name && l.employee_name.trim() === emp.full_name?.trim());
        const isInMonth = l.log_date && l.log_date.startsWith(selectedMonthPrefix);
        return isThisEmp && isInMonth;
      });

      // Deduplicate by date (keep only one record per day)
      const dateMap = {};
      empLogs.forEach(l => {
        if (!dateMap[l.log_date]) dateMap[l.log_date] = l;
      });
      const uniqueDays = Object.values(dateMap);

      // 2. Count ONLY Fridays where the employee actually had punches / attendance
      const attendedFridays = uniqueDays.filter(l => {
        if (!l.log_date) return false;
        const d = new Date(l.log_date);
        const isFriday = d.getDay() === 5 || l.day_name === 'الجمعة';
        
        // Strict check: Must have real punches or check_in (NOT absent or not started)
        const hasRealPunches = (l.check_in && l.check_in !== '—') || 
                               (l.timestamp_raw && l.timestamp_raw.length > 3) || 
                               (l.punches_raw && l.punches_raw.length > 3);
        
        const isNotAbsent = l.status !== 'absent' && l.status !== 'not_started' && l.status !== 'غائب' && l.status !== 'لم يباشر';

        return isFriday && hasRealPunches && isNotAbsent;
      });

      // Strict Friday Count (0 if didn't attend any Friday!)
      const fridayCount = attendedFridays.length;
      const fridayAllowance = fridayCount * 50;
      const fridayNote = fridayCount > 0 
        ? `${fridayAllowance} ريال عن إضافي حضور ${fridayCount} أيام جمعة`
        : 'لا يوجد حضور في أيام الجمعة لهذا الشهر';

      const basicSalary = Number(emp.salary) || 4000;
      const housing = Number(emp.housing_allowance) || 0;
      const transport = Number(emp.transport_allowance) || 0;
      
      // Daily Overtime for 9-hour split shifts (100 SAR daily)
      const isOvertimeShift = emp.shift?.includes('9') || emp.shift?.includes('إضافي') || emp.job_title?.includes('موارد') || emp.employee_number === '1022';
      const monthlyOvertime = isOvertimeShift ? 2600 : 0;

      // GOSI Calculation (9.75% for Saudis, 2% for Non-Saudis)
      const isSaudi = (emp.nationality || '').includes('سعودي');
      const gosiDeduction = isSaudi ? Math.round(basicSalary * 0.0975) : Math.round(basicSalary * 0.02);

      // Net Salary Calculation
      const totalAllowances = housing + transport + fridayAllowance + monthlyOvertime;
      const netSalary = basicSalary + totalAllowances - gosiDeduction;

      return {
        ...emp,
        basicSalary,
        housing,
        transport,
        fridayCount,
        fridayAllowance,
        fridayNote,
        monthlyOvertime,
        totalAllowances,
        gosiDeduction,
        netSalary
      };
    });
  }, [employees, attendanceLogs, month]);

  const totalBasic = payrollData.reduce((sum, e) => sum + e.basicSalary, 0);
  const totalAllowances = payrollData.reduce((sum, e) => sum + e.totalAllowances, 0);
  const totalFridayAllowances = payrollData.reduce((sum, e) => sum + e.fridayAllowance, 0);
  const totalGOSI = payrollData.reduce((sum, e) => sum + e.gosiDeduction, 0);
  const totalNet = payrollData.reduce((sum, e) => sum + e.netSalary, 0);

  const handleViewPayslip = (row) => {
    setSelectedPayslip(row);
    setPayslipOpen(true);
  };

  const handleExportWPS = () => {
    const headers = 'Employee_ID,Employee_Name,National_ID,Basic_Salary,Housing_Allowance,Transport_Allowance,Friday_Overtime,GOSI_Deduction,Net_Salary,Bank_IBAN';
    const rows = payrollData.map(e => {
      return `"${e.employee_number}","${e.full_name}","${e.national_id || ''}",${e.basicSalary},${e.housing},${e.transport},${e.fridayAllowance},${e.gosiDeduction},${e.netSalary},"SA0000000000000000000000"`;
    });
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WPS_Mudad_Payroll_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'تم تصدير مسير الرواتب المعتمد مع إضافي الجمعة لملف WPS مدد 📑' });
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold shadow-sm">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-foreground">مسير الرواتب والبدلات وإضافي الجمعة</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              احتساب الرواتب الفعلية مع تجميع أيام الجمعة (+50 ريال/جمعة) للموظفين الذين حضروا فقط
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={handleExportWPS}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-2 shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>تصدير ملف WPS (منصة مدد)</span>
          </Button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <p className="text-xs font-bold text-muted-foreground">إجمالي الرواتب الأساسية</p>
          <p className="text-2xl font-heading font-black text-foreground mt-1">{totalBasic.toLocaleString()} ر.س</p>
        </Card>

        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">إجمالي إضافي الجمعة الفعلي</p>
            <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">50 ر.س / جمعة</Badge>
          </div>
          <p className="text-2xl font-heading font-black text-emerald-600 mt-1">{totalFridayAllowances.toLocaleString()} ر.س</p>
        </Card>

        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">خصومات التأمينات (GOSI)</p>
          <p className="text-2xl font-heading font-black text-amber-600 mt-1">{totalGOSI.toLocaleString()} ر.س</p>
        </Card>

        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <p className="text-xs font-bold text-primary">صافي المسير المستحق للصرف</p>
          <p className="text-2xl font-heading font-black text-primary mt-1">{totalNet.toLocaleString()} ر.س</p>
        </Card>
      </div>

      {/* Main Payroll Table */}
      <Card className="border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 pb-3 border-b border-border/40 flex items-center justify-between bg-secondary/20">
          <h2 className="font-heading font-bold text-base text-foreground">
            كشف مسير رواتب منسوبي المنشأة (شهر {month})
          </h2>
          <Badge variant="outline" className="font-mono text-xs">
            {payrollData.length} موظفاً معتمداً
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60 text-xs">
                <TableHead>الموظف</TableHead>
                <TableHead>الرقم الوظيفي</TableHead>
                <TableHead>الراتب الأساسي</TableHead>
                <TableHead className="text-emerald-700 font-extrabold">إضافي حضور الجمعة الفعلي (+50 ر.س)</TableHead>
                <TableHead>البدلات والإضافي</TableHead>
                <TableHead className="text-amber-700">خصم التأمينات (GOSI)</TableHead>
                <TableHead className="text-primary font-black">صافي الراتب المستحق</TableHead>
                <TableHead className="text-center">قسيمة الراتب</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollData.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-secondary/40 text-xs">
                  
                  {/* Name */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <div>
                        <p className="font-bold text-xs text-foreground">{emp.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{emp.job_title || 'موظف'}</p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Emp Number */}
                  <TableCell className="font-mono font-bold text-slate-700">
                    {emp.employee_number}
                  </TableCell>

                  {/* Basic */}
                  <TableCell className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {emp.basicSalary.toLocaleString()} ر.س
                  </TableCell>

                  {/* Friday Allowance (STRICT) */}
                  <TableCell>
                    {emp.fridayCount > 0 ? (
                      <div className="space-y-0.5">
                        <span className="font-mono font-black text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          +{emp.fridayAllowance} ر.س
                        </span>
                        <p className="text-[10px] text-emerald-700 font-semibold">
                          ({emp.fridayCount} أيام جمعة × 50)
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground font-mono text-[11px]">0 ر.س (لم يحضر جمعة)</span>
                    )}
                  </TableCell>

                  {/* Allowances & OT */}
                  <TableCell className="font-mono font-semibold text-slate-700">
                    {(emp.housing + emp.transport + emp.monthlyOvertime).toLocaleString()} ر.س
                    {emp.monthlyOvertime > 0 && (
                      <span className="block text-[9px] text-amber-600 font-bold">شامل إضافي 9 ساعات</span>
                    )}
                  </TableCell>

                  {/* GOSI */}
                  <TableCell className="font-mono font-bold text-amber-700">
                    -{emp.gosiDeduction.toLocaleString()} ر.س
                  </TableCell>

                  {/* Net Salary */}
                  <TableCell className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                    {emp.netSalary.toLocaleString()} ر.س
                  </TableCell>

                  {/* Action Payslip */}
                  <TableCell className="text-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleViewPayslip(emp)}
                      className="h-8 px-2.5 text-xs font-bold gap-1 rounded-xl border-emerald-500/30 text-emerald-800 hover:bg-emerald-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>عرض القسيمة</span>
                    </Button>
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* DETAILED PAYSLIP MODAL */}
      {selectedPayslip && (
        <Dialog open={payslipOpen} onOpenChange={setPayslipOpen}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-heading font-bold text-base text-foreground flex items-center justify-between">
                <span>قسيمة الراتب الرسمية — شهر {month}</span>
                <Badge className="bg-emerald-600 text-white text-[10px]">معتمد للصرف</Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              
              {/* Employee Summary */}
              <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/60 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">{selectedPayslip.full_name}</h3>
                  <p className="text-[11px] text-muted-foreground">الرقم الوظيفي: #{selectedPayslip.employee_number} • {selectedPayslip.job_title}</p>
                </div>
                <div className="text-left font-mono">
                  <p className="text-[10px] text-muted-foreground">الفرع</p>
                  <p className="font-bold text-xs text-foreground">{selectedPayslip.branch_name || 'فرع كيا'}</p>
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-border/60">
                <p className="font-bold text-xs text-emerald-800 dark:text-emerald-400 border-b border-border/40 pb-1">
                  المستحقات والبدلات (Earnings):
                </p>
                
                <div className="flex justify-between py-1 border-b border-dashed border-border/40">
                  <span className="text-muted-foreground">الراتب الأساسي:</span>
                  <span className="font-mono font-bold">{selectedPayslip.basicSalary.toLocaleString()} ر.س</span>
                </div>

                {selectedPayslip.fridayAllowance > 0 && (
                  <>
                    <div className="flex justify-between py-1 border-b border-dashed border-border/40 text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-50/60 p-1.5 rounded-lg">
                      <span>إضافي حضور أيام الجمعة:</span>
                      <span className="font-mono">+{selectedPayslip.fridayAllowance} ر.س</span>
                    </div>
                    <p className="text-[10px] text-emerald-700 font-semibold px-1">
                      📌 {selectedPayslip.fridayNote}
                    </p>
                  </>
                )}

                {selectedPayslip.monthlyOvertime > 0 && (
                  <div className="flex justify-between py-1 border-b border-dashed border-border/40 text-amber-800 dark:text-amber-300 font-bold">
                    <span>بدل عمل إضافي (شفت 9 ساعات):</span>
                    <span className="font-mono">+{selectedPayslip.monthlyOvertime.toLocaleString()} ر.س</span>
                  </div>
                )}
              </div>

              {/* Deductions Breakdown */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-border/60">
                <p className="font-bold text-xs text-amber-800 dark:text-amber-400 border-b border-border/40 pb-1">
                  الاستقطاعات والخصومات (Deductions):
                </p>
                <div className="flex justify-between py-1 text-amber-700">
                  <span>التأمينات الاجتماعية (GOSI):</span>
                  <span className="font-mono font-bold">-{selectedPayslip.gosiDeduction.toLocaleString()} ر.س</span>
                </div>
              </div>

              {/* Net Pay */}
              <div className="p-4 rounded-2xl bg-emerald-600 text-white flex items-center justify-between shadow-lg shadow-emerald-600/20">
                <div>
                  <p className="text-xs text-emerald-100 font-bold">صافي الراتب المستحق للحساب البنكي</p>
                  <p className="text-xs text-emerald-200 mt-0.5">طريقة الصرف: تحويل سريع عبر نظام حماية الأجور (WPS)</p>
                </div>
                <p className="text-2xl font-heading font-black">{selectedPayslip.netSalary.toLocaleString()} ر.س</p>
              </div>

            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setPayslipOpen(false)} className="text-xs font-bold">إلغاء</Button>
              <Button onClick={() => window.print()} className="bg-emerald-600 text-white font-bold text-xs gap-1.5 shadow-md">
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة القسيمة</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
