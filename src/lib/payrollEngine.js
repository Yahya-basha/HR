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
  // A real punch must have check_out, or actual total_hours > 0, or raw punches
  if (log.check_in && log.check_out && log.check_in !== '—' && log.check_out !== '—') return true;
  if (log.total_hours && Number(log.total_hours) > 0) return true;
  if (log.actual_minutes && log.actual_minutes > 0) return true;
  return false;
}

export function isDayExempt(log) {
  if (!log) return false;
  const status = (log.status || '').toLowerCase();
  const label = (log.statusLabel || log.status_label || '').toLowerCase();
  
  // Paid leaves and exemptions (Zero shortfall deduction)
  if (status === 'annual_leave' || status === 'إجازة سنوية' || status === 'اجازة سنوية' ||
      status === 'sick_leave' || status === 'إجازة مرضية' || status === 'اجازة مرضية' ||
      status === 'emergency_leave' || status === 'إجازة اضطرارية' ||
      status === 'exempt' || status === 'معفى' || status.includes('عطلة') || status === 'weekend' ||
      status === 'on_leave' || status === 'leave' || label.includes('إجازة') || label.includes('اجاز') || label.includes('معفى')) {
    return true;
  }
  return false;
}

export function isFriday(log) {
  if (!log) return false;
  if (log.log_date) {
    const d = new Date(log.log_date + 'T12:00:00Z');
    if (d.getUTCDay() === 5) return true; // 5 = Friday
  }
  const name = (log.day_name || '').toLowerCase();
  if (name.includes('جمع') || name.includes('fri')) return true;
  return false;
}

export function isFridayAttendance(log) {
  return isFriday(log);
}

export function getStandardShiftPunches(shiftNameOrObj) {
  const name = (typeof shiftNameOrObj === 'string' ? shiftNameOrObj : (shiftNameOrObj?.name || '')).toLowerCase();
  
  if (name.includes('9 ساعات') || name.includes('إضافي 100')) {
    return {
      isSplit: true,
      p1In: '09:00',
      p1Out: '13:00',
      p2In: '16:00',
      p2Out: '21:00',
      totalHours: 9,
      raw: '09:00:00 -- 13:00:00 & 16:00:00 -- 21:00:00'
    };
  }
  if (name.includes('غير سعودي') || name.includes('8 ساعات') || name.includes('فترتين')) {
    return {
      isSplit: true,
      p1In: '08:00',
      p1Out: '12:00',
      p2In: '16:00',
      p2Out: '20:00',
      totalHours: 8,
      raw: '08:00:00 -- 12:00:00 & 16:00:00 -- 20:00:00'
    };
  }
  if (name.includes('سعودي صباحي') || name.includes('صباحي')) {
    return {
      isSplit: false,
      p1In: '08:00',
      p1Out: '13:00',
      p2In: '',
      p2Out: '',
      totalHours: 5,
      raw: '08:00:00 -- 13:00:00'
    };
  }
  if (name.includes('سعودي مسائي') || name.includes('مسائي')) {
    return {
      isSplit: false,
      p1In: '16:00',
      p1Out: '21:00',
      p2In: '',
      p2Out: '',
      totalHours: 5,
      raw: '16:00:00 -- 21:00:00'
    };
  }
  if (name.includes('مدير') || name.includes('الإدارة العامة')) {
    return {
      isSplit: false,
      p1In: '09:00',
      p1Out: '17:00',
      p2In: '',
      p2Out: '',
      totalHours: 8,
      raw: '09:00:00 -- 17:00:00'
    };
  }
  if (name.includes('رمضان')) {
    return {
      isSplit: false,
      p1In: '20:30',
      p1Out: '02:00',
      p2In: '',
      p2Out: '',
      totalHours: 5.5,
      raw: '20:30:00 -- 02:00:00'
    };
  }
  // Default 8-hour single shift
  return {
    isSplit: false,
    p1In: '08:00',
    p1Out: '16:00',
    p2In: '',
    p2Out: '',
    totalHours: 8,
    raw: '08:00:00 -- 16:00:00'
  };
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

  const empNum = String(emp.employee_number || '').trim();
  const empId = String(emp.id || '').trim();
  const empName = (emp.full_name || '').trim();

  const empLogs = (allLogs || []).filter(l => {
    const lUser = String(l.user_id || l.employee_id || '').trim();
    const lNum = String(l.employee_number || '').trim();
    const lName = (l.employee_name || '').trim();

    const match = (lUser && (lUser === empId || lUser === empNum || lUser === `emp_${empNum}`)) ||
                  (lNum && (lNum === empNum || lNum === empId || `emp_${lNum}` === empId)) ||
                  (lName && empName && (lName === empName || lName.includes(empName) || empName.includes(lName)));
    if (!match) return false;
    if (monthPrefix && l.log_date && !l.log_date.startsWith(monthPrefix)) return false;
    return true;
  });

  const dateMap = {};
  empLogs.forEach(l => {
    const existing = dateMap[l.log_date];
    if (!existing) {
      dateMap[l.log_date] = l;
    } else {
      const existingHrs = Number(existing.total_hours || calcActualMinutes(existing)) || 0;
      const newHrs = Number(l.total_hours || calcActualMinutes(l)) || 0;
      if (newHrs >= existingHrs) {
        dateMap[l.log_date] = l;
      }
    }
  });
  const uniqueLogs = Object.values(dateMap).sort((a, b) => (a.log_date || '').localeCompare(b.log_date || ''));

  let totalRequiredMinutes = 0, totalActualMinutes = 0;
  let totalDelayMinutes = 0, totalExtraMinutes = 0;
  let presentDays = 0, absentDays = 0, leaveDays = 0, unpaidLeaveDays = 0, fridayDays = 0, fridayWorkedDays = 0, overtimeDays = 0;

  const isExecutive = (emp.job_title || '').includes('المدير العام') || String(emp.employee_number || '') === '1001' || (emp.shift || '').includes('المدير العام') || (emp.shift || '').includes('إدارة عامة');

  const dailyDetails = uniqueLogs.map(log => {
    const isFri = isFriday(log);
    const exempt = isDayExempt(log) || (isExecutive && !isFri);
    const hasAtt = hasRealBiometricPunches(log) || (isExecutive && !!log.check_in);
    const status = (log.status || 'present').toLowerCase();
    const isUnpaidLeave = status === 'unpaid_leave' || status === 'إجازة بدون راتب' || status === 'اجازة بدون راتب';
    
    let actualMins = calcActualMinutes(log);

    // For Executive Manager with check-in, full hours credited
    if (isExecutive && (log.check_in || hasAtt)) {
      actualMins = shiftHours * 60;
    }

    let requiredMins = 0, shortfallMins = 0;

    if (isFri) {
      // 1. IT IS FRIDAY (Weekly Official Holiday - Never marked as Absent!)
      requiredMins = 0;
      shortfallMins = 0;
      fridayDays++;
      if (hasAtt) {
        // Punched on Friday -> Attendance on Weekend / Overtime Allowance credited!
        fridayWorkedDays++;
        presentDays++;
        actualMins = actualMins || (shiftHours * 60);
      } else {
        actualMins = 0;
      }
    } else if (isUnpaidLeave) {
      // 2. UNPAID LEAVE (0 required, 0 shortfall minutes, deducted as a day deduction in Stage 2)
      unpaidLeaveDays++;
      requiredMins = 0;
      actualMins = 0;
      shortfallMins = 0;
    } else if (exempt) {
      // 3. EXEMPT / PAID LEAVE DAY (Annual, Sick, Emergency, or Admin Exemption)
      requiredMins = 0;
      shortfallMins = 0;
      actualMins = actualMins || 0;
      if (status.includes('إجازة') || status === 'on_leave' || status === 'leave') leaveDays++;
      else if (isExecutive) presentDays++;
    } else if (hasAtt) {
      // 4. REGULAR WORKING DAY WITH ATTENDANCE
      presentDays++;
      requiredMins = shiftHours * 60;
      totalRequiredMinutes += requiredMins;
      const actual = actualMins || 0;
      totalActualMinutes += actual;

      if (actual < requiredMins) {
        // Late / Delay on attended work day
        const delay = requiredMins - actual;
        shortfallMins = delay;
        totalDelayMinutes += delay;
      } else if (actual > requiredMins) {
        // Extra time / Overtime on attended work day
        const extra = actual - requiredMins;
        shortfallMins = 0;
        totalExtraMinutes += extra;
      } else {
        shortfallMins = 0;
      }
    } else if (isExecutive && (log.check_in || hasAtt)) {
      // 5. EXECUTIVE
      requiredMins = shiftHours * 60;
      totalRequiredMinutes += requiredMins;
      totalActualMinutes += requiredMins;
      shortfallMins = 0;
      presentDays++;
    } else {
      // 6. ABSENCE DAY (Regular working day, not Friday, not exempt, no punches)
      // Counted under absentDays, NOT added to delay shortfall minutes!
      absentDays++;
      requiredMins = shiftHours * 60;
      totalRequiredMinutes += requiredMins;
      shortfallMins = 0; // NOT added to shortfall delay hours!
      actualMins = 0;
    }

    const hasOT = !isFri && !!(shift && shift.has_overtime) && hasAtt && !exempt;
    if (hasOT) overtimeDays++;

    // Format display values
    const displayCheckIn = (hasAtt || isExecutive) ? (log.check_in || '') : '';
    const displayCheckOut = (hasAtt || isExecutive) ? (log.check_out || (isExecutive ? '16:00' : '')) : '';
    const displayP1In = (hasAtt || isExecutive) ? (log.period_1_in || '') : '';
    const displayP1Out = (hasAtt || isExecutive) ? (log.period_1_out || '') : '';
    const displayP2In = (hasAtt || isExecutive) ? (log.period_2_in || '') : '';
    const displayP2Out = (hasAtt || isExecutive) ? (log.period_2_out || '') : '';

    let rowStatus = 'present';
    if (isFri) {
      rowStatus = 'weekend';
    } else if (isUnpaidLeave) {
      rowStatus = 'unpaid_leave';
    } else if (exempt) {
      rowStatus = 'exempt';
    } else if (!hasAtt) {
      rowStatus = 'absent';
    } else if (shortfallMins > 0) {
      rowStatus = 'late';
    } else {
      rowStatus = 'present';
    }

    return {
      ...log,
      log_date: log.log_date,
      day_name: log.day_name || '',
      status: rowStatus,
      check_in: displayCheckIn,
      check_out: displayCheckOut,
      period_1_in: displayP1In,
      period_1_out: displayP1Out,
      period_2_in: displayP2In,
      period_2_out: displayP2Out,
      timestamp_raw: hasAtt ? (log.timestamp_raw || '') : '',
      isFriday: isFri,
      isUnpaidLeave,
      isExempt: exempt,
      hasAttendance: hasAtt,
      requiredMinutes: requiredMins,
      actualMinutes: hasAtt ? (actualMins || 0) : 0,
      shortfallMinutes: shortfallMins,
      overtimeDay: hasOT,
    };
  });

  // ─── SALARY, RATES, AND OFFSETTING (المقاصة التلقائية بين الإضافي والتأخير) ────
  const basicSalary = Number(emp.salary) || 0;
  const housing = Number(emp.housing_allowance) || 0;
  const transport = Number(emp.transport_allowance) || 0;
  const hourlyRate = calcHourlyRate(basicSalary, shiftHours, daysPerMonth);
  const dailySalaryRate = Math.round((basicSalary / daysPerMonth) * 100) / 100;

  // AUTOMATIC NETTING: Deduct extra overtime minutes from delay shortfall minutes
  const netShortfallMinutes = Math.max(0, totalDelayMinutes - totalExtraMinutes);
  const netExtraMinutes = Math.max(0, totalExtraMinutes - totalDelayMinutes);
  const totalShortfallMinutes = netShortfallMinutes;

  const shortfallHours = totalShortfallMinutes / 60;
  const proposedShortfallDeduction = Math.round(shortfallHours * hourlyRate * 100) / 100;

  // ABSENCE AND UNPAID LEAVE DEDUCTIONS
  const proposedAbsenceDeduction = Math.round(absentDays * dailySalaryRate * 100) / 100;
  const proposedUnpaidLeaveDeduction = Math.round(unpaidLeaveDays * dailySalaryRate * 100) / 100;

  // Friday allowance ONLY for days with real biometric attendance on Friday
  const fridayAllowance = fridayWorkedDays * fridayDailyRate;
  const fridayNote = fridayWorkedDays > 0 ? `${fridayWorkedDays} جمعات دوام فعلي × ${fridayDailyRate} = ${fridayAllowance} ريال` : null;
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
    } else {
      // Default to proposed delay deduction
      approvedShortfallDeduction = proposedShortfallDeduction;
    }
  } catch {
    approvedShortfallDeduction = proposedShortfallDeduction;
  }

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
  const totalDeductions = approvedShortfallDeduction + proposedAbsenceDeduction + proposedUnpaidLeaveDeduction + customPenaltiesTotal + advanceInstallment;
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
    unpaidLeaveDays,
    fridayDays,
    fridayWorkedDays,
    overtimeDays,
    totalRequiredMinutes,
    totalActualMinutes,
    totalDelayMinutes,
    totalExtraMinutes,
    netExtraMinutes,
    totalShortfallMinutes,
    shortfallHours: Math.round(shortfallHours * 100) / 100,
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    dailySalaryRate,
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
    proposedAbsenceDeduction,
    proposedUnpaidLeaveDeduction,
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


// ============================================================================
// LOCKED MONTHLY PAYROLLS (ARCHIVE & CLOUD SNAPSHOTS)
// ============================================================================

export function getLockedMonthlyPayrolls() {
  try {
    return JSON.parse(localStorage.getItem('hr_flow_locked_payrolls_list') || '[]');
  } catch {
    return [];
  }
}

export function isMonthLocked(monthPrefix) {
  const list = getLockedMonthlyPayrolls();
  return list.some(m => m.month_prefix === monthPrefix && m.status === 'locked');
}

export function getLockedMonthlyPayroll(monthPrefix) {
  try {
    const data = localStorage.getItem('hr_flow_locked_payroll_' + monthPrefix);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveLockedMonthlyPayroll(monthPrefix, snapshotData, approvedBy = 'فهد ناصر محمد الجوعي (المدير العام)') {
  const record = {
    id: 'lock_' + monthPrefix.replace('-', '_'),
    month_prefix: monthPrefix,
    title: 'مسير رواتب شهر ' + (parseInt(monthPrefix.split('-')[1], 10)) + ' (' + monthPrefix + ')',
    totals: snapshotData.totals || {},
    payrolls: snapshotData.payrolls || [],
    employee_count: snapshotData.payrolls?.length || 0,
    status: 'locked',
    locked_at: new Date().toISOString(),
    locked_by: approvedBy,
  };

  // 1. Save specific snapshot
  localStorage.setItem('hr_flow_locked_payroll_' + monthPrefix, JSON.stringify(record));

  // 2. Update master locked list
  let list = getLockedMonthlyPayrolls();
  list = list.filter(m => m.month_prefix !== monthPrefix);
  list.unshift({
    month_prefix: record.month_prefix,
    title: record.title,
    totals: record.totals,
    employee_count: record.employee_count,
    status: 'locked',
    locked_at: record.locked_at,
    locked_by: record.locked_by
  });
  localStorage.setItem('hr_flow_locked_payrolls_list', JSON.stringify(list));

  // 3. Audit trail
  appendAuditLog({
    action: 'monthly_payroll_locked',
    monthPrefix,
    title: record.title,
    totalNet: record.totals?.net,
    employeeCount: record.employee_count,
    approvedBy,
  });

  return record;
}

export function unlockMonthlyPayroll(monthPrefix, reason = 'تعديل طارئ', unlockedBy = 'مدير النظام العام') {
  localStorage.removeItem('hr_flow_locked_payroll_' + monthPrefix);
  
  let list = getLockedMonthlyPayrolls();
  list = list.filter(m => m.month_prefix !== monthPrefix);
  localStorage.setItem('hr_flow_locked_payrolls_list', JSON.stringify(list));

  appendAuditLog({
    action: 'monthly_payroll_unlocked',
    monthPrefix,
    note: reason,
    approvedBy: unlockedBy,
  });
}
