import { useRef } from 'react';
import { Printer, Download, Building2, ShieldCheck, CreditCard, Calendar, UserCheck } from 'lucide-react';
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
    phone: '+966541697999',
    address: 'المملكة العربية السعودية',
    logo_url: '/green-arrow-logo.png',
  };
}

const fmtSAR = (n, dec = 2) => {
  return (Number(n) || 0).toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
};

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
    isInsured, gosiNumber, gosiDeduction = 0,
    dailyDetails
  } = payroll;

  const company = getCompanyProfile();
  const payslipNumber = 'PAY-' + (monthLabel?.replace(/[^0-9]/g, '') || '202608') + '-' + (emp.employee_number || emp.id);
  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>قسيمة راتب — ${emp.full_name} — ${monthLabel}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap');
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Cairo',Arial,sans-serif; direction:rtl; font-size:12px; color:#1a1a1a; background:#fff; }
          .font-mono { font-family:'JetBrains Mono',monospace; }
          .payslip-body { width:210mm; min-height:297mm; padding:12mm 10mm; margin:0 auto; }
          table { width:100%; border-collapse:collapse; }
          table th, table td { padding:6px 8px; }
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

  const approvalStatusLabel = shortfallApprovalStatus === 'approved' ? 'معتمد' : shortfallApprovalStatus === 'modified' ? 'معدل' : shortfallApprovalStatus === 'rejected' ? 'معفى (ملغي)' : 'قيد المراجعة';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-background rounded-3xl max-w-4xl w-full p-6 max-h-[95vh] overflow-y-auto border shadow-2xl">
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <div>
            <h2 className="text-xl font-heading font-black">قسيمة الراتب الرسمية A4</h2>
            <p className="text-xs text-muted-foreground">كشف راتب تفصيلي ومعتمد للموظف: <strong className="text-foreground">{emp.full_name}</strong></p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="bg-primary text-primary-foreground font-bold gap-2 text-xs rounded-xl shadow-md">
              <Printer className="w-4 h-4" /> طباعة / تصدير PDF
            </Button>
            <Button variant="outline" onClick={onClose} className="text-xs font-bold rounded-xl">
              إغلاق
            </Button>
          </div>
        </div>

        {/* ─── PRINTABLE A4 CONTAINER ───────────────────────────────────── */}
        <div
          ref={printRef}
          className="payslip-body bg-white border border-border/50 shadow-md rounded-2xl overflow-hidden"
          style={{ width: '100%', maxWidth: '794px', margin: '0 auto', fontFamily: 'Cairo, Arial, sans-serif', direction: 'rtl' }}
        >
          {/* ─── HEADER ──────────────────────────────────────────────────── */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '20px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {company.logo_url && (
                <img src={company.logo_url} alt="logo" style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#fff', objectFit: 'contain', padding: '4px' }} />
              )}
              <div>
                <div style={{ fontSize: '15px', fontWeight: '900' }}>{company.legal_name}</div>
                <div style={{ fontSize: '11px', opacity: '0.8', marginTop: '2px', fontFamily: 'monospace' }}>
                  السجل التجاري: {company.cr_number} | هاتف: {company.phone}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#38bdf8' }}>كشف قسيمة الراتب</div>
              <div style={{ fontSize: '11px', opacity: '0.9', marginTop: '3px', fontFamily: 'monospace' }}>رقم القسيمة: {payslipNumber}</div>
              <div style={{ fontSize: '10px', opacity: '0.7', fontFamily: 'monospace' }}>تاريخ الإصدار: {issueDate}</div>
            </div>
          </div>

          {/* ─── EMPLOYEE PROFILE CARD ──────────────────────────────────── */}
          <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '11px' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>اسم الموظف:</span>
                <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '12px' }}>{emp.full_name}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>الرقم الوظيفي:</span>
                <div style={{ fontWeight: '700', fontFamily: 'monospace' }}>#{emp.employee_number || emp.id}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>المسمى الوظيفي:</span>
                <div style={{ fontWeight: '600' }}>{emp.job_title || '—'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>الفرع / القسم:</span>
                <div style={{ fontWeight: '600' }}>{emp.branch_name || emp.department_name || '—'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>رقم الهوية / الإقامة:</span>
                <div style={{ fontWeight: '700', fontFamily: 'monospace' }}>{emp.national_id || '—'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>الجنسية:</span>
                <div style={{ fontWeight: '600' }}>{emp.nationality || '—'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>الوردية المعتمدة:</span>
                <div style={{ fontWeight: '600' }}>{emp.shift || '—'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>التأمينات الاجتماعية:</span>
                <div style={{ fontWeight: '700', color: isInsured ? '#059669' : '#dc2626' }}>
                  {isInsured ? `🛡️ مؤمن عليه (${gosiNumber || 'نشط'})` : 'غير مؤمن'}
                </div>
              </div>
            </div>
          </div>

          {/* ─── EARNINGS & DEDUCTIONS DUAL TABLES ───────────────────────── */}
          <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            
            {/* EARNINGS */}
            <div>
              <div style={{ fontWeight: '800', color: '#065f46', background: '#ecfdf5', padding: '6px 12px', borderRight: '4px solid #10b981', fontSize: '12px', marginBottom: '6px' }}>
                المستحقات والإضافات (Earnings)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', color: '#334155' }}>الراتب الأساسي</td>
                    <td style={{ padding: '6px 8px', fontWeight: '700', textAlign: 'left', color: '#0f172a', fontFamily: 'monospace' }}>{fmtSAR(basicSalary)} ر.س</td>
                  </tr>
                  {housing > 0 && <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', color: '#334155' }}>بدل السكن</td>
                    <td style={{ padding: '6px 8px', fontWeight: '700', textAlign: 'left', color: '#0f172a', fontFamily: 'monospace' }}>{fmtSAR(housing)} ر.س</td>
                  </tr>}
                  {transport > 0 && <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', color: '#334155' }}>بدل المواصلات</td>
                    <td style={{ padding: '6px 8px', fontWeight: '700', textAlign: 'left', color: '#0f172a', fontFamily: 'monospace' }}>{fmtSAR(transport)} ر.س</td>
                  </tr>}
                  {fridayAllowance > 0 && <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f0fdf4' }}>
                    <td style={{ padding: '6px 8px', color: '#047857' }}>
                      بدل حضور الجمعة
                      {fridayNote && <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>{fridayNote}</span>}
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: '800', textAlign: 'left', color: '#047857', fontFamily: 'monospace' }}>+{fmtSAR(fridayAllowance)} ر.س</td>
                  </tr>}
                  {dailyOvertimeAllowance > 0 && <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f0fdf4' }}>
                    <td style={{ padding: '6px 8px', color: '#047857' }}>
                      إضافي ساعات الدوام
                      {dailyOvertimeNote && <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>{dailyOvertimeNote}</span>}
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: '800', textAlign: 'left', color: '#047857', fontFamily: 'monospace' }}>+{fmtSAR(dailyOvertimeAllowance)} ر.س</td>
                  </tr>}
                  
                  {/* Approved Custom Bonuses */}
                  {approvedBonuses.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#f0fdf4' }}>
                      <td style={{ padding: '6px 8px', color: '#047857' }}>
                        🎁 {b.reason || 'مكافأة / حافز تشجيعي معتمد'}
                        <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>معتمد بواسطة: {b.approved_by || 'المدير العام'}</span>
                      </td>
                      <td style={{ padding: '6px 8px', fontWeight: '800', textAlign: 'left', color: '#047857', fontFamily: 'monospace' }}>+{fmtSAR(b.amount)} ر.س</td>
                    </tr>
                  ))}

                  <tr style={{ background: '#ecfdf5', fontWeight: '800' }}>
                    <td style={{ padding: '8px 8px', borderTop: '2px solid #10b981', color: '#065f46' }}>إجمالي المستحقات</td>
                    <td style={{ padding: '8px 8px', borderTop: '2px solid #10b981', textAlign: 'left', color: '#065f46', fontWeight: '900', fontSize: '13px', fontFamily: 'monospace' }}>
                      {fmtSAR(totalAdditions + basicSalary)} ر.س
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* DEDUCTIONS */}
            <div>
              <div style={{ fontWeight: '800', color: '#991b1b', background: '#fef2f2', padding: '6px 12px', borderRight: '4px solid #ef4444', fontSize: '12px', marginBottom: '6px' }}>
                الاستقطاعات والخصومات (Deductions)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
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

                  {/* Approved Custom Penalties */}
                  {approvedPenalties.map(p => (
                    <tr key={p.id} style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                      <td style={{ padding: '6px 8px', color: '#991b1b' }}>
                        ⚠️ {p.reason || 'جزاء / خصم إداري معتمد'}
                        <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>معتمد بواسطة: {p.approved_by || 'المدير العام'}</span>
                      </td>
                      <td style={{ padding: '6px 8px', fontWeight: '900', textAlign: 'left', color: '#dc2626', fontFamily: 'monospace' }}>
                        -{fmtSAR(p.amount)} ر.س
                      </td>
                    </tr>
                  ))}

                  {/* Monthly Advance / Loan Installment */}
                  {advanceInstallment > 0 && (
                    <tr style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                      <td style={{ padding: '6px 8px', color: '#92400e' }}>
                        💳 استقطاع قسط سلفة شهرية
                        <span style={{ fontSize: '9px', color: '#b45309', display: 'block', fontWeight: '700' }}>
                          {advanceNote}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', fontWeight: '900', textAlign: 'left', color: '#b45309', fontFamily: 'monospace' }}>
                        -{fmtSAR(advanceInstallment)} ر.س
                      </td>
                    </tr>
                  )}

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
          <div style={{ margin: '0 24px 16px 24px', background: 'linear-gradient(135deg, #065f46, #047857)', borderRadius: '12px', padding: '16px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(6, 95, 70, 0.15)' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', opacity: '0.95' }}>صافي الراتب المستحق للصرف</div>
              <div style={{ fontSize: '11px', opacity: '0.8', marginTop: '3px' }}>شهر: {monthLabel} • رقم المسير: {payslipNumber}</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '28px', fontWeight: '900', fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                {fmtSAR(netSalary)}
              </div>
              <div style={{ fontSize: '11px', opacity: '0.85', fontWeight: '600' }}>ريال سعودي (SAR)</div>
            </div>
          </div>

          {/* ─── DAILY DETAIL TABLE ──────────────────────────────────────── */}
          {dailyDetails && dailyDetails.length > 0 && (
            <div style={{ padding: '0 24px 16px 24px' }}>
              <div style={{ fontWeight: '800', color: '#1e40af', background: '#eff6ff', padding: '6px 12px', borderRight: '4px solid #3b82f6', fontSize: '12px', marginBottom: '6px' }}>
                كشف تفصيل الحضور اليومي
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ background: '#1e40af', color: '#fff' }}>
                    {['التاريخ', 'اليوم', 'الدخول', 'الخروج', 'المطلوب', 'الفعلي', 'العجز', 'الحالة'].map(h => (
                      <th key={h} style={{ padding: '5px', fontWeight: '700', textAlign: 'center' }}>{h}</th>
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
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontFamily: 'monospace', fontWeight: '700' }}>{d.log_date?.slice(5)}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: '600' }}>{d.day_name}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontFamily: 'monospace' }}>{checkIn}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontFamily: 'monospace' }}>{checkOut}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontFamily: 'monospace' }}>{d.requiredMinutes ? formatMinutes(d.requiredMinutes) : '—'}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontFamily: 'monospace' }}>{d.actualMinutes ? formatMinutes(d.actualMinutes) : '—'}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', color: d.shortfallMinutes > 0 ? '#dc2626' : '#16a34a', fontWeight: '700', fontFamily: 'monospace' }}>
                          {d.shortfallMinutes > 0 ? formatMinutes(d.shortfallMinutes) : '0 د'}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', color: statusColor, fontWeight: '700' }}>{statusLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── SIGNATURES ──────────────────────────────────────────────── */}
          <div style={{ padding: '0 24px 20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            {['إعداد المسير (الموارد البشرية)', 'مراجعة الحسابات والمالية', 'اعتماد المدير العام'].map(title => (
              <div key={title} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', textAlign: 'center', background: '#f8fafc' }}>
                <div style={{ fontWeight: '800', fontSize: '11px', color: '#334155', marginBottom: '30px' }}>{title}</div>
                <div style={{ borderTop: '1px dashed #94a3b8', width: '80%', margin: '0 auto' }}></div>
                <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>التوقيع والختم الرسمي</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: '9px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', padding: '8px 24px 14px 24px' }}>
            وثيقة كشف راتب رسمية صادرة آلياً عن منصة Green Arrow HR • {company.legal_name}
          </div>
        </div>
      </div>
    </div>
  );
}
