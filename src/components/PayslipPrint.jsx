import React, { useRef } from 'react';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  CreditCard, 
  Building2, 
  User, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  DollarSign, 
  Coins, 
  Award,
  QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';

function getCompanyProfile() {
  return {
    name_ar: 'شركة درة الصيارة للتجارة',
    name_en: 'DORAT AL-SAYARAH TRADING CO.',
    cr_number: '7016475555',
    tax_number: '310459827100003',
    address: 'الرياض - المملكة العربية السعودية',
  };
}

const fmtSAR = (n, dec = 2) => {
  return (Number(n) || 0).toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
};

function formatHours(decimalHours) {
  if (!decimalHours || isNaN(decimalHours)) return '0 د';
  const totalMinutes = Math.round(Number(decimalHours) * 60);
  const h = Math.floor(Math.abs(totalMinutes) / 60);
  const m = Math.abs(totalMinutes) % 60;
  if (h === 0) return `${m} د`;
  if (m === 0) return `${h} س`;
  return `${h} س و ${m} د`;
}

// Comprehensive Arabic Currency Tafqeet Function
function tafqeetSAR(num) {
  const amount = Math.round(Number(num) || 0);
  if (amount === 0) return 'صفر ريال سعودي فقط لا غير';
  if (amount < 0) return 'سالب ' + tafqeetSAR(Math.abs(amount));

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertHundreds(n) {
    let res = '';
    const h = Math.floor(n / 100);
    const rem = n % 100;
    if (h > 0) res += hundreds[h];
    if (rem > 0) {
      if (res !== '') res += ' و ';
      if (rem < 20) {
        res += ones[rem];
      } else {
        const t = Math.floor(rem / 10);
        const o = rem % 10;
        if (o > 0) res += ones[o] + ' و ';
        res += tens[t];
      }
    }
    return res;
  }

  function convertThousands(n) {
    if (n < 1000) return convertHundreds(n);
    const thousandsCount = Math.floor(n / 1000);
    const remainder = n % 1000;
    let thousandStr = '';
    if (thousandsCount === 1) thousandStr = 'ألف';
    else if (thousandsCount === 2) thousandStr = 'ألفان';
    else if (thousandsCount >= 3 && thousandsCount <= 10) thousandStr = convertHundreds(thousandsCount) + ' آلاف';
    else thousandStr = convertHundreds(thousandsCount) + ' ألفاً';

    if (remainder > 0) {
      return thousandStr + ' و ' + convertHundreds(remainder);
    }
    return thousandStr;
  }

  return 'فقط ' + convertThousands(amount) + ' ريال سعودي لا غير';
}

export default function PayslipPrint({ payroll, monthLabel, onClose }) {
  const printRef = useRef(null);
  if (!payroll) return null;

  const {
    emp = {}, basicSalary = 0, housing = 0, transport = 0,
    fridayAllowance = 0, fridayNote = '',
    dailyOvertimeAllowance = 0, dailyOvertimeNote = '',
    proposedShortfallDeduction = 0, approvedShortfallDeduction = 0,
    shortfallApprovalStatus = '', shortfallApprovalNote = '',
    shortfallHours = 0, hourlyRate = 0,
    approvedBonuses = [], customBonusesTotal = 0,
    approvedPenalties = [], customPenaltiesTotal = 0,
    activeAdvance, advanceInstallment = 0, advanceRemaining = 0, advanceNote = '',
    totalAdditions = 0, totalDeductions = 0, netSalary = 0,
    isInsured = false, gosiNumber = '', gosiDeduction = 0
  } = payroll;

  const effectivePayoutMethod = payroll.payoutMethod || emp.payout_method || (emp.iban ? 'bank_full' : 'cash_full');
  let effectiveBankAmount = payroll.bankTransferAmount;
  let effectiveCashAmount = payroll.cashPayoutAmount;

  if (effectiveBankAmount === undefined) {
    if (effectivePayoutMethod === 'bank_full') {
      effectiveBankAmount = netSalary;
      effectiveCashAmount = 0;
    } else if (effectivePayoutMethod === 'cash_full') {
      effectiveBankAmount = 0;
      effectiveCashAmount = netSalary;
    } else if (effectivePayoutMethod === 'split_bank_cash') {
      const fixedBank = Number(emp.bank_transfer_amount || emp.insured_salary || emp.basic_salary) || 0;
      effectiveBankAmount = Math.min(fixedBank, netSalary);
      effectiveCashAmount = Math.max(0, netSalary - effectiveBankAmount);
    }
  }

  const company = getCompanyProfile();
  const rawMonth = monthLabel?.replace(/[^0-9]/g, '') || '202608';
  const payslipNumber = 'PAY-' + rawMonth + '-' + (emp.employee_number || emp.id || '1001');
  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto" dir="rtl">
      
      {/* ─── PRINT CSS EMBEDDED DIRECTLY TO GUARANTEE ZERO FLICKER & STRICT A4 FIT ─── */}
      <style>{'\
        @media print {\
          body * {\
            visibility: hidden !important;\
          }\
          #official-payslip-print-sheet, #official-payslip-print-sheet * {\
            visibility: visible !important;\
          }\
          #official-payslip-print-sheet {\
            position: absolute !important;\
            left: 0 !important;\
            top: 0 !important;\
            width: 100% !important;\
            max-width: 100% !important;\
            margin: 0 !important;\
            padding: 12mm 15mm !important;\
            border: none !important;\
            box-shadow: none !important;\
            background: #ffffff !important;\
            color: #000000 !important;\
          }\
          @page {\
            size: A4 portrait;\
            margin: 0;\
          }\
          .print-avoid-break {\
            page-break-inside: avoid !important;\
            break-inside: avoid !important;\
          }\
        }\
      '}</style>

      {/* Main Modal Wrapper */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden text-slate-900 border border-slate-300">
        
        {/* Screen Toolbar (Hidden in Print) */}
        <div className="print:hidden bg-slate-900 text-white p-4 flex items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="font-heading font-black text-sm text-white flex items-center gap-2">
                <span>مسير وقسيمة الراتب الرسمية A4 (النموذج البنكي والحكومي المعتمد)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  WPS Compliant ✓
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                الموظف: <strong className="text-white">{emp.full_name}</strong> (#{emp.employee_number}) • شهر: <strong className="text-emerald-300">{monthLabel}</strong> • (صفحة واحدة رسمية بدون جدول البصمات)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-5 rounded-xl gap-2 shadow-lg shadow-emerald-900/30"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة القسيمة الرسمية (A4)</span>
            </Button>
            {onClose && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 text-xs h-9 rounded-xl"
              >
                <X className="w-4 h-4 me-1" />
                إغلاق
              </Button>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            OFFICIAL BANKING & GOVERNMENT CERTIFIED A4 PAYSLIP SHEET
        ════════════════════════════════════════════════════════════════════ */}
        <div
          id="official-payslip-print-sheet"
          ref={printRef}
          className="p-7 sm:p-9 bg-white font-sans text-slate-900 leading-tight print-avoid-break"
          style={{ width: '100%', maxWidth: '210mm', margin: '0 auto' }}
        >
          
          {/* 1. OFFICIAL CORPORATE HEADER */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex items-start justify-between gap-4">
              
              {/* Right: Company Logo & Legal Name */}
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-xl border-2 border-slate-900 bg-slate-900 text-white flex items-center justify-center font-heading font-black text-2xl shadow-sm">
                  GA
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-heading font-black text-slate-950 tracking-tight">
                    {company.name_ar}
                  </h1>
                  <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wider font-semibold">
                    {company.name_en}
                  </p>
                  <div className="text-[9.5px] text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span>السجل التجاري: <strong className="font-mono text-slate-900">{company.cr_number}</strong></span>
                    <span>•</span>
                    <span>الرقم الضريبي: <strong className="font-mono text-slate-900">{company.tax_number}</strong></span>
                  </div>
                </div>
              </div>

              {/* Left: Document Metadata Box */}
              <div className="text-left border border-slate-300 rounded-xl p-2.5 bg-slate-50 text-[10px] space-y-1 min-w-[200px] shadow-sm">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-bold">رقم المسير:</span>
                  <span className="font-mono font-black text-slate-950">{payslipNumber}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-bold">الشهر المالي:</span>
                  <span className="font-bold text-emerald-800">{monthLabel}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-bold">تاريخ الإصدار:</span>
                  <span className="font-mono text-slate-800">{issueDate}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 border-t border-slate-200 pt-1">
                  <span className="font-bold">حالة الصرف:</span>
                  <span className="font-bold text-emerald-700">معتمد ومصرح ✓</span>
                </div>
              </div>

            </div>

            {/* Document Title Banner */}
            <div className="mt-3.5 pt-2 border-t border-slate-200 text-center">
              <h2 className="text-sm sm:text-base font-heading font-black text-slate-950 uppercase tracking-wide">
                مسير وقسيمة استحقاق وصرف راتب شهري معتمدة
              </h2>
              <span className="text-[10px] text-slate-500 font-mono block">
                OFFICIAL MONTHLY SALARY PAYSLIP & SETTLEMENT VOUCHER
              </span>
            </div>
          </div>

          {/* 2. EMPLOYEE IDENTIFICATION MATRIX */}
          <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/80 mb-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2.5 gap-x-4">
              
              <div>
                <span className="text-[10px] text-slate-600 block">اسم الموظف الرباعي:</span>
                <strong className="font-heading font-black text-slate-950 text-xs sm:text-sm block truncate">
                  {emp.full_name || '—'}
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-slate-600 block">الرقم الوظيفي:</span>
                <strong className="font-mono font-bold text-slate-900 text-xs">
                  #{emp.employee_number || emp.id || '—'}
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-slate-600 block">الهوية الوطنية / الإقامة:</span>
                <strong className="font-mono font-bold text-slate-900 text-xs">
                  {emp.national_id || emp.iqama_number || '—'}
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-slate-600 block">الجنسية:</span>
                <strong className="font-bold text-slate-900 text-xs">
                  {emp.nationality || 'سعودي'}
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-slate-600 block">المسمى الوظيفي:</span>
                <strong className="font-bold text-slate-900 text-xs">
                  {emp.job_title || 'موظف'}
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-slate-600 block">الفرع / الإدارة:</span>
                <strong className="font-bold text-slate-900 text-xs">
                  {emp.branch_name || emp.branch || 'الفرع الرئيسي'}
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-slate-600 block">نظام التأمينات (GOSI):</span>
                <strong className="font-bold text-xs text-emerald-800">
                  {isInsured ? 'مسجل ومؤمن (تحمل المنشأة)' : 'غير مسجل بالتأمينات'}
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-slate-600 block">الوردية المعتمدة:</span>
                <strong className="font-bold text-slate-900 text-xs truncate block">
                  {emp.shift || 'دوام رسمي'}
                </strong>
              </div>

            </div>
          </div>

          {/* 3. DUAL BALANCED FINANCIAL TABLE (EARNINGS VS DEDUCTIONS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
            
            {/* ─── EARNINGS COLUMN (المستحقات والبدلات) ─── */}
            <div className="border border-emerald-300 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="bg-emerald-700 text-white px-3.5 py-2 text-xs font-heading font-black flex items-center justify-between">
                  <span>المستحقات والبدلات (Earnings)</span>
                  <span className="text-[10px] font-mono opacity-90">+SAR</span>
                </div>

                <div className="divide-y divide-slate-100 text-[11px]">
                  
                  {/* Basic Salary */}
                  <div className="flex items-center justify-between p-2 hover:bg-slate-50">
                    <span className="font-bold text-slate-800">الراتب الأساسي التعاقدي</span>
                    <span className="font-mono font-black text-slate-900">{fmtSAR(basicSalary)} ر.س</span>
                  </div>

                  {/* Housing Allowance */}
                  <div className="flex items-center justify-between p-2 hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-800">بدل السكن الشهري</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">{fmtSAR(housing)} ر.س</span>
                  </div>

                  {/* Transport Allowance */}
                  <div className="flex items-center justify-between p-2 hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-800">بدل الانتقال والمواصلات</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">{fmtSAR(transport)} ر.س</span>
                  </div>

                  {/* Friday Allowance */}
                  {fridayAllowance > 0 && (
                    <div className="flex items-center justify-between p-2 bg-emerald-50/40">
                      <div>
                        <span className="font-bold text-slate-800">بدل حضور الجمعات</span>
                        <span className="text-[9.5px] text-muted-foreground block">{fridayNote}</span>
                      </div>
                      <span className="font-mono font-black text-emerald-700">+{fmtSAR(fridayAllowance)} ر.س</span>
                    </div>
                  )}

                  {/* Daily Overtime */}
                  {dailyOvertimeAllowance > 0 && (
                    <div className="flex items-center justify-between p-2 bg-emerald-50/40">
                      <div>
                        <span className="font-bold text-slate-800">إضافي ساعات الدوام التراكمية</span>
                        <span className="text-[9.5px] text-muted-foreground block">{dailyOvertimeNote}</span>
                      </div>
                      <span className="font-mono font-black text-emerald-700">+{fmtSAR(dailyOvertimeAllowance)} ر.س</span>
                    </div>
                  )}

                  {/* Custom Bonuses */}
                  {approvedBonuses.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-2 bg-emerald-50/40">
                      <div>
                        <span className="font-bold text-slate-800">مكافأة: {b.title || b.reason}</span>
                      </div>
                      <span className="font-mono font-black text-emerald-700">+{fmtSAR(b.amount)} ر.س</span>
                    </div>
                  ))}

                </div>
              </div>

              {/* Earnings Total */}
              <div className="bg-emerald-50 border-t-2 border-emerald-300 p-2.5 flex items-center justify-between font-heading font-black text-xs text-emerald-950">
                <span>إجمالي المستحقات والبدلات (Gross):</span>
                <span className="font-mono text-sm text-emerald-800">{fmtSAR(basicSalary + totalAdditions)} ر.س</span>
              </div>
            </div>

            {/* ─── DEDUCTIONS COLUMN (الاستقطاعات والخصومات) ─── */}
            <div className="border border-rose-300 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="bg-rose-700 text-white px-3.5 py-2 text-xs font-heading font-black flex items-center justify-between">
                  <span>الاستقطاعات والخصومات (Deductions)</span>
                  <span className="text-[10px] font-mono opacity-90">-SAR</span>
                </div>

                <div className="divide-y divide-slate-100 text-[11px]">
                  
                  {/* GOSI Social Insurance */}
                  <div className="flex items-center justify-between p-2 hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-800">التأمينات الاجتماعية (GOSI)</span>
                      <span className="text-[9.5px] text-emerald-600 block">تحمل المنشأة بالكامل 100% (0% على الموظف) ✓</span>
                    </div>
                    <span className="font-mono font-bold text-slate-600">0.00 ر.س</span>
                  </div>

                  {/* Advance Installment */}
                  {advanceInstallment > 0 && (
                    <div className="flex items-center justify-between p-2 bg-rose-50/40">
                      <div>
                        <span className="font-bold text-rose-900">استقطاع قسط سلفة معتمدة</span>
                        <span className="text-[9.5px] text-rose-700 block">
                          {advanceNote || 'خصم القسط الشهري المعتمد'} • متبقي: {fmtSAR(advanceRemaining)} ر.س
                        </span>
                      </div>
                      <span className="font-mono font-black text-rose-700">-{fmtSAR(advanceInstallment)} ر.س</span>
                    </div>
                  )}

                  {/* Shortfall Deduction */}
                  {approvedShortfallDeduction > 0 && (
                    <div className="flex items-center justify-between p-2 bg-rose-50/40">
                      <div>
                        <span className="font-bold text-rose-900">خصم ساعات العجز والغياب</span>
                        <span className="text-[9.5px] text-rose-700 block">
                          عجز {formatHours(shortfallHours)} • معدل: {fmtSAR(hourlyRate)} ر.س/ساعة
                        </span>
                      </div>
                      <span className="font-mono font-black text-rose-700">-{fmtSAR(approvedShortfallDeduction)} ر.س</span>
                    </div>
                  )}

                  {/* Custom Penalties */}
                  {approvedPenalties.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 bg-rose-50/40">
                      <div>
                        <span className="font-bold text-rose-900">جزاء إداري: {p.title || p.reason}</span>
                      </div>
                      <span className="font-mono font-black text-rose-700">-{fmtSAR(p.amount)} ر.س</span>
                    </div>
                  ))}

                  {/* If no deductions */}
                  {advanceInstallment === 0 && approvedShortfallDeduction === 0 && approvedPenalties.length === 0 && (
                    <div className="p-3 text-center text-slate-400 text-xs">
                      لا توجد استقطاعات أو جزاءات على الموظف لهذا الشهر ✓
                    </div>
                  )}

                </div>
              </div>

              {/* Deductions Total */}
              <div className="bg-rose-50 border-t-2 border-rose-300 p-2.5 flex items-center justify-between font-heading font-black text-xs text-rose-950">
                <span>إجمالي الاستقطاعات والخصومات:</span>
                <span className="font-mono text-sm text-rose-800">-{fmtSAR(totalDeductions)} ر.س</span>
              </div>
            </div>

          </div>

          {/* 4. NET PAYABLE SALARY BANNER (BANKING GRADE) */}
          <div className="bg-gradient-to-l from-slate-950 via-slate-900 to-emerald-950 text-white rounded-xl p-4 mb-4 shadow-md border border-emerald-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-heading font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>إجمالي صافي الراتب المستحق للصرف (Net Payable Salary)</span>
                </div>
                <div className="text-[11.5px] text-slate-200 mt-1 font-semibold">
                  المبلغ بالحروف: <strong className="text-white underline">{tafqeetSAR(netSalary)}</strong>
                </div>
              </div>

              <div className="text-left">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-300">
                  {fmtSAR(netSalary)} <span className="text-xs font-sans text-slate-200">ريال سعودي (SAR)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. OFFICIAL DISBURSEMENT BREAKDOWN (BANK VS CASH) */}
          <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50 mb-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
              <span className="font-heading font-black text-slate-900 text-xs flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>طريقة استلام وصرف الراتب وتوزيع المستحقات المالية:</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border text-slate-700">
                {effectivePayoutMethod === 'split_bank_cash' ? 'تحويل بنكي جزئي + تسليم نقدي كاش 🔀' : effectivePayoutMethod === 'cash_full' ? 'تسليم نقدي كامل (كاش) 💵' : 'تحويل بنكي كامل (WPS) 🏦'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Bank Portion */}
              {(effectiveBankAmount > 0 || effectivePayoutMethod === 'bank_full') && (
                <div className="bg-white border border-blue-200 rounded-lg p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-900">🏦 المحول عبر الحساب البنكي (WPS):</span>
                    <strong className="font-mono text-sm text-blue-950 font-black">{fmtSAR(effectiveBankAmount)} ر.س</strong>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-1 flex items-center justify-between">
                    <span>البنك: <strong>{emp.bank_name || 'مصرف الإنماء'}</strong></span>
                    <span className="font-mono">IBAN: <strong>{emp.iban || 'SA4480000000000000000000'}</strong></span>
                  </div>
                </div>
              )}

              {/* Cash Portion */}
              {(effectiveCashAmount > 0 || effectivePayoutMethod === 'cash_full') && (
                <div className="bg-white border border-rose-200 rounded-lg p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-900">💵 المسلم نقداً من الخزينة (كاش):</span>
                    <strong className="font-mono text-sm text-rose-950 font-black">{fmtSAR(effectiveCashAmount)} ر.س</strong>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-1">
                    طريقة الصرف: سند صرف نقدي بموجب توقيع واستلام الموظف أدناه
                  </div>
                </div>
              )}

            </div>

            {/* Cash Handout Signature Undertaking */}
            {effectiveCashAmount > 0 && (
              <div className="mt-2.5 p-2 bg-amber-50 border border-dashed border-amber-300 rounded-lg text-[10.5px] text-amber-950 flex items-center justify-between">
                <span>إقرار استلام الكاش: أقر أنا الموظف الموقع أدناه باستلام مبلغ ({fmtSAR(effectiveCashAmount)} ر.س) نقداً من خزينة المنشأة عن شهر {monthLabel}.</span>
                <span className="font-bold underline">توقيع الاستلام: ....................</span>
              </div>
            )}
          </div>

          {/* 6. OFFICIAL FOUR-TIER SIGNATURES & COMPANY STAMP (STRICT A4 FOOTER) */}
          <div className="grid grid-cols-4 gap-2.5 text-center text-xs pt-1 border-t-2 border-slate-900">
            
            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
              <div className="font-bold text-[10px] text-slate-600 mb-5">إعداد وتدقيق الموارد البشرية</div>
              <div className="border-t border-dashed border-slate-400 pt-1 text-[9.5px] font-bold text-slate-800">
                يحيى محمد عبدالغفار باشا
              </div>
            </div>

            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
              <div className="font-bold text-[10px] text-slate-600 mb-5">تدقيق وترحيل الحسابات</div>
              <div className="border-t border-dashed border-slate-400 pt-1 text-[9.5px] font-bold text-slate-800">
                هشام ابوالفضل زغلول
              </div>
            </div>

            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
              <div className="font-bold text-[10px] text-slate-600 mb-5">اعتماد ومصادقة المدير العام</div>
              <div className="border-t border-dashed border-slate-400 pt-1 text-[9.5px] font-bold text-slate-800">
                فهد ناصر محمد الجوعي
              </div>
            </div>

            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
              <div className="font-bold text-[10px] text-slate-600 mb-5">توقيع واستلام الموظف / الختم</div>
              <div className="border-t border-dashed border-slate-400 pt-1 text-[9.5px] font-bold text-slate-800">
                {emp.full_name?.split(' ')[0] || 'الموظف المستلم'}
              </div>
            </div>

          </div>

          {/* Document Legal Footer */}
          <div className="mt-3 text-center text-[9px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-200 pt-2">
            <span>منظومة Green Arrow HR • وثيقة مسير مالي رسمية معتمدة وفق متطلبات وزارة الموارد البشرية ونظام حماية الأجور (WPS)</span>
            <span className="font-bold">الصفحة 1 من 1 (A4)</span>
          </div>

        </div>

      </div>

    </div>
  );
}
