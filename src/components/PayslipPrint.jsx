import { useRef } from 'react';
import { Printer, FileDown, Building2 } from 'lucide-react';
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

const fmtSAR = (n) => (Number(n) || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 });

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
  const issueDate = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

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
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Cairo',Arial,sans-serif; direction:rtl; font-size:12px; color:#1a1a1a; background:#fff; }
          .payslip-body { width:210mm; min-height:297mm; padding:15mm 12mm; margin:0 auto; }
          table { width:100%; border-collapse:collapse; }
          table th, table td { padding:6px 10px; }
          .section-title { font-size:11px; font-weight:800; color:#065f46; background:#ecfdf5; padding:6px 12px; border-right:4px solid #10b981; margin-bottom:4px; }
          .total-row td { font-weight:800; background:#f0fdf4; border-top:2px solid #10b981; }
          .net-box { background:linear-gradient(135deg,#065f46,#10b981); color:#fff; padding:14px 20px; border-radius:12px; text-align:center; }
          .net-box .label { font-size:13px; font-weight:600; opacity:0.9; }
          .net-box .amount { font-size:28px; font-weight:900; }
          .sig-box { border:1px solid #d1d5db; border-radius:8px; padding:12px; text-align:center; }
          .sig-line { border-top:1px dashed #9ca3af; margin-top:30px; width:80%; display:inline-block; }
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
    handlePrint(); // Browser will offer Save as PDF in print dialog
  };

  const approvalStatusLabel = {
    pending: 'قيد المراجعة',
    approved: 'معتمد',
    rejected: 'مرفوض',
    modified: 'معتمد بقيمة معدلة',
  }[shortfallApprovalStatus] || shortfallApprovalStatus;

  return (
    <div className="space-y-3" dir="rtl">
      {/* Print / Export Buttons */}
      <div className="flex items-center gap-2 no-print">
        <Button onClick={handlePrint} className="bg-slate-800 text-white gap-2 font-bold rounded-xl">
          <Printer className="w-4 h-4" /> طباعة القسيمة
        </Button>
        <Button onClick={handleExportPDF} variant="outline" className="border-emerald-500 text-emerald-700 gap-2 font-bold rounded-xl">
          <FileDown className="w-4 h-4" /> تصدير PDF
        </Button>
      </div>

      {/* A4 Payslip Preview */}
      <div
        ref={printRef}
        className="payslip-body bg-white border border-border/60 shadow-xl rounded-2xl overflow-hidden"
        style={{ width: '100%', maxWidth: '794px', margin: '0 auto', fontFamily: 'Cairo, Arial, sans-serif', direction: 'rtl' }}
      >
        {/* ─── HEADER ─────────────────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg, #065f46, #10b981)', padding: '20px 24px', color: '#fff', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {company.logo_url && (
              <img src={company.logo_url} alt="logo" style={{ width: '52px', height: '52px', borderRadius: '8px', background: '#fff', objectFit: 'contain', padding: '4px' }} />
            )}
            <div>
              <div style={{ fontSize: '16px', fontWeight: '900' }}>{company.legal_name}</div>
              <div style={{ fontSize: '11px', opacity: '0.85', marginTop: '2px' }}>السجل التجاري: {company.cr_number} | هاتف: {company.phone}</div>
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '18px', fontWeight: '900' }}>قسيمة الراتب</div>
            <div style={{ fontSize: '11px', opacity: '0.85', marginTop: '4px' }}>رقم المسير: {payslipNumber}</div>
            <div style={{ fontSize: '11px', opacity: '0.85' }}>شهر: {monthLabel}</div>
            <div style={{ fontSize: '10px', opacity: '0.7' }}>تاريخ الإصدار: {issueDate}</div>
          </div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ─── EMPLOYEE INFO ───────────────────────────────────────────── */}
          <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '14px 18px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontWeight: '800', color: '#065f46', fontSize: '13px', borderBottom: '1px solid #bbf7d0', paddingBottom: '6px', marginBottom: '10px' }}>
              بيانات الموظف
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px' }}>
              {[
                ['الاسم الكامل', emp.full_name],
                ['الرقم الوظيفي', '#' + emp.employee_number],
                ['رقم الهوية/الإقامة', emp.national_id || '—'],
                ['المسمى الوظيفي', emp.job_title || '—'],
                ['القسم', emp.department_name || emp.department || '—'],
                ['الفرع', emp.branch_name || emp.branch || '—'],
                ['الشفت', shiftName || '—'],
                ['ساعات الشفت', shiftHours + ' ساعة/يوم'],
                ['الراتب الأساسي', fmtSAR(basicSalary) + ' ريال'],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#6b7280', fontSize: '10px' }}>{lbl}</span>
                  <span style={{ fontWeight: '700', color: '#111827' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── ATTENDANCE SUMMARY ──────────────────────────────────────── */}
          <div>
            <div className="section-title" style={{ fontWeight: '800', color: '#065f46', background: '#ecfdf5', padding: '6px 12px', borderRight: '4px solid #10b981', fontSize: '12px', marginBottom: '6px' }}>
              ملخص الحضور والانصراف — {monthLabel}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                {[
                  ['أيام الحضور الفعلية', presentDays + ' يوم'],
                  ['أيام الغياب', absentDays + ' يوم'],
                  ['أيام الإجازة', leaveDays + ' يوم'],
                  ['أيام الجمعة المحضورة', fridayDays + ' يوم'],
                  ['إجمالي الساعات المطلوبة', formatMinutes(totalRequiredMinutes)],
                  ['إجمالي الساعات الفعلية', formatMinutes(totalActualMinutes)],
                  ['إجمالي ساعات العجز', formatMinutes(totalShortfallMinutes)],
                  ['قيمة الساعة', fmtSAR(hourlyRate) + ' ريال/ساعة'],
                ].map(([lbl, val], i) => (
                  <tr key={lbl} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={{ padding: '6px 10px', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>{lbl}</td>
                    <td style={{ padding: '6px 10px', fontWeight: '700', color: '#111827', borderBottom: '1px solid #f3f4f6', textAlign: 'left' }}>{val}</td>
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
                  <tr style={{ background: '#fff' }}>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>الراتب الأساسي</td>
                    <td style={{ padding: '6px 8px', fontWeight: '700', borderBottom: '1px solid #f3f4f6', textAlign: 'left' }}>{fmtSAR(basicSalary)}</td>
                  </tr>
                  {housing > 0 && <tr style={{ background: '#f9fafb' }}>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>بدل السكن</td>
                    <td style={{ padding: '6px 8px', fontWeight: '700', borderBottom: '1px solid #f3f4f6', textAlign: 'left' }}>{fmtSAR(housing)}</td>
                  </tr>}
                  {transport > 0 && <tr style={{ background: '#fff' }}>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>بدل المواصلات</td>
                    <td style={{ padding: '6px 8px', fontWeight: '700', borderBottom: '1px solid #f3f4f6', textAlign: 'left' }}>{fmtSAR(transport)}</td>
                  </tr>}
                  {fridayAllowance > 0 && <tr style={{ background: '#ecfdf5' }}>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6', color: '#065f46', fontWeight: '600' }}>
                      بدل حضور أيام الجمعة
                      <div style={{ fontSize: '9px', color: '#6b7280' }}>{fridayNote}</div>
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: '800', borderBottom: '1px solid #f3f4f6', textAlign: 'left', color: '#065f46' }}>+{fmtSAR(fridayAllowance)}</td>
                  </tr>}
                  {dailyOvertimeAllowance > 0 && <tr style={{ background: '#fffbeb' }}>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6', color: '#92400e', fontWeight: '600' }}>
                      إضافي ساعة يومياً
                      <div style={{ fontSize: '9px', color: '#6b7280' }}>{dailyOvertimeNote}</div>
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: '800', borderBottom: '1px solid #f3f4f6', textAlign: 'left', color: '#92400e' }}>+{fmtSAR(dailyOvertimeAllowance)}</td>
                  </tr>}
                  <tr style={{ background: '#ecfdf5', fontWeight: '800' }}>
                    <td style={{ padding: '8px 8px', borderTop: '2px solid #10b981', color: '#065f46' }}>إجمالي الإضافات</td>
                    <td style={{ padding: '8px 8px', borderTop: '2px solid #10b981', textAlign: 'left', color: '#065f46', fontWeight: '900', fontSize: '13px' }}>{fmtSAR(basicSalary + totalAdditions)}</td>
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
                  <tr style={{ background: '#fff' }}>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>التأمينات الاجتماعية (GOSI)</td>
                    <td style={{ padding: '6px 8px', fontWeight: '700', borderBottom: '1px solid #f3f4f6', textAlign: 'left', color: '#dc2626' }}>-{fmtSAR(gosiDeduction)}</td>
                  </tr>
                  {proposedShortfallDeduction > 0 && <tr style={{ background: '#fef2f2' }}>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6', color: '#991b1b' }}>
                      خصم عجز الحضور
                      <div style={{ fontSize: '9px', color: '#6b7280' }}>{formatHours(shortfallHours)} ساعة × {fmtSAR(hourlyRate)} ريال/س</div>
                      <div style={{ fontSize: '9px', fontWeight: '600', color: shortfallApprovalStatus === 'rejected' ? '#15803d' : '#991b1b' }}>
                        حالة الاعتماد: {approvalStatusLabel}
                        {shortfallApprovalNote ? ' — ' + shortfallApprovalNote : ''}
                      </div>
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: '700', borderBottom: '1px solid #f3f4f6', textAlign: 'left', color: approvedShortfallDeduction > 0 ? '#dc2626' : '#15803d' }}>
                      {approvedShortfallDeduction > 0 ? '-' + fmtSAR(approvedShortfallDeduction) : '0.00 (مرفوض)'}
                    </td>
                  </tr>}
                  <tr style={{ background: '#fef2f2', fontWeight: '800' }}>
                    <td style={{ padding: '8px 8px', borderTop: '2px solid #ef4444', color: '#991b1b' }}>إجمالي الخصومات</td>
                    <td style={{ padding: '8px 8px', borderTop: '2px solid #ef4444', textAlign: 'left', color: '#991b1b', fontWeight: '900', fontSize: '13px' }}>-{fmtSAR(totalDeductions)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── NET SALARY BOX ──────────────────────────────────────────── */}
          <div style={{ background: 'linear-gradient(135deg, #065f46, #10b981)', borderRadius: '12px', padding: '20px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', opacity: '0.9' }}>صافي الراتب المستحق للصرف</div>
              <div style={{ fontSize: '11px', opacity: '0.7', marginTop: '4px' }}>الشهر: {monthLabel} | رقم المسير: {payslipNumber}</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '32px', fontWeight: '900' }}>{fmtSAR(netSalary)}</div>
              <div style={{ fontSize: '12px', opacity: '0.8' }}>ريال سعودي</div>
            </div>
          </div>

          {/* ─── DAILY DETAIL TABLE ──────────────────────────────────────── */}
          {dailyDetails && dailyDetails.length > 0 && (
            <div>
              <div style={{ fontWeight: '800', color: '#1e40af', background: '#eff6ff', padding: '6px 12px', borderRight: '4px solid #3b82f6', fontSize: '12px', marginBottom: '6px' }}>
                تفصيل الحضور اليومي
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ background: '#1e40af', color: '#fff' }}>
                    {['التاريخ', 'اليوم', 'الدخول', 'الخروج', 'المطلوب', 'الفعلي', 'العجز', 'الحالة'].map(h => (
                      <th key={h} style={{ padding: '6px 6px', fontWeight: '700', textAlign: 'center' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dailyDetails.map((d, i) => {
                    const times = d.timestamp_raw ? d.timestamp_raw.match(/\d{1,2}[:.][0-9]{2}/g) : null;
                    const checkIn = times ? times[0] : (d.check_in ? formatTimeDisplay(d.check_in) : '—');
                    const checkOut = times ? times[times.length - 1] : (d.check_out ? formatTimeDisplay(d.check_out) : '—');
                    const statusLabel = d.isFriday ? 'جمعة' : d.isExempt ? 'معفى' : !d.hasAttendance ? 'غائب' : d.shortfallMinutes > 0 ? 'عجز' : 'حاضر';
                    const statusColor = d.isFriday ? '#4338ca' : d.isExempt ? '#6b7280' : !d.hasAttendance ? '#dc2626' : d.shortfallMinutes > 0 ? '#d97706' : '#16a34a';
                    return (
                      <tr key={d.log_date} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        <td style={{ padding: '5px 6px', textAlign: 'center', borderBottom: '1px solid #f3f4f6', fontFamily: 'monospace', fontWeight: '600' }}>{d.log_date?.slice(5)}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>{d.day_name}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', borderBottom: '1px solid #f3f4f6', fontFamily: 'monospace' }}>{checkIn}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', borderBottom: '1px solid #f3f4f6', fontFamily: 'monospace' }}>{checkOut}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>{d.requiredMinutes ? formatMinutes(d.requiredMinutes) : '—'}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>{d.actualMinutes ? formatMinutes(d.actualMinutes) : '—'}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', borderBottom: '1px solid #f3f4f6', color: d.shortfallMinutes > 0 ? '#dc2626' : '#16a34a', fontWeight: '700' }}>
                          {d.shortfallMinutes > 0 ? formatMinutes(d.shortfallMinutes) : '0'}
                        </td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', borderBottom: '1px solid #f3f4f6', color: statusColor, fontWeight: '700' }}>{statusLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── SIGNATURES ──────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '20px' }}>
            {['إعداد المسير', 'مراجعة الموارد البشرية', 'اعتماد المدير العام'].map(title => (
              <div key={title} style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontWeight: '700', fontSize: '11px', color: '#374151', marginBottom: '40px' }}>{title}</div>
                <div style={{ borderTop: '1px dashed #9ca3af', width: '80%', margin: '0 auto' }}></div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>الاسم / التوقيع / التاريخ</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: '9px', color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
            هذه القسيمة وثيقة رسمية صادرة عن نظام Green Arrow HR | {company.legal_name} | {issueDate}
          </div>
        </div>
      </div>
    </div>
  );
}
