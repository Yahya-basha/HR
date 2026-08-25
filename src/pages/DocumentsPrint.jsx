import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Printer, FileText, Calendar, Building2, User, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DocumentsPrint() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('emp_1001');
  const [docType, setDocType] = useState('loan');

  // Loan Fields
  const [loanAmount, setLoanAmount] = useState('3000');
  const [loanInstallments, setLoanInstallments] = useState('6');
  const [deductionStart, setDeductionStart] = useState('2026-09-01');
  const [loanReason, setLoanReason] = useState('ظروف شخصية');

  // Leave Clearance Fields
  const [leaveType, setLeaveType] = useState('سنوية');
  const [leaveStart, setLeaveStart] = useState('2026-09-01');
  const [leaveEnd, setLeaveEnd] = useState('2026-09-21');
  const [leaveAllowance, setLeaveAllowance] = useState('2800');

  useEffect(() => {
    base44.entities.Employee.list().then((list) => {
      setEmployees(list || []);
      if (list && list.length > 0) {
        setSelectedEmpId(list[0].id);
      }
    }).catch(() => {});
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* CSS For Exact A4 1-Page Clean Printout */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide all UI Chrome */
          header, aside, nav, .no-print, .print-controls {
            display: none !important;
          }
          .lg\\:ps-64 {
            padding-inline-start: 0 !important;
          }
          main {
            padding: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
          .printable-doc-container {
            border: 1.5px solid #000000 !important;
            border-radius: 8px !important;
            padding: 24px !important;
            background: #ffffff !important;
            box-shadow: none !important;
            width: 100% !important;
            margin: 0 auto !important;
            page-break-inside: avoid !important;
          }
          .employee-info-box {
            background-color: #f8f9fa !important;
            border: 1px solid #e2e8f0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .pill-header-box {
            border: 2px solid #1E1035 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Screen Header Controls (Hidden on Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#1E1035] flex items-center justify-center font-bold">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">طابعة المستندات الرسمية</h1>
            <p className="text-xs text-muted-foreground mt-0.5">توليد وطباعة المستندات الرسمية جاهزة للتصدير PDF</p>
          </div>
        </div>

        <Button onClick={handlePrint} className="bg-[#2D164D] hover:bg-[#1E1035] text-white shadow-sm gap-2">
          <Printer className="w-4 h-4" /> طباعة / حفظ PDF
        </Button>
      </div>

      {/* Form Controls Card (Hidden on Print) */}
      <Card className="no-print p-6 border-border/60 shadow-sm rounded-2xl bg-white space-y-4">
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
              <Input placeholder="ظروف شخصية" value={loanReason} onChange={(e) => setLoanReason(e.target.value)} className="rounded-xl h-11" />
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
              <Label className="text-xs font-semibold">بدل الإجازة المستحق (ريال)</Label>
              <Input type="number" value={leaveAllowance} onChange={(e) => setLeaveAllowance(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تاريخ بداية الإجازة</Label>
              <Input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} className="rounded-xl h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تاريخ نهاية الإجازة</Label>
              <Input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} className="rounded-xl h-11" />
            </div>
          </div>
        )}
      </Card>

      {/* Official A4 Printable Document Container */}
      {currentEmp && (
        <div className="printable-doc-container bg-white rounded-2xl border-2 border-slate-300 shadow-xl p-8 text-black font-sans">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-black">
            {/* Document Meta */}
            <div className="text-xs space-y-1 text-right font-medium text-black">
              <p>رقم المستند: <span className="font-mono font-bold">LN-{currentEmp.employee_number}</span></p>
              <p>تاريخ الإصدار: <span className="font-mono">{new Date().toISOString().split('T')[0]}</span></p>
            </div>

            {/* Centered Document Pill Title */}
            <div className="text-center">
              <div className="pill-header-box px-8 py-2 rounded-xl border-2 border-black font-bold text-lg bg-slate-50 text-black">
                {docTitles[docType] || 'مستند رسمي'}
              </div>
            </div>

            {/* Official Company Branding */}
            <div className="flex items-center gap-3 text-right">
              <div>
                <h3 className="font-heading font-extrabold text-sm text-black tracking-wide">HR DORAT CARS</h3>
                <p className="text-[10px] text-gray-700 font-medium">إدارة الموارد البشرية والشؤون الإدارية</p>
                <p className="text-[10px] text-gray-700">بريدة - القصيم</p>
              </div>
              <div className="w-12 h-12 rounded-full border-2 border-blue-600 bg-white flex items-center justify-center font-black text-blue-600 text-sm shadow-sm">
                DC
              </div>
            </div>
          </div>

          {/* Employee Information Strip */}
          <div className="employee-info-box my-4 p-4 rounded-xl border border-gray-300 bg-gray-50 grid grid-cols-2 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600">اسم الموظف:</span>
              <span className="font-bold text-black text-sm">{currentEmp.full_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600">الرقم الوظيفي:</span>
              <span className="font-mono font-bold text-black text-sm">{currentEmp.employee_number}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600">القسم:</span>
              <span className="font-bold text-black">{currentEmp.department_name || currentEmp.branch_name || 'مكتب الإدارة'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600">المسمى الوظيفي:</span>
              <span className="font-bold text-black">{currentEmp.job_title}</span>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-4 my-6 text-xs">
            {docType === 'loan' && (
              <>
                <h4 className="font-bold text-sm text-black border-b border-gray-300 pb-1">تفاصيل السلفة:</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center justify-between border-b border-dashed pb-1">
                    <span className="text-gray-600">قيمة السلفة:</span>
                    <span className="font-bold font-mono text-sm">{loanAmount ? Number(loanAmount).toLocaleString() + ' ريال' : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed pb-1">
                    <span className="text-gray-600">عدد الأقساط:</span>
                    <span className="font-bold font-mono">{loanInstallments ? loanInstallments + ' قسط' : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed pb-1">
                    <span className="text-gray-600">القسط الشهري:</span>
                    <span className="font-bold font-mono text-sm">{monthlyDeduction ? Math.round(monthlyDeduction).toLocaleString() + ' ريال' : '0 ريال'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed pb-1">
                    <span className="text-gray-600">يبدأ الاستقطاع من:</span>
                    <span className="font-bold font-mono">{deductionStart || '—'}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-between border-b border-dashed pb-1">
                    <span className="text-gray-600">سبب الطلب:</span>
                    <span className="font-medium">{loanReason || '—'}</span>
                  </div>
                </div>

                <h4 className="font-bold text-sm text-black border-b border-gray-300 pb-1 mt-6">جدول الاستقطاع:</h4>
                <div className="border border-gray-300 rounded-lg overflow-hidden text-center text-xs">
                  <div className="grid grid-cols-4 bg-gray-100 font-bold py-2 border-b border-gray-300">
                    <div>القسط</div>
                    <div>المبلغ (ريال)</div>
                    <div>القسط</div>
                    <div>المبلغ (ريال)</div>
                  </div>
                  <div className="py-4 text-gray-500 font-mono">
                    —
                  </div>
                </div>
              </>
            )}

            {docType === 'leave_clearance' && (
              <>
                <h4 className="font-bold text-sm text-black border-b border-gray-300 pb-1">تفاصيل مخالصة الإجازة:</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center justify-between border-b border-dashed pb-1">
                    <span className="text-gray-600">نوع الإجازة:</span>
                    <span className="font-bold">{leaveType}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed pb-1">
                    <span className="text-gray-600">بدل الإجازة:</span>
                    <span className="font-bold font-mono">{leaveAllowance} ريال</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed pb-1">
                    <span className="text-gray-600">تاريخ البدء:</span>
                    <span className="font-bold font-mono">{leaveStart}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed pb-1">
                    <span className="text-gray-600">تاريخ العودة:</span>
                    <span className="font-bold font-mono">{leaveEnd}</span>
                  </div>
                </div>
              </>
            )}

            {docType === 'salary_cert' && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl leading-loose text-sm">
                <p>تشهد إدارة شركة <span className="font-bold">درة السيارة لقطع غيار السيارات</span> بأن الموظف المذكور أعلاه يعمل لدينا بموجب عقد عمل ساري المفعول، ويتقاضى راتباً شهرياً إجمالياً قدره (<span className="font-bold font-mono text-base">{Number(currentEmp.salary || 0).toLocaleString()} ريال سعودي</span>).</p>
                <p className="mt-2">وقد أعطي هذا الخطاب بناءً على طلبه لتقديمه للجهات المعنية دون أدنى مسؤولية على الشركة تجاه حقوق الغير.</p>
              </div>
            )}
          </div>

          {/* 4 Standard Signature Columns */}
          <div className="pt-8 border-t border-black grid grid-cols-4 gap-4 text-center text-xs">
            <div>
              <p className="font-bold text-black mb-8">مقدم الطلب (الموظف)</p>
              <p className="text-[11px] text-gray-500">التوقيع: .....................</p>
            </div>
            <div>
              <p className="font-bold text-black mb-8">مدير الفرع / القسم</p>
              <p className="text-[11px] text-gray-500">التوقيع: .....................</p>
            </div>
            <div>
              <p className="font-bold text-black mb-8">الموارد البشرية</p>
              <p className="text-[11px] text-gray-500">التوقيع: .....................</p>
            </div>
            <div>
              <p className="font-bold text-black mb-8">الإدارة المالية / الاعتماد</p>
              <p className="text-[11px] text-gray-500">التوقيع: .....................</p>
            </div>
          </div>

          {/* Official Footer */}
          <div className="pt-6 mt-6 border-t border-gray-200 text-center text-[10px] text-gray-500">
            HR DORAT CARS — هاتف: +966 54 169 7999 — هذا المستند مستخرج آلياً من نظام إدارة الموارد البشرية.
          </div>

        </div>
      )}
    </div>
  );
}
