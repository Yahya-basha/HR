import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/lib/i18n';
import { ArrowLeft, Mail, Phone, Briefcase, Building2, Calendar, DollarSign, IdCard, Globe, User, MapPin, ShieldAlert, Clock, CalendarRange } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { computeBalance } from '@/lib/leaveBalance';

const statusBadge = (s) => {
  const map = { active: 'bg-emerald-100 text-emerald-700', on_leave: 'bg-amber-100 text-amber-700', inactive: 'bg-slate-200 text-slate-600' };
  return map[s] || 'bg-slate-100 text-slate-600';
};

const daysUntil = (ds) => {
  if (!ds) return null;
  return Math.round((new Date(ds) - new Date()) / 86400000);
};

export default function EmployeeDetail() {
  const { id } = useParams();
  const { t } = useI18n();
  const [emp, setEmp] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const e = await base44.entities.Employee.get(id);
        setEmp(e);
        if (e) {
          const [policies, leaves] = await Promise.all([
            base44.entities.LeavePolicy.list().catch(() => []),
            base44.entities.LeaveRequest.filter({ employee_name: e.full_name }).catch(() => []),
          ]);
          setBalance(computeBalance(e, policies, leaves));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="h-40 rounded-2xl bg-secondary animate-pulse" />;
  if (!emp) return <p className="text-muted-foreground">{t('employeeDetail.notFound')}</p>;

  const basicFields = [
    { icon: Mail, label: t('employeeDetail.email'), value: emp.email },
    { icon: Phone, label: t('employeeDetail.phone'), value: emp.phone || '—' },
    { icon: Briefcase, label: t('employeeDetail.jobTitle'), value: emp.job_title },
    { icon: Building2, label: t('employeeDetail.department'), value: emp.department },
    { icon: Building2, label: t('employeeDetail.branch'), value: emp.branch || '—' },
    { icon: Clock, label: t('emp.shift'), value: emp.shift || '—' },
    { icon: Calendar, label: t('employeeDetail.hireDate'), value: emp.hire_date || '—' },
    { icon: DollarSign, label: t('employeeDetail.annualSalary'), value: emp.salary ? `${Number(emp.salary).toLocaleString()} SAR` : '—' },
  ];

  const idFields = [
    { icon: IdCard, label: t('emp.employeeId'), value: emp.employee_id || '—' },
    { icon: User, label: t('emp.nationalId'), value: emp.national_id || '—' },
    { icon: ShieldAlert, label: t('emp.idExpiry'), value: emp.id_expiry_date || '—', warn: daysUntil(emp.id_expiry_date) != null && daysUntil(emp.id_expiry_date) <= 30 },
    { icon: Globe, label: t('emp.passportNumber'), value: emp.passport_number || '—' },
    { icon: ShieldAlert, label: t('emp.passportExpiry'), value: emp.passport_expiry_date || '—', warn: daysUntil(emp.passport_expiry_date) != null && daysUntil(emp.passport_expiry_date) <= 60 },
    { icon: Globe, label: t('emp.nationality'), value: emp.nationality || '—' },
    { icon: User, label: t('emp.gender'), value: emp.gender ? t('gender.' + emp.gender) : '—' },
    { icon: Calendar, label: t('emp.dob'), value: emp.date_of_birth || '—' },
    { icon: MapPin, label: t('emp.address'), value: emp.address || '—' },
    { icon: Phone, label: t('emp.emergencyContact'), value: emp.emergency_contact || '—' },
  ];

  return (
    <div className="space-y-6">
      <Link to="/employees"><Button variant="ghost" size="sm" className="text-muted-foreground"><ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" /> {t('employeeDetail.back')}</Button></Link>

      <Card className="p-8 border-border/60 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <Avatar className="w-24 h-24 bg-primary/10">
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-heading font-bold">
              {emp.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-heading font-bold">{emp.full_name}</h1>
              <Badge className={statusBadge(emp.status)}>{t('status.' + emp.status)}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">{emp.job_title} · {emp.department}</p>
            {emp.company && <p className="text-xs text-muted-foreground mt-0.5">{emp.company}</p>}
          </div>
        </div>

        <Separator className="my-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {basicFields.map((f) => (
            <div key={f.label} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0"><f.icon className="w-4 h-4 text-primary" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground">{f.label}</p><p className="text-sm font-medium break-words">{f.value}</p></div>
            </div>
          ))}
        </div>

        {balance && (
          <>
            <Separator className="my-6" />
            <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2"><CalendarRange className="w-5 h-5 text-primary" /> {t('emp.leaveBalance')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-4 rounded-2xl bg-primary/5 border border-border/60">
                <p className="text-xs text-muted-foreground">{t('leave.annualAllowance')}</p>
                <p className="text-2xl font-heading font-bold mt-1">{balance.allowance} <span className="text-sm font-normal text-muted-foreground">{t('leave.days')}</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">{emp.leave_policy || t('leave.noPolicy')}</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <p className="text-xs text-muted-foreground">{t('leave.used')}</p>
                <p className="text-2xl font-heading font-bold mt-1 text-amber-700">{balance.used} <span className="text-sm font-normal text-muted-foreground">{t('leave.days')}</span></p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <p className="text-xs text-muted-foreground">{t('leave.remaining')}</p>
                <p className="text-2xl font-heading font-bold mt-1 text-emerald-700">{balance.remaining} <span className="text-sm font-normal text-muted-foreground">{t('leave.days')}</span></p>
              </div>
            </div>
          </>
        )}

        {(emp.national_id || emp.passport_number || emp.id_expiry_date) && (
          <>
            <Separator className="my-6" />
            <h2 className="font-heading font-semibold text-lg mb-4">{t('emp.identity')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {idFields.map((f) => (
                <div key={f.label} className={`flex items-start gap-3 ${f.warn ? 'p-3 rounded-xl bg-amber-50 border border-amber-200' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${f.warn ? 'bg-amber-100 text-amber-600' : 'bg-primary/5'}`}>
                    <f.icon className={`w-4 h-4 ${f.warn ? 'text-amber-600' : 'text-primary'}`} />
                  </div>
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">{f.label}</p><p className="text-sm font-medium break-words">{f.value}</p></div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}