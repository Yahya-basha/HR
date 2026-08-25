import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { Clock, Timer, CheckCircle2, XCircle, AlertTriangle, TrendingUp, Download } from 'lucide-react';
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

export default function EmployeeReportCard({ empId, from, to, logs, employees, shifts }) {
  const { t, lang } = useI18n();

  const shiftMap = useMemo(() => {
    const m = {};
    (shifts || []).forEach((s) => { if (s.name) m[s.name] = s; });
    return m;
  }, [shifts]);

  const emp = employees.find((e) => e.id === empId);

  const data = useMemo(() => {
    if (!emp) return { rows: [], daily: [], totals: {} };
    const shift = emp.shift ? shiftMap[emp.shift] : null;
    const start = shift ? parseTime(shift.start_time) : null;
    const graceMin = shift?.grace_minutes || 0;

    const inRange = (ds) => {
      if (!ds) return false;
      if (from && ds < from) return false;
      if (to && ds > to) return false;
      return true;
    };

    const rows = logs
      .filter((l) => inRange(l.log_date) && ((emp.user_id && l.user_id === emp.user_id) || l.employee_name === emp.full_name))
      .map((l) => {
        const work = hoursBetween(l.check_in, l.check_out);
        let late = 0;
        if (l.status === 'late' && l.check_in && start) {
          const ci = new Date(l.check_in);
          const expected = new Date(ci);
          expected.setHours(start.h, start.m + graceMin, 0, 0);
          const lateMs = ci.getTime() - expected.getTime();
          if (lateMs > 0) late = lateMs / 3600000;
        }
        return { ...l, work, late };
      })
      .sort((a, b) => (b.log_date || '').localeCompare(a.log_date || ''));

    const present = rows.filter((r) => r.status === 'present').length;
    const lateC = rows.filter((r) => r.status === 'late').length;
    const absent = rows.filter((r) => r.status === 'absent').length;
    const tot = rows.length || 1;
    const rate = Math.round(((present + lateC) / tot) * 100);
    const totalWork = rows.reduce((a, r) => a + r.work, 0);
    const totalLate = rows.reduce((a, r) => a + r.late, 0);

    const map = {};
    rows.forEach((r) => {
      const k = r.log_date;
      if (!k) return;
      if (!map[k]) map[k] = { date: k, work: 0, late: 0 };
      map[k].work += r.work;
      map[k].late += r.late;
    });
    const daily = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));

    return { rows, daily, totals: { present, lateC, absent, rate, totalWork, totalLate } };
  }, [emp, logs, from, to, shiftMap]);

  if (!emp) return null;

  const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
  const fmtD = (ds) => {
    const d = new Date(ds);
    if (isNaN(d.getTime())) return ds;
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };
  const fmtTime = (dt) => dt ? new Date(dt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtH = (h) => (Math.round(h * 10) / 10).toFixed(1);

  const exportReport = () => {
    const headers = [t('common.date'), t('reports.checkIn'), t('reports.checkOut'), t('reports.colWorkHours'), t('reports.colLateHours'), t('common.status')];
    const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const bodyRows = data.rows.map((r) => [r.log_date, fmtTime(r.check_in), fmtTime(r.check_out), fmtH(r.work), fmtH(r.late), t('status.' + r.status)]);
    const table = `<table border="1"><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${bodyRows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 border-border/60 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Clock className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-bold">{fmtH(totals.totalWork)}</p><p className="text-xs text-muted-foreground">{t('reports.actualHours')}</p></div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Timer className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-bold">{fmtH(totals.totalLate)}</p><p className="text-xs text-muted-foreground">{t('reports.lateHours')}</p></div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-bold">{totals.present}</p><p className="text-xs text-muted-foreground">{t('reports.present')}</p></div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-bold">{totals.rate}%</p><p className="text-xs text-muted-foreground">{t('reports.trackRate')}</p></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 border-border/60 shadow-sm lg:col-span-2">
          <h2 className="font-heading font-semibold text-lg mb-4">{t('reports.dailyHours')}</h2>
          {daily.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">{t('reports.noLogs')}</p>
          ) : (
            <div className="h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtD} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} labelFormatter={fmtD} formatter={(v) => fmtH(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="work" name={t('reports.colWorkHours')} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late" name={t('reports.colLateHours')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-6 border-border/60 shadow-sm">
          <h2 className="font-heading font-semibold text-lg mb-3">{emp.full_name}</h2>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" />{t('reports.actualHours')}</span>
              <span className="font-semibold">{fmtH(totals.totalWork)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground"><Timer className="w-4 h-4" />{t('reports.lateHours')}</span>
              <span className="font-semibold text-amber-600">{fmtH(totals.totalLate)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="w-4 h-4" />{t('reports.present')}</span>
              <span className="font-semibold">{totals.present}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground"><AlertTriangle className="w-4 h-4" />{t('reports.late')}</span>
              <span className="font-semibold text-amber-600">{totals.lateC}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground"><XCircle className="w-4 h-4" />{t('reports.absent')}</span>
              <span className="font-semibold text-red-600">{totals.absent}</span>
            </div>
          </div>
          <Button variant="outline" onClick={exportReport} disabled={rows.length === 0} className="w-full mt-5 gap-2">
            <Download className="w-4 h-4" />
            {t('reports.exportEmployee')}
          </Button>
        </Card>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="p-5 pb-3"><h2 className="font-heading font-semibold text-lg">{emp.full_name}</h2></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60">
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('reports.checkIn')}</TableHead>
                <TableHead>{t('reports.checkOut')}</TableHead>
                <TableHead>{t('reports.colWorkHours')}</TableHead>
                <TableHead>{t('reports.colLateHours')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('reports.noLogs')}</TableCell></TableRow>
              ) : rows.map((l, i) => (
                <TableRow key={i} className="hover:bg-secondary/40">
                  <TableCell className="text-sm">{l.log_date}</TableCell>
                  <TableCell><Badge className={l.status === 'present' ? 'bg-emerald-100 text-emerald-700' : l.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>{t('status.' + l.status)}</Badge></TableCell>
                  <TableCell className="text-sm">{fmtTime(l.check_in)}</TableCell>
                  <TableCell className="text-sm">{fmtTime(l.check_out)}</TableCell>
                  <TableCell className="text-sm font-medium">{fmtH(l.work)}</TableCell>
                  <TableCell className="text-sm font-medium text-amber-600">{fmtH(l.late)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}