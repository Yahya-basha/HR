import { useRef } from 'react';
import { Printer, FileDown, Building2, ShieldCheck, CreditCard, Calendar, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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

const fmtNum = (n, dec = 2) => {
  return (Number(n) || 0).toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
};

export default function AdvancePrintModal({ open, onOpenChange, advance, employee }) {
  const printRef = useRef(null);
  if (!advance) return null;

  const company = getCompanyProfile();
  const emp = employee || {
    full_name: advance.employee_name,
    employee_number: advance.employee_number,
    national_id: '—',
    job_title: 'موظف',
    branch_name: 'الفرع الرئيسي',
    salary: 0
  };

  const voucherNumber = 'ADV-' + (advance.employee_number || '0000') + '-' + (advance.id || '').slice(-6);
  const issueDate = new Date(advance.created_at || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  // Calculate schedule dates
  const totalInstallments = Number(advance.total_installments) || 1;
  const monthlyAmount = Number(advance.monthly_installment) || 0;
  const [startYear, startMonth] = (advance.start_month || '2026-08').split('-').map(Number);

  const installmentsList = [];
  let currentY = startYear || 2026;
  let currentM = startMonth || 8;

  for (let i = 1; i <= totalInstallments; i++) {
    const mStr = String(currentM).padStart(2, '0');
    const monthKey = `${currentY}-${mStr}`;
    const isPaid = i <= (advance.paid_installments || 0);

    installmentsList.push({
      num: i,
      monthKey,
      amount: monthlyAmount,
      status: isPaid ? 'مسدد ✓' : 'مستحق السداد',
      paidAt: isPaid ? (advance.history?.[i-1]?.paid_at?.slice(0, 10) || 'تم الخصم') : '—'
    });

    currentM++;
    if (currentM > 12) {
      currentM = 1;
      currentY++;
    }
  }

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>سند صرف وعقد سلفة — ${advance.employee_name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap');
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Cairo',Arial,sans-serif; direction:rtl; font-size:12px; color:#1a1a1a; background:#fff; }
          .font-mono { font-family:'JetBrains Mono',monospace; }
          .voucher-body { width:210mm; min-height:297mm; padding:12mm 10mm; margin:0 auto; }
          table { width:100%; border-collapse:collapse; }
          table th, table td { padding:6px 10px; }
          @media print { 
            body { margin:0; } 
            .no-print { display:none !important; }
            .voucher-body { padding:8mm; }
          }
        </style>
      </head>
      <body>${printContents}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); win.close(); }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-6 rounded-3xl" dir="rtl">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="text-base font-heading font-black text-foreground">
            سند وعقد صرف سلفة مالية — {advance.employee_name}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs gap-1.5 shadow-sm">
              <Printer className="w-3.5 h-3.5" /> طباعة السند A4
            </Button>
          </div>
        </DialogHeader>

        {/* ─── A4 PRINT CONTAINER ────────────────────────────────────────── */}
        <div
          ref={printRef}
          className="voucher-body bg-white border border-border/60 shadow-lg rounded-2xl overflow-hidden my-2"
          style={{ width: '100%', maxWidth: '794px', margin: '0 auto', fontFamily: 'Cairo, Arial, sans-serif', direction: 'rtl' }}
        >
          {/* Header Banner */}
          <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '20px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
              <div style={{ fontSize: '17px', fontWeight: '900', color: '#38bdf8' }}>سند وعقد سلفة موظف</div>
              <div style={{ fontSize: '11px', opacity: '0.9', marginTop: '3px', fontFamily: 'monospace' }}>رقم السند: {voucherNumber}</div>
              <div style={{ fontSize: '10px', opacity: '0.7', fontFamily: 'monospace' }}>تاريخ الصرف: {issueDate}</div>
            </div>
          </div>

          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* 1. EMPLOYEE DETAILS */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginBottom: '8px' }}>
                بيانات الموظف المستفيد
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '11px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>اسم الموظف الرباعي:</span>
                  <div style={{ fontWeight: '800', color: '#0f172a' }}>{emp.full_name || advance.employee_name}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>الرقم الوظيفي:</span>
                  <div style={{ fontWeight: '700', fontFamily: 'monospace' }}>#{emp.employee_number || advance.employee_number}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>رقم الهوية / الإقامة:</span>
                  <div style={{ fontWeight: '700', fontFamily: 'monospace' }}>{emp.national_id || '—'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>المسمى الوظيفي:</span>
                  <div style={{ fontWeight: '600' }}>{emp.job_title || '—'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>الفرع التابع له:</span>
                  <div style={{ fontWeight: '600' }}>{emp.branch_name || emp.branch || '—'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>الراتب الأساسي:</span>
                  <div style={{ fontWeight: '800', color: '#065f46', fontFamily: 'monospace' }}>{fmtNum(emp.salary || emp.basic_salary)} ر.س</div>
                </div>
              </div>
            </div>

            {/* 2. ADVANCE TERMS & FINANCIAL SUMMARY */}
            <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '14px 18px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontWeight: '800', color: '#1e40af', fontSize: '13px', borderBottom: '1px solid #bfdbfe', paddingBottom: '6px', marginBottom: '10px' }}>
                بيانات ومبالغ السلفة المعتمدة
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', fontSize: '11px', textAlign: 'center' }}>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>إجمالي مبلغ السلفة</div>
                  <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e3a8a', fontFamily: 'monospace', marginTop: '2px' }}>
                    {fmtNum(advance.total_amount)} <span style={{ fontSize: '10px', fontFamily: 'sans-serif' }}>ر.س</span>
                  </div>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>القسط الشهري</div>
                  <div style={{ fontSize: '16px', fontWeight: '900', color: '#dc2626', fontFamily: 'monospace', marginTop: '2px' }}>
                    {fmtNum(advance.monthly_installment)} <span style={{ fontSize: '10px', fontFamily: 'sans-serif' }}>ر.س/شهر</span>
                  </div>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>عدد الأقساط</div>
                  <div style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
                    {advance.total_installments} <span style={{ fontSize: '10px', fontFamily: 'sans-serif' }}>أشهر</span>
                  </div>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>شهر بدء الاستقطاع</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace', marginTop: '4px' }}>
                    {advance.start_month}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '10px', fontSize: '11px', color: '#334155', fontWeight: '600' }}>
                سبب ومبرر السلفة: <span style={{ fontWeight: '400' }}>{advance.reason || 'سلفة شخصية'}</span>
              </div>
            </div>

            {/* 3. INSTALLMENTS SCHEDULE TABLE */}
            <div>
              <div style={{ fontWeight: '800', color: '#0f172a', background: '#f1f5f9', padding: '6px 12px', borderRight: '4px solid #475569', fontSize: '11px', marginBottom: '6px' }}>
                جدول استحقاق وسداد الأقساط الشهرية
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#334155', color: '#fff' }}>
                    <th style={{ padding: '5px' }}>رقم القسط</th>
                    <th style={{ padding: '5px' }}>شهر الاستحقاق</th>
                    <th style={{ padding: '5px' }}>مبلغ القسط</th>
                    <th style={{ padding: '5px' }}>حالة السداد</th>
                    <th style={{ padding: '5px' }}>تاريخ السداد / الخصم</th>
                  </tr>
                </thead>
                <tbody>
                  {installmentsList.map((inst, idx) => (
                    <tr key={inst.num} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '5px', fontWeight: '700', fontFamily: 'monospace' }}>القسط ({inst.num}/{totalInstallments})</td>
                      <td style={{ padding: '5px', fontFamily: 'monospace', fontWeight: '700' }}>{inst.monthKey}</td>
                      <td style={{ padding: '5px', fontFamily: 'monospace', fontWeight: '800', color: '#dc2626' }}>{fmtNum(inst.amount)} ر.س</td>
                      <td style={{ padding: '5px', fontWeight: '700', color: inst.status.includes('مسدد') ? '#16a34a' : '#d97706' }}>
                        {inst.status}
                      </td>
                      <td style={{ padding: '5px', fontFamily: 'monospace', color: '#64748b' }}>{inst.paidAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. LEGAL ACKNOWLEDGEMENT & TERMS */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', fontSize: '10.5px', color: '#92400e', lineHeight: '1.6' }}>
              <div style={{ fontWeight: '800', marginBottom: '3px' }}>إقرار وتعهد الموظف المقترض:</div>
              أقر أنا الموظف الموقع أدناه بأنني استلمت مبلغ السلفة الموضح أعلاه وقدره (<strong>{fmtNum(advance.total_amount)} ريال سعودي</strong>)، وأوافق موافقة صريحة وغير مشروطة على استقطاع القسط الشهري المحدد بمبلغ (<strong>{fmtNum(advance.monthly_installment)} ريال</strong>) من راتبي الشهري تلقائياً ابتداءً من شهر (<strong>{advance.start_month}</strong>) وحتى تمام سداد كامل مبلغ السلفة. كما أتعهد بعدم طلب إخلاء طرف أو إنهاء خدمات أو استلام مستحقات نهاية الخدمة إلا بعد سداد وتصفية كامل رصيد هذه السلفة للمنشأة.
            </div>

            {/* 5. OFFICIAL SIGNATURES (3-TIER) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginTop: '10px' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', textAlign: 'center', background: '#f8fafc' }}>
                <div style={{ fontWeight: '800', fontSize: '11px', color: '#334155', marginBottom: '35px' }}>توقيع وإقرار الموظف المقترض</div>
                <div style={{ borderTop: '1px dashed #94a3b8', width: '80%', margin: '0 auto' }}></div>
                <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>الاسم: {emp.full_name || advance.employee_name}</div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', textAlign: 'center', background: '#f8fafc' }}>
                <div style={{ fontWeight: '800', fontSize: '11px', color: '#334155', marginBottom: '35px' }}>مراجعة وتدقيق الإدارة المالية</div>
                <div style={{ borderTop: '1px dashed #94a3b8', width: '80%', margin: '0 auto' }}></div>
                <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>التوقيع والتاريخ</div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', textAlign: 'center', background: '#f8fafc' }}>
                <div style={{ fontWeight: '800', fontSize: '11px', color: '#334155', marginBottom: '35px' }}>اعتماد وختم المدير العام</div>
                <div style={{ borderTop: '1px dashed #94a3b8', width: '80%', margin: '0 auto' }}></div>
                <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>{advance.approved_by || 'فهد ناصر محمد الجوعي'}</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '9px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
              مستند مالي وإداري رسمي صادر عن نظام Green Arrow HR • {company.legal_name} • السجل: {company.cr_number}
            </div>

          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs font-bold rounded-xl px-5">
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
