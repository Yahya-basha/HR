import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Users, Clock, CalendarDays, UserPlus, LogIn, FileText, Download, CheckCircle2, ShieldAlert, IdCard, Globe, FileSignature } from 'lucide-react';
import StatCard from '@/components/StatCard';
import QuickActions from '@/components/QuickActions';
import QuickActionsGrid from '@/components/QuickActionsGrid';
import AttendanceDonut from '@/components/AttendanceDonut';
import ActivityPanel from '@/components/ActivityPanel';
import Announcements from '@/components/Announcements';
import EmployeeForm from '@/components/EmployeeForm';
import LeaveForm from '@/components/LeaveForm';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
const statusBadge = (s) => {
  const map = { present: 'bg-emerald-100 text-emerald-700', late: 'bg-amber-100 text-amber-700', absent: 'bg-red-100 text-red-700', pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' };
  return map[s] || 'bg-slate-100 text-slate-700';
};
const daysUntil = (ds) => (ds ? Math.round((new Date(ds) - new Date()) / 86400000) : null);

const ProgressBar = ({ label, value, color }) => (
  <div>
    <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">{label}</span><span className="text-sm font-semibold">{value}%</span></div>
    <div className="h-2.5 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} /></div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [myLog, setMyLog] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [empFormOpen, setEmpFormOpen] = useState(false);
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);

  const load = async () => {
    try {
      if (isAdmin) {
        const [emps, depts, logs, recent, pending, cts] = await Promise.all([
          base44.entities.Employee.filter({ status: 'active' }),
          base44.entities.Department.list(),
          base44.entities.AttendanceLog.filter({ log_date: todayStr() }, '-check_in'),
          base44.entities.AttendanceLog.list('-log_date', 100),
          base44.entities.LeaveRequest.filter({ status: 'pending' }, '-created_date'),
          base44.entities.EmploymentContract.list('-created_date'),
        ]);
        setEmployees(emps); setDepartments(depts); setTodayLogs(logs); setRecentLogs(recent); setPendingLeaves(pending); setContracts(cts);
      } else {
        const [logs, leaves] = await Promise.all([
          base44.entities.AttendanceLog.filter({ user_id: user.id, log_date: todayStr() }),
          base44.entities.LeaveRequest.filter({ user_id: user.id }, '-created_date'),
        ]);
        setMyLog(logs[0] || null); setMyLeaves(leaves);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user, isAdmin]);

  const decide = async (req, status) => {
    const note = status === 'rejected' ? window.prompt(t('leave.rejectPrompt')) || '' : '';
    try {
      await base44.entities.LeaveRequest.update(req.id, { status, review_note: note, reviewed_by: user.id });
      toast({ title: status === 'approved' ? t('leave.approved') : t('leave.rejected') });
      load();
    } catch (e) { toast({ title: t('common.error'), description: e.message, variant: 'destructive' }); }
  };

  const exportCSV = () => {
    const headers = ['Employee ID', 'Full Name', 'Email', 'Job Title', 'Department', 'Status', 'Salary'];
    const rows = employees.map((e) => [e.employee_id, e.full_name, e.email, e.job_title, e.department, e.status, e.salary]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'employees.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
  const greeting = () => {
    const h = new Date().getHours();
    return t(h < 12 ? 'dashboard.greetingMorning' : h < 18 ? 'dashboard.greetingAfternoon' : 'dashboard.greetingEvening');
  };

  if (loading) return <div className="space-y-6">{[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-secondary animate-pulse" />)}</div>;

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <h1 className="text-2xl font-heading font-bold mt-1">{greeting()}, {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}</h1>
        </div>
        <QuickActions actions={[
          { icon: LogIn, label: t('quick.logAttendance'), onClick: () => navigate('/attendance'), primary: true },
          { icon: FileText, label: t('quick.submitLeave'), onClick: () => setLeaveFormOpen(true) },
        ]} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard icon={Clock} label={t('dashboard.todaysStatus')} value={myLog ? (myLog.status === 'late' ? t('dashboard.checkedInLate') : t('dashboard.checkedIn')) : t('dashboard.notCheckedIn')} accent={myLog ? statusBadge(myLog.status) : 'bg-slate-100 text-slate-600'} />
          <StatCard icon={CalendarDays} label={t('dashboard.pendingLeaves')} value={myLeaves.filter((l) => l.status === 'pending').length} accent="bg-amber-100 text-amber-600" />
          <StatCard icon={CheckCircle2} label={t('dashboard.approvedLeaves')} value={myLeaves.filter((l) => l.status === 'approved').length} accent="bg-emerald-100 text-emerald-600" />
        </div>
        <Card className="p-6 border-border/60 shadow-sm">
          <h2 className="font-heading font-semibold text-lg mb-4">{t('dashboard.myRecentLeaves')}</h2>
          {myLeaves.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">{t('dashboard.noLeaveRequests')}</p> : (
            <div className="space-y-3">{myLeaves.slice(0, 5).map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div><p className="font-medium text-sm">{t('leave.' + l.leave_type)} {t('leave.typeSuffix')}</p><p className="text-xs text-muted-foreground">{l.start_date} → {l.end_date}</p></div>
                <Badge className={statusBadge(l.status)}>{t('status.' + l.status)}</Badge>
              </div>
            ))}</div>
          )}
        </Card>
        <LeaveForm open={leaveFormOpen} onOpenChange={setLeaveFormOpen} onSaved={load} />
      </div>
    );
  }

  const present = todayLogs.filter((l) => l.status === 'present').length;
  const late = todayLogs.filter((l) => l.status === 'late').length;
  const absent = Math.max(0, employees.length - present - late);
  const donutData = [
    { name: t('status.present'), value: present, color: '#10b981' },
    { name: t('status.late'), value: late, color: '#f59e0b' },
    { name: t('status.absent'), value: absent, color: '#ef4444' },
  ];
  const withinDays = (ds, days) => { const d = new Date(ds); const diff = (new Date() - d) / 86400000; return diff >= 0 && diff < days; };
  const weekLogs = recentLogs.filter((l) => withinDays(l.log_date, 7));
  const weekPct = weekLogs.length ? Math.round((weekLogs.filter((l) => l.status === 'present').length / weekLogs.length) * 100) : 0;
  const monthLogs = recentLogs.filter((l) => withinDays(l.log_date, 30));
  const monthPct = monthLogs.length ? Math.round((monthLogs.filter((l) => l.status === 'present').length / monthLogs.length) * 100) : 0;

  const idExpiring = employees.filter((e) => { const d = daysUntil(e.id_expiry_date); return d != null && d <= 30 && d >= 0; });
  const passportExpiring = employees.filter((e) => { const d = daysUntil(e.passport_expiry_date); return d != null && d <= 60 && d >= 0; });
  const contractExpiring = contracts.filter((c) => { const d = daysUntil(c.end_date); return d != null && d <= 60 && d >= 0; });
  const totalAlerts = idExpiring.length + passportExpiring.length + contractExpiring.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <h1 className="text-2xl font-heading font-bold mt-1">{greeting()}, {user?.full_name?.split(' ')[0] || 'Admin'}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('dashboard.adminOverview')}</p>
        </div>
        <div className="w-full">
        <QuickActionsGrid />
      </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard icon={Users} label={t('stats.employees')} value={employees.length} accent="bg-primary/10 text-primary" />
        <StatCard icon={CheckCircle2} label={t('stats.attendanceToday')} value={present + late} accent="bg-emerald-100 text-emerald-600" />
        <StatCard icon={CalendarDays} label={t('stats.pendingLeaves')} value={pendingLeaves.length} accent="bg-accent/20 text-accent-foreground" />
      </div>

      {totalAlerts > 0 && (
        <Card className="p-5 border-amber-200 bg-amber-50/50 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h2 className="font-heading font-semibold text-lg text-amber-700">{t('expiry.title')}</h2>
            <Badge className="bg-amber-200 text-amber-800">{totalAlerts}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: IdCard, label: t('expiry.idExpiry'), items: idExpiring.map((e) => ({ name: e.full_name, days: daysUntil(e.id_expiry_date) })) },
              { icon: Globe, label: t('expiry.passportExpiry'), items: passportExpiring.map((e) => ({ name: e.full_name, days: daysUntil(e.passport_expiry_date) })) },
              { icon: FileSignature, label: t('expiry.contractExpiry'), items: contractExpiring.map((c) => ({ name: c.employee_name, days: daysUntil(c.end_date) })) },
            ].map((grp) => (
              <div key={grp.label} className="bg-card rounded-xl p-4 border border-amber-100">
                <div className="flex items-center gap-2 mb-2"><grp.icon className="w-4 h-4 text-amber-600" /><p className="text-sm font-semibold">{grp.label}</p></div>
                {grp.items.length === 0 ? <p className="text-xs text-muted-foreground">—</p> : (
                  <div className="space-y-1">{grp.items.slice(0, 4).map((it, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="truncate me-2">{it.name}</span>
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">{t('expiry.daysLeft', { n: it.days })}</Badge>
                    </div>
                  ))}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <Card className="p-5 border-border/60 shadow-sm h-full">
            <h2 className="font-heading font-semibold text-lg mb-4">{t('activity.title')}</h2>
            <ActivityPanel todayLogs={todayLogs} pendingLeaves={pendingLeaves} onDecide={decide} t={t} />
          </Card>
        </div>
        <div className="lg:col-span-6">
          <Card className="p-6 border-border/60 shadow-sm h-full">
            <h2 className="font-heading font-semibold text-lg mb-4">{t('charts.attendanceDistribution')}</h2>
            <AttendanceDonut data={donutData} t={t} />
            <div className="mt-6 space-y-4 pt-5 border-t border-border/50">
              <ProgressBar label={t('charts.weeklyAttendance')} value={weekPct} color="#D4AF37" />
              <ProgressBar label={t('charts.monthlyAttendance')} value={monthPct} color="#0B1F3A" />
            </div>
          </Card>
        </div>
        <div className="lg:col-span-3">
          <Card className="p-5 border-border/60 shadow-sm h-full">
            <h2 className="font-heading font-semibold text-lg mb-4">{t('announcements.title')}</h2>
            <Announcements />
          </Card>
        </div>
      </div>

      <EmployeeForm open={empFormOpen} onOpenChange={setEmpFormOpen} departments={departments} onSaved={load} />
      <LeaveForm open={leaveFormOpen} onOpenChange={setLeaveFormOpen} onSaved={load} />
    </div>
  );
}