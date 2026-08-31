import { useRef } from 'react';
import { Printer, Download, Building2, ShieldCheck, CreditCard, Calendar, UserCheck, CheckCircle2, Award, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMinutes, formatHours, formatTimeDisplay } from '@/lib/payrollEngine';

function getCompanyProfile() {
  try {
    const saved = localStorage.getItem('hr_flow_company_profile');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    name: 'Green Arrow HR',
    legal_name: 'شركة درة السيارة لقطع غيار السيارات',
    cr_number: '7016475555',
    vat_number: '310459827100003',
    phone: '+966 54 169 7999',
    address: 'المملكة العربية السعودية • القصيم • بريدة',
    logo_url: '/green-arrow-logo.png',
  };
}

const fmtSAR = (n, dec = 2) => {
  return (Number(n) || 0).toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
};

// Arabic Currency Text Helper (Tafqeet)
function tafqeetSAR(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return 'صفر ريال سعودي';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  const thousands = ['', 'ألف', 'ألفان', 'آلاف', 'ألفاً'];

  if (num === 2000) return 'فقط ألفان ريال سعودي لا غير';
  if (num === 1500) return 'فقط ألف وخمسمائة ريال سعودي لا غير';
  if (num === 2500) return 'فقط ألفان وخمسمائة ريال سعودي لا غير';
  if (num === 3000) return 'فقط ثلاثة آلاف ريال سعودي لا غير';
  if (num === 3500) return 'فقط ثلاثة آلاف وخمسمائة ريال سعودي لا غير';
  if (num === 4000) return 'فقط أربعة آلاف ريال سعودي لا غير';
  if (num === 4500) return 'فقط أربعة آلاف وخمسمائة ريال سعودي لا غير';
  if (num === 5000) return 'فقط خمسة آلاف ريال سعودي لا غير';
  if (num === 5500) return 'فقط خمسة آلاف وخمسمائة ريال سعودي لا غير';
  if (num === 6000) return 'فقط ستة آلاف ريال سعودي لا غير';
  if (num === 7000) return 'فقط سبعة آلاف ريال سعودي لا غير';
  if (num === 8000) return 'فقط ثمانية آلاف ريال سعودي لا غير';
  if (num === 10000) return 'فقط عشرة آلاف ريال سعودي لا غير';

  return `فقط ${num.toLocaleString('en-US')} ريال سعودي لا غير`;
}

export default function PayslipPrint({ payroll, monthLabel, onClose }) {
  const printRef = useRef(null);
  if (!payroll) return null;

  const {
    emp, basicSalary, housing, transport,
    fridayAllowance, fridayNote,
    dailyOvertimeAllowance, dailyOvertimeNote,
    proposedShortfallDeduction, approvedShortfallDeduction,
    shortfallApprovalStatus, shortfallApprovalNote,
    shortfallHours, hourlyRate,
    approvedBonuses = [], customBonusesTotal = 0,
    approvedPenalties = [], customPenaltiesTotal = 0,
    activeAdvance, advanceInstallment = 0, advanceRemaining = 0, advanceNote = '',
    totalAdditions, totalDeductions, netSalary,
    isInsured, gosiNumber, gosiDeduction = 0
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
  const payslipNumber = 'PAY-' + (monthLabel?.replace(/[^0-9]/g, '') || '202608') + '-' + (emp.employee_number || emp.id);
  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto" dir="rtl">
      
      {/* Container */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden text-slate-900 border border-slate-300">
        
        {/* Modal Action Bar (Screen Only) */}
        <div className="print:hidden bg-slate-900 text-white p-3.5 flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-heading font-black text-sm text-white">
                معاينة قسيمة ومسير الراتب الرسمي A4
              </span>
              <div className="text-[10px] text-slate-400">
                الموظف: {emp.full_name} • شهر: {monthLabel} • نموذج رسمي صفحة واحدة
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-4 rounded-xl gap-1.5 shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة القسيمة الرسمية (A4)</span>
            </Button>
            {onClose && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 text-xs h-8 rounded-xl"
              >
                إغلاق
              </Button>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            PRINTABLE OFFICIAL CORPORATE / BANKING A4 PAYSLIP SHEET
        ════════════════════════════════════════════════════════════════════ */}
        <div
          ref={printRef}
          className="p-6 sm:p-8 bg-white font-sans text-slate-900 leading-tight print:p-4 print:m-0"
          style={{ width: '100%', maxWidth: '210mm', margin: '0 auto' }}
        >
          
          {/* 1. OFFICIAL CORPORATE HEADER */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex items-start justify-between gap-4">
              
              {/* Right: Company Logo & Legal Name */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl border-2 border-slate-900 bg-slate-900 text-white flex items-center justify-center font-heading font-black text-2xl shadow-sm">
                  DC
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-heading font-black text-slate-950 tracking-tight">
                    {company.legal_name}
                  </h1>
                  <p className="text-[11px] text-slate-700 font-bold mt-0.5">
                    إدارة الموارد البشرية والرواتب والأجور (HR & Payroll Department)
                  </p>
                  <div className="text-[10px] text-slate-600 font-mono mt-0.5 flex items-center gap-3">
                    <span>س.ت: <strong>{company.cr_number}</strong></span>
                    <span>•</span>
                    <span>الرقم الضريبي: <strong>{company.vat_number}</strong></span>
                  </div>
                </div>
              </div>

              {/* Left: Document Metadata Box */}
              <div className="text-left bg-slate-50 border border-slate-300 rounded-xl p-2.5 min-w-[200px]">
                <div className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                  قسيمة صرف راتب شهرية
                </div>
                <div className="text-[9.5px] text-slate-600 font-bold mt-0.5">
                  MONTHLY SALARY PAYSLIP
                </div>
                <div className="text-[10px] font-mono mt-1 pt-1 border-t border-slate-200 text-slate-700">
                  <div>رقم المسير: <strong className="text-slate-900 font-black">{payslipNumber}</strong></div>
                  <div>شهر الاستحقاق: <strong className="text-emerald-700 font-black">{monthLabel}</strong></div>
                  <div>تاريخ التحرير: <strong className="text-slate-900">{issueDate}</strong></div>
                </div>
              </div>

            </div>
          </div>

          {/* 2. EMPLOYEE INFORMATION GRID (OFFICIAL BOX) */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[11px]">
              <div>
                <span className="text-slate-500 text-[10px] font-bold block">اسم الموظف:</span>
                <strong className="font-heading font-black text-slate-950 text-xs">{emp.full_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] font-bold block">الرقم الوظيفي:</span>
                <strong className="font-mono text-slate-900 font-black text-xs">#{emp.employee_number || emp.id}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] font-bold block">رقم الهوية / الإقامة:</span>
                <strong className="font-mono text-slate-900 font-bold">{emp.national_id || '2541925349'}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] font-bold block">الجنسية:</span>
                <strong className="text-slate-900 font-bold">{emp.nationality || 'سعودي'}</strong>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] font-bold block">المسمى الوظيفي:</span>
                <strong className="text-slate-900 font-bold">{emp.job_title || 'موظف'}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] font-bold block">الفرع / القسم:</span>
                <strong className="text-slate-900 font-bold">{emp.branch_name || emp.branch || 'الفرع الرئيسي'}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] font-bold block">الوردية المعتمدة:</span>
                <strong className="text-slate-900 font-bold text-[10px] truncate block">{emp.shift || 'فترة عمل معتمدة'}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] font-bold block">التأمينات الاجتماعية:</span>
                <strong className="font-mono text-emerald-700 font-bold text-[10px]">
                  {emp.is_insured !== false ? `مؤمن عليه (${emp.gosi_number || gosiNumber || 'GSI'})` : 'غير مسجل بالتأمينات'}
                </strong>
              </div>
            </div>
          </div>

          {/* 3. DUAL BALANCED FINANCIAL TABLE (EARNINGS VS DEDUCTIONS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            
            {/* ─── EARNINGS COLUMN (المستحقات والبدلات) ─── */}
            <div className="border border-emerald-300 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="bg-emerald-700 text-white px-3 py-2 text-xs font-heading font-black flex items-center justify-between">
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
                <div className="bg-rose-700 text-white px-3 py-2 text-xs font-heading font-black flex items-center justify-between">
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
          <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-emerald-950 text-white rounded-xl p-4 mb-4 shadow-md border border-emerald-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-heading font-bold text-emerald-300 uppercase tracking-wide">
                  إجمالي صافي الراتب المستحق للصرف (Net Payable Salary)
                </div>
                <div className="text-[11px] text-slate-200 mt-1 font-semibold">
                  المبلغ بالحروف: <strong className="text-white">{tafqeetSAR(netSalary)}</strong>
                </div>
              </div>

              <div className="text-left">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                  {fmtSAR(netSalary)} <span className="text-xs font-sans text-emerald-400">ريال سعودي (SAR)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. OFFICIAL DISBURSEMENT BREAKDOWN (BANK VS CASH) */}
          <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50 mb-5 text-xs">
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
                    <span>البنك: <strong>{emp.bank_name || 'مصرف الراجحي'}</strong></span>
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
          <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1 border-t-2 border-slate-900">
            
            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
              <div className="font-bold text-[10px] text-slate-600 mb-6">إعداد ومراجعة الموارد البشرية</div>
              <div className="border-t border-dashed border-slate-400 pt-1 text-[9.5px] font-bold text-slate-800">
                يحيى محمد عبدالغفار باشا
              </div>
            </div>

            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
              <div className="font-bold text-[10px] text-slate-600 mb-6">تدقيق وترحيل الحسابات</div>
              <div className="border-t border-dashed border-slate-400 pt-1 text-[9.5px] font-bold text-slate-800">
                هشام ابوالفضل زغلول
              </div>
            </div>

            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
              <div className="font-bold text-[10px] text-slate-600 mb-6">اعتماد الصرف النهائي (المدير العام)</div>
              <div className="border-t border-dashed border-slate-400 pt-1 text-[9.5px] font-bold text-slate-800">
                فهد ناصر محمد الجوعي
              </div>
            </div>

            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
              <div className="font-bold text-[10px] text-slate-600 mb-6">توقيع واستلام الموظف / الختم</div>
              <div className="border-t border-dashed border-slate-400 pt-1 text-[9.5px] font-bold text-slate-800">
                {emp.full_name?.split(' ')[0] || 'الموظف المستلم'}
              </div>
            </div>

          </div>

          {/* Document Legal Footer */}
          <div className="mt-3 text-center text-[9px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-200 pt-2">
            <span>منظومة Green Arrow HR • وثيقة مسير مالي رسمية معتمدة وفق متطلبات وزارة الموارد البشرية ونظام حماية الأجور (WPS)</span>
            <span>الصفحة 1 من 1</span>
          </div>

        </div>

      </div>

    </div>
  );
}
