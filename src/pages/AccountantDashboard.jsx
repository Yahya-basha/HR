
import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, CreditCard, FileSpreadsheet, Clock, CheckCircle2, ArrowLeft, Coins } from 'lucide-react';

export default function AccountantDashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  useEffect(() => { base44.entities.Employee.list().then(d => setEmployees(d||[])); }, []);

  const metrics = useMemo(() => {
    const active = employees.filter(e => e.status === 'active');
    const totalBasic = active.reduce((s,e) => s + (Number(e.salary)||0), 0);
    const totalAllowances = active.reduce((s,e) => s + (Number(e.housing_allowance)||0) + (Number(e.transport_allowance)||0), 0);
    let pendingAdv=0;
    try { pendingAdv = JSON.parse(localStorage.getItem('hr_advances_list')||'[]').filter(r => r.status==='pending'||r.status==='hr_approved').length; } catch(e) {}
    return { employeeCount: active.length, totalBasic, totalAllowances, totalGross: totalBasic+totalAllowances, pendingAdv };
  }, [employees]);

  const fmtSAR = n => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" dir="rtl">
      <div className="bg-gradient-to-l from-sky-900 via-sky-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-sky-700/40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-2xl">🧾</div>
          <div>
            <h1 className="text-xl font-black tracking-tight">لوحة تحكم المحاسب</h1>
            <p className="text-xs text-sky-200/80 mt-0.5">إدارة الرواتب والمسيرات والسلف والتقارير المالية</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 rounded-2xl border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/20">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-indigo-700">الرواتب الأساسية</span><Wallet className="w-4 h-4 text-indigo-500" /></div>
          <div className="text-lg font-black text-indigo-800 dark:text-indigo-200 font-mono">{fmtSAR(metrics.totalBasic)}</div>
          <div className="text-xs text-indigo-600">ريال / شهر</div>
        </Card>
        <Card className="p-4 rounded-2xl border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950/40 dark:to-sky-900/20">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-sky-700">إجمالي البدلات</span><Coins className="w-4 h-4 text-sky-500" /></div>
          <div className="text-lg font-black text-sky-800 dark:text-sky-200 font-mono">+{fmtSAR(metrics.totalAllowances)}</div>
          <div className="text-xs text-sky-600">سكن + مواصلات</div>
        </Card>
        <Card className="p-4 rounded-2xl border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/20">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-purple-700">الكتلة الراتبية</span><TrendingUp className="w-4 h-4 text-purple-500" /></div>
          <div className="text-lg font-black text-purple-800 dark:text-purple-200 font-mono">{fmtSAR(metrics.totalGross)}</div>
          <Link to="/payroll" className="text-xs text-purple-600 hover:underline font-bold">فتح مسير الرواتب ←</Link>
        </Card>
        <Card className="p-4 rounded-2xl border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/20">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-amber-700">سلف بانتظار الاعتماد</span><CreditCard className="w-4 h-4 text-amber-500" /></div>
          <div className="text-3xl font-black text-amber-800 dark:text-amber-200">{metrics.pendingAdv}</div>
          <Link to="/requests" className="text-xs text-amber-600 hover:underline font-bold">مراجعة السلف ←</Link>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/payroll', icon: Wallet, label: 'مسير الرواتب', color: 'text-purple-600' },
          { to: '/payroll?tab=advances', icon: CreditCard, label: 'السلف والقروض', color: 'text-amber-600' },
          { to: '/reports', icon: FileSpreadsheet, label: 'التقارير المالية', color: 'text-indigo-600' },
          { to: '/allowances', icon: Coins, label: 'البدلات', color: 'text-sky-600' },
          { to: '/approvals', icon: CheckCircle2, label: 'الاعتمادات المالية', color: 'text-emerald-600' },
          { to: '/attendance', icon: Clock, label: 'مراجعة الحضور', color: 'text-orange-600' },
          { to: '/employees', icon: CheckCircle2, label: 'بيانات الموظفين', color: 'text-slate-600' },
          { to: '/end-of-service', icon: TrendingUp, label: 'نهاية الخدمة', color: 'text-rose-600' },
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
