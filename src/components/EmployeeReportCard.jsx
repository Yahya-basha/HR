import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { Clock, Timer, CheckCircle2, XCircle, AlertTriangle, TrendingUp, Download, Sun, Moon, Coffee, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { toast } from '@/components/ui/use-toast';

// Accurate parser for two periods (e.g. "08:19:00 -- 12:45:00 & 16:48:00 -- 21:14:00")
const parseSplitPeriods = (rawTimestamp, rawPunches, checkInIso, checkOutIso) => {
  const str = rawTimestamp || '';
  const periods = str.includes('&') ? str.split('&').map(p => p.trim()) : [str];
  
  const result = {
    morningIn: null,
    morningOut: null,
    eveningIn: null,
    eveningOut: null,
    totalMinutes: 0,
    isSplit: false
  };

  if (periods.length >= 2) {
    result.isSplit = true;
    
    // Period 1 (Morning)
    const mTimes = periods[0].match(/\d{1,2}:\d{2}(?::\d{2})?/g) || [];
    if (mTimes.length > 0) result.morningIn = mTimes[0];
    if (mTimes.length > 1) result.morningOut = mTimes[1];

    // Period 2 (Evening)
    const eTimes = periods[1].match(/\d{1,2}:\d{2}(?::\d{2})?/g) || [];
    if (eTimes.length > 0) result.eveningIn = eTimes[0];
    if (eTimes.length > 1) result.eveningOut = eTimes[1];

    // Calculate Morning Duration
    if (result.morningIn && result.morningOut) {
      const [inH, inM] = result.morningIn.split(':').map(Number);
      const [outH, outM] = result.morningOut.split(':').map(Number);
      result.totalMinutes += Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));
    } else if (result.morningIn) {
      result.totalMinutes += 240; // 4 hours default
    }

    // Calculate Evening Duration
    if (result.eveningIn && result.eveningOut) {
      const [inH, inM] = result.eveningIn.split(':').map(Number);
      const [outH, outM] = result.eveningOut.split(':').map(Number);
      result.totalMinutes += Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));
    } else if (result.eveningIn) {
      result.totalMinutes += 270; // 4.5 hours default
    }

  } else {
    // Single period or fallback
    const times = (str || rawPunches || '').match(/\d{1,2}:\d{2}(?::\d{2})?/g) || [];
    if (times.length >= 2) {
      const inTime = times[0];
      const outTime = times[times.length - 1];
      const [inH, inM] = inTime.split(':').map(Number);
      const [outH, outM] = outTime.split(':').map(Number);
      const rawSpan = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));
      
      if (rawSpan > 420) {
        // If > 7 hours, it's a split shift: deduct 3.5h break (210 mins)
        result.totalMinutes = Math.max(0, rawSpan - 210);
        result.morningIn = inTime;
        result.eveningOut = outTime;
        result.isSplit = true;
      } else {
        result.totalMinutes = rawSpan;
        result.morningIn = inTime;
        result.morningOut = outTime;
      }
    } else if (times.length === 1) {
      result.morningIn = times[0];
      result.totalMinutes = 300; // 5 hours default
    }
  }

  return result;
};

const fmtTimeStr = (t) => {
  if (!t) return '—';
  try {
    const parts = t.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'م' : 'ص';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
  } catch {
    return t;
  }
};

const fmtD = (d) => (d ? d.slice(5) : '');
const fmtH = (h) => (typeof h === 'number' ? h.toFixed(1) : '0.0');

export default function EmployeeReportCard({ empId, from, to, logs, employees, shifts }) {
  const { t, lang } = useI18n();

  const shiftMap = useMemo(() => {
    const m = {};
    (shifts || []).forEach((s) => { if (s.name) m[s.name] = s; });
    return m;
  }, [shifts]);

  const emp = employees.find((e) => e.id === empId || e.employee_number === empId);

  const data = useMemo(() => {
    if (!emp) return { rows: [], daily: [], totals: {} };
    const shift = emp.shift ? shiftMap[emp.shift] : null;
    const startHour = shift?.start_time ? parseInt(shift.start_time.split(':')[0], 10) : 9;

    const inRange = (ds) => {
      if (!ds) return false;
      if (from && ds < from) return false;
      if (to && ds > to) return false;
      return true;
    };

    const myLogs = logs
      .filter((l) => (l.user_id === emp.id || l.employee_number === emp.employee_number || l.employee_name === emp.full_name) && inRange(l.log_date))
      .sort((a, b) => (b.log_date || '').localeCompare(a.log_date || ''));

    let totalWork = 0;
    let totalLate = 0;
    let present = 0;
    let lateC = 0;
    let absent = 0;

    const rows = myLogs.map((l) => {
      const splitInfo = parseSplitPeriods(l.timestamp_raw || l.timestampStr, l.punches_raw || l.punches_summary, l.check_in, l.check_out);
      
      let workHours = splitInfo.totalMinutes > 0 ? (splitInfo.totalMinutes / 60) : 0;
      let lateHours = 0;
      let st = l.status || 'present';

      // Clean status values
      if (l.status === 'exempt' || l.status === 'معفى') st = 'exempt';
      else if (l.status === 'weekend' || l.status?.includes('عطلة')) st = 'weekend';
      else if (l.status === 'not_started' || l.status === 'لم يباشر') st = 'not_started';
      else if (l.status === 'absent' || l.status === 'غائب') st = 'absent';
      else if (l.status === 'on_leave' || l.status?.includes('إجازة')) st = 'on_leave';

      // Calculate Late Hours: ONLY for regular working days (NEVER for exempt or weekend)
      if (st !== 'exempt' && st !== 'weekend' && st !== 'not_started' && st !== 'on_leave' && st !== 'absent') {
        const firstIn = splitInfo.morningIn || (l.check_in ? new Date(l.check_in).toTimeString().substring(0, 5) : null);
        if (firstIn) {
          const [inH, inM] = firstIn.split(':').map(Number);
          
          // Yahya Basha / 9 AM shift: grace until 09:15
          if (startHour === 9 || emp.full_name?.includes('يحيى') || emp.full_name?.includes('يحيي')) {
            if (inH < 9 || (inH === 9 && inM <= 15)) {
              st = 'present';
              lateHours = 0;
            } else {
              st = 'late';
              lateHours = Math.max(0, ((inH * 60 + inM) - (9 * 60)) / 60);
            }
          } else {
            // 8 AM shift: grace until 08:15
            if (inH < 8 || (inH === 8 && inM <= 15)) {
              st = 'present';
              lateHours = 0;
            } else {
              st = 'late';
              lateHours = Math.max(0, ((inH * 60 + inM) - (8 * 60)) / 60);
            }
          }
        }
      } else {
        // Zero delay for exempt / weekend / leave
        lateHours = 0;
      }

      if (st === 'present' || st === 'exempt') present++;
      else if (st === 'late') { lateC++; present++; }
      else if (st === 'absent') absent++;

      totalWork += workHours;
      totalLate += lateHours;

      return {
        ...l,
        splitInfo,
        work: workHours,
        late: lateHours,
        status: st
      };
    });

    const totalDays = rows.length;
    const rate = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;

    const daily = [...rows].reverse().map((r) => ({
      date: r.log_date,
      work: Number(r.work.toFixed(1)),
      late: Number(r.late.toFixed(1)),
    }));

    return {
      rows,
      daily,
      totals: { totalWork, totalLate, present, lateC, absent, rate, totalDays }
    };
  }, [emp, logs, from, to, shiftMap]);

  const { totals, daily, rows } = data;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">حاضر</Badge>;
      case 'late':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">متأخر</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800 border-red-300">غائب</Badge>;
      case 'exempt':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">معفى</Badge>;
      case 'weekend':
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">عطلة الأسبوع</Badge>;
      case 'not_started':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-300">لم يباشر</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center"><Clock className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-black text-foreground">{fmtH(totals.totalWork)}</p><p className="text-xs text-muted-foreground">صافي ساعات العمل الفعلية</p></div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Timer className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-black text-foreground">{fmtH(totals.totalLate)}</p><p className="text-xs text-muted-foreground">ساعات التأخير المعتمدة</p></div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-black text-foreground">{totals.present}</p><p className="text-xs text-muted-foreground">أيام الحضور والالتزام</p></div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-black text-foreground">{totals.rate}%</p><p className="text-xs text-muted-foreground">نسبة التزام الموظف</p></div>
          </div>
        </Card>
      </div>

      {/* Main Table with Detailed Two-Period Breakdown */}
      <Card className="border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 pb-3 border-b border-border/40 flex items-center justify-between bg-secondary/20">
          <div>
            <h2 className="font-heading font-bold text-base text-foreground">
              سجل حضور وانصراف دوام الفترتين (الصباحية + المسائية)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              عرض تفصيلي لدخول وخروج كل فترة وحساب مجموع الساعات الصافية تلقائياً
            </p>
          </div>
          <Badge className="bg-emerald-600 text-white font-mono text-xs">
            {rows.length} سجل دوام
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60 text-xs">
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-amber-800 font-extrabold">الفترة الأولى (الصباحية)</TableHead>
                <TableHead className="text-indigo-800 font-extrabold">الفترة الثانية (المسائية)</TableHead>
                <TableHead className="text-emerald-700 font-extrabold">إجمالي الساعات الصافية</TableHead>
                <TableHead className="text-amber-600 font-extrabold">ساعات التأخير</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد سجلات</TableCell></TableRow>
              ) : rows.map((l, i) => {
                const s = l.splitInfo;
                return (
                  <TableRow key={i} className="hover:bg-secondary/40 text-xs">
                    
                    {/* Date */}
                    <TableCell className="font-mono font-bold text-foreground">
                      {l.log_date}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {getStatusBadge(l.status)}
                    </TableCell>

                    {/* Period 1: Morning (08:19 - 12:45) */}
                    <TableCell>
                      {s.morningIn ? (
                        <div className="flex items-center gap-1 font-mono text-[11px] bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-lg border border-amber-200/60 w-fit" dir="ltr">
                          <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="font-bold text-emerald-700">{fmtTimeStr(s.morningIn)}</span>
                          <span className="text-muted-foreground">➔</span>
                          <span className="font-bold text-blue-700">{fmtTimeStr(s.morningOut)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs font-mono">—</span>
                      )}
                    </TableCell>

                    {/* Period 2: Evening (16:48 - 21:14) */}
                    <TableCell>
                      {s.eveningIn ? (
                        <div className="flex items-center gap-1 font-mono text-[11px] bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 rounded-lg border border-indigo-200/60 w-fit" dir="ltr">
                          <Moon className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="font-bold text-emerald-700">{fmtTimeStr(s.eveningIn)}</span>
                          <span className="text-muted-foreground">➔</span>
                          <span className="font-bold text-blue-700">{fmtTimeStr(s.eveningOut)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs font-mono">—</span>
                      )}
                    </TableCell>

                    {/* Net Work Hours */}
                    <TableCell className="font-mono font-black text-xs text-emerald-700">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                        {fmtH(l.work)} ساعة
                      </span>
                    </TableCell>

                    {/* Late Hours */}
                    <TableCell className="font-mono font-bold text-xs text-amber-600">
                      {fmtH(l.late)}
                    </TableCell>

                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

    </div>
  );
}
