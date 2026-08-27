import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { LogIn, LogOut, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export default function Attendance() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.role === 'admin';
  const [myLog, setMyLog] = useState(null);
  const [myHistory, setMyHistory] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [date, setDate] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const statusBadge = (s) => {
    const map = { present: 'bg-emerald-100 text-emerald-700', late: 'bg-amber-100 text-amber-700', absent: 'bg-red-100 text-red-700' };
    return map[s] || 'bg-slate-100 text-slate-600';
  };

  const loadMine = async () => {
    const [today, hist] = await Promise.all([
      base44.entities.AttendanceLog.filter({ user_id: user.id, log_date: todayStr() }),
      base44.entities.AttendanceLog.filter({ user_id: user.id }, '-log_date'),
    ]);
    setMyLog(today[0] || null);
    setMyHistory(hist);
  };

  const loadAll = async () => {
    const logs = await base44.entities.AttendanceLog.filter({ log_date: date }, '-check_in');
    setAllLogs(logs);
  };

  useEffect(() => {
    (async () => {
      try {
        if (isAdmin) await loadAll();
        else await loadMine();
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [date]);

  const checkIn = async () => {
    setActing(true);
    try {
      const now = new Date();
      const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);
      const created = await base44.entities.AttendanceLog.create({
        user_id: user.id,
        employee_name: user.full_name || user.email,
        log_date: todayStr(),
        check_in: now.toISOString(),
        status: isLate ? 'late' : 'present',
      });
      setMyLog(created);
    } finally {
      setActing(false);
    }
  };

  const checkOut = async () => {
    if (!myLog) return;
    setActing(true);
    try {
      const updated = await base44.entities.AttendanceLog.update(myLog.id, { check_out: new Date().toISOString() });
      setMyLog(updated);
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">{isAdmin ? t('attendance.titleAdmin') : t('attendance.titleEmployee')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{isAdmin ? t('attendance.subtitleAdmin') : t('attendance.subtitleEmployee')}</p>
      </div>

      {!isAdmin && (
        <Card className="p-8 border-border/60 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${myLog ? statusBadge(myLog.status) : 'bg-secondary text-muted-foreground'}`}>
                {myLog ? (myLog.status === 'late' ? <AlertCircle className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />) : <Clock className="w-7 h-7" />}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('attendance.todaysStatus')}</p>
                <p className="text-xl font-heading font-bold">{myLog ? (myLog.status === 'late' ? t('dashboard.checkedInLate') : t('dashboard.checkedIn')) : t('dashboard.notCheckedIn')}</p>
                {myLog && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('dashboard.in')}: {fmtTime(myLog.check_in)} · {t('dashboard.out')}: {fmtTime(myLog.check_out)}
                  </p>
                )}
              </div>
            </div>
            {!myLog ? (
              <Button onClick={checkIn} disabled={acting} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <LogIn className="w-4 h-4 me-2" /> {t('attendance.checkIn')}
              </Button>
            ) : !myLog.check_out ? (
              <Button onClick={checkOut} disabled={acting} variant="outline">
                <LogOut className="w-4 h-4 me-2" /> {t('attendance.checkOut')}
              </Button>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-700">{t('dashboard.dayCompleted')}</Badge>
            )}
          </div>
        </Card>
      )}

      {isAdmin && (
        <Card className="p-4 border-border/60 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">{t('common.date')}:</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-[180px]" />
            <Badge className={statusBadge('present')}>{t('attendance.presentCount', { n: allLogs.filter((l) => l.status === 'present').length })}</Badge>
            <Badge className={statusBadge('late')}>{t('attendance.lateCount', { n: allLogs.filter((l) => l.status === 'late').length })}</Badge>
          </div>
        </Card>
      )}

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60">
                <TableHead>{t('common.employee')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('attendance.checkInCol')}</TableHead>
                <TableHead>{t('attendance.checkOutCol')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><div className="h-6 bg-secondary rounded animate-pulse" /></TableCell></TableRow>)
              ) : (isAdmin ? allLogs : myHistory).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">{t('attendance.noRecords')}</TableCell></TableRow>
              ) : (isAdmin ? allLogs : myHistory).map((l) => (
                <TableRow key={l.id} className="hover:bg-secondary/40">
                  <TableCell className="font-medium text-sm">{l.employee_name}</TableCell>
                  <TableCell className="text-sm">{l.log_date}</TableCell>
                  <TableCell className="text-sm">{fmtTime(l.check_in)}</TableCell>
                  <TableCell className="text-sm">{fmtTime(l.check_out)}</TableCell>
                  <TableCell><Badge className={statusBadge(l.status)}>{t('status.' + l.status)}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}