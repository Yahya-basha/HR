import { LayoutDashboard, Users, Clock, CalendarDays, Wallet, Settings as SettingsIcon, FileSignature, Building2, Timer, BarChart3, CalendarClock, Fingerprint } from 'lucide-react';

export function getNavItems(isAdmin, t) {
  const all = [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard') || 'لوحة التحكم' },
    { to: '/employees', icon: Users, label: t('nav.employees') || 'الموظفين', admin: true },
    { to: '/branches', icon: Building2, label: t('nav.branches') || 'الفروع', admin: true },
    { to: '/devices', icon: Fingerprint, label: 'أجهزة البصمة', admin: true },
    { to: '/shifts', icon: Timer, label: t('nav.shifts') || 'الورديات', admin: true },
    { to: '/attendance', icon: Clock, label: t('nav.attendance') || 'الحضور والانصراف' },
    { to: '/leave', icon: CalendarDays, label: t('nav.leaveRequests') || 'الإجازات' },
    { to: '/leave-policies', icon: CalendarClock, label: t('nav.leavePolicies') || 'سياسات الإجازات', admin: true },
    { to: '/payroll', icon: Wallet, label: t('nav.payroll') || 'مسيرات الرواتب', admin: true },
    { to: '/contracts', icon: FileSignature, label: t('nav.contracts') || 'عقود العمل', admin: true },
    { to: '/reports', icon: BarChart3, label: t('nav.reports') || 'التقارير', admin: true },
    { to: '/settings', icon: SettingsIcon, label: t('nav.settings') || 'الإعدادات' },
  ];
  return all.filter((i) => !i.admin || isAdmin);
}
