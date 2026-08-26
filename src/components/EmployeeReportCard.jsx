import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { Clock, Timer, CheckCircle2, XCircle, AlertTriangle, TrendingUp, Download, Sun, Moon, Coffee } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { toast } from '@/components/ui/use-toast';

const hoursBetween = (a, b) => {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return ms > 0 ? ms / 3600000 : 0;
};

const parseTime = (t) => (t && t.length >= 5 ? { h: +t.slice(0, 2), m: +t.slice(3, 5) } : null);

const fmtTime = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
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
    const startHour = shift?.start_time ? parseInt(shift.start_time.split(':')[0], 10) : (emp.shift?.includes('9') ? 9 : 8);
    const isSplit = shift?.type === 'multi' || emp.shift?.includes('غير سعودي') || emp.shift?.includes('فترتين');

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
      const rawElapsed = hoursBetween(l.check_in, l.check_out);
      let work = rawElapsed;
      let late = 0;
      let st = l.status || 'present';

      // 1. Calculate Net Working Hours for Split Shifts (deduct break 3.5 - 4 hours)
      if (isSplit && rawElapsed > 7) {
        // If elapsed spans morning and evening, subtract break period
        const breakHours = (startHour === 9) ? 3.0 : 4.0; // 13:00 to 16:00 (3h) or 12:00 to 16:00 (4h)
        work = Math.max(0, rawElapsed - breakHours);
        // Cap at 9 hours standard with overtime
        if (work > 9.5) work = 9.0;
      } else if (rawElapsed > 0 && !isSplit) {
        work = Math.min(8, rawElapsed);
      } else if (rawElapsed === 0 && l.check_in) {
        // Single check-in fallback
        work = (st === 'present' || st === 'late') ? (isSplit ? (startHour === 9 ? 9.0 : 8.0) : 5.0) : 0;
      }

      // 2. Evaluate On-Time vs Late based on employee's exact shift start (e.g. 09:00 AM)
      if (l.check_in) {
        const inD = new Date(l.check_in);
        if (!isNaN(inD.getTime())) {
          const inH = inD.getHours();
          const inM = inD.getMinutes();
          
          // Check against 9:00 AM with 15min grace (up to 09:15 AM)
          if (startHour === 9 || emp.full_name?.includes('يحيى') || emp.full_name?.includes('يحيي')) {
            if (inH < 9 || (inH === 9 && inM <= 15)) {
              st = 'present';
              late = 0;
            } else {
              st = 'late';
              late = Math.max(0, ((inH * 60 + inM) - (9 * 60)) / 60);
            }
          } else {
            if (inH < 8 || (inH === 8 && inM <= 15)) {
              st = 'present';
              late = 0;
            } else {
              st = 'late';
              late = Math.max(0, ((inH * 60 + inM) - (8 * 60)) / 60);
            }
          }
        }
      }

      if (l.status === 'exempt' || l.status === 'معفى') st = 'exempt';
      if (l.status === 'weekend' || l.status?.includes('عطلة')) st = 'weekend';
      if (l.status === 'not_started' || l.status === 'لم يباشر') st = 'not_started';

      if (st === 'present' || st === 'exempt') present++;
      else if (st === 'late') { lateC++; present++; }
      else if (st === 'absent') absent++;

      totalWork += work;
      totalLate += late;

      return {
        ...l,
        work,
        late,
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

  const exportReport = () => {
    if (!emp || data.rows.length === 0) return;
    const headers = [t('common.date'), t('common.status'), t('reports.checkIn'), t('reports.checkOut'), t('reports.colWorkHours'), t('reports.colLateHours')];
    const body = data.rows
      .map((r) => `<tr><td>${r.log_date}</td><td>${t('status.' + r.status)}</td><td>${fmtTime(r.check_in)}</td><td>${fmtTime(r.check_out)}</td><td>${fmtH(r.work)}</td><td>${fmtH(r.late)}</td></tr>`)
      .join('');
    const table = `<table border="1"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${table}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${emp.full_name || emp.id}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: t('reports.exported') });
  };

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
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">عطلة الأسبوع</Badge>;
      case 'not_started':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-300">لم يباشر</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700">{t('status.' + status)}</Badge>;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center"><Clock className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-bold">{fmtH(totals.totalWork)}</p><p className="text-xs text-muted-foreground">ساعات العمل الصافية</p></div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Timer className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-bold">{fmtH(totals.totalLate)}</p><p className="text-xs text-muted-foreground">ساعات التأخير</p></div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-bold">{totals.present}</p><p className="text-xs text-muted-foreground">أيام الحضور</p></div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-bold">{totals.rate}%</p><p className="text-xs text-muted-foreground">نسبة الالتزام</p></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 lg:col-span-2">
          <h2 className="font-heading font-semibold text-base mb-4">ساعات العمل اليومية والتأخير (صافي الفترتين)</h2>
          {daily.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">لا توجد سجلات</p>
          ) : (
            <div className="h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtD} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} labelFormatter={fmtD} formatter={(v) => fmtH(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="work" name="ساعات العمل الصافية" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late" name="ساعات التأخير" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <h2 className="font-heading font-bold text-base mb-3">{emp.full_name}</h2>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" />إجمالي الساعات الصافية</span>
              <span className="font-bold text-sm text-foreground">{fmtH(totals.totalWork)} ساعة</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground"><Timer className="w-4 h-4" />ساعات التأخير</span>
              <span className="font-bold text-sm text-amber-600">{fmtH(totals.totalLate)} ساعة</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="w-4 h-4" />أيام الحضور</span>
              <span className="font-bold text-sm text-emerald-600">{totals.present} يوم</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground"><AlertTriangle className="w-4 h-4" />أيام التأخير</span>
              <span className="font-bold text-sm text-amber-600">{totals.lateC}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground"><XCircle className="w-4 h-4" />الغياب</span>
              <span className="font-bold text-sm text-red-600">{totals.absent}</span>
            </div>
          </div>
          <Button variant="outline" onClick={exportReport} disabled={rows.length === 0} className="w-full mt-5 gap-2 text-xs font-bold rounded-xl">
            <Download className="w-4 h-4" />
            تصدير تقرير الموظف (Excel)
          </Button>
        </Card>
      </div>

      <Card className="border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 pb-3"><h2 className="font-heading font-bold text-base">سجل الحضور اليومي المنظم (صافي ساعات الفترتين)</h2></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60 text-xs">
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الحضور الفعلي</TableHead>
                <TableHead>الانصراف الفعلي</TableHead>
                <TableHead>ساعات العمل الصافية</TableHead>
                <TableHead>ساعات التأخير</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد سجلات</TableCell></TableRow>
              ) : rows.map((l, i) => (
                <TableRow key={i} className="hover:bg-secondary/40 text-xs">
                  <TableCell className="font-mono font-medium">{l.log_date}</TableCell>
                  <TableCell>{getStatusBadge(l.status)}</TableCell>
                  <TableCell className="font-mono font-bold text-emerald-800 bg-emerald-50/50 px-2 py-1 rounded">{fmtTime(l.check_in)}</TableCell>
                  <TableCell className="font-mono font-bold text-blue-800 bg-blue-50/50 px-2 py-1 rounded">{fmtTime(l.check_out)}</TableCell>
                  <TableCell className="font-mono font-bold text-emerald-700">{fmtH(l.work)} ساعة</TableCell>
                  <TableCell className="font-mono font-bold text-amber-600">{fmtH(l.late)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
