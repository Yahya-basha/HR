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
  ArrowRight,
  Sparkles,
  Check,
  RefreshCw,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
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
  const [parsing, setParsing] = useState(false);
  const [rawRows, setRawRows] = useState([]);
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

  // Helper to normalize strings for robust fuzzy matching
  const cleanStr = (s) => (s || '').toString().trim().toLowerCase().replace(/[\s-_]/g, '');

  // Helper to parse Excel dates / serial numbers
  const parseExcelDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'number') {
      // Excel serial date to JS Date
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    }
    const s = val.toString().trim();
    // Match YYYY-MM-DD, DD/MM/YYYY, or YYYY/MM/DD
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
      const parts = s.split(/[-/]/);
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
      const parts = s.split(/[-/]/);
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    const parsed = new Date(s);
    return isNaN(parsed.getTime()) ? s : parsed.toISOString().split('T')[0];
  };

  // Helper to parse time string
  const parseTimeString = (val) => {
    if (!val) return '';
    if (typeof val === 'number') {
      // Fraction of day
      const totalSeconds = Math.round(val * 86400);
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    const s = val.toString().trim();
    const match = s.match(/(\d{1,2}):(\d{2})(:\d{2})?/);
    if (match) {
      return match[0];
    }
    return s;
  };

  // Process File Handler
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
    setParsing(true);
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
          setParsing(false);
          return;
        }

        analyzeAndMapRows(rows);
      } catch (err) {
        console.error('Parsing error:', err);
        toast({ title: 'فشل في قراءة ملف الـ Excel. يرجى التأكد من صيغة الملف.', variant: 'destructive' });
      } finally {
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(f);
  };

  // Intelligent Multi-Format Biometric Column Finder & Matcher
  const analyzeAndMapRows = (rows) => {
    const headerRow = rows[0].map(h => (h || '').toString().trim());
    
    // Find column indexes by keywords
    let idCol = -1;
    let nameCol = -1;
    let dateCol = -1;
    let timeCol = -1;
    let typeCol = -1;
    let deviceCol = -1;

    headerRow.forEach((col, idx) => {
      const c = col.toLowerCase();
      if (idCol === -1 && (c.includes('رقم') || c.includes('id') || c.includes('pin') || c.includes('no') || c.includes('كود') || c.includes('user'))) idCol = idx;
      if (nameCol === -1 && (c.includes('اسم') || c.includes('name') || c.includes('موظف'))) nameCol = idx;
      if (dateCol === -1 && (c.includes('تاريخ') || c.includes('date') || c.includes('يوم'))) dateCol = idx;
      if (timeCol === -1 && (c.includes('وقت') || c.includes('time') || c.includes('ساعة') || c.includes('بصمة'))) timeCol = idx;
      if (typeCol === -1 && (c.includes('نوع') || c.includes('حالة') || c.includes('state') || c.includes('status') || c.includes('type') || c.includes('حركة'))) typeCol = idx;
      if (deviceCol === -1 && (c.includes('جهاز') || c.includes('فرع') || c.includes('device') || c.includes('machine') || c.includes('location'))) deviceCol = idx;
    });

    // Fallbacks if header is missing / standard biometric format
    if (idCol === -1) idCol = 0;
    if (nameCol === -1 && rows[1] && typeof rows[1][1] === 'string' && isNaN(Number(rows[1][1]))) nameCol = 1;
    if (dateCol === -1) dateCol = 2;
    if (timeCol === -1) timeCol = 3;

    // Group punches by [employeeIdentifier + date]
    const grouped = {};
    let matched = 0;
    let unmatched = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || row.every(cell => cell === '')) continue;

      const rawId = (row[idCol] || '').toString().trim();
      const rawName = nameCol !== -1 ? (row[nameCol] || '').toString().trim() : '';
      const rawDate = parseExcelDate(row[dateCol]);
      const rawTime = parseTimeString(row[timeCol]);
      const rawType = typeCol !== -1 ? (row[typeCol] || '').toString().trim() : '';
      const rawDevice = deviceCol !== -1 ? (row[deviceCol] || '').toString().trim() : '';

      if (!rawDate && !rawTime && !rawId) continue;

      // Find matching employee from system employees list
      const matchedEmp = employees.find(emp => {
        const empNum = cleanStr(emp.employee_number);
        const empNat = cleanStr(emp.national_id);
        const empName = cleanStr(emp.full_name);
        const searchId = cleanStr(rawId);
        const searchName = cleanStr(rawName);

        return (
          (searchId && empNum && searchId === empNum) ||
          (searchId && empNat && searchId === empNat) ||
          (searchName && empName && (empName.includes(searchName) || searchName.includes(empName)))
        );
      });

      const key = `${matchedEmp?.id || rawId || rawName}_${rawDate || 'today'}`;

      if (!grouped[key]) {
        grouped[key] = {
          key,
          employee: matchedEmp || null,
          rawId,
          rawName: rawName || matchedEmp?.full_name || 'موظف غير مسجل',
          date: rawDate || new Date().toISOString().split('T')[0],
          punches: [],
          device: rawDevice || 'جهاز فرع كيا / الرئيسي',
        };
      }

      if (rawTime) {
        grouped[key].punches.push({
          time: rawTime,
          type: rawType,
          fullRow: row
        });
      }
    }

    // Process each grouped day into clean check_in / check_out
    const processed = Object.values(grouped).map(item => {
      // Sort punches chronologically
      item.punches.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      
      const checkInTime = item.punches.length > 0 ? item.punches[0].time : '08:30:00';
      const checkOutTime = item.punches.length > 1 ? item.punches[item.punches.length - 1].time : null;

      // Determine late status (after 09:00 AM)
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

    setRawRows(rows);
    setParsedRecords(processed);
    setMatchedCount(matched);
    setUnmatchedCount(unmatched);

    toast({
      title: `تم تحليل ملف البصمة بنجاح! تم تجهيز ${processed.length} سجل دوام.`,
      description: `تمت مطابقة ${matched} موظفاً بنجاح مع قاعدة البيانات.`
    });
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
          user_id: emp?.id || ('usr_' + (rec.rawId || 'temp')),
          employee_number: emp?.employee_number || rec.rawId,
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

  // Generate Sample Excel Template for testing
  const handleDownloadSample = () => {
    const sampleData = [
      ['الرقم الوظيفي', 'اسم الموظف', 'التاريخ', 'وقت الحركة', 'نوع الحركة', 'الجهاز / الفرع'],
      ['1022', 'يحيى باشا', '2025-02-26', '08:15:00', 'Check-In', 'جهاز فرع كيا (EK0201000044)'],
      ['1022', 'يحيى باشا', '2025-02-26', '16:45:00', 'Check-Out', 'جهاز فرع كيا (EK0201000044)'],
      ['1001', 'فهد الجوعي', '2025-02-26', '08:30:00', 'Check-In', 'الفرع الرئيسي'],
      ['1001', 'فهد الجوعي', '2025-02-26', '17:00:00', 'Check-Out', 'الفرع الرئيسي'],
      ['2151595283', 'محمود المحيميد', '2025-02-26', '09:20:00', 'Check-In', 'فرع كيا'],
      ['2151595283', 'محمود المحيميد', '2025-02-26', '18:00:00', 'Check-Out', 'فرع كيا'],
      ['2406494993', 'هشام زغلول', '2025-02-26', '08:00:00', 'Check-In', 'الإدارة العامة'],
      ['2406494993', 'هشام زغلول', '2025-02-26', '16:00:00', 'Check-Out', 'الإدارة العامة']
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
    setRawRows([]);
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
              رفع وتفكيك كشوفات البصمات من الأجهزة القديمة ومطابقتها آلياً مع الموظفين المسجلين في النظام
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
              يدعم ملفات <strong>.xlsx</strong> و <strong>.xls</strong> و <strong>.csv</strong> المصدرة من كافة أجهزة البصمة (اكتفاء / ZKTeco / Anviz / Realand)
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
              <Check className="w-3.5 h-3.5" /> مطابقة تلقائية بالرقم الوظيفي أو الهوية الوطنية
            </span>
            <span className="flex items-center gap-1 font-semibold text-emerald-700">
              <Check className="w-3.5 h-3.5" /> احتساب وقت الحضور والانصراف والتأخير آلياً
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

              <div className="flex items-center gap-2 w-full sm:w-auto">
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

            {/* Matching Metrics Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-[11px] text-muted-foreground font-bold">إجمالي السجلات</p>
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
                    <TableHead>الرقم المسجل بالملف</TableHead>
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
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
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
                        {rec.rawId || rec.employee?.employee_number || '—'}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-foreground font-medium">
                        {rec.date}
                      </TableCell>

                      <TableCell className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50/50 px-2 py-1 rounded">
                        {rec.check_in_str || '—'}
                      </TableCell>

                      <TableCell className="font-mono text-xs font-bold text-blue-700 bg-blue-50/50 px-2 py-1 rounded">
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
