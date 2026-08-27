// payrollEngine.js - Green Arrow HR Payroll Engine
export const PAYROLL_DEFAULTS = {
  FRIDAY_DAILY_RATE: 50,
  OVERTIME_DAILY_RATE: 100,
  DAYS_PER_MONTH: 30,
  GOSI_SAUDI_RATE: 0.0975,
  GOSI_NONSAUDI_RATE: 0.02,
};

const EXEMPT_STATUSES_SET = new Set([
  'on_leave','leave','holiday','public_holiday','weekend',
  'not_started','exempt','approved_absence','mission',
  'on leave','annual leave'
]);

export function getPayrollSettings() {
  try {
    const saved = localStorage.getItem('hr_flow_payroll_settings');
    if (saved) {
      const p = JSON.parse(saved);
      return {
        fridayDailyRate: Number(p.friday_daily_rate) || 50,
        overtimeDailyRate: Number(p.overtime_daily_rate) || 100,
        daysPerMonth: Number(p.days_per_month) || 30,
      };
    }
  } catch {}
  return { fridayDailyRate: 50, overtimeDailyRate: 100, daysPerMonth: 30 };
}

export function savePayrollSettings(settings) {
  try {
    localStorage.setItem('hr_flow_payroll_settings', JSON.stringify({
      friday_daily_rate: settings.fridayDailyRate ?? 50,
      overtime_daily_rate: settings.overtimeDailyRate ?? 100,
      days_per_month: settings.daysPerMonth ?? 30,
    }));
  } catch {}
}

export function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const clean = timeStr.toString().trim().replace(/\./g, ':');
  const parts = clean.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

export function extractPunchTimes(rawStr) {
  if (!rawStr) return [];
  const matches = rawStr.toString().match(/\d{1,2}[:.][0-9]{2}(?:[:.][0-9]{2})?/g) || [];
  return matches.map(t => {
    const parts = t.replace(/\./g, ':').split(':');
    return (parts[0]||'00').padStart(2,'0') + ':' + (parts[1]||'00').padStart(2,'0');
  });
}

export function hasRealBiometricPunches(log) {
  if (!log) return false;
  const candidates = [log.timestamp_raw, log.punches_raw, log.check_in].filter(Boolean);
  return candidates.some(str => {
    const s = str.toString().trim();
    if (!s || s === '—' || s === '-') return false;
    if (s.includes('\u0639\u0637\u0644\u0629')) return false;
    if (s.includes('\u0644\u0645 \u064a\u0628\u0627\u0634\u0631')) return false;
    return /\d{1,2}[:.][0-9]{2}/.test(s);
  });
}

export function isDayExempt(log) {
  if (!log) return true;
  const status = (log.status || '').trim().toLowerCase();
  if (EXEMPT_STATUSES_SET.has(status)) return true;
  if (status.includes('\u0625\u062c\u0627\u0632\u0629')) return true;
  if (status.includes('\u0639\u0637\u0644\u0629')) return true;
  if (status.includes('\u0645\u0647\u0645\u0629')) return true;
  return false;
}

export function getShiftRequiredHours(shift) {
  if (!shift) return 8;
  if (shift.working_hours && Number(shift.working_hours) > 0) return Number(shift.working_hours);
  if (shift.start_time && shift.end_time) {
    const start = timeToMinutes(shift.start_time);
    const end = timeToMinutes(shift.end_time);
    if (start !== null && end !== null) {
      let diff = end - start;
      if (diff < 0) diff += 1440;
      if (shift.break_start && shift.break_end) {
        const bs = timeToMinutes(shift.break_start);
        const be = timeToMinutes(shift.break_end);
        if (bs !== null && be !== null) {
          let bd = be - bs; if (bd < 0) bd += 1440; diff -= bd;
        }
      }
      return Math.max(0, diff / 60);
    }
  }
  return 8;
}

export function calcActualMinutes(log) {
  if (!log) return 0;
  if (isDayExempt(log)) return null;
  const rawStr = (log.timestamp_raw || log.punches_raw || '').toString();
  if (rawStr.includes('&')) {
    let total = 0;
    rawStr.split('&').forEach(part => {
      const times = extractPunchTimes(part);
      if (times.length >= 2) {
        const s = timeToMinutes(times[0]);
        const e = timeToMinutes(times[times.length - 1]);
        if (s !== null && e !== null) { let d = e - s; if (d < 0) d += 1440; total += Math.max(0, d); }
      }
    });
    return total;
  }
  const times = extractPunchTimes(rawStr);
  if (times.length >= 2) {
    const s = timeToMinutes(times[0]);
    const e = timeToMinutes(times[times.length - 1]);
    if (s !== null && e !== null) { let d = e - s; if (d < 0) d += 1440; return Math.max(0, d); }
  }
  if (log.check_in && log.check_out) {
    try { return Math.max(0, (new Date(log.check_out) - new Date(log.check_in)) / 60000); } catch {}
  }
  return 0;
}

export function calcHourlyRate(salary, shiftHours, daysPerMonth = 30) {
  if (!salary || salary <= 0 || !shiftHours || shiftHours <= 0) return 0;
  return (salary / daysPerMonth) / shiftHours;
}

export function isFridayAttendance(log) {
  if (!log || !log.log_date) return false;
  const date = new Date(log.log_date + 'T12:00:00');
  if (date.getDay() !== 5) return false;
  if (!hasRealBiometricPunches(log)) return false;
  const status = (log.status || '').toLowerCase();
  if (status === 'absent' || status === 'not_started') return false;
  return true;
}

export function computeEmployeePayroll(emp, allLogs, allShifts, settings = {}) {
  const {
    fridayDailyRate = 50, overtimeDailyRate = 100, daysPerMonth = 30, monthPrefix = null,
  } = settings;

  const shiftName = emp.shift || '';
  const shift = (allShifts || []).find(s =>
    s.name === shiftName || s.id === shiftName || (s.name && shiftName && s.name.includes(shiftName))
  ) || null;
  const shiftHours = getShiftRequiredHours(shift);

  const empLogs = (allLogs || []).filter(l => {
    const match = l.user_id === emp.id ||
      (l.employee_number && l.employee_number.toString() === emp.employee_number?.toString()) ||
      (l.employee_name && l.employee_name.trim() === emp.full_name?.trim());
    if (!match) return false;
    if (monthPrefix && l.log_date && !l.log_date.startsWith(monthPrefix)) return false;
    return true;
  });

  const dateMap = {};
  empLogs.forEach(l => {
    if (!dateMap[l.log_date] || hasRealBiometricPunches(l)) dateMap[l.log_date] = l;
  });
  const uniqueLogs = Object.values(dateMap).sort((a, b) => (a.log_date||'').localeCompare(b.log_date||''));

  let totalRequiredMinutes = 0, totalActualMinutes = 0, totalShortfallMinutes = 0;
  let presentDays = 0, absentDays = 0, leaveDays = 0, fridayDays = 0, overtimeDays = 0;

  const dailyDetails = uniqueLogs.map(log => {
    const isFriday = isFridayAttendance(log);
    const exempt = isDayExempt(log);
    const hasAtt = hasRealBiometricPunches(log);
    const status = (log.status || 'present').toLowerCase();
    const actualMins = calcActualMinutes(log);
    let requiredMins = 0, shortfallMins = 0;

    if (!exempt && !isFriday && hasAtt) {
      requiredMins = shiftHours * 60; totalRequiredMinutes += requiredMins;
      const actual = actualMins || 0; totalActualMinutes += actual;
      shortfallMins = Math.max(0, requiredMins - actual); totalShortfallMinutes += shortfallMins;
      presentDays++;
    } else if (!exempt && !isFriday && !hasAtt && (status === 'absent' || status === 'غائب')) {
      absentDays++; requiredMins = shiftHours * 60; totalRequiredMinutes += requiredMins;
      shortfallMins = requiredMins; totalShortfallMinutes += shortfallMins;
    } else if (exempt) {
      if (status.includes('إجازة') || status === 'on_leave' || status === 'leave') leaveDays++;
    }
    if (isFriday && hasAtt) { fridayDays++; presentDays++; }
    const hasOT = !isFriday && !!(shift && shift.has_overtime) && hasAtt && !exempt;
    if (hasOT) overtimeDays++;

    return {
      log_date: log.log_date, day_name: log.day_name||'', status: log.status||'present',
      check_in: log.check_in||'', check_out: log.check_out||'', timestamp_raw: log.timestamp_raw||'',
      isFriday, isExempt: exempt, hasAttendance: hasAtt,
      requiredMinutes: requiredMins, actualMinutes: actualMins||0, shortfallMinutes: shortfallMins,
      overtimeDay: hasOT,
    };
  });

  const basicSalary = Number(emp.salary) || 0;
  const housing = Number(emp.housing_allowance) || 0;
  const transport = Number(emp.transport_allowance) || 0;
  const hourlyRate = calcHourlyRate(basicSalary, shiftHours, daysPerMonth);
  const shortfallHours = totalShortfallMinutes / 60;
  const proposedShortfallDeduction = Math.round(shortfallHours * hourlyRate * 100) / 100;
  const fridayAllowance = fridayDays * fridayDailyRate;
  const fridayNote = fridayDays > 0 ? fridayDays + ' أيام جمعة × ' + fridayDailyRate + ' = ' + fridayAllowance + ' ريال' : null;
  const dailyOvertimeAllowance = overtimeDays * overtimeDailyRate;
  const dailyOvertimeNote = overtimeDays > 0 ? overtimeDays + ' يوم × ' + overtimeDailyRate + ' = ' + dailyOvertimeAllowance + ' ريال' : null;
  const isSaudi = (emp.nationality || '').includes('سعودي');
  const gosiDeduction = Math.round(basicSalary * (isSaudi ? 0.0975 : 0.02));

  let approvedShortfallDeduction = 0, shortfallApprovalStatus = 'pending', shortfallApprovalNote = '';
  try {
    const saved = localStorage.getItem('hr_flow_approval_' + (emp.employee_number||emp.id) + '_' + (monthPrefix||'all'));
    if (saved) {
      const ap = JSON.parse(saved);
      shortfallApprovalStatus = ap.status || 'pending';
      if (ap.status === 'approved' || ap.status === 'modified') approvedShortfallDeduction = Number(ap.finalDeduction) || 0;
      shortfallApprovalNote = ap.note || '';
    }
  } catch {}

  const totalAdditions = housing + transport + fridayAllowance + dailyOvertimeAllowance;
  const totalDeductions = gosiDeduction + approvedShortfallDeduction;
  const netSalary = basicSalary + totalAdditions - totalDeductions;

  return {
    emp, shiftName, shift, shiftHours,
    dailyDetails, presentDays, absentDays, leaveDays, fridayDays, overtimeDays,
    totalRequiredMinutes, totalActualMinutes, totalShortfallMinutes,
    shortfallHours: Math.round(shortfallHours * 100) / 100,
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    basicSalary, housing, transport,
    fridayAllowance, fridayNote, fridayDailyRate,
    dailyOvertimeAllowance, dailyOvertimeNote,
    totalAdditions, gosiDeduction,
    proposedShortfallDeduction, approvedShortfallDeduction,
    shortfallApprovalStatus, shortfallApprovalNote,
    totalDeductions, netSalary,
  };
}

export function saveShortfallApproval(employeeNumber, monthPrefix, decision) {
  const record = {
    status: decision.status,
    finalDeduction: Number(decision.finalDeduction) || 0,
    note: decision.note || '',
    approvedBy: decision.approvedBy || 'المدير العام',
    approvedAt: new Date().toISOString(),
  };
  try { localStorage.setItem('hr_flow_approval_' + employeeNumber + '_' + monthPrefix, JSON.stringify(record)); } catch {}
  appendAuditLog({ action: 'shortfall_' + decision.status, employeeNumber, monthPrefix, ...record });
  return record;
}

export function getShortfallApproval(employeeNumber, monthPrefix) {
  try {
    const saved = localStorage.getItem('hr_flow_approval_' + employeeNumber + '_' + monthPrefix);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

export function appendAuditLog(entry) {
  try {
    const existing = JSON.parse(localStorage.getItem('hr_flow_audit_log') || '[]');
    existing.unshift({ id: 'audit_' + Date.now(), timestamp: new Date().toISOString(), ...entry });
    localStorage.setItem('hr_flow_audit_log', JSON.stringify(existing.slice(0, 500)));
  } catch {}
}

export function getAuditLog() {
  try { return JSON.parse(localStorage.getItem('hr_flow_audit_log') || '[]'); }
  catch { return []; }
}

export function formatMinutes(m) {
  if (m === null || m === undefined) return '—';
  const h = Math.floor(Math.abs(m) / 60);
  const min = Math.round(Math.abs(m) % 60);
  if (h === 0 && min === 0) return '0 د';
  if (h === 0) return min + ' د';
  if (min === 0) return h + ' س';
  return h + ' س ' + min + ' د';
}

export function formatHours(hours) {
  if (!hours && hours !== 0) return '—';
  const h = Math.floor(Math.abs(hours));
  const m = Math.round((Math.abs(hours) - h) * 60);
  if (h === 0 && m === 0) return '0:00';
  return h + ':' + m.toString().padStart(2, '0');
}

export function formatTimeDisplay(timeStr) {
  if (!timeStr) return '—';
  try {
    let h, m;
    if (timeStr.toString().includes('T')) {
      const d = new Date(timeStr);
      h = d.getHours();
      m = d.getMinutes().toString().padStart(2, '0');
    } else {
      const parts = timeStr.replace(/\./g, ':').split(':');
      h = parseInt(parts[0], 10);
      m = (parts[1] || '00').padStart(2, '0');
    }
    const ap = h >= 12 ? 'م' : 'ص';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return h + ':' + m + ' ' + ap;
  } catch {
    return timeStr;
  }
}
