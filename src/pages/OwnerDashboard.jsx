import { initFullCloudSync } from '@/lib/cloudSyncEngine';

import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { hasPermission } from '@/lib/rbac';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Users, Wallet, AlertTriangle, Clock, CheckCircle2,
  TrendingUp, Building, Calendar, FileText, Bell,
  ArrowLeft, Crown, Eye, XCircle, Coins
} from 'lucide-react';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initFullCloudSync();
    base44.entities.Employee.list().then(d => {
      setEmployees(d || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const active = employees.filter(e => e.status === 'active');
    const inactive = employees.filter(e => e.status === 'inactive' || e.status === 'terminated');
    const today = new Date();
    const in30days = new Date(today.getTime() + 30 * 86400000);

    // Doc expiry
    const expiringDocs = active.filter(e => {
      if (!e.id_expiry_date) return false;
      const exp = new Date(e.id_expiry_date);
      return exp <= in30days && exp >= today;
    });
    const expiredDocs = active.filter(e => {
      if (!e.id_expiry_date) return false;
      return new Date(e.id_expiry_date) < today;
    });

    // Salary totals
    const totalBasic = active.reduce((s, e) => s + (Number(e.salary) || 0), 0);
    const totalAllowances = active.reduce((s, e) => s + (Number(e.housing_allowance) || 0) + (Number(e.transport_allowance) || 0) + (Number(e.electricity_allowance) || 0) + (Number(e.phone_allowance) || 0), 0);

    // Pending requests from localStorage
    let pendingRequests = 0;
    try {
      const adv = JSON.parse(localStorage.getItem('hr_advances_list') || '[]');
      pendingRequests += adv.filter(a => a.status === 'pending' || a.status === 'hr_approved' || a.status === 'accountant_approved').length;
      const lr = JSON.parse(localStorage.getItem('hr_leave_requests') || '[]');
      pendingRequests += lr.filter(r => r.status === 'pending').length;
      const cr = JSON.parse(localStorage.getItem('hr_correction_requests') || '[]');
      pendingRequests += cr.filter(r => r.status === 'pending').length;
    } catch(e) {}

    return {
      total: employees.length, active: active.length, inactive: inactive.length,
      totalBasic, totalAllowances, totalGross: totalBasic + totalAllowances,
      expiringDocs: expiringDocs.length, expiredDocs: expiredDocs.length,
      pendingRequests,
    };
  }, [employees]);

  const fmtSAR = n => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-amber-900 via-amber-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-amber-700/40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-2xl">👑</div>
          <div>
            <h1 className="text-xl font-black tracking-tight">لوحة تحكم المدير العام</h1>
            <p className="text-xs text-amber-200/80 mt-0.5">نظرة شاملة على أداء المؤسسة والكوادر البشرية</p>
          </div>
        </div>
      </div>

      {/* KPI Cards Row 1 — Employees */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 rounded-2xl border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">إجمالي الموظفين</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{metrics.total}</div>
          <div className="text-xs text-emerald-600 font-bold mt-1">✓ {metrics.active} نشط</div>
        </Card>
        <Card className="p-4 rounded-2xl border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">الموظفون النشطون</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-800 dark:text-emerald-200">{metrics.active}</div>
        </Card>
        <Card className="p-4 rounded-2xl border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/40 dark:to-rose-900/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300">المتوقفون/المنتهون</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-black text-rose-800 dark:text-rose-200">{metrics.inactive}</div>
        </Card>
        <Card className="p-4 rounded-2xl border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">طلبات معلقة</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-800 dark:text-amber-200">{metrics.pendingRequests}</div>
          <Link to="/approvals" className="text-xs text-amber-600 hover:underline font-bold">مراجعة الاعتمادات ←</Link>
        </Card>
      </div>

      {/* KPI Cards Row 2 — Financials */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4 rounded-2xl border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">إجمالي الرواتب الأساسية</span>
            <Wallet className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-indigo-800 dark:text-indigo-200 font-mono">{fmtSAR(metrics.totalBasic)}</div>
          <div className="text-xs text-indigo-600 font-semibold mt-0.5">ريال سعودي / شهرياً</div>
        </Card>
        <Card className="p-4 rounded-2xl border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950/40 dark:to-sky-900/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-700 dark:text-sky-300">إجمالي البدلات</span>
            <Coins className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-black text-sky-800 dark:text-sky-200 font-mono">+{fmtSAR(metrics.totalAllowances)}</div>
          <div className="text-xs text-sky-600 font-semibold mt-0.5">سكن + مواصلات + كهرباء + هاتف</div>
        </Card>
        <Card className="p-4 rounded-2xl border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/20 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300">الكتلة الراتبية الإجمالية</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-purple-800 dark:text-purple-200 font-mono">{fmtSAR(metrics.totalGross)}</div>
          <Link to="/payroll" className="text-xs text-purple-600 hover:underline font-bold">عرض مسير الرواتب ←</Link>
        </Card>
      </div>

      {/* Alerts Row */}
      {(metrics.expiringDocs > 0 || metrics.expiredDocs > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.expiredDocs > 0 && (
            <Card className="p-4 rounded-2xl border-red-300 bg-red-50 dark:bg-red-950/30">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <div className="font-black text-red-800 dark:text-red-200 text-sm">🔴 إقامات أو وثائق منتهية!</div>
                  <div className="text-xs text-red-600">{metrics.expiredDocs} موظف لديهم وثائق منتهية الصلاحية</div>
                </div>
                <Link to="/alerts" className="mr-auto"><Button size="sm" variant="destructive" className="rounded-xl text-xs h-7">عرض التنبيهات</Button></Link>
              </div>
            </Card>
          )}
          {metrics.expiringDocs > 0 && (
            <Card className="p-4 rounded-2xl border-amber-300 bg-amber-50 dark:bg-amber-950/30">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <div className="font-black text-amber-800 dark:text-amber-200 text-sm">🟡 وثائق ستنتهي قريباً</div>
                  <div className="text-xs text-amber-600">{metrics.expiringDocs} موظف لديهم وثائق تنتهي خلال 30 يوم</div>
                </div>
                <Link to="/alerts" className="mr-auto"><Button size="sm" className="bg-amber-600 text-white rounded-xl text-xs h-7 hover:bg-amber-700">عرض التنبيهات</Button></Link>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Quick Action Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/employees', icon: Users, label: 'إدارة الموظفين', color: 'text-slate-600' },
          { to: '/payroll', icon: Wallet, label: 'مسير الرواتب', color: 'text-purple-600' },
          { to: '/approvals', icon: CheckCircle2, label: 'مركز الاعتمادات', color: 'text-amber-600' },
          { to: '/alerts', icon: Bell, label: 'مركز التنبيهات', color: 'text-red-600' },
          { to: '/reports', icon: FileText, label: 'التقارير التنفيذية', color: 'text-sky-600' },
          { to: '/allowances', icon: Coins, label: 'البدلات والمزايا', color: 'text-indigo-600' },
          { to: '/announcements', icon: Bell, label: 'البريد والتعاميم', color: 'text-emerald-600' },
          { to: '/leave', icon: Calendar, label: 'إدارة الإجازات', color: 'text-rose-600' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to}>
            <Card className={"p-3.5 rounded-2xl border hover:shadow-md transition-all cursor-pointer group hover:scale-[1.02]"}>
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
