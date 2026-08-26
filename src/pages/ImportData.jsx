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
  CalendarCheck
} from 'lucide-react';
import { Card } from '@/components/ui/card';
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
  const [matchedCount, setMatchedCount] = useState(0);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedSuccess, setImportedSuccess] = useState(false);

  // Load existing employees for real-time matching
  useEffect(() => {
    (async () => {
      try {
        const emps = await base44.entities.Employee.list();
        setEmployees(emps || []);
      } catch (e) {
        console.error('Error loading employees:', e);
      } finally {
        setLoadingEmployees(false);
      }
    })();
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

  // Helper to parse dates
  const parseExcelDate = (val) => {
    if (val === undefined || val === null || val === '') return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'number') {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    }
    const str = val.toString().trim();
    // Match M/D/YYYY, D/M/YYYY, or YYYY-MM-DD
    const slashParts = str.split('/');
    if (slashParts.length === 3) {
      const p1 = slashParts[0].padStart(2, '0');
      const p2 = slashParts[1].padStart(2, '0');
      let p3 = slashParts[2].trim();
      if (p3.length === 2) p3 = '20' + p3;
      return `${p3}-${p1}-${p2}`;
    }
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
      const parts = str.split(/[-/]/);
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? str : parsed.toISOString().split('T')[0];
  };

  // Helper to extract all time values from a text string (e.g. "07:55:00 -- 12:08:00 & 16:04:00 -- 20:18:00" or "07:55, 12:08")
  const extractTimes = (text) => {
    if (!text) return [];
    const str = text.toString().trim();
    const matches = str.match(/\b\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\b/g);
    if (!matches) return [];
    return matches.map(t => {
      // Normalize dot separators to colons (e.g. 07.55 -> 07:55)
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
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
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

    // Exact index fallback matching user's Excel sheet:
    // Col 0: #, Col 1: الرقم الوظيفي, Col 2: اسم الموظف, Col 3: التاريخ, Col 4: يوم, Col 5: الفترة, Col 6: وقت الفترة, Col 7: الطابع الزمني, Col 8: الحالة, Col 9: البصمات خلال اليوم
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

  // 2. Parse & Extract Check-In, Check-Out, Shift, and Raw Punches
  const executeParseWithMapping = (rows, hIdx, mapping) => {
    const list = [];
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

      // Extract all timestamps from Column 7 (الطابع الزمني)
      const timestampTimes = extractTimes(timestampStr);

      // Extract all timestamps from Column 9 (البصمات خلال اليوم)
      const rawPunchesTimes = extractTimes(rawPunchesStr);

      // Determine Check-In & Check-Out:
      // Priority 1: From structured Timestamp (الطابع الزمني)
      // Priority 2: From Raw Punches (البصمات خلال اليوم)
      let checkIn = '';
      let checkOut = '';

      if (timestampTimes.length > 0) {
        checkIn = timestampTimes[0];
        if (timestampTimes.length > 1) {
          checkOut = timestampTimes[timestampTimes.length - 1];
        }
      }

      // If Check-Out was not found in Timestamp, check Raw Punches
      if (!checkOut && rawPunchesTimes.length > 1) {
        checkOut = rawPunchesTimes[rawPunchesTimes.length - 1];
      }

      // If Check-In was still empty, use first raw punch
      if (!checkIn && rawPunchesTimes.length > 0) {
        checkIn = rawPunchesTimes[0];
      }

      // Match employee from system
      const normRawName = normalizeArabic(rawName);
      const cleanEmpNum = rawEmpNum.replace(/\D/g, '');

      const matchedEmp = employees.find(emp => {
        const empNum = (emp.employee_number || '').toString().trim();
        const empNat = (emp.national_id || '').toString().trim();
        const empName = normalizeArabic(emp.full_name);

        if (cleanEmpNum && empNum && cleanEmpNum === empNum) return true;
        if (cleanEmpNum && empNat && cleanEmpNum === empNat) return true;
        if (normRawName && empName && (empName.includes(normRawName) || normRawName.includes(empName))) return true;
        return false;
      });

      if (matchedEmp) matched++;
      else unmatched++;

      // Compute status & delay
      let computedStatus = 'present';
      if (statusText === 'غائب' || statusText.includes('غياب')) {
        computedStatus = 'absent';
      } else if (statusText === 'إجازة' || statusText.includes('اجاز')) {
        computedStatus = 'on_leave';
      } else if (statusText === 'معفى') {
        computedStatus = 'exempt';
      } else if (statusText === 'لم يباشر') {
        computedStatus = 'not_started';
      } else if (checkIn) {
        // Compare with Shift start time
        const shiftStartHour = parseInt((shiftTime.split('--')[0] || shiftTime.split('-')[0] || '08').trim().split(':')[0], 10) || 8;
        const inHour = parseInt(checkIn.split(':')[0], 10) || 8;
        const inMin = parseInt(checkIn.split(':')[1], 10) || 0;
        if (inHour > shiftStartHour || (inHour === shiftStartHour && inMin > 15)) {
          computedStatus = 'late';
        }
      }

      list.push({
        id: `rec_${r}_${cleanEmpNum}`,
        employee: matchedEmp || null,
        rawEmpNum,
        rawName: rawName || matchedEmp?.full_name || 'موظف غير مسجل',
        date: rawDate || new Date().toISOString().split('T')[0],
        dayName: dayName || 'السبت',
        shiftName: shiftName || matchedEmp?.shift || 'فترة العمل المعتمدة',
        shiftTime: shiftTime || '08:00 -- 17:00',
        timestampStr,
        rawPunchesStr,
        checkIn: checkIn || (computedStatus === 'present' ? '08:00:00' : '—'),
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

  // Save All Attendance Records
  const handleConfirmImport = async () => {
    if (parsedRecords.length === 0) return;
    setImporting(true);
    setImportProgress(10);

    try {
      let savedCount = 0;
      const total = parsedRecords.length;

      for (let i = 0; i < parsedRecords.length; i++) {
        const rec = parsedRecords[i];
        const emp = rec.employee;

        const checkInIso = rec.checkIn !== '—' && rec.date ? `${rec.date}T${rec.checkIn}` : null;
        const checkOutIso = rec.checkOut !== '—' && rec.date ? `${rec.date}T${rec.checkOut}` : null;

        await base44.entities.AttendanceLog.create({
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
          source: 'excel_biometric_import'
        });

        savedCount++;
        setImportProgress(Math.round((savedCount / total) * 90) + 10);
      }

      setImportedSuccess(true);
      toast({
        title: `🎉 تم استيراد ${savedCount} سجل دوام وبصمات معتمدة (حضور + انصراف) بنجاح!`
      });

    } catch (err) {
      console.error('Import error:', err);
      toast({ title: 'حدث خطأ أثناء حفظ السجلات', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRecords([]);
    setRawSheetRows([]);
    setImportedSuccess(false);
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
            <h1 className="text-2xl font-heading font-extrabold text-foreground">استيراد ومطابقة كشوفات البصمة والطابع الزمني</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              استخراج أوقات الحضور والانصراف بدقة من عمود الطابع الزمني وبصمات اليوم
            </p>
          </div>
        </div>
      </div>

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
              يدعم ملفات <strong>سحب بصمات اكتفاء.xlsx</strong> وكافة كشوفات الحضور متعددة الفترات
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
              <LogIn className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>استخراج وقت الحضور الفعلي (Check-In)</span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
              <LogOut className="w-4 h-4 text-blue-600 shrink-0" />
              <span>استخراج وقت الانصراف الفعلي (Check-Out)</span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
              <Timer className="w-4 h-4 text-amber-600 shrink-0" />
              <span>تثبيت ساعات الوردية وبصمات اليوم</span>
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
                        <span>جاري حفظ البصمات ({importProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تأكيد واعتماد البصمات في جدول الحضور 🚀</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Manual Column Mapping Config Box */}
            {showMapping && (
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                  <span>تحديد أعمدة كشف البصمات يدوياً:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">عمود الرقم الوظيفي</label>
                    <Select value={colMap.empNum.toString()} onValueChange={(v) => handleMappingChange('empNum', v)}>
                      <SelectTrigger className="h-9 bg-white text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {headers.map((h, i) => <SelectItem key={i} value={i.toString()}>{h} (عمود {i + 1})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">عمود اسم الموظف</label>
                    <Select value={colMap.name.toString()} onValueChange={(v) => handleMappingChange('name', v)}>
                      <SelectTrigger className="h-9 bg-white text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {headers.map((h, i) => <SelectItem key={i} value={i.toString()}>{h} (عمود {i + 1})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">عمود الطابع الزمني (الدخول/الخروج)</label>
                    <Select value={colMap.timestamp.toString()} onValueChange={(v) => handleMappingChange('timestamp', v)}>
                      <SelectTrigger className="h-9 bg-white text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {headers.map((h, i) => <SelectItem key={i} value={i.toString()}>{h} (عمود {i + 1})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">عمود البصمات خلال اليوم</label>
                    <Select value={colMap.rawPunches.toString()} onValueChange={(v) => handleMappingChange('rawPunches', v)}>
                      <SelectTrigger className="h-9 bg-white text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {headers.map((h, i) => <SelectItem key={i} value={i.toString()}>{h} (عمود {i + 1})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                </div>
              </div>
            )}

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
                  <span>جاري حفظ السجلات وتحديث كشوفات الحضور...</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}

            {importedSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>تم حفظ كافة البصمات وسجلات الطابع الزمني بنجاح! يمكنك الآن مراجعتها في شاشة الحضور.</span>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => window.location.href = '/attendance'}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs"
                >
                  الذهاب لشاشة الحضور
                </Button>
              </div>
            )}
          </Card>

          {/* Detailed Table Preview */}
          <Card className="border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <h3 className="font-heading font-bold text-sm text-foreground">
                  معاينة الطابع الزمني والدخول والخروج المعتمد
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
                        {rec.employee ? (
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            <div>
                              <p className="font-bold text-xs text-foreground">{rec.employee.full_name}</p>
                              <p className="text-[10px] text-muted-foreground">{rec.employee.branch_name || 'الفرع'}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-700">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            <span className="font-bold text-xs">{rec.rawName}</span>
                          </div>
                        )}
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
