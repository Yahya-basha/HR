import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Printer, FileText, Calendar, Building2, User, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function DocumentsPrint() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('emp_1001');
  const [docType, setDocType] = useState('loan');

  // Form Fields
  const [loanAmount, setLoanAmount] = useState('');
  const [loanInstallments, setLoanInstallments] = useState('6');
  const [deductionStart, setDeductionStart] = useState(new Date().toISOString().split('T')[0]);
  const [loanReason, setLoanReason] = useState('ظروف شخصية طارئة');

  // Leave Clearance Fields
  const [leaveType, setLeaveType] = useState('سنوية');
  const [leaveStart, setLeaveStart] = useState('2026-09-01');
  const [leaveEnd, setLeaveEnd] = useState('2026-09-21');
  const [leaveDays, setLeaveDays] = useState('21');
  const [leaveAllowance, setLeaveAllowance] = useState('2800');

  useEffect(() => {
    base44.entities.Employee.list().then(setEmployees).catch(() => {});
  }, []);

  const currentEmp = employees.find(e => e.id === selectedEmpId || e.employee_number === selectedEmpId) || employees[0];
  const monthlyDeduction = (Number(loanAmount) || 0) / (Number(loanInstallments) || 1);

  const docTitles = {
    loan: 'طلب سلفة مالية',
    leave_clearance: 'مخالصة إجازة',
    overtime: 'طلب عمل إضافي',
    comp_leave: 'إجازة تعويضية',
    salary_cert: 'خطاب تعريف بالراتب',
    end_service: 'تسوية نهاية الخدمة'
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#1E1035] flex items-center justify-center font-bold">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">طابعة المستندات الرسمية</h1>
            <p className="text-xs text-muted-foreground mt-0.5">توليد وطباعة المستندات الرسمية جاهزة للتصدير PDF</p>
          </div>
        </div>

        <Button onClick={() => window.print()} className="bg-[#2D164D] hover:bg-[#1E1035] text-white shadow-sm gap-2">
          <Printer className="w-4 h-4" /> طباعة / حفظ PDF
        </Button>
      </div>

      {/* Top Configuration Card */}
      <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">نوع المستند</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="loan">طلب سلفة</SelectItem>
                <SelectItem value="leave_clearance">مخالصة إجازة</SelectItem>
                <SelectItem value="overtime">طلب عمل إضافي</SelectItem>
                <SelectItem value="comp_leave">إجازة تعويضية</SelectItem>
                <SelectItem value="salary_cert">خطاب تعريف بالراتب</SelectItem>
                <SelectItem value="end_service">تسوية نهاية الخدمة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">الموظف</Label>
            <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name} - {e.employee_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dynamic Fields for Loan */}
        {docType === 'loan' && (
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">قيمة السلفة (ريال)</Label>
              <Input type="number" placeholder="مثال: 3000" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">عدد الأقساط</Label>
              <Input type="number" placeholder="6" value={loanInstallments} onChange={(e) => setLoanInstallments(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">يبدأ الاستقطاع من</Label>
              <Input type="date" value={deductionStart} onChange={(e) => setDeductionStart(e.target.value)} className="rounded-xl h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">السبب</Label>
              <Input placeholder="ظروف شخصية طارئة" value={loanReason} onChange={(e) => setLoanReason(e.target.value)} className="rounded-xl h-11" />
            </div>
          </div>
        )}

        {/* Dynamic Fields for Leave Clearance */}
        {docType === 'leave_clearance' && (
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">نوع الإجازة</Label>
              <Input value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="rounded-xl h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تاريخ بداية الإجازة</Label>
              <Input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} className="rounded-xl h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تاريخ نهاية الإجازة</Label>
              <Input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} className="rounded-xl h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">بدل الإجازة المستحق (ريال)</Label>
              <Input type="number" value={leaveAllowance} onChange={(e) => setLeaveAllowance(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>
          </div>
        )}
      </Card>

      {/* Official Live Preview Sheet */}
      {currentEmp ? (
        <Card className="p-8 border-border/80 shadow-md rounded-2xl bg-white text-foreground print:border-none print:shadow-none space-y-6">
          {/* Document Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-200">
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>رقم المستند: <span className="font-mono font-bold text-foreground">LN-{currentEmp.employee_number}</span></p>
              <p>تاريخ الإصدار: <span className="font-mono text-foreground">{new Date().toISOString().split('T')[0]}</span></p>
            </div>

            <div className="text-center">
              <div className="inline-block px-6 py-2 rounded-xl border-2 border-primary/30 font-bold text-base bg-primary/5 text-primary">
                {docTitles[docType] || 'مستند رسمي'}
              </div>
            </div>

            <div className="flex items-center gap-3 text-left">
              <div className="text-right">
                <h3 className="font-heading font-bold text-sm text-foreground">HR DORAT CARS</h3>
                <p className="text-[10px] text-muted-foreground">إدارة الموارد البشرية والشؤون الإدارية</p>
                <p className="text-[10px] text-muted-foreground">بريدة - القصيم</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow">
                DC
              </div>
            </div>
          </div>

          {/* Employee Information Strip */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block">اسم الموظف:</span>
              <span className="font-bold text-foreground">{currentEmp.full_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">الرقم الوظيفي:</span>
              <span className="font-mono font-bold text-primary">#{currentEmp.employee_number}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">القسم / الفرع:</span>
              <span className="font-semibold text-foreground">{currentEmp.branch_name || currentEmp.department_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">المسمى الوظيفي:</span>
              <span className="font-semibold text-foreground">{currentEmp.job_title}</span>
            </div>
          </div>

          {/* Document Content Details */}
          {docType === 'loan' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-sm text-foreground border-b pb-1">تفاصيل السلفة:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-secondary/20 rounded-xl">
                <p>قيمة السلفة: <span className="font-bold font-mono text-sm">{loanAmount || '0'} ريال</span></p>
                <p>عدد الأقساط: <span className="font-bold font-mono">{loanInstallments || '0'} قسط</span></p>
                <p>القسط الشهري: <span className="font-bold font-mono text-emerald-600">{Math.round(monthlyDeduction)} ريال</span></p>
                <p>يبدأ الاستقطاع من: <span className="font-bold font-mono">{deductionStart}</span></p>
                <p className="col-span-2">سبب الطلب: <span className="font-medium">{loanReason}</span></p>
              </div>
            </div>
          )}

          {docType === 'leave_clearance' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-sm text-foreground border-b pb-1">تفاصيل مخالصة الإجازة:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-secondary/20 rounded-xl">
                <p>نوع الإجازة: <span className="font-bold">{leaveType}</span></p>
                <p>تاريخ البدء: <span className="font-mono font-bold">{leaveStart}</span></p>
                <p>تاريخ العودة: <span className="font-mono font-bold">{leaveEnd}</span></p>
                <p>بدل الإجازة: <span className="font-bold font-mono text-emerald-600">{leaveAllowance} ريال</span></p>
              </div>
            </div>
          )}

          {docType === 'salary_cert' && (
            <div className="space-y-4 text-xs leading-relaxed p-4 bg-secondary/10 rounded-xl">
              <p>تشهد إدارة شركة <span className="font-bold">درة السيارة لقطع غيار السيارات</span> بأن الموظف المذكور أعلاه يعمل لدينا بموجب عقد عمل ساري المفعول، ويتقاضى راتباً شهرياً إجمالياً قدره (<span className="font-bold font-mono text-sm">{Number(currentEmp.salary || 0).toLocaleString()} ريال سعودي</span>).</p>
              <p>وقد أعطي هذا الخطاب بناءً على طلبه دون أدنى مسؤولية على الشركة تجاه حقوق الغير.</p>
            </div>
          )}

          {/* Signatures Area */}
          <div className="pt-10 grid grid-cols-4 gap-4 text-center text-xs text-muted-foreground border-t border-slate-200">
            <div>
              <p className="font-bold text-foreground mb-8">توقيع الموظف</p>
              <div className="border-b border-dashed border-slate-300 w-24 mx-auto"></div>
            </div>
            <div>
              <p className="font-bold text-foreground mb-8">المحاسب</p>
              <div className="border-b border-dashed border-slate-300 w-24 mx-auto"></div>
            </div>
            <div>
              <p className="font-bold text-foreground mb-8">مدير الموارد البشرية</p>
              <div className="border-b border-dashed border-slate-300 w-24 mx-auto"></div>
            </div>
            <div>
              <p className="font-bold text-foreground mb-8">المدير العام</p>
              <div className="border-b border-dashed border-slate-300 w-24 mx-auto"></div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">
          اختر موظفاً لتوليد المستند
        </Card>
      )}
    </div>
  );
}
