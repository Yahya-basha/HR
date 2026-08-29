import { useState } from 'react';
import { 
  Printer, 
  X, 
  Building2, 
  Calendar, 
  User, 
  DollarSign, 
  FileText,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

function tafqeetRiyals(amount) {
  const num = Math.floor(Number(amount) || 0);
  if (num <= 0) return 'صفر ريال سعودي';
  
  if (num === 1000) return 'فقط ألف ريال سعودي لا غير';
  if (num === 2000) return 'فقط ألفان ريال سعودي لا غير';
  if (num === 500) return 'فقط خمسمائة ريال سعودي لا غير';
  if (num === 1500) return 'فقط ألف وخمسمائة ريال سعودي لا غير';
  if (num === 2500) return 'فقط ألفان وخمسمائة ريال سعودي لا غير';
  if (num === 3000) return 'فقط ثلاثة آلاف ريال سعودي لا غير';
  if (num === 4000) return 'فقط أربعة آلاف ريال سعودي لا غير';
  if (num === 5000) return 'فقط خمسة آلاف ريال سعودي لا غير';

  return `فقط ${num.toLocaleString('ar-SA')} ريال سعودي لا غير`;
}

export default function AdvanceVoucherA4Modal({ open, onOpenChange, advance, employee }) {
  if (!advance) return null;

  const voucherNumber = advance.voucher_number || `VCH-ADV-2026-${String(advance.id || '').replace(/[^0-9]/g, '').slice(-3) || '001'}`;
  const empName = employee?.full_name || advance.employee_name || 'الموظف';
  const empNum = employee?.employee_number || advance.employee_number || '1000';
  const empBranch = employee?.branch_name || employee?.branch || advance.branch || 'مكتب الإدارة';
  const empJob = employee?.job_title || advance.job_title || 'موظف';
  const empNatId = employee?.national_id || advance.national_id || '—';
  const empSalary = employee?.salary ? `${Number(employee.salary).toLocaleString('en-US')} ر.س` : '—';
  
  const totalAmount = Number(advance.total_amount || advance.amount || 0);
  const installmentsCount = Number(advance.total_installments || advance.installments || 1);
  const monthlyInstallment = Number(advance.monthly_installment || Math.round(totalAmount / (installmentsCount || 1)));
  const startMonth = advance.start_month || '2026-09';
  const previousBalance = Number(advance.previous_balance || 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-950 border-border print:border-none print:shadow-none print:max-w-none print:m-0 print:p-0" dir="rtl">
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm text-white">
                معاينة وطباعة سند صرف سلفة مالية معتمد (A4)
              </h3>
              <p className="text-[11px] text-slate-400">
                رقم السند: <span className="font-mono text-emerald-400 font-bold">{voucherNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold gap-1.5 h-9 px-4 shadow-lg shadow-emerald-600/30"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة السند الرسمي A4</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold h-9"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ─── A4 PAPER CONTAINER ─────────────────────────────────────────── */}
        <div className="p-4 sm:p-8 max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
          
          <div 
            id="a4-advance-voucher-sheet"
            className="w-full max-w-[210mm] mx-auto bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-2xl border border-slate-300 font-sans text-xs print:shadow-none print:rounded-none print:border-none print:p-8 print:max-w-none relative"
            style={{ minHeight: '270mm' }}
          >
            {/* Watermark in background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
              <span className="text-[120px] font-black tracking-widest uppercase">GREEN ARROW</span>
            </div>

            {/* 1. OFFICIAL CORPORATE HEADER */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5 mb-6">
              <div className="text-right space-y-1">
                <h2 className="font-heading font-black text-base text-slate-950">
                  درة السيارة لقطع غيار السيارات
                </h2>
                <p className="text-[11px] text-slate-600 font-bold">
                  DORAT AL-SAYARAH AUTO SPARE PARTS
                </p>
                <p className="text-[10px] text-slate-500">
                  منظومة الموارد البشرية والشؤون المالية والإدارية (Green Arrow HR)
                </p>
              </div>

              <div className="text-center px-4 py-2 bg-slate-900 text-white rounded-2xl shadow-sm">
                <div className="font-heading font-black text-sm tracking-wide">
                  سند صرف سلفة موظف
                </div>
                <div className="text-[10px] font-mono text-emerald-300 font-bold mt-0.5" dir="ltr">
                  ADVANCE DISBURSEMENT VOUCHER
                </div>
              </div>

              <div className="text-left space-y-1 font-mono text-[11px]" dir="ltr">
                <div><strong className="text-slate-900 font-sans">No:</strong> <span className="font-bold text-rose-600">{voucherNumber}</span></div>
                <div><strong className="text-slate-900 font-sans">Date:</strong> {advance.disbursement_date || new Date().toISOString().split('T')[0]}</div>
                <div><strong className="text-slate-900 font-sans">Hijri:</strong> 1448/03/17 هـ</div>
              </div>
            </div>

            {/* 2. EMPLOYEE INFORMATION BOX */}
            <div className="mb-5 bg-slate-50 rounded-2xl p-4 border border-slate-300">
              <h4 className="font-heading font-bold text-xs text-slate-900 mb-3 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>أولاً: بيانات الموظف المستفيد من السلفة</span>
              </h4>

              <div className="grid grid-cols-3 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-500 font-bold">اسم الموظف: </span>
                  <strong className="text-slate-950 font-heading">{empName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">الرقم الوظيفي: </span>
                  <strong className="font-mono text-slate-950">#{empNum}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">رقم الهوية / الإقامة: </span>
                  <strong className="font-mono text-slate-950">{empNatId}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">المسمى الوظيفي: </span>
                  <strong className="text-slate-900">{empJob}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">الفرع المعتمد: </span>
                  <strong className="text-slate-900">{empBranch}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">الراتب الأساسي: </span>
                  <strong className="font-mono text-slate-900">{empSalary}</strong>
                </div>
              </div>
            </div>

            {/* 3. ADVANCE & DISBURSEMENT DETAILS */}
            <div className="mb-5 bg-slate-50 rounded-2xl p-4 border border-slate-300">
              <h4 className="font-heading font-bold text-xs text-slate-900 mb-3 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>ثانياً: تفاصيل السلفة المعتمدة وطريقة السداد</span>
              </h4>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-slate-500 text-[10px] font-bold">مبلغ السلفة المعتمد:</div>
                  <div className="text-lg font-mono font-black text-emerald-700 mt-0.5">
                    {totalAmount.toLocaleString('en-US')} <span className="text-xs font-sans font-bold">ريال سعودي</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 mt-1 border-t border-slate-100 pt-1">
                    {tafqeetRiyals(totalAmount)}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-slate-500 text-[10px] font-bold">طريقة الاستقطاع والسداد:</div>
                  <div className="text-xs font-bold text-slate-900 mt-1 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">عدد الأقساط:</span>
                      <span className="font-mono font-black">{installmentsCount} {installmentsCount === 1 ? 'دفعة واحدة' : 'أقساط شهرية'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">قيمة القسط الشهري:</span>
                      <span className="font-mono font-black text-rose-600">{monthlyInstallment.toLocaleString('en-US')} ر.س / شهر</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">بدء الاستقطاع من مسير:</span>
                      <span className="font-mono font-bold text-slate-800">شهر ({startMonth})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-[11px]">
                <span className="text-slate-500 font-bold">الغرض من السلفة / السبب: </span>
                <span className="text-slate-900 font-medium">{advance.reason || 'سلفة شخصية طارئة بناءً على طلب الموظف'}</span>
              </div>

              {/* Previous Active Balance Check */}
              {previousBalance > 0 && (
                <div className="mt-2.5 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-[11px]">
                  <span className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>تنبيه المحاسبة: رصيد سلف سابقة غير مسددة على الموظف:</span>
                  </span>
                  <span className="font-mono font-black text-amber-950">{previousBalance.toLocaleString('en-US')} ر.س</span>
                </div>
              )}
            </div>

            {/* 4. INSTALLMENTS SCHEDULE BREAKDOWN */}
            <div className="mb-5">
              <h4 className="font-heading font-bold text-xs text-slate-900 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>ثالثاً: جدول استقطاع الأقساط من الرواتب الشهرية</span>
              </h4>

              <table className="w-full border-collapse border border-slate-300 text-center text-[11px]">
                <thead>
                  <tr className="bg-slate-100 font-heading font-bold text-slate-900">
                    <th className="border border-slate-300 py-1.5 px-2">الدفعة #</th>
                    <th className="border border-slate-300 py-1.5 px-3">شهر الاستقطاع</th>
                    <th className="border border-slate-300 py-1.5 px-3">مبلغ القسط المستقطع</th>
                    <th className="border border-slate-300 py-1.5 px-3">الرصيد المتبقي بعد الخصم</th>
                    <th className="border border-slate-300 py-1.5 px-3">حالة السداد</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.min(installmentsCount, 12) }).map((_, idx) => {
                    const instNum = idx + 1;
                    const remAfter = Math.max(0, totalAmount - (monthlyInstallment * instNum));
                    
                    const parts = startMonth.split('-');
                    let yr = parseInt(parts[0] || '2026', 10);
                    let mo = parseInt(parts[1] || '8', 10) + idx;
                    while (mo > 12) { mo -= 12; yr += 1; }
                    const mStr = `${yr}-${String(mo).padStart(2, '0')}`;

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="border border-slate-300 py-1 font-mono font-bold">{instNum}</td>
                        <td className="border border-slate-300 py-1 font-mono font-bold text-slate-700">{mStr}</td>
                        <td className="border border-slate-300 py-1 font-mono font-black text-rose-700">{monthlyInstallment.toLocaleString('en-US')} ر.س</td>
                        <td className="border border-slate-300 py-1 font-mono font-bold text-slate-600">{remAfter.toLocaleString('en-US')} ر.س</td>
                        <td className="border border-slate-300 py-1 font-sans text-slate-500 font-medium">
                          {idx === 0 && advance.paid_installments > 0 ? 'مسدد ✓' : 'مجدول بالمسير'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 5. LEGAL UNDERTAKING & EMPLOYEE ACKNOWLEDGEMENT */}
            <div className="mb-6 p-3.5 bg-slate-50 rounded-2xl border border-slate-300 text-[10px] leading-relaxed text-slate-700">
              <h5 className="font-bold text-slate-900 mb-1">إقرار وتعهد باستلام السلفة وتفويض بالخصم:</h5>
              <p>
                أقر أنا الموظف الموضح بياناتي أعلاه بأنني قد استلمت مبلغ السلفة المذكور وقدره ({totalAmount.toLocaleString('en-US')} ريال سعودي)، وأفوض إدارة المنشأة بتفويض رسمي غير قابل للإلغاء باستقطاع الأقساط المحددة شهرياً من راتبي ومستحقاتي حتى السداد التام، وفي حال انتهاء خدماتي لأي سبب قبل اكتمال السداد، يحق للمنشأة حسم كامل الرصيد المتبقي دفعة واحدة من مكافأة نهاية الخدمة وأي مستحقات نهائية لي.
              </p>
            </div>

            {/* 6. TRIPLE AUTHORIZATION SIGNATURES */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-slate-900 text-center text-xs">
              
              <div className="space-y-6">
                <div className="font-heading font-bold text-slate-900">
                  توقيع الموظف المستلم (المقترض)
                </div>
                <div className="h-10 border-b border-dashed border-slate-400 mx-4"></div>
                <div className="text-[10px] text-slate-500 font-mono">
                  التاريخ: {advance.disbursement_date || new Date().toISOString().split('T')[0]}
                </div>
              </div>

              <div className="space-y-6">
                <div className="font-heading font-bold text-slate-900">
                  المحاسب المالي (الصرف والجدولة)
                </div>
                <div className="font-bold text-[11px] text-slate-800">
                  هشام ابوالفضل زغلول
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  الختم والاعتماد المالي ✓
                </div>
              </div>

              <div className="space-y-6">
                <div className="font-heading font-bold text-slate-900">
                  اعتماد المدير العام
                </div>
                <div className="font-bold text-[11px] text-slate-800">
                  فهد ناصر محمد الجوعي
                </div>
                <div className="text-[10px] font-bold text-emerald-700 font-mono">
                  معتمد رسمياً (Approved) ✓
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="mt-8 pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-mono" dir="ltr">
              <span>SYSTEM-GENERATED FINANCIAL RECORD • GREEN ARROW HR ENTERPRISE</span>
              <span>VERIFIED: {voucherNumber}</span>
            </div>

          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}
