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
  Layers, 
  CalendarCheck, 
  FilePlus, 
  ArrowRight, 
  Filter, 
  Search 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';

export default function ImportData() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const fileInputRef = useRef(null);

  // Multi-Files State
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedRecords, setExtractedRecords] = useState([]);
  const [employeesMap, setEmployeesMap] = useState(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [importedSuccess, setImportedSuccess] = useState(false);

  // Load existing employees for name & number mapping
  useEffect(() => {
    async function loadEmployees() {
      try {
        const emps = await base44.entities.Employee.list();
        const map = new Map();
        (emps || []).forEach(e => {
          if (e.employee_number) map.set(String(e.employee_number), e);
          if (e.full_name) map.set(e.full_name.trim(), e);
        });
        setEmployeesMap(map);
      } catch (e) {
        console.warn('Error loading employees:', e);
      }
    }
    loadEmployees();
  }, []);

  // Helper: Read file as ArrayBuffer
  const readFileAsync = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(new Uint8Array(e.target.result));
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  };

  // Helper: Robust Date & Time Value Parser
  const parseDateTimeValue = (val) => {
    if (val === undefined || val === null || val === '') return { date: null, time: null };

    // If JS Date
    if (val instanceof Date) {
      const dateStr = val.toISOString().split('T')[0];
      const timeStr = val.toTimeString().split(' ')[0].substring(0, 5);
      return { date: dateStr, time: timeStr };
    }

    // If Excel serial number (e.g. 45627.999)
    if (typeof val === 'number') {
      if (val > 40000 && val < 60000) {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(d.getTime())) {
          const dateStr = d.toISOString().split('T')[0];
          const timeStr = d.toISOString().split('T')[1].substring(0, 5);
          return { date: dateStr, time: timeStr };
        }
      }
    }

    const str = val.toString().trim();
    let datePart = null;
    let timePart = null;

    // Check if contains both date and time (e.g. "2026-08-20 08:30:00" or "20/08/2026 08:30")
    const parts = str.split(/[\sT]+/);
    for (const part of parts) {
      if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(part)) {
        const d = part.split(/[-/]/);
        datePart = d[0] + '-' + d[1].padStart(2, '0') + '-' + d[2].padStart(2, '0');
      } else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(part)) {
        const d = part.split(/[-/]/);
        datePart = d[2] + '-' + d[1].padStart(2, '0') + '-' + d[0].padStart(2, '0');
      } else if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(part)) {
        timePart = part.substring(0, 5);
      }
    }

    if (!datePart && str.length >= 8) {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2020 && parsed.getFullYear() <= 2030) {
        datePart = parsed.toISOString().split('T')[0];
        timePart = timePart || parsed.toTimeString().split(' ')[0].substring(0, 5);
      }
    }

    return { date: datePart, time: timePart };
  };

  // Helper: Parse rows from Excel
  const parseRowsToAttendance = (rows, sourceFileName) => {
    let bestHeaderRowIndex = 0;
    let maxScore = -1;

    for (let r = 0; r < Math.min(8, rows.length); r++) {
      const row = rows[r];
      let score = 0;
      row.forEach(cell => {
        const text = (cell || '').toString().toLowerCase();
        if (text.includes('الرقم الوظيفي') || text.includes('رقم الموظف') || text.includes('ac-no') || text.includes('no.')) score += 5;
        if (text.includes('اسم الموظف') || text.includes('الاسم') || text.includes('name')) score += 5;
        if (text.includes('الطابع الزمني') || text.includes('timetable') || text.includes('بصمات')) score += 6;
        if (text.includes('التاريخ') || text.includes('date') || text.includes('اليوم')) score += 5;
        if (text.includes('دخول') || text.includes('خروج') || text.includes('in') || text.includes('out')) score += 3;
      });
      if (score > maxScore) {
        maxScore = score;
        bestHeaderRowIndex = r;
      }
    }

    const headerRow = rows[bestHeaderRowIndex].map((h, i) => (h ? h.toString().trim() : 'col_' + (i + 1)));
    
    let idxEmpNum = -1, idxEmpName = -1, idxDate = -1, idxRaw = -1, idxIn = -1, idxOut = -1;
    headerRow.forEach((col, idx) => {
      const c = col.toLowerCase();
      if (idxEmpNum === -1 && (c.includes('رقم') || c.includes('وظيفي') || c.includes('ac-no') || c.includes('no.'))) idxEmpNum = idx;
      if (idxEmpName === -1 && (c.includes('اسم') || c.includes('name') || (c.includes('موظف') && !c.includes('رقم')))) idxEmpName = idx;
      if (idxDate === -1 && (c.includes('تاريخ') || c.includes('date') || c.includes('اليوم'))) idxDate = idx;
      if (idxRaw === -1 && (c.includes('طابع') || c.includes('بصمات') || c.includes('raw') || c.includes('timetable'))) idxRaw = idx;
      if (idxIn === -1 && (c.includes('دخول') || c.includes('حضور') || c.includes('in') || c.includes('on duty'))) idxIn = idx;
      if (idxOut === -1 && (c.includes('خروج') || c.includes('انصراف') || c.includes('out') || c.includes('off duty'))) idxOut = idx;
    });

    const parsed = [];
    for (let r = bestHeaderRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rawEmpNum = idxEmpNum !== -1 ? String(row[idxEmpNum] || '').trim() : '';
      const rawEmpName = idxEmpName !== -1 ? String(row[idxEmpName] || '').trim() : '';
      const rawDateCell = idxDate !== -1 ? row[idxDate] : null;
      const rawTimeCell = idxIn !== -1 ? row[idxIn] : null;
      const rawPunches = idxRaw !== -1 ? String(row[idxRaw] || '').trim() : '';

      if (!rawEmpNum && !rawEmpName) continue;

      // Extract accurate date
      const dateInfo = parseDateTimeValue(rawDateCell);
      const timeInfo = parseDateTimeValue(rawTimeCell);
      const punchesDateInfo = parseDateTimeValue(rawPunches);

      const finalDate = dateInfo.date || punchesDateInfo.date || '2026-08-01';

      // Extract times from raw punches or in/out columns
      const times = (rawPunches.match(/\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/g) || []);
      const p1In = times[0] || timeInfo.time || (row[idxIn] ? String(row[idxIn]).slice(0, 5) : '08:00');
      const p1Out = times[1] || '';
      const p2In = times[2] || '';
      const p2Out = times[3] || times[times.length - 1] || (row[idxOut] ? String(row[idxOut]).slice(0, 5) : '');

      const empNum = rawEmpNum.replace(/\D/g, '') || '1000';
      const empName = rawEmpName || 'موظف';

      parsed.push({
        id: ('att_' + empNum + '_' + finalDate).replace(/[^a-zA-Z0-9_]/g, '_'),
        employee_number: empNum,
        employee_id: 'emp_' + empNum,
        employee_name: empName,
        log_date: finalDate,
        check_in: p1In ? (finalDate + 'T' + p1In + ':00') : null,
        check_out: p2Out ? (finalDate + 'T' + p2Out + ':00') : null,
        period_1_in: p1In,
        period_1_out: p1Out,
        period_2_in: p2In,
        period_2_out: p2Out,
        timestamp_raw: rawPunches || (p1In && p2Out ? (p1In + ' -- ' + p2Out) : ''),
        status: (p1In || p2Out || rawPunches) ? 'present' : 'absent',
        source_file: sourceFileName
      });
    }
    return parsed;
  };

  // Handle Multi-Files Processing
  const processMultipleFiles = async (files) => {
    setImportedSuccess(false);
    setIsProcessing(true);

    const newFilesList = [...selectedFiles];
    let allExtracted = [...extractedRecords];

    for (const f of files) {
      try {
        const fileData = await readFileAsync(f);
        const workbook = XLSX.read(fileData, { type: 'array', cellDates: false, raw: false });
        
        let fileRecords = [];
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          if (rows.length >= 2) {
            const records = parseRowsToAttendance(rows, f.name);
            fileRecords = [...fileRecords, ...records];
          }
        }

        newFilesList.push({
          file: f,
          name: f.name,
          size: (f.size / 1024).toFixed(1) + ' KB',
          count: fileRecords.length,
          records: fileRecords
        });

        allExtracted = [...allExtracted, ...fileRecords];
      } catch (err) {
        console.error('Error processing file:', f.name, err);
        newFilesList.push({
          file: f,
          name: f.name,
          size: (f.size / 1024).toFixed(1) + ' KB',
          count: 0,
          records: []
        });
      }
    }

    // Deduplicate merged records by (employee_number + '_' + log_date)
    const dedupMap = new Map();
    allExtracted.forEach(r => {
      const key = r.employee_number + '_' + r.log_date;
      dedupMap.set(key, r);
    });

    const uniqueRecords = Array.from(dedupMap.values());

    setSelectedFiles(newFilesList);
    setExtractedRecords(uniqueRecords);
    setIsProcessing(false);

    toast({
      title: '✓ تم استخراج ودمج البيانات من ' + files.length + ' ملف بنجاح',
      description: 'إجمالي السجلات بعد الدمج ومنع التكرار: ' + uniqueRecords.length + ' سجل حركة دوام.'
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    processMultipleFiles(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      processMultipleFiles(files);
    }
  };

  const removeFileFromQueue = (index) => {
    const updated = selectedFiles.filter((_, idx) => idx !== index);
    setSelectedFiles(updated);

    const dedupMap = new Map();
    updated.forEach(f => {
      (f.records || []).forEach(r => {
        const key = r.employee_number + '_' + r.log_date;
        dedupMap.set(key, r);
      });
    });
    setExtractedRecords(Array.from(dedupMap.values()));
  };

  // Save All Extracted Records to Supabase in Safe Batches
  const handleSaveToCloud = async () => {
    if (extractedRecords.length === 0) return;

    setIsSaving(true);
    setSaveProgress(10);

    try {
      const total = extractedRecords.length;
      const chunkSize = 150;
      
      for (let i = 0; i < total; i += chunkSize) {
        const chunk = extractedRecords.slice(i, i + chunkSize);
        await base44.entities.AttendanceLog.bulkCreate(chunk);
        const currentPct = Math.min(95, Math.round(((i + chunk.length) / total) * 100));
        setSaveProgress(currentPct);
      }

      setSaveProgress(100);
      setImportedSuccess(true);
      toast({
        title: '🎉 تم حفظ واعتماد ' + extractedRecords.length + ' سجل بنجاح في السحابة!',
        description: 'تم تحديث كافة حركات الحضور والانصراف، وأصبحت متاحة فوراً في لوحة التحكم ومسير الرواتب.'
      });
    } catch (e) {
      console.error('Save error:', e);
      toast({ title: 'خطأ أثناء الحفظ السحابي', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered preview records
  const filteredRecords = extractedRecords.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.employee_name && r.employee_name.toLowerCase().includes(q)) ||
      (r.employee_number && r.employee_number.includes(q)) ||
      (r.log_date && r.log_date.includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading font-black text-xl text-foreground">
              استيراد ورفع كشوفات البصمة السحابية (متعدد الملفات)
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              يدعم رفع ملف واحد أو عدة ملفات إكسيل دفعة واحدة مع الدمج الذكي ومنع التكرار والحفظ السحابي الدائم.
            </p>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveToCloud}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold gap-2 h-11 px-5 shadow-lg shadow-emerald-600/20"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ السحابي ({saveProgress}%)...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعتماد وحفظ كافة السجلات ({extractedRecords.length}) 💾</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Upload Dropzone (When no files are loaded) */}
      {selectedFiles.length === 0 ? (
        <Card 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="p-12 border-dashed border-2 border-emerald-500/40 rounded-3xl bg-white dark:bg-slate-900 text-center space-y-5 shadow-sm hover:border-emerald-500 transition-all cursor-pointer group"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xlsx, .xls, .csv" 
            multiple
            className="hidden" 
          />

          <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto transition-transform group-hover:scale-110 shadow-inner">
            <Layers className="w-8 h-8 text-emerald-600" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>يدعم اختيار عدة ملفات إكسيل معاً (Multi-Files) 📂</span>
            </div>
            <h3 className="font-heading font-black text-lg text-foreground">
              اسحب وأفلت ملفات إكسيل البصمات والطابع الزمني هنا
            </h3>
            <p className="text-xs text-muted-foreground">
              يمكنك تحديد ملف أو <strong>مجموعة ملفات دفعة واحدة</strong> (مثل: ملفات كل شهر أو ملفات كل فرع) وسيتم دمجها سحابياً تلقائياً.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6 shadow-md gap-2">
              <UploadCloud className="w-4 h-4" />
              <span>اختيار ملفات من جهازك (ملف واحد أو أكثر)</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs text-muted-foreground border-t border-border/40 max-w-2xl mx-auto text-right">
            <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
              <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>دمج تلقائي ومنع التكرار بين الملفات</span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
              <CalendarCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تغطية كاملة لكافة شهور السنة وفروع المنشأة</span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>حفظ سحابي دائم ومباشر في Supabase</span>
            </div>
          </div>
        </Card>
      ) : (
        /* Parsed Multi-Files Management & Data Preview */
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xlsx, .xls, .csv" 
            multiple
            className="hidden" 
          />

          {/* Files Queue List Banner */}
          <Card className="p-5 rounded-3xl border border-border bg-slate-50/60 dark:bg-slate-900/60 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-black text-sm text-foreground">
                    الملفات المحددة للاستيراد ({selectedFiles.length} ملفات)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    تم استخراج ودمج <strong>{extractedRecords.length} سجل حركة دوام</strong> جاهزة للحفظ السحابي
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold gap-1.5 h-8 px-3"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>+ إضافة ملفات أخرى</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedFiles([]);
                    setExtractedRecords([]);
                  }}
                  className="rounded-xl text-xs font-bold h-8 text-rose-600 hover:bg-rose-50 border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5 ml-1" />
                  <span>مسح القائمة</span>
                </Button>
              </div>
            </div>

            {/* Individual Files Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {selectedFiles.map((sf, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-border/80 flex items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <div className="font-bold text-xs text-foreground truncate" title={sf.name}>{sf.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{sf.size} • {sf.count} سجل ✓</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFileFromQueue(idx)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                    title="حذف هذا الملف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Saving Progress Bar (If active) */}
          {isSaving && (
            <Card className="p-5 rounded-3xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 space-y-2">
              <div className="flex justify-between font-bold text-xs text-emerald-900 dark:text-emerald-200">
                <span>جاري الحفظ والمزامنة السحابية مع Supabase...</span>
                <span className="font-mono">{saveProgress}%</span>
              </div>
              <Progress value={saveProgress} className="h-2.5 bg-emerald-100 [&>div]:bg-emerald-600" />
            </Card>
          )}

          {/* Data Table Card */}
          <Card className="p-6 rounded-3xl border shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="بحث في السجلات المستخرجة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-9 rounded-xl text-xs font-bold h-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs py-1.5 px-3">
                  إجمالي السجلات: {extractedRecords.length}
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <Table className="text-right text-xs">
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="py-2.5">الموظف</TableHead>
                    <TableHead className="py-2.5">التاريخ</TableHead>
                    <TableHead className="py-2.5">حركات البصمة (الطابع الزمني)</TableHead>
                    <TableHead className="py-2.5 text-center">الدخول</TableHead>
                    <TableHead className="py-2.5 text-center">الخروج</TableHead>
                    <TableHead className="py-2.5 text-center">الملف المصدر</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.slice(0, 100).map((r, i) => (
                    <TableRow key={i} className="hover:bg-muted/40 font-medium">
                      <TableCell className="py-2.5 font-bold">
                        <div>{r.employee_name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">#{r.employee_number}</div>
                      </TableCell>
                      <TableCell className="py-2.5 font-mono">{r.log_date}</TableCell>
                      <TableCell className="py-2.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {r.timestamp_raw || '—'}
                      </TableCell>
                      <TableCell className="py-2.5 text-center font-mono font-bold text-emerald-600">
                        {r.period_1_in || (r.check_in ? r.check_in.slice(11, 16) : '—')}
                      </TableCell>
                      <TableCell className="py-2.5 text-center font-mono font-bold text-indigo-600">
                        {r.period_2_out || (r.check_out ? r.check_out.slice(11, 16) : '—')}
                      </TableCell>
                      <TableCell className="py-2.5 text-center text-muted-foreground text-[10px] truncate max-w-[140px]">
                        {r.source_file}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredRecords.length > 100 && (
              <div className="p-3 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl">
                يتم عرض أول 100 سجل في المعاينة لتسريع الأداء (سيتم حفظ جميع السجلات الـ {filteredRecords.length} بالكامل عند الضغط على زر الاعتماد).
              </div>
            )}
          </Card>

        </div>
      )}

    </div>
  );
}
