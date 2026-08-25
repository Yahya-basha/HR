import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Plus, Check, X, CalendarRange } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import LeaveForm from '@/components/LeaveForm';
import LeaveCalendar from '@/components/LeaveCalendar';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { computeBalance } from '@/lib/leaveBalance';

const statusBadge = (s) => {
  const map = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' };
  return map[s] || 'bg-slate-100 text-slate-600';
};

export default function Leave() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();
  const { employee: me } = useCurrentEmployee();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [policies, setPolicies] = useState([]);
  const [allEmps, setAllEmps] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [res, pol, emps] = await Promise.all([
        isAdmin
          ? base44.entities.LeaveRequest.list('-created_date')
          : base44.entities.LeaveRequest.filter({ user_id: user.id }, '-created_date'),
        base44.entities.LeavePolicy.list().catch(() => []),
        isAdmin ? base44.entities.Employee.list().catch(() => []) : Promise.resolve([]),
      ]);
      setRequests(res); setPolicies(pol); setAllEmps(emps);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const myBalance = me ? computeBalance(me, policies, requests) : null;
  const balanceFor = (name) => {
    const e = allEmps.find((x) => x.full_name === name);
    return e ? computeBalance(e, policies, requests) : null;
  };

  const decide = async (req, status) => {
    const note = status === 'rejected' ? window.prompt(t('leave.rejectPrompt')) || '' : '';
    try {
      await base44.entities.LeaveRequest.update(req.id, { status, review_note: note });
      toast({ title: status === 'approved' ? t('leave.approved') : t('leave.rejected') });
      load();
    } catch (e) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    }
  };

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);
  const filterKeys = { all: 'leave.filterAll', pending: 'leave.filterPending', approved: 'leave.filterApproved', rejected: 'leave.filterRejected' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">{isAdmin ? t('leave.titleAdmin') : t('leave.titleEmployee')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{isAdmin ? t('leave.subtitleAdmin') : t('leave.subtitleEmployee')}</p>
        </div>
        {!isAdmin && (
          <Button onClick={() => setFormOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="w-4 h-4 me-2" /> {t('leave.requestLeave')}
          </Button>
        )}
      </div>

      {!isAdmin && myBalance && (
        <Card className="p-6 border-border/60 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CalendarRange className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-lg">{t('leave.balance')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-4 rounded-2xl bg-primary/5 border border-border/60">
              <p className="text-xs text-muted-foreground">{t('leave.annualAllowance')}</p>
              <p className="text-2xl font-heading font-bold mt-1">{myBalance.allowance} <span className="text-sm font-normal text-muted-foreground">{t('leave.days')}</span></p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <p className="text-xs text-muted-foreground">{t('leave.used')}</p>
              <p className="text-2xl font-heading font-bold mt-1 text-amber-700">{myBalance.used} <span className="text-sm font-normal text-muted-foreground">{t('leave.days')}</span></p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs text-muted-foreground">{t('leave.remaining')}</p>
              <p className="text-2xl font-heading font-bold mt-1 text-emerald-700">{myBalance.remaining} <span className="text-sm font-normal text-muted-foreground">{t('leave.days')}</span></p>
            </div>
          </div>
        </Card>
      )}

      {isAdmin && (
        <div className="flex items-center gap-2 flex-wrap">
          {Object.keys(filterKeys).map((s) => (
            <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s)} className={filter === s ? 'bg-primary' : ''}>
              {t(filterKeys[s])}
            </Button>
          ))}
        </div>
      )}

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60">
                <TableHead>{t('common.employee')}</TableHead>
                <TableHead>{t('common.type')}</TableHead>
                <TableHead>{t('common.dates')}</TableHead>
                <TableHead>{t('common.days')}</TableHead>
                {isAdmin && <TableHead>{t('leave.remaining')}</TableHead>}
                <TableHead>{t('common.reason')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                {isAdmin && <TableHead className="text-right">{t('common.actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(4)].map((_, i) => <TableRow key={i}><TableCell colSpan={isAdmin ? 8 : 6}><div className="h-6 bg-secondary rounded animate-pulse" /></TableCell></TableRow>)
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={isAdmin ? 8 : 6} className="text-center text-muted-foreground py-10">{t('leave.noRequests')}</TableCell></TableRow>
              ) : filtered.map((r) => {
                const bal = isAdmin ? balanceFor(r.employee_name) : null;
                return (
                <TableRow key={r.id} className="hover:bg-secondary/40">
                  <TableCell className="font-medium text-sm">{r.employee_name}</TableCell>
                  <TableCell className="text-sm">{t('leave.' + r.leave_type)}</TableCell>
                  <TableCell className="text-sm">{r.start_date} → {r.end_date}</TableCell>
                  <TableCell className="text-sm">{r.days}</TableCell>
                  {isAdmin && <TableCell className="text-sm">{bal ? `${bal.remaining}/${bal.allowance}` : '—'}</TableCell>}
                  <TableCell className="text-sm max-w-[200px] truncate text-muted-foreground">{r.reason || '—'}</TableCell>
                  <TableCell><Badge className={statusBadge(r.status)}>{t('status.' + r.status)}</Badge></TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      {r.status === 'pending' ? (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => decide(r, 'approved')} className="text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => decide(r, 'rejected')} className="text-red-600 hover:text-red-700"><X className="w-4 h-4" /></Button>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">{t('leave.reviewed')}</span>}
                    </TableCell>
                  )}
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <LeaveCalendar leaves={requests} />

      {!isAdmin && <LeaveForm open={formOpen} onOpenChange={setFormOpen} onSaved={load} />}
    </div>
  );
}