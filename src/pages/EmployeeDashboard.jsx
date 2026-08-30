
import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Clock, Calendar, FileText, User, ArrowLeft, Send, ClipboardList, Wallet } from 'lucide-react';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [empData, setEmpData] = useState(null);

  useEffect(() => {
    if (!user?.employee_number) return;
    base44.entities.Employee.list().then(emps => {
      const found = (emps||[]).find(e => e.employee_number === user.employee_number);
      setEmpData(found || null);
    });
  }, [user]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16" dir="rtl">
      <div className="bg-gradient-to-l from-slate-800 via-slate-700 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl">👤</div>
          <div>
            <h1 className="text-xl font-black">مرحباً، {user?.full_name?.split(' ')[0]}</h1>
            <p className="text-xs text-slate-300 mt-0.5">
              {empData?.job_title} • {empData?.department_name} • #{user?.employee_number}
            </p>
          </div>
        </div>
        {empData && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <div className="text-xs text-slate-300">الراتب الأساسي</div>
              <div className="font-black font-mono text-sm mt-0.5">{Number(empData.salary||0).toLocaleString()} ر.س</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <div className="text-xs text-slate-300">الشفت</div>
              <div className="font-bold text-xs mt-0.5 truncate">{empData.shift}</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <div className="text-xs text-slate-300">الحالة</div>
              <div className="font-bold text-xs mt-0.5 text-emerald-300">{empData.status==='active'?'نشط':'—'}</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { to: '/my-requests', icon: ClipboardList, label: 'طلباتي', desc: 'إجازة • سلفة • تعديل بصمة', color: 'text-indigo-600', bg: 'from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/20', border: 'border-indigo-200' },
          { to: '/my-requests?type=leave', icon: Calendar, label: 'طلب إجازة', desc: 'سنوية • بدون راتب • عمرة', color: 'text-amber-600', bg: 'from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/20', border: 'border-amber-200' },
          { to: '/my-requests?type=advance', icon: Wallet, label: 'طلب سلفة', desc: 'تقديم طلب سلفة مالية', color: 'text-sky-600', bg: 'from-sky-50 to-sky-100 dark:from-sky-950/40 dark:to-sky-900/20', border: 'border-sky-200' },
          { to: '/my-requests?type=correction', icon: Clock, label: 'تعديل بصمة', desc: 'تصحيح وقت الدخول/الخروج', color: 'text-purple-600', bg: 'from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/20', border: 'border-purple-200' },
        ].map(({ to, icon: Icon, label, desc, color, bg, border }) => (
          <Link key={to} to={to}>
            <Card className={"p-4 rounded-2xl border " + border + " bg-gradient-to-br " + bg + " hover:shadow-md transition-all cursor-pointer group"}>
              <Icon className={"w-6 h-6 " + color + " mb-2"} />
              <div className="font-black text-foreground text-sm">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-4 rounded-2xl border bg-card">
        <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          بياناتي الوظيفية
        </h3>
        {empData ? (
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['الاسم الكامل', empData.full_name],
              ['الرقم الوظيفي', '#' + empData.employee_number],
              ['المسمى الوظيفي', empData.job_title],
              ['القسم', empData.department_name],
              ['الفرع', empData.branch_name],
              ['تاريخ الانضمام', empData.join_date],
              ['الجنسية', empData.nationality],
              ['الشفت', empData.shift],
            ].map(([k, v]) => (
              <div key={k} className="space-y-0.5">
                <div className="text-muted-foreground">{k}</div>
                <div className="font-bold text-foreground">{v || '—'}</div>
              </div>
            ))}
          </div>
        ) : <div className="text-xs text-muted-foreground">جاري تحميل البيانات...</div>}
      </Card>
    </div>
  );
}
