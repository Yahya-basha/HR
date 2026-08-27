// ============================================================================
// PAYROLL ENGINE - FINANCIAL CALCULATIONS & BUSINESS LOGIC
// Includes: Shortfall hours, Friday overtime, Daily overtime, GOSI,
// Penalties & Disciplinary deductions, Bonuses & Sales incentives,
// Employee Advances & Loans with Debt Protection & Audit trail.
// ============================================================================

export function getPayrollSettings() {
  try {
    const saved = localStorage.getItem('hr_flow_payroll_settings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    fridayDailyRate: 50,
    overtimeDailyRate: 100,
    daysPerMonth: 30,
    lateGraceMinutes: 15,
  };
}

export function savePayrollSettings(settings) {
  try {
    localStorage.setItem('hr_flow_payroll_settings', JSON.stringify(settings));
    appendAuditLog({
      action: 'settings_updated',
      details: settings,
      user: 'المدير العام',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to save payroll settings:', e);
  }
}

export function calcHourlyRate(basicSalary, shiftRequiredHours, daysPerMonth = 30) {
  if (!basicSalary || basicSalary <= 0 || !shiftRequiredHours || shiftRequiredHours <= 0) return 0;
  return basicSalary / daysPerMonth / shiftRequiredHours;
}

export function getShiftRequiredHours(shift) {
  if (!shift) return 8;
  const directHours = Number(shift.working_hours || shift.hours || shift.required_hours);
  if (directHours > 0) return directHours;

  const type = (shift.type || '').toLowerCase();
  const name = (shift.name || '').toLowerCase();

  if (type === 'dual' || name.includes('فترت') || name.includes('غير سعودي') || name.includes('dual')) {
    return 8;
  }
  if (type === 'single' || name.includes('صباح') || name.includes('مساء') || name.includes('سعودي')) {
    return 8;
  }
  if (name.includes('مدير') || name.includes('مرن') || type === 'flexible') {
    return 8;
  }
  return 8;
}

export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  try {
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return null;
      return d.getHours() * 60 + d.getMinutes();
    }
    const clean = timeStr.replace(/[^0-9:]/g, '');
    const parts = clean.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
    }
  } catch {}
  return null;
}

export function extractTimes(str) {
  if (!str || typeof str !== 'string') return [];
  const matches = str.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g) || [];
  return matches.map(t => {
    const parts = t.split(':');
    return parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0');
  });
}

export function calcActualMinutes(log) {
  if (!log) return 0;

  if (log.total_hours && Number(log.total_hours) > 0) {
    return Math.round(Number(log.total_hours) * 60);
  }

  const raw = log.timestamp_raw || log.punches_raw || '';
  const times = extractTimes(raw);

  if (times.length >= 4) {
    const m1In = parseTimeToMinutes(times[0]);
    const m1Out = parseTimeToMinutes(times[1]);
    const m2In = parseTimeToMinutes(times[2]);
    const m2Out = parseTimeToMinutes(times[3]);

    let dur1 = 0;
    if (m1In !== null && m1Out !== null) {
      dur1 = m1Out >= m1In ? m1Out - m1In : (m1Out + 1440) - m1In;
    }
    let dur2 = 0;
    if (m2In !== null && m2Out !== null) {
      dur2 = m2Out >= m2In ? m2Out - m2In : (m2Out + 1440) - m2In;
    }
    const total = dur1 + dur2;
    if (total > 0 && total <= 1440) return total;
  }

  if (times.length === 2) {
    const inM = parseTimeToMinutes(times[0]);
    const outM = parseTimeToMinutes(times[1]);
    if (inM !== null && outM !== null) {
      const dur = outM >= inM ? outM - inM : (outM + 1440) - inM;
      if (dur > 0 && dur <= 1440) return dur;
    }
  }

  if (log.check_in && log.check_out) {
    const inM = parseTimeToMinutes(log.check_in);
    const outM = parseTimeToMinutes(log.check_out);
    if (inM !== null && outM !== null) {
      const dur = outM >= inM ? outM - inM : (outM + 1440) - inM;
      if (dur > 0 && dur <= 1440) return dur;
    }
  }

  return 0;
}

export function hasRealBiometricPunches(log) {
  if (!log) return false;
  const raw = (log.timestamp_raw || log.punches_raw || '').trim();
  if (raw && extractTimes(raw).length > 0) return true;
  if (log.check_in && log.check_in !== '—' && log.check_in !== '') return true;
  if (log.check_out && log.check_out !== '—' && log.check_out !== '') return true;
  return false;
}

export function isDayExempt(log) {
  if (!log) return false;
  const status = (log.status || '').toLowerCase();
  const label = (log.statusLabel || log.status_label || '').toLowerCase();
  if (status === 'exempt' || status === 'معفى' || status.includes('عطلة') || status === 'weekend') return true;
  if (label.includes('معفى') || label.includes('عطلة')) return true;
  if (status === 'on_leave' || status === 'leave' || label.includes('إجازة') || label.includes('اجاز')) return true;
  return false;
}

export function isFridayAttendance(log) {
  if (!log) return false;
  const isFri = (log.day_name && (log.day_name.includes('جمع') || log.day_name.toLowerCase().includes('fri'))) ||
                (log.log_date && new Date(log.log_date).getDay() === 5);
  if (!isFri) return false;
  if (!hasRealBiometricPunches(log)) return false;
  const status = (log.status || '').toLowerCase();
  if (status === 'absent' || status === 'not_started') return false;
  return true;
}

// ============================================================================
// EMPLOYEE ADVANCES & LOANS MANAGEMENT
// ============================================================================

export function getAdvances() {
  try {
    return JSON.parse(localStorage.getItem('hr_flow_employee_advances') || '[]');
  } catch {
    return [];
  }
}

export function saveAdvance(advanceData) {
  const advances = getAdvances();
  const newAdvance = {
    id: advanceData.id || ('adv_' + Date.now()),
    employee_id: advanceData.employee_id || '',
    employee_number: String(advanceData.employee_number || '').trim(),
    employee_name: advanceData.employee_name || '',
    total_amount: Number(advanceData.total_amount) || 0,
    monthly_installment: Number(advanceData.monthly_installment) || 0,
    total_installments: Number(advanceData.total_installments) || 1,
    paid_installments: Number(advanceData.paid_installments) || 0,
    paid_amount: Number(advanceData.paid_amount) || 0,
    remaining_balance: Number(advanceData.remaining_balance) !== undefined ? Number(advanceData.remaining_balance) : (Number(advanceData.total_amount) || 0),
    start_month: advanceData.start_month || '2026-08',
    disbursement_date: advanceData.disbursement_date || new Date().toISOString().split('T')[0],
    reason: advanceData.reason || 'سلفة شخصية',
    status: advanceData.status || 'active', // 'active', 'completed', 'cancelled'
    approved_by: advanceData.approved_by || 'المدير العام',
    created_at: advanceData.created_at || new Date().toISOString(),
    history: advanceData.history || []
  };

  const idx = advances.findIndex(a => a.id === newAdvance.id);
  if (idx !== -1) {
    advances[idx] = newAdvance;
  } else {
    advances.unshift(newAdvance);
  }

  localStorage.setItem('hr_flow_employee_advances', JSON.stringify(advances));
  appendAuditLog({
    action: idx !== -1 ? 'advance_updated' : 'advance_created',
    employeeNumber: newAdvance.employee_number,
    amount: newAdvance.total_amount,
    installment: newAdvance.monthly_installment,
    note: newAdvance.reason,
    approvedBy: newAdvance.approved_by,
  });

  return newAdvance;
}

export function getEmployeeActiveAdvance(employeeNumber) {
  const advances = getAdvances();
  const cleanNum = String(employeeNumber || '').trim();
  return advances.find(a => a.employee_number === cleanNum && a.status === 'active' && a.remaining_balance > 0) || null;
}

export function recordAdvanceInstallmentPayment(advanceId, monthPrefix, paidAmount) {
  const advances = getAdvances();
  const idx = advances.findIndex(a => a.id === advanceId);
  if (idx === -1) return null;

  const adv = advances[idx];
  const amount = Number(paidAmount) || adv.monthly_installment;
  
  adv.paid_amount = (Number(adv.paid_amount) || 0) + amount;
  adv.remaining_balance = Math.max(0, adv.total_amount - adv.paid_amount);
  adv.paid_installments = (Number(adv.paid_installments) || 0) + 1;
  
  if (adv.remaining_balance <= 0) {
    adv.status = 'completed';
    adv.remaining_balance = 0;
  }

  if (!adv.history) adv.history = [];
  adv.history.push({
    month: monthPrefix,
    amount,
    paid_at: new Date().toISOString(),
    remaining_after: adv.remaining_balance
  });

  localStorage.setItem('hr_flow_employee_advances', JSON.stringify(advances));
  return adv;
}

// ============================================================================
// PAYROLL ADJUSTMENTS (BONUSES & PENALTIES)
// ============================================================================

export function getAdjustments() {
  try {
    return JSON.parse(localStorage.getItem('hr_flow_payroll_adjustments') || '[]');
  } catch {
    return [];
  }
}

export function saveAdjustment(adjData) {
  const adjustments = getAdjustments();
  const newAdj = {
    id: adjData.id || ('adj_' + Date.now()),
    type: adjData.type || 'bonus', // 'bonus' or 'penalty'
    category: adjData.category || 'general', // 'sales_incentive', 'daily_overtime', 'performance', 'delay_penalty', 'absence_penalty', 'disciplinary'
    employee_id: adjData.employee_id || '',
    employee_number: String(adjData.employee_number || '').trim(),
    employee_name: adjData.employee_name || '',
    month_prefix: adjData.month_prefix || '2026-08',
    amount: Number(adjData.amount) || 0,
    days_count: Number(adjData.days_count) || 0,
    reason: adjData.reason || '',
    status: adjData.status || 'approved', // 'approved', 'pending', 'rejected'
    approved_by: adjData.approved_by || 'المدير العام',
    created_at: adjData.created_at || new Date().toISOString(),
  };

  const idx = adjustments.findIndex(a => a.id === newAdj.id);
  if (idx !== -1) {
    adjustments[idx] = newAdj;
  } else {
    adjustments.unshift(newAdj);
  }

  localStorage.setItem('hr_flow_payroll_adjustments', JSON.stringify(adjustments));
  appendAuditLog({
    action: newAdj.type === 'bonus' ? 'bonus_approved' : 'penalty_approved',
    employeeNumber: newAdj.employee_number,
    monthPrefix: newAdj.month_prefix,
    amount: newAdj.amount,
    note: newAdj.reason,
    approvedBy: newAdj.approved_by,
  });

  return newAdj;
}

export function deleteAdjustment(adjId) {
  let adjustments = getAdjustments();
  adjustments = adjustments.filter(a => a.id !== adjId);
  localStorage.setItem('hr_flow_payroll_adjustments', JSON.stringify(adjustments));
}

export function getEmployeeAdjustments(employeeNumber, monthPrefix) {
  const adjustments = getAdjustments();
  const cleanNum = String(employeeNumber || '').trim();
  return adjustments.filter(a => 
    a.employee_number === cleanNum && 
    (!monthPrefix || a.month_prefix === monthPrefix) &&
    a.status === 'approved'
  );
}

// ============================================================================
// MAIN PAYROLL CALCULATION ENGINE
// ============================================================================

export function computeEmployeePayroll(emp, allLogs, allShifts, settings = {}) {
  const {
    fridayDailyRate = 50,
    overtimeDailyRate = 100,
    daysPerMonth = 30,
    monthPrefix = '2026-08',
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
  const uniqueLogs = Object.values(dateMap).sort((a, b) => (a.log_date || '').localeCompare(b.log_date || ''));

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
      requiredMins = shiftHours * 60;
      totalRequiredMinutes += requiredMins;
      const actual = actualMins || 0;
      totalActualMinutes += actual;
      shortfallMins = Math.max(0, requiredMins - actual);
      totalShortfallMinutes += shortfallMins;
      presentDays++;
    } else if (!exempt && !isFriday && !hasAtt && (status === 'absent' || status === 'غائب')) {
      absentDays++;
      requiredMins = shiftHours * 60;
      totalRequiredMinutes += requiredMins;
      shortfallMins = requiredMins;
      totalShortfallMinutes += shortfallMins;
    } else if (exempt) {
      if (status.includes('إجازة') || status === 'on_leave' || status === 'leave') leaveDays++;
    }
    
    if (isFriday && hasAtt) {
      fridayDays++;
      presentDays++;
    }
    
    const hasOT = !isFriday && !!(shift && shift.has_overtime) && hasAtt && !exempt;
    if (hasOT) overtimeDays++;

    return {
      log_date: log.log_date,
      day_name: log.day_name || '',
      status: log.status || 'present',
      check_in: log.check_in || '',
      check_out: log.check_out || '',
      timestamp_raw: log.timestamp_raw || '',
      isFriday,
      isExempt: exempt,
      hasAttendance: hasAtt,
      requiredMinutes: requiredMins,
      actualMinutes: actualMins || 0,
      shortfallMinutes: shortfallMins,
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
  const fridayNote = fridayDays > 0 ? `${fridayDays} أيام جمعة × ${fridayDailyRate} = ${fridayAllowance} ريال` : null;
  const dailyOvertimeAllowance = overtimeDays * overtimeDailyRate;
  const dailyOvertimeNote = overtimeDays > 0 ? `${overtimeDays} يوم × ${overtimeDailyRate} = ${dailyOvertimeAllowance} ريال` : null;

  // GOSI: 100% employer paid (zero deduction from employee)
  const isInsured = emp.is_insured === true || emp.is_insured === 'true';
  const gosiNumber = isInsured ? (emp.gosi_number || ('GSI-' + (emp.employee_number || '0000'))) : '';
  const gosiDeduction = 0;

  // Shortfall Approval
  let approvedShortfallDeduction = 0, shortfallApprovalStatus = 'pending', shortfallApprovalNote = '';
  try {
    const saved = localStorage.getItem('hr_flow_approval_' + (emp.employee_number || emp.id) + '_' + (monthPrefix || 'all'));
    if (saved) {
      const ap = JSON.parse(saved);
      shortfallApprovalStatus = ap.status || 'pending';
      if (ap.status === 'approved' || ap.status === 'modified') {
        approvedShortfallDeduction = Number(ap.finalDeduction) || 0;
      }
      shortfallApprovalNote = ap.note || '';
    }
  } catch {}

  // 1. CUSTOM APPROVED BONUSES & INCENTIVES
  const empAdjustments = getEmployeeAdjustments(emp.employee_number || emp.id, monthPrefix);
  const approvedBonuses = empAdjustments.filter(a => a.type === 'bonus');
  const customBonusesTotal = approvedBonuses.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);

  // 2. CUSTOM APPROVED PENALTIES & DEDUCTIONS
  const approvedPenalties = empAdjustments.filter(a => a.type === 'penalty');
  const customPenaltiesTotal = approvedPenalties.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  // 3. EMPLOYEE ADVANCE / LOAN INSTALLMENT
  const activeAdvance = getEmployeeActiveAdvance(emp.employee_number || emp.id);
  let advanceInstallment = 0;
  let advanceRemaining = 0;
  let advanceNote = '';

  if (activeAdvance) {
    advanceInstallment = Math.min(activeAdvance.monthly_installment, activeAdvance.remaining_balance);
    advanceRemaining = Math.max(0, activeAdvance.remaining_balance - advanceInstallment);
    advanceNote = `قسط ${(activeAdvance.paid_installments || 0) + 1}/${activeAdvance.total_installments} — متبقي بعد الخصم: ${advanceRemaining.toLocaleString('en-US')} ر.س`;
  }

  // TOTALS CALCULATION
  const totalAdditions = housing + transport + fridayAllowance + dailyOvertimeAllowance + customBonusesTotal;
  const totalDeductions = approvedShortfallDeduction + customPenaltiesTotal + advanceInstallment;
  const netSalary = Math.max(0, basicSalary + totalAdditions - totalDeductions);

  return {
    emp,
    shiftName,
    shift,
    shiftHours,
    dailyDetails,
    presentDays,
    absentDays,
    leaveDays,
    fridayDays,
    overtimeDays,
    totalRequiredMinutes,
    totalActualMinutes,
    totalShortfallMinutes,
    shortfallHours: Math.round(shortfallHours * 100) / 100,
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    basicSalary,
    housing,
    transport,
    fridayAllowance,
    fridayNote,
    fridayDailyRate,
    dailyOvertimeAllowance,
    dailyOvertimeNote,
    isInsured,
    gosiNumber,
    gosiDeduction,
    proposedShortfallDeduction,
    approvedShortfallDeduction,
    shortfallApprovalStatus,
    shortfallApprovalNote,
    // Bonuses, Penalties, Advances
    approvedBonuses,
    customBonusesTotal,
    approvedPenalties,
    customPenaltiesTotal,
    activeAdvance,
    advanceInstallment,
    advanceRemaining,
    advanceNote,
    totalAdditions,
    totalDeductions,
    netSalary,
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
  try {
    localStorage.setItem('hr_flow_approval_' + employeeNumber + '_' + monthPrefix, JSON.stringify(record));
  } catch {}
  appendAuditLog({ action: 'shortfall_' + decision.status, employeeNumber, monthPrefix, ...record });
  return record;
}

export function getShortfallApproval(employeeNumber, monthPrefix) {
  try {
    const saved = localStorage.getItem('hr_flow_approval_' + employeeNumber + '_' + monthPrefix);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function appendAuditLog(entry) {
  try {
    const existing = JSON.parse(localStorage.getItem('hr_flow_audit_log') || '[]');
    existing.unshift({
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      ...entry
    });
    localStorage.setItem('hr_flow_audit_log', JSON.stringify(existing.slice(0, 500)));
  } catch {}
}

export function getAuditLog() {
  try {
    return JSON.parse(localStorage.getItem('hr_flow_audit_log') || '[]');
  } catch {
    return [];
  }
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
