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
  Layers
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
  const [headerIndex, setHeaderIndex] = useState(0);
  const [headers, setHeaders] = useState([]);

  // Column mappings
  const [colMap, setColMap] = useState({
    empNum: -1,
    name: -1,
    date: -1,
    time: -1,
    type: -1,
    device: -1
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

  // Normalize Arabic strings (unify Alef, Taa Marbuta, Yaa, remove spaces/tashkeel)
  const normalizeArabic = (text) => {
    if (!text) return '';
    return text
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/[ة]/g, 'ه')
      .replace(/[ىي]/g, 'ي')
      .replace(/[\u064B-\u0652]/g, '') // Remove tashkeel
      .replace(/[\s-_\.#]/g, '');
  };

  // Parse Excel Dates / Timestamps / Serial numbers
  const parseDateTimeValue = (val) => {
    if (val === undefined || val === null || val === '') return { date: null, time: null };

    // If already a JS Date
    if (val instanceof Date) {
      const dateStr = val.toISOString().split('T')[0];
      const timeStr = val.toTimeString().split(' ')[0];
      return { date: dateStr, time: timeStr };
    }

    // If Excel serial number (e.g. 45627.999)
    if (typeof val === 'number') {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) {
        const dateStr = d.toISOString().split('T')[0];
        const timeStr = d.toISOString().split('T')[1].substring(0, 8);
        return { date: dateStr, time: timeStr };
      }
    }

    const str = val.toString().trim();

    // Check if contains both date and time (e.g. "2024-12-01 23:59:08" or "01/12/2024 08:30:00")
    const parts = str.split(/[\sT]+/);
    let datePart = null;
    let timePart = null;

    for (const part of parts) {
      // Check date patterns
      if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(part)) {
        const d = part.split(/[-/]/);
        datePart = `${d[0]}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}`;
      } else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(part)) {
        const d = part.split(/[-/]/);
        datePart = `${d[2]}-${d[1].padStart(2, '0')}-${d[0].padStart(2, '0')}`;
      } else if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(part)) {
        timePart = part.length === 5 ? part + ':00' : part;
      }
    }

    // Fallback if Date.parse works
    if (!datePart && str.length > 5) {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        datePart = parsed.toISOString().split('T')[0];
        timePart = timePart || parsed.toTimeString().split(' ')[0];
      }
    }

    return { date: datePart, time: timePart };
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
          toast({ title: 'الملف فارغ أو لا يحتوي على صفوف بيانات كافية', variant: 'destructive' });
          return;
        }

        setRawSheetRows(rows);
        detectAndProcess(rows);
      } catch (err) {
        console.error('Parsing error:', err);
        toast({ title: 'فشل في قراءة ملف الـ Excel. يرجى التأكد من سلامة الملف.', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(f);
  };

  // 1. Detect Real Header Row & Map Columns
  const detectAndProcess = (rows) => {
    let bestHeaderRowIndex = 0;
    let maxKeywordScore = -1;

    // Look at first 6 rows for header keywords
    for (let r = 0; r < Math.min(6, rows.length); r++) {
      const row = rows[r];
      let score = 0;
      row.forEach(cell => {
        const text = (cell || '').toString().toLowerCase();
        if (text.includes('رقم') || text.includes('وظيفي') || text.includes('id') || text.includes('pin') || text.includes('user')) score += 3;
        if (text.includes('اسم') || text.includes('name') || text.includes('موظف')) score += 3;
        if (text.includes('تاريخ') || text.includes('date') || text.includes('وقت') || text.includes('time')) score += 3;
        if (text.includes('حالة') || text.includes('نوع') || text.includes('status') || text.includes('جهاز')) score += 1;
      });
      if (score > maxKeywordScore) {
        maxKeywordScore = score;
        bestHeaderRowIndex = r;
      }
    }

    setHeaderIndex(bestHeaderRowIndex);
    const headerRow = rows[bestHeaderRowIndex].map((h, i) => (h ? h.toString().trim() : `العمود ${i + 1}`));
    setHeaders(headerRow);

    // Identify Columns by keywords
    const detected = {
      empNum: -1,
      name: -1,
      date: -1,
      time: -1,
      type: -1,
      device: -1
    };

    headerRow.forEach((col, idx) => {
      const c = col.toLowerCase();
      
      // Employee Number / ID
      if (detected.empNum === -1 && (c.includes('وظيفي') || c.includes('رقم الموظف') || c.includes('رقم المستخدم') || c.includes('user id') || c.includes('pin') || c.includes('emp no') || c.includes('كود'))) {
        detected.empNum = idx;
      }
      
      // Employee Name
      if (detected.name === -1 && (c.includes('اسم') || c.includes('name') || (c.includes('موظف') && !c.includes('رقم')))) {
        detected.name = idx;
      }

      // Date / DateTime
      if (detected.date === -1 && (c.includes('تاريخ') || c.includes('date') || c.includes('وقت البصمة') || c.includes('بصمة'))) {
        detected.date = idx;
      }

      // Time
      if (detected.time === -1 && (c.includes('وقت') || c.includes('time') || c.includes('ساعة')) && !c.includes('تاريخ')) {
        detected.time = idx;
      }

      // Punch Type / State
      if (detected.type === -1 && (c.includes('نوع') || c.includes('حالة') || c.includes('state') || c.includes('status') || c.includes('type') || c.includes('حركة'))) {
        detected.type = idx;
      }

      // Device / Branch
      if (detected.device === -1 && (c.includes('جهاز') || c.includes('فرع') || c.includes('device') || c.includes('machine') || c.includes('location'))) {
        detected.device = idx;
      }
    });

    // Content-based heuristic fallback if column header wasn't exact
    const sampleRows = rows.slice(bestHeaderRowIndex + 1, bestHeaderRowIndex + 10);
    
    // Check if empNum still not found
    if (detected.empNum === -1) {
      headerRow.forEach((_, colIdx) => {
        const isNumericCol = sampleRows.every(r => r[colIdx] && !isNaN(Number(r[colIdx])) && Number(r[colIdx]) >= 100);
        if (isNumericCol && detected.empNum === -1) detected.empNum = colIdx;
      });
    }

    // Check if name still not found
    if (detected.name === -1) {
      headerRow.forEach((_, colIdx) => {
        const isStringCol = sampleRows.some(r => r[colIdx] && typeof r[colIdx] === 'string' && r[colIdx].trim().length > 4 && isNaN(Number(r[colIdx])));
        if (isStringCol && detected.name === -1 && colIdx !== detected.date) detected.name = colIdx;
      });
    }

    // Default fallbacks matching Ektefa standard exports
    if (detected.empNum === -1) detected.empNum = headerRow.length > 1 ? 1 : 0;
    if (detected.name === -1) detected.name = headerRow.length > 2 ? 2 : 1;
    if (detected.date === -1) detected.date = headerRow.length > 3 ? 3 : 2;

    setColMap(detected);
    executeParseWithMapping(rows, bestHeaderRowIndex, detected);
  };

  // 2. Parse & Group Rows Using the Determined Mapping
  const executeParseWithMapping = (rows, hIdx, mapping) => {
    const grouped = {};
    let matched = 0;
    let unmatched = 0;

    for (let r = hIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0 || row.every(cell => cell === '')) continue;

      const rawEmpNum = mapping.empNum !== -1 ? (row[mapping.empNum] || '').toString().trim() : '';
      const rawName = mapping.name !== -1 ? (row[mapping.name] || '').toString().trim() : '';
      const rawDateCell = mapping.date !== -1 ? row[mapping.date] : null;
      const rawTimeCell = mapping.time !== -1 ? row[mapping.time] : null;
      const rawType = mapping.type !== -1 ? (row[mapping.type] || '').toString().trim() : '';
      const rawDevice = mapping.device !== -1 ? (row[mapping.device] || '').toString().trim() : '';

      // Extract date and time
      const dateInfo = parseDateTimeValue(rawDateCell);
      const timeInfo = parseDateTimeValue(rawTimeCell);

      const finalDate = dateInfo.date || timeInfo.date || new Date().toISOString().split('T')[0];
      const finalTime = timeInfo.time || dateInfo.time || '08:30:00';

      if (!rawEmpNum && !rawName) continue;

      // Match with system employees
      const normRawName = normalizeArabic(rawName);
      const cleanEmpNum = rawEmpNum.replace(/\D/g, '');

      const matchedEmp = employees.find(emp => {
        const empNum = (emp.employee_number || '').toString().trim();
        const empNat = (emp.national_id || '').toString().trim();
        const empName = normalizeArabic(emp.full_name);

        // 1. Match by Employee Number
        if (cleanEmpNum && empNum && cleanEmpNum === empNum) return true;
        
        // 2. Match by National ID
        if (cleanEmpNum && empNat && cleanEmpNum === empNat) return true;

        // 3. Match by Name Similarity
        if (normRawName && empName) {
          if (empName === normRawName) return true;
          if (empName.includes(normRawName) || normRawName.includes(empName)) return true;
          
          // Match first + last names
          const empParts = empName.split(' ');
          const rawParts = normRawName.split(' ');
          if (empParts[0] && rawParts[0] && empParts[0] === rawParts[0] && empParts[empParts.length - 1] === rawParts[rawParts.length - 1]) {
            return true;
          }
        }

        return false;
      });

      const key = `${matchedEmp?.id || rawEmpNum || rawName}_${finalDate}`;

      if (!grouped[key]) {
        grouped[key] = {
          key,
          employee: matchedEmp || null,
          rawEmpNum,
          rawName: rawName || matchedEmp?.full_name || 'موظف غير مسجل',
          date: finalDate,
          punches: [],
          device: rawDevice || 'جهاز فرع كيا / الرئيسي'
        };
      }

      grouped[key].punches.push({
        time: finalTime,
        type: rawType,
        row
      });
    }

    // Process each employee day into check-in and check-out
    const processed = Object.values(grouped).map(item => {
      item.punches.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      const checkInTime = item.punches[0]?.time || '08:30:00';
      const checkOutTime = item.punches.length > 1 ? item.punches[item.punches.length - 1].time : null;

      // Status: late if check in after 09:15
      const hours = parseInt(checkInTime.split(':')[0], 10) || 8;
      const mins = parseInt(checkInTime.split(':')[1], 10) || 0;
      const isLate = hours > 9 || (hours === 9 && mins > 15);

      if (item.employee) matched++;
      else unmatched++;

      return {
        ...item,
        check_in_str: checkInTime,
        check_out_str: checkOutTime,
        status: isLate ? 'late' : 'present',
        punch_count: item.punches.length
      };
    });

    setParsedRecords(processed);
    setMatchedCount(matched);
    setUnmatchedCount(unmatched);
  };

  // Re-run parsing when user changes column mapping manually
  const handleMappingChange = (field, newColIdx) => {
    const updated = { ...colMap, [field]: parseInt(newColIdx, 10) };
    setColMap(updated);
    if (rawSheetRows.length > 0) {
      executeParseWithMapping(rawSheetRows, headerIndex, updated);
      toast({ title: 'تم تحديث مطابقة الأعمدة وإعادة تحليل السجلات آلياً' });
    }
  };

  // Confirm and Save All Attendance Records
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

        const checkInIso = rec.date ? `${rec.date}T${rec.check_in_str}` : new Date().toISOString();
        const checkOutIso = rec.check_out_str && rec.date ? `${rec.date}T${rec.check_out_str}` : null;

        await base44.entities.AttendanceLog.create({
          user_id: emp?.id || ('usr_' + (rec.rawEmpNum || 'temp')),
          employee_number: emp?.employee_number || rec.rawEmpNum,
          national_id: emp?.national_id || '',
          employee_name: emp?.full_name || rec.rawName,
          branch_name: emp?.branch_name || rec.device || 'فرع كيا',
          log_date: rec.date,
          check_in: checkInIso,
          check_out: checkOutIso,
          status: rec.status,
          source: 'excel_biometric_import',
          punches_summary: `${rec.punch_count} حركات مسجلة`
        });

        savedCount++;
        setImportProgress(Math.round((savedCount / total) * 90) + 10);
      }

      setImportedSuccess(true);
      toast({
        title: `🎉 تم استيراد ${savedCount} سجل بصمة بنجاح إلى جدول الحضور والتقارير!`
      });

    } catch (err) {
      console.error('Import error:', err);
      toast({ title: 'حدث خطأ أثناء حفظ السجلات', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadSample = () => {
    const sampleData = [
      ['#', 'الرقم الوظيفي', 'اسم الموظف', 'التاريخ والوقت', 'نوع الحركة', 'الجهاز / الفرع'],
      ['1', '1022', 'يحيى باشا', '2025-02-26 08:15:00', 'Check-In', 'جهاز فرع كيا (EK0201000044)'],
      ['2', '1022', 'يحيى باشا', '2025-02-26 16:45:00', 'Check-Out', 'جهاز فرع كيا (EK0201000044)'],
      ['3', '1001', 'فهد الجوعي', '2025-02-26 08:30:00', 'Check-In', 'الفرع الرئيسي'],
      ['4', '1001', 'فهد الجوعي', '2025-02-26 17:00:00', 'Check-Out', 'الفرع الرئيسي'],
      ['5', '1002', 'محمود طه المحيميد', '2025-02-26 09:20:00', 'Check-In', 'فرع كيا'],
      ['6', '1002', 'محمود طه المحيميد', '2025-02-26 18:00:00', 'Check-Out', 'فرع كيا'],
      ['7', '1005', 'هشام ابوالفضل زغلول', '2025-02-26 08:00:00', 'Check-In', 'الإدارة العامة'],
      ['8', '1005', 'هشام ابوالفضل زغلول', '2025-02-26 16:00:00', 'Check-Out', 'الإدارة العامة']
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجلات الحضور');
    XLSX.writeFile(wb, 'نموذج_بصمات_Green_Arrow_HR.xlsx');
    toast({ title: 'تم تحميل نموذج الـ Excel التجريبي بنجاح 📥' });
  };

  const handleReset = () => {
    setFile(null);
    setParsedRecords([]);
    setRawSheetRows([]);
    setImportedSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold shrink-0 shadow-sm">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-foreground">استيراد ومطابقة كشوفات البصمة (Excel / CSV)</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              رفع وتفكيك كشوفات البصمات من نظام اكتفاء والأجهزة السابقة ومطابقتها آلياً بالرقم الوظيفي واسم الموظف
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleDownloadSample}
          className="rounded-xl text-xs font-bold gap-2 border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 shrink-0"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>تحميل نموذج Excel تجريبي</span>
        </Button>
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
              اسحب وأفلت ملف إكسيل البصمة هنا أو انقر للاختيار
            </h3>
            <p className="text-xs text-muted-foreground">
              يدعم ملفات <strong>.xlsx</strong> و <strong>.xls</strong> و <strong>.csv</strong> المصدرة من نظام اكتفاء (Ektefa) وكافة أجهزة البصمة
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6 shadow-md gap-2">
              <UploadCloud className="w-4 h-4" />
              <span>اختيار ملف من جهازك</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-[11px] text-muted-foreground border-t border-border/40">
            <span className="flex items-center gap-1 font-semibold text-emerald-700">
              <Check className="w-3.5 h-3.5" /> مطابقة ذكية بالرقم الوظيفي (1001, 1022...) واسم الموظف
            </span>
            <span className="flex items-center gap-1 font-semibold text-emerald-700">
              <Check className="w-3.5 h-3.5" /> دمج بصمات الحضور والانصراف واحتساب التأخير آلياً
            </span>
          </div>
        </Card>
      ) : (
        /* 2. PARSED DATA PREVIEW & MATCHING DASHBOARD */
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
                    الحجم: {(file.size / 1024).toFixed(1)} KB • إجمالي السجلات المعالجة: {parsedRecords.length}
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

            {/* Manual Column Mapping Config Box (Collapsible) */}
            {showMapping && (
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                  <span>تحديد الأعمدة يدوياً في حال كانت تركيبة الملف مختلفة:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">عمود الرقم الوظيفي / PIN</label>
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
                    <label className="font-bold text-slate-700">عمود التاريخ / وقت البصمة</label>
                    <Select value={colMap.date.toString()} onValueChange={(v) => handleMappingChange('date', v)}>
                      <SelectTrigger className="h-9 bg-white text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {headers.map((h, i) => <SelectItem key={i} value={i.toString()}>{h} (عمود {i + 1})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">عمود وقت البصمة (إن وجد منفصلاً)</label>
                    <Select value={colMap.time.toString()} onValueChange={(v) => handleMappingChange('time', v)}>
                      <SelectTrigger className="h-9 bg-white text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">غير موجود (مدمج مع التاريخ)</SelectItem>
                        {headers.map((h, i) => <SelectItem key={i} value={i.toString()}>{h} (عمود {i + 1})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                </div>
              </div>
            )}

            {/* Matching Metrics Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-[11px] text-muted-foreground font-bold">إجمالي السجلات المعالجة</p>
                <p className="text-xl font-heading font-black text-foreground mt-0.5">{parsedRecords.length}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <p className="text-[11px] text-emerald-800 font-bold">موظفون تمت مطابقتهم</p>
                <p className="text-xl font-heading font-black text-emerald-700 mt-0.5">{matchedCount}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <p className="text-[11px] text-amber-800 font-bold">حركات حضور / انصراف</p>
                <p className="text-xl font-heading font-black text-amber-700 mt-0.5">
                  {parsedRecords.reduce((acc, r) => acc + (r.punch_count || 1), 0)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <p className="text-[11px] text-blue-800 font-bold">حالة المزامنة</p>
                <p className="text-sm font-heading font-bold text-blue-700 mt-1.5">
                  {importedSuccess ? '✅ معتمد ومسجل' : '⏳ جاهز للاعتماد'}
                </p>
              </div>
            </div>

            {importing && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs text-muted-foreground font-bold">
                  <span>جاري المزامنة مع قاعدة البيانات السحابية...</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}

            {importedSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>تم حفظ كافة سجلات البصمات بنجاح! يمكنك الآن مشاهدة الحضور وتقارير الموظفين مباشرة.</span>
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

          {/* Table Preview */}
          <Card className="border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-secondary/30">
              <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>معاينة البيانات ومطابقة الموظفين قبل الحفظ النهائي</span>
              </h3>
              <Badge variant="outline" className="font-mono text-xs">
                عرض أول {Math.min(50, parsedRecords.length)} سجل
              </Badge>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/60 sticky top-0 z-10">
                    <TableHead>الموظف المطابق في النظام</TableHead>
                    <TableHead>الرقم الوظيفي</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>وقت الحضور (Check-In)</TableHead>
                    <TableHead>وقت الانصراف (Check-Out)</TableHead>
                    <TableHead>عدد الحركات</TableHead>
                    <TableHead>الحالة المحتسبة</TableHead>
                    <TableHead>الفرع / الجهاز</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRecords.slice(0, 50).map((rec, idx) => (
                    <TableRow key={idx} className="hover:bg-secondary/30">
                      <TableCell>
                        {rec.employee ? (
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <div>
                              <p className="font-bold text-xs text-foreground">{rec.employee.full_name}</p>
                              <p className="text-[10px] text-muted-foreground">#{rec.employee.employee_number} • {rec.employee.department_name || 'موظف'}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-700">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <div>
                              <p className="font-bold text-xs">{rec.rawName || 'غير مسجل'}</p>
                              <p className="text-[10px] text-amber-600">سيتم حفظه كحساب جديد</p>
                            </div>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-xs font-bold text-slate-700">
                        {rec.employee?.employee_number || rec.rawEmpNum || '—'}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-foreground font-medium">
                        {rec.date}
                      </TableCell>

                      <TableCell className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50/60 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                        {rec.check_in_str || '—'}
                      </TableCell>

                      <TableCell className="font-mono text-xs font-bold text-blue-700 bg-blue-50/60 px-2.5 py-1 rounded-lg border border-blue-200/60">
                        {rec.check_out_str || '—'}
                      </TableCell>

                      <TableCell className="text-center font-mono text-xs font-bold">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                          {rec.punch_count}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge className={rec.status === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}>
                          {rec.status === 'late' ? 'متأخر' : 'حاضر في الموعد'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {rec.employee?.branch_name || rec.device || 'فرع كيا'}
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
