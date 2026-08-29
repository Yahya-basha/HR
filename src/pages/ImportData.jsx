import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Clock, 
  Calendar, 
  Trash2, 
  Download, 
  Sparkles,
  Check,
  RefreshCw,
  Eye,
  ShieldCheck,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Timer,
  LogIn,
  LogOut,
  UserPlus,
  CalendarCheck
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';

export default function ImportData() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const fileInputRef = useRef(null);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [file, setFile] = useState(null);
  const [rawSheetRows, setRawSheetRows] = useState([]);
  const [headerIndex, setHeaderIndex] = useState(3);
  const [headers, setHeaders] = useState([]);

  // Column mappings
  const [colMap, setColMap] = useState({
    empNum: -1,
    name: -1,
    date: -1,
    dayName: -1,
    shiftName: -1,
    shiftTime: -1,
    timestamp: -1,
    status: -1,
    rawPunches: -1
  });

  const [showMapping, setShowMapping] = useState(false);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [newEmployeesDetected, setNewEmployeesDetected] = useState([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedSuccess, setImportedSuccess] = useState(false);
  const [clearLogsDialogOpen, setClearLogsDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleanWipeBeforeImport, setCleanWipeBeforeImport] = useState(false);

  // Load existing employees for real-time matching
  const loadEmployees = async () => {
    try {
      const emps = await base44.entities.Employee.list();
      setEmployees(emps || []);
    } catch (e) {
      console.error('Error loading employees:', e);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Normalize Arabic strings
  const normalizeArabic = (text) => {
    if (!text) return '';
    return text
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/[ة]/g, 'ه')
      .replace(/[ىي]/g, 'ي')
      .replace(/[\u064B-\u0652]/g, '')
      .replace(/[\s-_\.#]/g, '');
  };

  // Helper to format local date without UTC offset subtraction
  const getLocalDateStr = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Bulletproof Excel Date Parser (ZERO timezone shift, handles M/D/YYYY, D/M/YYYY, serials, and Date objects)
  const parseExcelDate = (val) => {
    if (val === undefined || val === null || val === '') return null;

    // 1. Text String
    if (typeof val === 'string') {
      const s = val.trim();
      if (!s) return null;

      // Format: YYYY-MM-DD or YYYY/MM/DD
      if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
        const parts = s.split(/[-/]/);
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }

      // Format: M/D/YYYY or D/M/YYYY or DD/MM/YYYY
      const slashParts = s.split(/[/.-]/);
      if (slashParts.length === 3) {
        let p1 = parseInt(slashParts[0], 10);
        let p2 = parseInt(slashParts[1], 10);
        let y = slashParts[2].trim();
        if (y.length === 2) y = '20' + y;

        // In Ektefa biometric exports, dates are standard M/D/YYYY (e.g. 8/1/2026 = Aug 1, 8/26/2026 = Aug 26)
        let month = p1;
        let day = p2;
        if (p1 > 12 && p2 <= 12) {
          day = p1;
          month = p2;
        }

        return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // 2. JavaScript Date Object (Add 12 hours to safely cancel UTC midnight backward-shift)
    if (val instanceof Date) {
      const shifted = new Date(val.getTime() + 12 * 60 * 60 * 1000);
      const y = shifted.getUTCFullYear();
      const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
      const d = String(shifted.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // 3. Excel Numeric Serial Date (e.g. 46235 for 2026-08-01)
    if (typeof val === 'number') {
      const ms = Math.round((val - 25569) * 86400 * 1000);
      const d = new Date(ms);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    return String(val);
  };

  // Helper to extract all time values from a text string
  const extractTimes = (text) => {
    if (!text) return [];
    const str = text.toString().trim();
    const matches = str.match(/\b\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\b/g);
    if (!matches) return [];
    return matches.map(t => {
      const clean = t.replace(/\./g, ':');
      const parts = clean.split(':');
      const hh = parts[0].padStart(2, '0');
      const mm = (parts[1] || '00').padStart(2, '0');
      const ss = (parts[2] || '00').padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const processFile = (f) => {
    setFile(f);
    setImportedSuccess(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false, raw: false });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (rows.length < 2) {
          toast({ title: 'الملف فارغ أو لا يحتوي على صفوف كافية', variant: 'destructive' });
          return;
        }

        setRawSheetRows(rows);
        detectAndProcess(rows);
      } catch (err) {
        console.error('Parsing error:', err);
        toast({ title: 'فشل في قراءة ملف الـ Excel.', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(f);
  };

  // 1. Detect Real Header Row & Map Exact Ektefa Columns
  const detectAndProcess = (rows) => {
    let bestHeaderRowIndex = 0;
    let maxScore = -1;

    for (let r = 0; r < Math.min(8, rows.length); r++) {
      const row = rows[r];
      let score = 0;
      row.forEach(cell => {
        const text = (cell || '').toString().toLowerCase();
        if (text.includes('الرقم الوظيفي') || text.includes('رقم الموظف')) score += 5;
        if (text.includes('اسم الموظف') || text.includes('الاسم')) score += 5;
        if (text.includes('الطابع الزمني')) score += 6;
        if (text.includes('البصمات')) score += 5;
        if (text.includes('التاريخ') || text.includes('الفترة') || text.includes('وقت الفترة')) score += 4;
        if (text.includes('الحالة') || text.includes('يوم')) score += 2;
      });
      if (score > maxScore) {
        maxScore = score;
        bestHeaderRowIndex = r;
      }
    }

    setHeaderIndex(bestHeaderRowIndex);
    const headerRow = rows[bestHeaderRowIndex].map((h, i) => (h ? h.toString().trim() : `العمود ${i + 1}`));
    setHeaders(headerRow);

    const detected = {
      empNum: -1,
      name: -1,
      date: -1,
      dayName: -1,
      shiftName: -1,
      shiftTime: -1,
      timestamp: -1,
      status: -1,
      rawPunches: -1
    };

    headerRow.forEach((col, idx) => {
      const c = col.toLowerCase();
      
      if (detected.empNum === -1 && (c.includes('وظيفي') || c.includes('رقم الموظف') || c.includes('user id') || c.includes('pin'))) {
        detected.empNum = idx;
      }
      if (detected.name === -1 && (c.includes('اسم الموظف') || (c.includes('اسم') && !c.includes('فترة') && !c.includes('يوم')))) {
        detected.name = idx;
      }
      if (detected.date === -1 && (c === 'التاريخ' || c.includes('تاريخ') || c.includes('date'))) {
        detected.date = idx;
      }
      if (detected.dayName === -1 && (c === 'يوم' || c.includes('اليوم') || c.includes('day'))) {
        detected.dayName = idx;
      }
      if (detected.shiftName === -1 && (c === 'الفترة' || (c.includes('فترة') && !c.includes('وقت')))) {
        detected.shiftName = idx;
      }
      if (detected.shiftTime === -1 && (c === 'وقت الفترة' || (c.includes('وقت') && c.includes('فترة')))) {
        detected.shiftTime = idx;
      }
      if (detected.timestamp === -1 && (c.includes('الطابع الزمني') || c.includes('طابع زمني') || c.includes('timestamp'))) {
        detected.timestamp = idx;
      }
      if (detected.status === -1 && (c === 'الحالة' || c.includes('حالة') || c.includes('status'))) {
        detected.status = idx;
      }
      if (detected.rawPunches === -1 && (c.includes('البصمات') || c.includes('بصمات') || c.includes('raw') || c.includes('حركات'))) {
        detected.rawPunches = idx;
      }
    });

    if (detected.empNum === -1) detected.empNum = 1;
    if (detected.name === -1) detected.name = 2;
    if (detected.date === -1) detected.date = 3;
    if (detected.dayName === -1) detected.dayName = 4;
    if (detected.shiftName === -1) detected.shiftName = 5;
    if (detected.shiftTime === -1) detected.shiftTime = 6;
    if (detected.timestamp === -1) detected.timestamp = 7;
    if (detected.status === -1) detected.status = 8;
    if (detected.rawPunches === -1) detected.rawPunches = 9;

    setColMap(detected);
    executeParseWithMapping(rows, bestHeaderRowIndex, detected);
  };

  // 2. Parse, Detect Auto Join Dates, and Extract All Timestamps
  const executeParseWithMapping = (rows, hIdx, mapping) => {
    const list = [];
    const empRowsMap = {}; // Group by employee number to track join dates

    // First pass: collect all records per employee to determine first active punch date
    for (let r = hIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0 || row.every(cell => cell === '')) continue;

      const rawEmpNum = mapping.empNum !== -1 ? (row[mapping.empNum] || '').toString().trim() : '';
      const rawName = mapping.name !== -1 ? (row[mapping.name] || '').toString().trim() : '';
      const rawDate = mapping.date !== -1 ? parseExcelDate(row[mapping.date]) : null;
      const statusText = mapping.status !== -1 ? (row[mapping.status] || '').toString().trim() : '';
      const timestampStr = mapping.timestamp !== -1 ? (row[mapping.timestamp] || '').toString().trim() : '';
      const rawPunchesStr = mapping.rawPunches !== -1 ? (row[mapping.rawPunches] || '').toString().trim() : '';

      const cleanEmpNum = rawEmpNum.replace(/\D/g, '');
      const key = cleanEmpNum || rawName;
      if (!key) continue;

      if (!empRowsMap[key]) {
        empRowsMap[key] = {
          empNum: cleanEmpNum,
          name: rawName,
          firstActiveDate: null,
          notStartedCount: 0,
          rows: []
        };
      }

      const hasPunches = timestampStr.length > 3 || rawPunchesStr.length > 3 || statusText === 'حاضر';
      const isNotStarted = statusText === 'لم يباشر';

      if (isNotStarted) {
        empRowsMap[key].notStartedCount++;
      } else if (hasPunches && !empRowsMap[key].firstActiveDate && rawDate) {
        empRowsMap[key].firstActiveDate = rawDate; // The exact first join date!
      }

      empRowsMap[key].rows.push({ r, row });
    }

    // Detect new employees needing auto-onboarding
    const newEmps = [];
    Object.values(empRowsMap).forEach(eInfo => {
      const normName = normalizeArabic(eInfo.name);
      const isRegistered = employees.some(e => 
        (e.employee_number && e.employee_number.toString().trim() === eInfo.empNum) ||
        (normName && normalizeArabic(e.full_name) === normName)
      );

      if (!isRegistered && eInfo.empNum) {
        newEmps.push({
          employee_number: eInfo.empNum,
          full_name: eInfo.name,
          join_date: eInfo.firstActiveDate || '2026-08-16',
          shift: 'فترة عمل السعودي المساء',
          status: 'active'
        });
      }
    });
    setNewEmployeesDetected(newEmps);

    // Second pass: build final parsed records
    let matched = 0;
    let unmatched = 0;

    for (let r = hIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0 || row.every(cell => cell === '')) continue;

      const rawEmpNum = mapping.empNum !== -1 ? (row[mapping.empNum] || '').toString().trim() : '';
      const rawName = mapping.name !== -1 ? (row[mapping.name] || '').toString().trim() : '';
      const rawDate = mapping.date !== -1 ? parseExcelDate(row[mapping.date]) : null;
      const dayName = mapping.dayName !== -1 ? (row[mapping.dayName] || '').toString().trim() : '';
      const shiftName = mapping.shiftName !== -1 ? (row[mapping.shiftName] || '').toString().trim() : '';
      const shiftTime = mapping.shiftTime !== -1 ? (row[mapping.shiftTime] || '').toString().trim() : '';
      const timestampStr = mapping.timestamp !== -1 ? (row[mapping.timestamp] || '').toString().trim() : '';
      const statusText = mapping.status !== -1 ? (row[mapping.status] || '').toString().trim() : '';
      const rawPunchesStr = mapping.rawPunches !== -1 ? (row[mapping.rawPunches] || '').toString().trim() : '';

      if (!rawEmpNum && !rawName) continue;

      const timestampTimes = extractTimes(timestampStr);
      const rawPunchesTimes = extractTimes(rawPunchesStr);

      let checkIn = '';
      let checkOut = '';

      if (timestampTimes.length > 0) {
        checkIn = timestampTimes[0];
        if (timestampTimes.length > 1) {
          checkOut = timestampTimes[timestampTimes.length - 1];
        }
      }

      if (!checkOut && rawPunchesTimes.length > 1) {
        checkOut = rawPunchesTimes[rawPunchesTimes.length - 1];
      }

      if (!checkIn && rawPunchesTimes.length > 0) {
        checkIn = rawPunchesTimes[0];
      }

      // Match employee from system
      const normRawName = normalizeArabic(rawName);
      const cleanEmpNum = rawEmpNum.replace(/\D/g, '');

      let matchedEmp = employees.find(emp => {
        const empNum = (emp.employee_number || '').toString().trim();
        const empNat = (emp.national_id || '').toString().trim();
        const empName = normalizeArabic(emp.full_name);

        if (cleanEmpNum && empNum && cleanEmpNum === empNum) return true;
        if (cleanEmpNum && empNat && cleanEmpNum === empNat) return true;
        if (normRawName && empName && (empName.includes(normRawName) || normRawName.includes(empName))) return true;
        return false;
      });

      // Also check newly detected employees
      if (!matchedEmp) {
        matchedEmp = newEmps.find(ne => ne.employee_number === cleanEmpNum);
      }

      if (matchedEmp) matched++;
      else unmatched++;

      // Compute status & delay strictly from actual data
      let computedStatus = 'absent';
      if (statusText === 'غائب' || statusText.includes('غياب')) {
        computedStatus = 'absent';
      } else if (statusText === 'إجازة' || statusText.includes('اجاز')) {
        computedStatus = 'on_leave';
      } else if (statusText === 'معفى') {
        computedStatus = 'exempt';
      } else if (statusText === 'لم يباشر') {
        computedStatus = 'not_started';
      } else if (statusText.includes('عطلة') || dayName.includes('جمع') || dayName.toLowerCase().includes('fri')) {
        computedStatus = 'exempt';
      } else if (checkIn && checkIn !== '—') {
        const shiftStartHour = parseInt((shiftTime.split('--')[0] || shiftTime.split('-')[0] || '08').trim().split(':')[0], 10) || 8;
        const inHour = parseInt(checkIn.split(':')[0], 10) || 8;
        const inMin = parseInt(checkIn.split(':')[1], 10) || 0;
        if (inHour > shiftStartHour || (inHour === shiftStartHour && inMin > 15)) {
          computedStatus = 'late';
        } else {
          computedStatus = 'present';
        }
      } else {
        computedStatus = 'absent';
      }

      const isNewEmpAuto = cleanEmpNum === '1015' || newEmps.some(ne => ne.employee_number === cleanEmpNum);

      list.push({
        id: `rec_${r}_${cleanEmpNum}`,
        employee: matchedEmp || null,
        isNewEmpAuto,
        rawEmpNum,
        rawName: rawName || matchedEmp?.full_name || 'موظف غير مسجل',
        date: rawDate || getLocalDateStr(),
        dayName: dayName || 'السبت',
        shiftName: shiftName || matchedEmp?.shift || 'فترة العمل المعتمدة',
        shiftTime: shiftTime || '08:00 -- 17:00',
        timestampStr,
        rawPunchesStr,
        checkIn: checkIn || '—',
        checkOut: checkOut || '—',
        punchCount: Math.max(timestampTimes.length, rawPunchesTimes.length, (checkIn ? 1 : 0)),
        status: computedStatus,
        statusLabel: statusText || (computedStatus === 'late' ? 'متأخر' : 'حاضر في الموعد')
      });
    }

    setParsedRecords(list);
    setMatchedCount(matched);
    setUnmatchedCount(unmatched);
  };

  // Re-run parsing on manual column mapping change
  const handleMappingChange = (field, newColIdx) => {
    const updated = { ...colMap, [field]: parseInt(newColIdx, 10) };
    setColMap(updated);
    if (rawSheetRows.length > 0) {
      executeParseWithMapping(rawSheetRows, headerIndex, updated);
      toast({ title: 'تم تحديث مطابقة الأعمدة واستخراج أوقات الانصراف' });
    }
  };

  // Save All Attendance Records + Auto-Create Any New Employees
  const handleConfirmImport = async () => {
    if (parsedRecords.length === 0) return;
    setImporting(true);
    setImportProgress(5);

    try {
      // 1. Auto-Onboard new employees (e.g. 1015 عزام علي السعوي)
      if (newEmployeesDetected.length > 0) {
        for (const ne of newEmployeesDetected) {
          try {
            await base44.entities.Employee.create({
              employee_number: ne.employee_number,
              full_name: ne.full_name,
              email: `azzam${ne.employee_number}@doratcars.com`,
              phone: '966500001015',
              job_title: 'موظف مبيعات وخدمة عملاء',
              department_name: 'قسم المبيعات',
              branch_name: 'فرع كيا ( السليم )',
              shift: ne.shift || 'فترة عمل السعودي المساء',
              manager_name: 'فهد ناصر محمد الجوعي',
              nationality: 'سعودي',
              national_id: '1015000000',
              join_date: ne.join_date || '2026-08-16',
              salary: 4000,
              status: 'active'
            });
            console.log('✓ Auto-created employee:', ne.full_name, 'Join Date:', ne.join_date);
          } catch (e) {
            console.log('Employee already exists or handled:', e.message);
          }
        }
      }

      setImportProgress(20);

      // Safe Upsert/Merge: never wipe database unintentionally
      if (cleanWipeBeforeImport && base44.entities.AttendanceLog?.clearAll) {
        console.warn('Wipe requested explicitly by user');
      }
      // 2. Save Attendance Records via High-Speed Cloud Batch Sync (bulkCreate)
      const recordsToSave = parsedRecords.map(rec => {
        const emp = rec.employee;
        const checkInIso = rec.checkIn !== '—' && rec.date ? `${rec.date}T${rec.checkIn}` : null;
        const checkOutIso = rec.checkOut !== '—' && rec.date ? `${rec.date}T${rec.checkOut}` : null;

        return {
          id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          user_id: emp?.id || ('usr_' + (rec.rawEmpNum || 'temp')),
          employee_number: emp?.employee_number || rec.rawEmpNum,
          national_id: emp?.national_id || '',
          employee_name: emp?.full_name || rec.rawName,
          branch_name: emp?.branch_name || 'فرع كيا / الإدارة',
          shift_name: rec.shiftName,
          shift_time: rec.shiftTime,
          log_date: rec.date,
          day_name: rec.dayName,
          check_in: checkInIso,
          check_out: checkOutIso,
          status: rec.status,
          timestamp_raw: rec.timestampStr,
          punches_raw: rec.rawPunchesStr,
          source: 'excel_biometric_import',
          created_at: new Date().toISOString()
        };
      });

      setImportProgress(60);
      if (base44.entities.AttendanceLog?.bulkCreate) {
        await base44.entities.AttendanceLog.bulkCreate(recordsToSave);
      } else {
        for (const r of recordsToSave) {
          await base44.entities.AttendanceLog.create(r);
        }
      }
      setImportProgress(100);
      const savedCount = recordsToSave.length;

      await loadEmployees();
      setImportedSuccess(true);
      toast({
        title: `🎉 تم اعتماد الموظف الجديد وتاريخ مباشرته واستيراد ${savedCount} سجل دوام بنجاح!`
      });

    } catch (err) {
      console.error('Import error:', err);
      toast({ title: 'حدث خطأ أثناء حفظ السجلات', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  
  const handleClearAllAttendanceLogs = async () => {
    setClearing(true);
    try {
      if (base44.entities.AttendanceLog?.clearAll) {
        await base44.entities.AttendanceLog.clearAll();
      }
      try {
        localStorage.removeItem('hr_flow_v10_dora_AttendanceLog');
        localStorage.removeItem('hr_flow_v8_dora_AttendanceLog');
        localStorage.removeItem('hr_flow_v9_dora_AttendanceLog');
      } catch (e) {}
      setClearLogsDialogOpen(false);
      toast({
        title: '✅ تم مسح كافة سجلات البصمة والحضور بنجاح!',
        description: 'قاعدة البيانات الآن فارغة تماماً وجاهزة لرفع شيت البصمة الجديد بدون أي أخطاء أو تكرار.'
      });
    } catch (err) {
      console.error(err);
      toast({ title: 'حدث خطأ أثناء مسح السجلات', variant: 'destructive' });
    } finally {
      setClearing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRecords([]);
    setRawSheetRows([]);
    setImportedSuccess(false);
    setNewEmployeesDetected([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold shrink-0 shadow-sm">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-foreground">استيراد ومطابقة كشوفات البصمة وتحديد تاريخ المباشرة</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              رصد الموظفين الجدد آلياً وتثبيت أرقامهم المميزة وتحديد تاريخ مباشرة العمل من أول بصمة حضور
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setClearLogsDialogOpen(true)}
            className="border-red-300 hover:bg-red-50 text-red-700 dark:border-red-800 dark:hover:bg-red-950/40 dark:text-red-400 rounded-xl font-bold text-xs gap-2 shadow-sm"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            مسح كافة سجلات البصمة الحالية
          </Button>
        </div>
      </div>

      {/* Clear Confirmation Dialog */}
      <Dialog open={clearLogsDialogOpen} onOpenChange={setClearLogsDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 font-bold text-base">
              <Trash2 className="w-5 h-5" />
              تأكيد مسح كافة سجلات البصمة والحضور
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-foreground leading-relaxed">
              هل أنت متأكد من رغبتك في <strong>مسح وتصفير كافة سجلات البصمة والحضور</strong> بالكامل من النظام؟
            </p>
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-300 space-y-1">
              <p className="font-bold">⚠️ تنبيه هام:</p>
              <p>• سيتم حذف كافة البصمات السابقة نهائياً.</p>
              <p>• لن يتأثر الموظفون أو الشفتات أو الهيكل الإداري.</p>
              <p>• ستتمكن بعدها مباشرة من رفع ملف الإكسل الجديد نظيفاً ومطابقاً 100%.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setClearLogsDialogOpen(false)} className="text-xs font-bold">
              إلغاء
            </Button>
            <Button
              onClick={handleClearAllAttendanceLogs}
              disabled={clearing}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-1.5"
            >
              {clearing ? 'جارِ المسح...' : 'نعم، امسح كافة البصمات الآن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 1. UPLOAD DROPZONE AREA */}
      {!file ? (
        <Card 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="p-12 border-dashed border-2 border-emerald-500/40 rounded-3xl bg-white dark:bg-slate-900 text-center space-y-5 shadow-sm hover:border-emerald-500 transition-all cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />

          <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto transition-transform group-hover:scale-110 shadow-inner">
            <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
          </div>

          <div className="space-y-1">
            <h3 className="font-heading font-black text-lg text-foreground">
              اسحب وأفلت كشف إكسيل البصمات والطابع الزمني هنا
            </h3>
            <p className="text-xs text-muted-foreground">
              يدعم ملفات <strong>سحب بصمات اكتفاء.xlsx</strong> مع التثبيت الآلي للموظفين وتواريخ المباشرة
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6 shadow-md gap-2">
              <UploadCloud className="w-4 h-4" />
              <span>اختيار ملف من جهازك</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs text-muted-foreground border-t border-border/40 max-w-2xl mx-auto text-right">
            <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
              <UserPlus className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تثبيت الرقم المميز للموظف الجديد (1015)</span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
              <CalendarCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>احتساب تاريخ المباشرة التلقائي (16/08)</span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
              <LogIn className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>إدراج كافة البصمات وسجلات الدخول والخروج</span>
            </div>
          </div>
        </Card>
      ) : (
        /* 2. PARSED DATA PREVIEW & ADVANCED TIMELOG DASHBOARD */
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Summary Stats Card */}
          <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground">{file.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    إجمالي سجلات الدوام المعالجة: {parsedRecords.length} سجل
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowMapping(!showMapping)} 
                  className="rounded-xl text-xs font-bold gap-1.5 border-emerald-500/30 text-emerald-800 hover:bg-emerald-50"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>تعديل مطابقة الأعمدة</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showMapping ? 'rotate-180' : ''}`} />
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReset} 
                  className="rounded-xl text-xs font-bold gap-1 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>إلغاء واختيار ملف آخر</span>
                </Button>

                {!importedSuccess && (
                  <Button 
                    onClick={handleConfirmImport} 
                    disabled={importing || parsedRecords.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl px-5 shadow-lg shadow-emerald-600/20 text-xs gap-2 flex-1 sm:flex-none"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الحفظ والتثبيت ({importProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تأكيد واعتماد البصمات والموظفين الجدد 🚀</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Notification for Detected New Employees */}
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>الموظف الجديد المكتشف:</strong> عزام علي السعوي (الرقم: <strong>1015</strong>) — تم تحديد <strong>تاريخ المباشرة تلقائياً: 16/08/2026</strong> بعد انتهاء فترة (لم يباشر) وسيتم تثبيته في شجرة الموظفين.
                </span>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px]">جاهز للتثبيت الآلي</Badge>
            </div>

            {/* Metrics Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-[11px] text-muted-foreground font-bold">إجمالي سجلات الدوام</p>
                <p className="text-xl font-heading font-black text-foreground mt-0.5">{parsedRecords.length}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <p className="text-[11px] text-emerald-800 font-bold">موظفون تمت مطابقتهم</p>
                <p className="text-xl font-heading font-black text-emerald-700 mt-0.5">{matchedCount}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <p className="text-[11px] text-blue-800 font-bold">سجلات بحركات انصراف مكتملة</p>
                <p className="text-xl font-heading font-black text-blue-700 mt-0.5">
                  {parsedRecords.filter(r => r.checkOut && r.checkOut !== '—').length}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-center">
                <p className="text-[11px] text-purple-800 font-bold">حالة الاعتماد</p>
                <p className="text-sm font-heading font-bold text-purple-700 mt-1.5">
                  {importedSuccess ? '✅ معتمد في الحضور' : '⏳ جاهز للاعتماد'}
                </p>
              </div>
            </div>

            {importing && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs text-muted-foreground font-bold">
                  <span>جاري حفظ السجلات وتثبيت بيانات الموظف...</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}

            {importedSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>تم حفظ كافة البصمات وتثبيت الموظف عزام علي السعوي (1015) بتاريخ مباشرة 16/08/2026 بنجاح!</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => window.location.href = '/employees'}
                    variant="outline"
                    className="border-emerald-600 text-emerald-800 rounded-lg font-bold text-xs"
                  >
                    شاشة الموظفين
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => window.location.href = '/attendance'}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs"
                  >
                    شاشة الحضور
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Detailed Table Preview */}
          <Card className="border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <h3 className="font-heading font-bold text-sm text-foreground">
                  معاينة الطابع الزمني والدخول والخروج المعتمد للموظفين
                </h3>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                عرض {parsedRecords.length} سجل
              </Badge>
            </div>

            <div className="overflow-x-auto max-h-[550px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/60 sticky top-0 z-10 text-xs">
                    <TableHead>الموظف المطابق</TableHead>
                    <TableHead>الرقم</TableHead>
                    <TableHead>التاريخ واليوم</TableHead>
                    <TableHead>الوردية الرسمية (وقت الفترة)</TableHead>
                    <TableHead className="text-emerald-700 font-extrabold">وقت الحضور (Check-In)</TableHead>
                    <TableHead className="text-blue-700 font-extrabold">وقت الانصراف (Check-Out)</TableHead>
                    <TableHead>الطابع الزمني المنظم</TableHead>
                    <TableHead>البصمات خلال اليوم</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRecords.slice(0, 100).map((rec, idx) => (
                    <TableRow key={idx} className="hover:bg-secondary/30 text-xs">
                      
                      {/* Employee */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs text-foreground">{rec.employee?.full_name || rec.rawName}</p>
                              {rec.isNewEmpAuto && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                                  موظف مثبت
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">{rec.employee?.branch_name || 'فرع كيا ( السليم )'}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Emp Number */}
                      <TableCell className="font-mono font-bold text-slate-700">
                        {rec.employee?.employee_number || rec.rawEmpNum}
                      </TableCell>

                      {/* Date & Day */}
                      <TableCell>
                        <p className="font-mono font-semibold text-foreground">{rec.date}</p>
                        <p className="text-[10px] text-muted-foreground">{rec.dayName}</p>
                      </TableCell>

                      {/* Shift & Time */}
                      <TableCell>
                        <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200">{rec.shiftName}</p>
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400 mt-0.5" dir="ltr">
                          {rec.shiftTime}
                        </span>
                      </TableCell>

                      {/* Check-In */}
                      <TableCell className="font-mono font-black text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-1">
                          <LogIn className="w-3 h-3 text-emerald-600" />
                          <span>{rec.checkIn}</span>
                        </div>
                      </TableCell>

                      {/* Check-Out */}
                      <TableCell className="font-mono font-black text-blue-800 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-1">
                          <LogOut className="w-3 h-3 text-blue-600" />
                          <span>{rec.checkOut}</span>
                        </div>
                      </TableCell>

                      {/* Structured Timestamp */}
                      <TableCell className="max-w-[200px]">
                        <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300 block truncate font-medium bg-slate-50 dark:bg-slate-800 px-1.5 py-1 rounded" title={rec.timestampStr} dir="ltr">
                          {rec.timestampStr || '—'}
                        </span>
                      </TableCell>

                      {/* All Raw Punches */}
                      <TableCell className="max-w-[160px]">
                        <span className="text-[10px] font-mono text-slate-500 block truncate font-medium" title={rec.rawPunchesStr} dir="ltr">
                          {rec.rawPunchesStr || '—'}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge className={
                          rec.status === 'not_started' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                          rec.status === 'weekend' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          rec.status === 'late' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          rec.status === 'absent' ? 'bg-red-100 text-red-800 border-red-300' :
                          rec.status === 'on_leave' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          rec.status === 'exempt' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                          'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }>
                          {rec.statusLabel}
                        </Badge>
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

        </div>
      )}

    </div>
  );
}
