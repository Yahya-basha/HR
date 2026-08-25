import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { CheckCircle2, Clock, XCircle, TrendingUp, Award, UserSearch, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import ComplianceChart from '@/components/ComplianceChart';
import EmployeeReportCard from '@/components/EmployeeReportCard';

const WEEK_DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const WEEK_DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Reports() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const isAdmin = user?.role === 'admin';
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackEmp, setTrackEmp] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [recent, emps, shfs] = await Promise.all([
          base44.entities.AttendanceLog.list('-log_date', 300),
          base44.entities.Employee.list(),
          base44.entities.Shift.list(),
        ]);
        setLogs(recent);
        setEmployees(emps);
        setShifts(shfs);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!isAdmin) {
    return <div className="text-center py-20"><p className="text-muted-foreground">{t('common.noAccess')}</p></div>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const inWeek = (ds) => {
    if (!ds) return false;
    const d = new Date(ds);
    d.setHours(0, 0, 0, 0);
    return d >= weekStart && d <= today;
  };
  const weekLogs = logs.filter((l) => inWeek(l.log_date));

  const present = weekLogs.filter((l) => l.status === 'present').length;
  const late = weekLogs.filter((l) => l.status === 'late').length;
  const absent = weekLogs.filter((l) => l.status === 'absent').length;
  const total = weekLogs.length || 1;
  const rate = Math.round(((present + late) / total) * 100);
  const latePct = Math.round((late / total) * 100);
  const absentPct = Math.round((absent / total) * 100);

  const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
  const fmt = (d) => new Date(d).toLocaleDateString(locale, { month: 'short', day: 'numeric' });

  const dayNames = lang === 'ar' ? WEEK_DAYS_AR : WEEK_DAYS_EN;
  const dailyMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = { day: dayNames[d.getDay()], date: fmt(d), present: 0, late: 0, absent: 0 };
  }
  weekLogs.forEach((l) => {
    if (dailyMap[l.log_date]) {
      if (l.status === 'present') dailyMap[l.log_date].present++;
      else if (l.status === 'late') dailyMap[l.log_date].late++;
      else if (l.status === 'absent') dailyMap[l.log_date].absent++;
    }
  });
  const daily = Object.values(dailyMap);

  const lateByEmp = {};
  const totalByEmp = {};
  weekLogs.forEach((l) => {
    const name = l.employee_name || '—';
    totalByEmp[name] = (totalByEmp[name] || 0) + 1;
    if (l.status === 'late') lateByEmp[name] = (lateByEmp[name] || 0) + 1;
  });
  const empDept = {};
  employees.forEach((e) => { empDept[e.full_name] = e.department; });
  const mostLate = Object.keys(lateByEmp)
    .map((name) => ({ name, late: lateByEmp[name], total: totalByEmp[name] || 0, dept: empDept[name] }))
    .sort((a, b) => b.late - a.late)
    .slice(0, 6);

  const deptAgg = {};
  weekLogs.forEach((l) => {
    const name = l.employee_name || '—';
    const dept = empDept[name] || t('reports.unassigned');
    if (!deptAgg[dept]) deptAgg[dept] = { dept, present: 0, late: 0, absent: 0 };
    if (l.status === 'present') deptAgg[dept].present++;
    else if (l.status === 'late') deptAgg[dept].late++;
    else if (l.status === 'absent') deptAgg[dept].absent++;
  });
  const byDept = Object.values(deptAgg).map((d) => {
    const tot = d.present + d.late + d.absent || 1;
    return { ...d, rate: Math.round(((d.present + d.late) / tot) * 100) };
  }).sort((a, b) => b.rate - a.rate);

  if (loading) return <div className="space-y-6">{[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-secondary animate-pulse" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">{t('reports.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('reports.subtitle')}</p>
      </div>

      <Card className="p-5 border-border/60 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">{t('reports.weekRange')}</span>
        </div>
        <p className="font-heading font-semibold text-lg">{fmt(weekStart)} → {fmt(today)}</p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 border-border/60 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-bold">{rate}%</p><p className="text-xs text-muted-foreground">{t('reports.attendanceRate')}</p></div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-bold">{present}</p><p className="text-xs text-muted-foreground">{t('reports.present')}</p></div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Clock className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-bold">{late} <span className="text-sm font-normal text-muted-foreground">({latePct}%)</span></p><p className="text-xs text-muted-foreground">{t('reports.late')}</p></div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"><XCircle className="w-5 h-5" /></div>
            <div><p className="text-2xl font-heading font-bold">{absent} <span className="text-sm font-normal text-muted-foreground">({absentPct}%)</span></p><p className="text-xs text-muted-foreground">{t('reports.absent')}</p></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 border-border/60 shadow-sm lg:col-span-2">
          <h2 className="font-heading font-semibold text-lg mb-4">{t('reports.dailyBreakdown')}</h2>
          {weekLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">{t('reports.noData')}</p>
          ) : (
            <div className="h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="present" name={t('status.present')} stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="late" name={t('status.late')} stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="absent" name={t('status.absent')} stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-6 border-border/60 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-600" />
            <h2 className="font-heading font-semibold text-lg">{t('reports.mostLate')}</h2>
          </div>
          {mostLate.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">{t('reports.noLate')}</p>
          ) : (
            <div className="space-y-3">
              {mostLate.map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-200 text-amber-800' : 'bg-secondary text-muted-foreground'}`}>{i + 1}</span>
                  <Avatar className="w-8 h-8"><AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{e.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{e.name}</p>
                    {e.dept && <p className="text-xs text-muted-foreground truncate">{e.dept}</p>}
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">{e.late} {t('reports.lateCount')}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6 border-border/60 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold text-lg">{t('reports.byDepartment')}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{t('reports.byDepartmentDesc')}</p>
        {byDept.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">{t('reports.noDeptData')}</p>
        ) : (
          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDept} margin={{ top: 5, right: 8, left: -16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="dept" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={64} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="present" name={t('status.present')} stackId="a" fill="#10b981" />
                <Bar dataKey="late" name={t('status.late')} stackId="a" fill="#f59e0b" />
                <Bar dataKey="absent" name={t('status.absent')} stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <ComplianceChart logs={logs} employees={employees} />

      <Card className="p-6 border-border/60 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <UserSearch className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold text-lg">{t('reports.trackEmployee')}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{t('reports.trackEmployeeDesc')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('reports.selectEmployee')}</label>
            <Select value={trackEmp} onValueChange={setTrackEmp}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('reports.from')}</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('reports.to')}</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </Card>

      {trackEmp && (
        <EmployeeReportCard empId={trackEmp} from={from} to={to} logs={logs} employees={employees} shifts={shifts} />
      )}

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="p-5 pb-3"><h2 className="font-heading font-semibold text-lg">{t('reports.weekSummary')}</h2></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60">
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('reports.day')}</TableHead>
                <TableHead>{t('status.present')}</TableHead>
                <TableHead>{t('status.late')}</TableHead>
                <TableHead>{t('status.absent')}</TableHead>
                <TableHead>{t('reports.rate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daily.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('reports.noData')}</TableCell></TableRow>
              ) : daily.map((d, i) => {
                const tot = d.present + d.late + d.absent || 1;
                const r = Math.round(((d.present + d.late) / tot) * 100);
                return (
                  <TableRow key={i} className="hover:bg-secondary/40">
                    <TableCell className="text-sm">{d.date}</TableCell>
                    <TableCell className="text-sm font-medium">{d.day}</TableCell>
                    <TableCell className="text-sm text-emerald-600 font-medium">{d.present}</TableCell>
                    <TableCell className="text-sm text-amber-600 font-medium">{d.late}</TableCell>
                    <TableCell className="text-sm text-red-600 font-medium">{d.absent}</TableCell>
                    <TableCell><Badge className="bg-primary/10 text-primary">{r}%</Badge></TableCell>
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