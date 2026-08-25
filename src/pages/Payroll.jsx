import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Wallet, Users, TrendingDown, TrendingUp, Eye, Download } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { toast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const statusBadge = (s) => {
  const map = { active: 'bg-emerald-100 text-emerald-700', on_leave: 'bg-amber-100 text-amber-700', inactive: 'bg-slate-200 text-slate-600' };
  return map[s] || 'bg-slate-100 text-slate-600';
};

const workingDaysInMonth = (monthStr) => {
  const [y, m] = monthStr.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  let wd = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(y, m - 1, d).getDay();
    if (dow !== 5 && dow !== 6) wd++; // exclude Fri & Sat (Saudi weekend)
  }
  return wd;
};

const lastDayStr = (monthStr) => {
  const [y, m] = monthStr.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  return `${monthStr}-${String(days).padStart(2, '0')}`;
};

export default function Payroll() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.role === 'admin';
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setEmployees(await base44.entities.Employee.list('-salary'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLogs(await base44.entities.AttendanceLog.filter({ log_date: { $gte: `${month}-01`, $lte: lastDayStr(month) } }));
      } catch { setLogs([]); }
    })();
  }, [month]);

  const fmt = (n) => Math.round(n || 0).toLocaleString();
  const cur = (n) => `${fmt(n)} SAR`;

  const matchLogs = (e) => logs.filter((l) => (e.user_id && l.user_id === e.user_id) || (l.employee_name && l.employee_name === e.full_name));

  const rows = useMemo(() => {
    const wd = workingDaysInMonth(month);
    return employees
      .filter((e) => e.status === 'active')
      .map((e) => {
        const empLogs = matchLogs(e);
        const present = empLogs.filter((l) => l.status === 'present').length;
        const late = empLogs.filter((l) => l.status === 'late').length;
        const absentLogged = empLogs.filter((l) => l.status === 'absent').length;
        const attended = present + late;
        const absent = absentLogged + Math.max(0, wd - attended - absentLogged);
        const monthly = (e.salary || 0) / 12;
        const daily = monthly / 30;
        const absentDed = absent * daily;
        const lateDed = late * daily * 0.25;
        const deductions = absentDed + lateDed;
        const net = Math.max(0, monthly - deductions);
        return { e, present, late, absent, wd, monthly, daily, absentDed, lateDed, deductions, net };
      });
  }, [employees, logs, month]);

  const totals = useMemo(() => rows.reduce((a, r) => ({
    basic: a.basic + r.monthly, deductions: a.deductions + r.deductions, net: a.net + r.net,
  }), { basic: 0, deductions: 0, net: 0 }), [rows]);

  const exportExcel = () => {
    const headers = [
      t('payroll.colEmployee'), t('payroll.colDepartment'),
      t('payroll.colPresent'), t('payroll.colLate'), t('payroll.colAbsent'),
      t('payroll.colWorkingDays'),
      t('payroll.colBasic'), t('payroll.colAbsentDed'), t('payroll.colLateDed'),
      t('payroll.colTotalDed'), t('payroll.colNet'),
    ];
    const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const bodyRows = rows.map((r) => [
      r.e.full_name, r.e.department || '', r.present, r.late, r.absent, r.wd,
      Math.round(r.monthly || 0), Math.round(r.absentDed), Math.round(r.lateDed),
      Math.round(r.deductions), Math.round(r.net),
    ]);
    const table = `<table border="1"><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${bodyRows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${table}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${month}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: t('payroll.exported') });
  };

  if (!isAdmin) {
    return <div className="text-center py-20"><p className="text-muted-foreground">{t('common.noAccess')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">{t('payroll.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('payroll.attendanceBased')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('payroll.month')}</span>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="max-w-[180px]" />
          <Button variant="outline" onClick={exportExcel} disabled={loading || rows.length === 0} className="gap-2">
            <Download className="w-4 h-4" />
            {t('payroll.exportExcel')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard icon={Wallet} label={t('payroll.totalBasic')} value={cur(totals.basic)} accent="bg-accent/20 text-accent-foreground" />
        <StatCard icon={TrendingDown} label={t('payroll.totalDeductions')} value={cur(totals.deductions)} accent="bg-red-100 text-red-600" />
        <StatCard icon={TrendingUp} label={t('payroll.totalNet')} value={cur(totals.net)} accent="bg-emerald-100 text-emerald-600" />
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60">
                <TableHead>{t('common.employee')}</TableHead>
                <TableHead>{t('common.department')}</TableHead>
                <TableHead className="text-center">{t('payroll.presentDays')}</TableHead>
                <TableHead className="text-center">{t('payroll.lateDays')}</TableHead>
                <TableHead className="text-center">{t('payroll.absentDays')}</TableHead>
                <TableHead className="text-end">{t('payroll.basic')}</TableHead>
                <TableHead className="text-end">{t('payroll.deductions')}</TableHead>
                <TableHead className="text-end">{t('payroll.net')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={9}><div className="h-6 bg-secondary rounded animate-pulse" /></TableCell></TableRow>)
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-10">{t('employees.noEmployees')}</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.e.id} className="hover:bg-secondary/40">
                  <TableCell className="font-medium text-sm">{r.e.full_name}</TableCell>
                  <TableCell className="text-sm">{r.e.department || '—'}</TableCell>
                  <TableCell className="text-center text-sm text-emerald-600 font-medium">{r.present}</TableCell>
                  <TableCell className="text-center text-sm text-amber-600 font-medium">{r.late}</TableCell>
                  <TableCell className="text-center text-sm text-red-600 font-medium">{r.absent}</TableCell>
                  <TableCell className="text-end text-sm">{r.monthly ? cur(r.monthly) : '—'}</TableCell>
                  <TableCell className="text-end text-sm text-red-600">{r.deductions > 0 ? `- ${cur(r.deductions)}` : '—'}</TableCell>
                  <TableCell className="text-end text-sm font-semibold">{r.monthly ? cur(r.net) : '—'}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => setDetail(r)}><Eye className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('payroll.detailTitle')}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 py-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-heading font-semibold text-lg">{detail.e.full_name}</p>
                  <p className="text-xs text-muted-foreground">{detail.e.department || '—'}</p>
                </div>
                <Badge className={statusBadge(detail.e.status)}>{t('status.' + detail.e.status)}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-50 rounded-xl p-3"><p className="text-xl font-bold text-emerald-600">{detail.present}</p><p className="text-xs text-muted-foreground">{t('payroll.presentDays')}</p></div>
                <div className="bg-amber-50 rounded-xl p-3"><p className="text-xl font-bold text-amber-600">{detail.late}</p><p className="text-xs text-muted-foreground">{t('payroll.lateDays')}</p></div>
                <div className="bg-red-50 rounded-xl p-3"><p className="text-xl font-bold text-red-600">{detail.absent}</p><p className="text-xs text-muted-foreground">{t('payroll.absentDays')}</p></div>
              </div>
              <div className="space-y-2 text-sm border-t border-border/50 pt-3">
                <Row label={t('payroll.workingDays')} value={`${detail.wd} ${t('payroll.days')}`} />
                <Row label={t('payroll.basic')} value={detail.monthly ? cur(detail.monthly) : t('payroll.noSalary')} />
                <Row label={t('payroll.dailyWage')} value={detail.monthly ? cur(detail.daily) : '—'} />
                <Row label={t('payroll.absentDeduction')} value={`- ${cur(detail.absentDed)}`} danger />
                <Row label={t('payroll.lateDeduction')} value={`- ${cur(detail.lateDed)}`} danger />
              </div>
              <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <span className="font-heading font-semibold">{t('payroll.net')}</span>
                <span className="text-xl font-heading font-bold text-primary">{detail.monthly ? cur(detail.net) : '—'}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Row = ({ label, value, danger }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-medium ${danger ? 'text-red-600' : ''}`}>{value}</span>
  </div>
);