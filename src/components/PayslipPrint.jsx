import { useRef } from 'react';
import { Printer, FileDown, Building2, User, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTimeDisplay, formatMinutes, formatHours } from '@/lib/payrollEngine';

// Company profile from localStorage
function getCompanyProfile() {
  try {
    const saved = localStorage.getItem('hr_flow_company_profile');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    name: 'Green Arrow HR',
    legal_name: 'شركة درة السيارة لقطع غيار السيارات',
    cr_number: '7016475555',
    phone: '+966541697999',
    address: 'المملكة العربية السعودية',
    logo_url: '/green-arrow-logo.png',
  };
}

// Clean English/Western numerals for currency
const fmtSAR = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function PayslipPrint({ payrollResult, month }) {
  const printRef = useRef(null);
  if (!payrollResult) return null;

  const company = getCompanyProfile();
  const {
    emp, shiftName, shiftHours,
    dailyDetails, presentDays, absentDays, leaveDays, fridayDays,
    totalRequiredMinutes, totalActualMinutes, totalShortfallMinutes, shortfallHours,
    hourlyRate, basicSalary, housing, transport,
    fridayAllowance, fridayNote, fridayDailyRate,
    dailyOvertimeAllowance, dailyOvertimeNote,
    totalAdditions, gosiDeduction,
    proposedShortfallDeduction, approvedShortfallDeduction,
    shortfallApprovalStatus, shortfallApprovalNote,
    totalDeductions, netSalary,
  } = payrollResult;

  const payslipNumber = 'PS-' + (emp.employee_number || '0000') + '-' + (month || '').replace('-', '');
  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const monthLabel = (() => {
    if (!month) return '';
    const [y, m] = month.split('-');
    const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return (months[parseInt(m,10)-1] || '') + ' ' + y;
  })();

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>قسيمة راتب — ${emp.full_name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap');
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Cairo',Arial,sans-serif; direction:rtl; font-size:12px; color:#1a1a1a; background:#fff; }
          .font-mono { font-family:'JetBrains Mono',monospace; }
          .payslip-body { width:210mm; min-height:297mm; padding:12mm 10mm; margin:0 auto; }
          table { width:100%; border-collapse:collapse; }
          table th, table td { padding:6px 10px; }
          .section-title { font-size:11px; font-weight:800; color:#065f46; background:#ecfdf5; padding:6px 12px; border-right:4px solid #10b981; margin-bottom:4px; }
          .total-row td { font-weight:800; background:#f0fdf4; border-top:2px solid #10b981; }
          .sig-box { border:1px solid #d1d5db; border-radius:8px; padding:12px; text-align:center; }
          @media print { 
            body { margin:0; } 
            .no-print { display:none !important; }
            .payslip-body { padding:8mm; }
          }
        </style>
      </head>
      <body>${printContents}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); win.close(); }, 500);
  };

  const handleExportPDF = async () => {
    handlePrint();
  };

  const approvalStatusLabel = {
    pending: 'قيد المراجعة',
    approved: 'معتمد',
    rejected: 'مرفوض / معفى',
    modified: 'معتمد بتعديل',
  }[shortfallApprovalStatus] || shortfallApprovalStatus;

  return (
    <div className="space-y-4" dir="rtl">
      
      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 no-print">
        <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white gap-2 font-bold rounded-xl shadow-sm text-xs">
          <Printer className="w-4 h-4" /> طباعة القسيمة A4
        </Button>
        <Button onClick={handleExportPDF} variant="outline" className="border-emerald-500/60 text-emerald-700 hover:bg-emerald-50 gap-2 font-bold rounded-xl text-xs">
          <FileDown className="w-4 h-4" /> تصدير PDF
        </Button>
      </div>

      {/* A4 Payslip Container */}
      <div
        ref={printRef}
        className="payslip-body bg-white border border-border/60 shadow-xl rounded-2xl overflow-hidden"
        style={{ width: '100%', maxWidth: '794px', margin: '0 auto', fontFamily: 'Cairo, Arial, sans-serif', direction: 'rtl' }}
      >
        {/* ─── HEADER ─────────────────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg, #065f46, #047857)', padding: '20px 24px', color: '#fff', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {company.logo_url && (
              <img src={company.logo_url} alt="logo" style={{ width: '50px', height: '50px', borderRadius: '8px', background: '#fff', objectFit: 'contain', padding: '4px' }} />
            )}
            <div>
              <div style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '-0.3px' }}>{company.legal_name}</div>
              <div style={{ fontSize: '11px', opacity: '0.85', marginTop: '2px', fontFamily: 'monospace' }}>
                السجل: {company.cr_number} | هاتف: {company.phone}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '18px', fontWeight: '900' }}>قسيمة الراتب</div>
            <div style={{ fontSize: '11px', opacity: '0.9', marginTop: '4px', fontFamily: 'monospace' }}>رقم: {payslipNumber}</div>
            <div style={{ fontSize: '11px', opacity: '0.9' }}>شهر: {monthLabel}</div>
            <div style={{ fontSize: '10px', opacity: '0.7', fontFamily: 'monospace' }}>{issueDate}</div>
          </div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ─── EMPLOYEE INFO ───────────────────────────────────────────── */}
          <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 18px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: '800', color: '#065f46', fontSize: '13px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '10px' }}>
              بيانات الموظف
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '11px' }}>
              {[
                ['الاسم الكامل', emp.full_name, 'font-bold'],
                ['الرقم الوظيفي', '#' + emp.employee_number, 'font-mono font-bold text-slate-700'],
                ['رقم الهوية / الإقامة', emp.national_id || '—', 'font-mono'],
                ['المسمى الوظيفي', emp.job_title || '—', 'font-semibold'],
                ['القسم', emp.department_name || emp.department || '—', 'font-semibold'],
                ['الفرع', emp.branch_name || emp.branch || '—', 'font-semibold'],
                ['الوردية المعتمدة', shiftName || '—', 'font-semibold'],
                ['ساعات الوردية', shiftHours + ' ساعات / يوم', 'font-mono'],
                ['حالة التأمينات (GOSI)', (emp.is_insured !== false && emp.is_insured !== 'false') ? 'مؤمن عليه 🛡️' + (emp.gosi_number ? ' (#' + emp.gosi_number + ')' : '') : 'غير مسجل', 'font-semibold text-blue-700'],
                ['الراتب الأساسي', fmtSAR(basicSalary) + ' ر.س', 'font-mono font-bold text-emerald-800'],
              ].map(([lbl, val, cls]) => (
                <div key={lbl} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>{lbl}</span>
                  <span style={{ color: '#0f172a' }} className={cls}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── ATTENDANCE SUMMARY ──────────────────────────────────────── */}
          <div>
            <div style={{ fontWeight: '800', color: '#065f46', background: '#ecfdf5', padding: '6px 12px', borderRight: '4px solid #10b981', fontSize: '12px', marginBottom: '6px' }}>
              ملخص الحضور والانصراف — {monthLabel}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                {[
                  ['أيام الحضور الفعلية', presentDays + ' يوم', 'أيام الغياب', absentDays + ' يوم'],
                  ['أيام الإجازة', leaveDays + ' يوم', 'أيام الجمعة المحضورة بالبصمة', fridayDays + ' يوم'],
                  ['إجمالي الساعات المطلوبة', formatMinutes(totalRequiredMinutes), 'إجمالي الساعات الفعلية', formatMinutes(totalActualMinutes)],
                  ['إجمالي عجز الساعات', formatMinutes(totalShortfallMinutes), 'قيمة الساعة المحتسبة', fmtSAR(hourlyRate) + ' ر.س / س'],
                ].map(([l1, v1, l2, v2], i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 10px', color: '#475569', width: '25%' }}>{l1}</td>
                    <td style={{ padding: '6px 10px', fontWeight: '700', color: '#0f172a', width: '25%', fontFamily: 'monospace' }}>{v1}</td>
                    <td style={{ padding: '6px 10px', color: '#475569', width: '25%' }}>{l2}</td>
                    <td style={{ padding: '6px 10px', fontWeight: '700', color: '#0f172a', width: '25%', fontFamily: 'monospace' }}>{v2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ─── TWO COLUMNS: ADDITIONS & DEDUCTIONS ────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

            {/* ADDITIONS */}
            <div>
              <div style={{ fontWeight: '800', color: '#065f46', background: '#ecfdf5', padding: '6px 12px', borderRight: '4px solid #10b981', fontSize: '12px', marginBottom: '6px' }}>
                الإضافات والمستحقات
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <tbody>
                  <tr style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px' }}>الراتب الأساسي</td>
                    <td style={{ padding: '6px 8px', fontWeight: '700', textAlign: 'left', fontFamily: 'monospace' }}>{fmtSAR(basicSalary)} ر.س</td>
                  </tr>
                  {housing > 0 && <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px' }}>بدل السكن</td>
                    <td style={{ padding: '6px 8px', fontWeight: '700', textAlign: 'left', fontFamily: 'monospace' }}>{fmtSAR(housing)} ر.س</td>
                  </tr>}
                  {transport > 0 && <tr style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px' }}>بدل المواصلات</td>
                    <td style={{ padding: '6px 8px', fontWeight: '700', textAlign: 'left', fontFamily: 'monospace' }}>{fmtSAR(transport)} ر.س</td>
                  </tr>}
                  {fridayAllowance > 0 && <tr style={{ background: '#ecfdf5', borderBottom: '1px solid #bbf7d0' }}>
                    <td style={{ padding: '6px 8px', color: '#065f46', fontWeight: '700' }}>
                      بدل حضور أيام الجمعة
                      <div style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace' }}>{fridayNote}</div>
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: '900', textAlign: 'left', color: '#065f46', fontFamily: 'monospace' }}>+{fmtSAR(fridayAllowance)} ر.س</td>
                  </tr>}
                  {dailyOvertimeAllowance > 0 && <tr style={{ background: '#fffbeb', borderBottom: '1px solid #fef3c7' }}>
                    <td style={{ padding: '6px 8px', color: '#92400e', fontWeight: '700' }}>
                      إضافي ساعة يومياً (9 ساعات)
                      <div style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace' }}>{dailyOvertimeNote}</div>
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: '900', textAlign: 'left', color: '#92400e', fontFamily: 'monospace' }}>+{fmtSAR(dailyOvertimeAllowance)} ر.س</td>
                  </tr>}
                  <tr style={{ background: '#f0fdf4', fontWeight: '800' }}>
                    <td style={{ padding: '8px 8px', borderTop: '2px solid #10b981', color: '#065f46' }}>إجمالي المستحقات</td>
                    <td style={{ padding: '8px 8px', borderTop: '2px solid #10b981', textAlign: 'left', color: '#065f46', fontWeight: '900', fontSize: '13px', fontFamily: 'monospace' }}>
                      {fmtSAR(basicSalary + totalAdditions)} ر.س
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* DEDUCTIONS */}
            <div>
              <div style={{ fontWeight: '800', color: '#991b1b', background: '#fef2f2', padding: '6px 12px', borderRight: '4px solid #ef4444', fontSize: '12px', marginBottom: '6px' }}>
                الخصومات والاستقطاعات
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <tbody>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', color: '#64748b' }}>
                      التأمينات الاجتماعية (GOSI)
                      <span style={{ fontSize: '9px', color: '#2563eb', display: 'block' }}>تحمل المنشأة بالكامل (0% على الموظف)</span>
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: '600', textAlign: 'left', color: '#64748b', fontFamily: 'monospace' }}>0.00 ر.س</td>
                  </tr>
                  {proposedShortfallDeduction > 0 && <tr style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                    <td style={{ padding: '6px 8px', color: '#991b1b' }}>
                      خصم عجز الحضور
                      <div style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace' }}>{formatHours(shortfallHours)} س × {fmtSAR(hourlyRate)} ر.س/س</div>
                      <div style={{ fontSize: '9px', fontWeight: '700', color: shortfallApprovalStatus === 'rejected' ? '#15803d' : '#991b1b' }}>
                        الحالة: {approvalStatusLabel}
                        {shortfallApprovalNote ? ' • ' + shortfallApprovalNote : ''}
                      </div>
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: '900', textAlign: 'left', color: approvedShortfallDeduction > 0 ? '#dc2626' : '#15803d', fontFamily: 'monospace' }}>
                      {approvedShortfallDeduction > 0 ? '-' + fmtSAR(approvedShortfallDeduction) + ' ر.س' : '0.00 (معفى)'}
                    </td>
                  </tr>}
                  <tr style={{ background: '#fef2f2', fontWeight: '800' }}>
                    <td style={{ padding: '8px 8px', borderTop: '2px solid #ef4444', color: '#991b1b' }}>إجمالي الخصومات</td>
                    <td style={{ padding: '8px 8px', borderTop: '2px solid #ef4444', textAlign: 'left', color: '#991b1b', fontWeight: '900', fontSize: '13px', fontFamily: 'monospace' }}>
                      -{fmtSAR(totalDeductions)} ر.س
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── NET SALARY BOX ──────────────────────────────────────────── */}
          <div style={{ background: 'linear-gradient(135deg, #065f46, #047857)', borderRadius: '12px', padding: '18px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(6, 95, 70, 0.15)' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', opacity: '0.95' }}>صافي الراتب المستحق للصرف</div>
              <div style={{ fontSize: '11px', opacity: '0.8', marginTop: '3px' }}>شهر: {monthLabel} • رقم المسير: {payslipNumber}</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '30px', fontWeight: '900', fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                {fmtSAR(netSalary)}
              </div>
              <div style={{ fontSize: '11px', opacity: '0.85', fontWeight: '600' }}>ريال سعودي (SAR)</div>
            </div>
          </div>

          {/* ─── DAILY DETAIL TABLE ──────────────────────────────────────── */}
          {dailyDetails && dailyDetails.length > 0 && (
            <div>
              <div style={{ fontWeight: '800', color: '#1e40af', background: '#eff6ff', padding: '6px 12px', borderRight: '4px solid #3b82f6', fontSize: '12px', marginBottom: '6px' }}>
                كشف تفصيل الحضور اليومي
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ background: '#1e40af', color: '#fff' }}>
                    {['التاريخ', 'اليوم', 'الدخول', 'الخروج', 'المطلوب', 'الفعلي', 'العجز', 'الحالة'].map(h => (
                      <th key={h} style={{ padding: '6px', fontWeight: '700', textAlign: 'center' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dailyDetails.map((d, i) => {
                    const times = d.timestamp_raw ? d.timestamp_raw.match(/\d{1,2}[:.][0-9]{2}/g) : null;
                    const checkIn = times ? times[0] : (d.check_in ? formatTimeDisplay(d.check_in) : '—');
                    const checkOut = times ? times[times.length - 1] : (d.check_out ? formatTimeDisplay(d.check_out) : '—');
                    const statusLabel = d.isFriday ? 'عطلة جمعة' : d.isExempt ? 'معفى' : !d.hasAttendance ? 'غائب' : d.shortfallMinutes > 0 ? 'عجز' : 'حاضر';
                    const statusColor = d.isFriday ? '#4338ca' : d.isExempt ? '#64748b' : !d.hasAttendance ? '#dc2626' : d.shortfallMinutes > 0 ? '#d97706' : '#16a34a';
                    return (
                      <tr key={d.log_date} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '5px 6px', textAlign: 'center', fontFamily: 'monospace', fontWeight: '700' }}>{d.log_date?.slice(5)}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: '600' }}>{d.day_name}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', fontFamily: 'monospace' }}>{checkIn}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', fontFamily: 'monospace' }}>{checkOut}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', fontFamily: 'monospace' }}>{d.requiredMinutes ? formatMinutes(d.requiredMinutes) : '—'}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', fontFamily: 'monospace' }}>{d.actualMinutes ? formatMinutes(d.actualMinutes) : '—'}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', color: d.shortfallMinutes > 0 ? '#dc2626' : '#16a34a', fontWeight: '700', fontFamily: 'monospace' }}>
                          {d.shortfallMinutes > 0 ? formatMinutes(d.shortfallMinutes) : '0 د'}
                        </td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', color: statusColor, fontWeight: '700' }}>{statusLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── SIGNATURES ──────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginTop: '16px' }}>
            {['إعداد المسير (الموارد البشرية)', 'مراجعة الحسابات والمالية', 'اعتماد المدير العام'].map(title => (
              <div key={title} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', textAlign: 'center', background: '#f8fafc' }}>
                <div style={{ fontWeight: '800', fontSize: '11px', color: '#334155', marginBottom: '35px' }}>{title}</div>
                <div style={{ borderTop: '1px dashed #94a3b8', width: '80%', margin: '0 auto' }}></div>
                <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>التوقيع والختم الرسمي</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: '9px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
            وثيقة كشف راتب رسمية صادرة آلياً عن منصة Green Arrow HR • {company.legal_name}
          </div>
        </div>
      </div>
    </div>
  );
}
