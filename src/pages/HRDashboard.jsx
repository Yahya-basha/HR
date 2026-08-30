
import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Users, Clock, Calendar, FileText, Bell, CheckCircle2,
  AlertTriangle, UserPlus, UserX, Briefcase, ArrowLeft,
  ClipboardList, UploadCloud, Settings
} from 'lucide-react';

export default function HRDashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Employee.list().then(d => {
      setEmployees(d || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const today = new Date();
    const in30 = new Date(today.getTime() + 30*86400000);
    const active = employees.filter(e => e.status === 'active');
    const expiringDocs = active.filter(e => {
      if (!e.id_expiry_date) return false;
      const d = new Date(e.id_expiry_date);
      return d <= in30 && d >= today;
    });
    const expiredDocs = active.filter(e => e.id_expiry_date && new Date(e.id_expiry_date) < today);

    let pendingLeave=0, pendingAdv=0, pendingCorr=0;
    try {
      pendingLeave = JSON.parse(localStorage.getItem('hr_leave_requests')||'[]').filter(r=>r.status==='pending').length;
      pendingAdv   = JSON.parse(localStorage.getItem('hr_advances_list')||'[]').filter(r=>r.status==='pending').length;
      pendingCorr  = JSON.parse(localStorage.getItem('hr_correction_requests')||'[]').filter(r=>r.status==='pending').length;
    } catch(e) {}

    return {
      total: employees.length, active: active.length,
      expiringDocs: expiringDocs.length, expiredDocs: expiredDocs.length,
      pendingLeave, pendingAdv, pendingCorr,
      pendingTotal: pendingLeave + pendingAdv + pendingCorr,
    };
  }, [employees]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" dir="rtl">
      <div className="bg-gradient-to-l from-emerald-900 via-emerald-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-emerald-700/40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-2xl">👥</div>
          <div>
            <h1 className="text-xl font-black tracking-tight">لوحة تحكم الموارد البشرية</h1>
            <p className="text-xs text-emerald-200/80 mt-0.5">إدارة الموظفين والحضور والطلبات والوثائق</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 rounded-2xl border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-slate-600">إجمالي الموظفين</span><Users className="w-4 h-4 text-slate-500" /></div>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{metrics.total}</div>
          <div className="text-xs text-emerald-600 font-bold mt-1">✓ {metrics.active} نشط</div>
        </Card>
        <Card className="p-4 rounded-2xl border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/20">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-amber-700">طلبات إجازة</span><Calendar className="w-4 h-4 text-amber-500" /></div>
          <div className="text-3xl font-black text-amber-800 dark:text-amber-200">{metrics.pendingLeave}</div>
          <Link to="/leave" className="text-xs text-amber-600 hover:underline font-bold">مراجعة الإجازات ←</Link>
        </Card>
        <Card className="p-4 rounded-2xl border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950/40 dark:to-sky-900/20">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-sky-700">طلبات سلف</span><ClipboardList className="w-4 h-4 text-sky-500" /></div>
          <div className="text-3xl font-black text-sky-800 dark:text-sky-200">{metrics.pendingAdv}</div>
          <Link to="/requests" className="text-xs text-sky-600 hover:underline font-bold">مراجعة السلف ←</Link>
        </Card>
        <Card className="p-4 rounded-2xl border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/20">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-purple-700">تعديلات بصمة</span><Clock className="w-4 h-4 text-purple-500" /></div>
          <div className="text-3xl font-black text-purple-800 dark:text-purple-200">{metrics.pendingCorr}</div>
          <Link to="/requests" className="text-xs text-purple-600 hover:underline font-bold">مراجعة التعديلات ←</Link>
        </Card>
      </div>

      {(metrics.expiredDocs > 0 || metrics.expiringDocs > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.expiredDocs > 0 && (
            <Card className="p-4 rounded-2xl border-red-300 bg-red-50 dark:bg-red-950/30">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div><div className="font-black text-red-800 text-sm">🔴 وثائق منتهية!</div><div className="text-xs text-red-600">{metrics.expiredDocs} موظف</div></div>
                <Link to="/alerts" className="mr-auto"><Button size="sm" variant="destructive" className="rounded-xl text-xs h-7">عرض</Button></Link>
              </div>
            </Card>
          )}
          {metrics.expiringDocs > 0 && (
            <Card className="p-4 rounded-2xl border-amber-300 bg-amber-50 dark:bg-amber-950/30">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div><div className="font-black text-amber-800 text-sm">🟡 ستنتهي خلال 30 يوم</div><div className="text-xs text-amber-600">{metrics.expiringDocs} موظف</div></div>
                <Link to="/alerts" className="mr-auto"><Button size="sm" className="bg-amber-600 text-white rounded-xl text-xs h-7 hover:bg-amber-700">عرض</Button></Link>
              </div>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/employees', icon: Users, label: 'إدارة الموظفين', color: 'text-slate-600' },
          { to: '/attendance', icon: Clock, label: 'البصمات والحضور', color: 'text-orange-600' },
          { to: '/leave', icon: Calendar, label: 'الإجازات', color: 'text-amber-600' },
          { to: '/requests', icon: ClipboardList, label: 'الطلبات والسلف', color: 'text-sky-600' },
          { to: '/approvals', icon: CheckCircle2, label: 'مركز الاعتمادات', color: 'text-emerald-600' },
          { to: '/alerts', icon: Bell, label: 'التنبيهات', color: 'text-red-600' },
          { to: '/import-data', icon: UploadCloud, label: 'رفع الحضور', color: 'text-purple-600' },
          { to: '/reports', icon: FileText, label: 'التقارير', color: 'text-indigo-600' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to}>
            <Card className="p-3.5 rounded-2xl border hover:shadow-md transition-all cursor-pointer group hover:scale-[1.02]">
              <div className="flex items-center gap-2.5">
                <Icon className={"w-5 h-5 " + color} />
                <span className="text-xs font-bold text-foreground">{label}</span>
                <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground mr-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
