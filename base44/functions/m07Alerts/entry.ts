import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const daysUntil = (ds) => {
  if (!ds) return null;
  const d = new Date(ds);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
};

const LABELS = { id: 'National ID', passport: 'Passport', contract: 'Employment Contract', probation: 'Probation' };

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Block direct non-admin invocation; allow scheduled (no-user) runs.
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch {}
    const idDays = Number(body.id_days) || 30;
    const passportDays = Number(body.passport_days) || 60;
    const contractDays = Number(body.contract_days) || 60;
    const probationDays = Number(body.probation_days) || 30;

    const sr = base44.asServiceRole;
    const [employees, contracts, users] = await Promise.all([
      sr.entities.Employee.list(),
      sr.entities.EmploymentContract.list(),
      sr.entities.User.list(),
    ]);
    const admins = users.filter((u) => u.role === 'admin' && u.email);

    const alerts = [];
    employees.forEach((e) => {
      const id = daysUntil(e.id_expiry_date);
      if (id != null && id <= idDays && id >= -90) {
        alerts.push({ type: 'id', employee: e.full_name, expiry: e.id_expiry_date, days: id });
      }
      const pp = daysUntil(e.passport_expiry_date);
      if (pp != null && pp <= passportDays && pp >= -90) {
        alerts.push({ type: 'passport', employee: e.full_name, expiry: e.passport_expiry_date, days: pp });
      }
    });
    contracts.forEach((c) => {
      const ce = daysUntil(c.end_date);
      if (ce != null && ce <= contractDays && ce >= -90) {
        alerts.push({ type: 'contract', employee: c.employee_name, expiry: c.end_date, days: ce });
      }
      const pe = daysUntil(c.probation_end_date);
      if (pe != null && pe <= probationDays && pe >= -90) {
        alerts.push({ type: 'probation', employee: c.employee_name, expiry: c.probation_end_date, days: pe });
      }
    });

    let sent = 0;
    if (alerts.length > 0 && admins.length > 0) {
      const rows = alerts.map((a) => `
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0">${LABELS[a.type] || a.type}</td>
          <td style="padding:8px;border:1px solid #e2e8f0">${a.employee || '—'}</td>
          <td style="padding:8px;border:1px solid #e2e8f0">${a.expiry || '—'}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;color:${a.days < 0 ? '#dc2626' : '#d97706'};font-weight:600">${a.days < 0 ? 'Expired ' + Math.abs(a.days) + 'd ago' : a.days + ' days left'}</td>
        </tr>`).join('');
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;color:#0b1f3a">
          <h2 style="margin:0 0 8px">M07 Expiry Alerts</h2>
          <p style="color:#475569;margin:0 0 16px">${alerts.length} document(s) need attention.</p>
          <table style="border-collapse:collapse;font-size:13px;width:100%">
            <thead><tr style="background:#f1f5f9">
              <th style="padding:8px;border:1px solid #e2e8f0;text-align:start">Document</th>
              <th style="padding:8px;border:1px solid #e2e8f0;text-align:start">Employee</th>
              <th style="padding:8px;border:1px solid #e2e8f0;text-align:start">Expiry</th>
              <th style="padding:8px;border:1px solid #e2e8f0;text-align:start">Status</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="color:#94a3b8;font-size:12px;margin-top:16px">Zenith HR · M07 Alerts Engine</p>
        </div>`;
      for (const admin of admins) {
        try {
          await sr.integrations.Core.SendEmail({
            to: admin.email,
            subject: 'M07 · ' + alerts.length + ' document(s) expiring soon',
            body: html,
          });
          sent++;
        } catch (e) {}
      }
    }

    return Response.json({ ok: true, alerts: alerts.length, sent, adminCount: admins.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}