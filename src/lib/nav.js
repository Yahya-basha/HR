import { LayoutDashboard, Users, Clock, CalendarDays, Wallet, Settings as SettingsIcon, FileSignature, Building2, Timer, BarChart3, CalendarClock } from 'lucide-react';

export function getNavItems(isAdmin, t) {
  const all = [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/employees', icon: Users, label: t('nav.employees'), admin: true },
    { to: '/branches', icon: Building2, label: t('nav.branches'), admin: true },
    { to: '/shifts', icon: Timer, label: t('nav.shifts'), admin: true },
    { to: '/reports', icon: BarChart3, label: t('nav.reports'), admin: true },
    { to: '/attendance', icon: Clock, label: t('nav.attendance') },
    { to: '/leave', icon: CalendarDays, label: t('nav.leaveRequests') },
    { to: '/leave-policies', icon: CalendarClock, label: t('nav.leavePolicies'), admin: true },
    { to: '/payroll', icon: Wallet, label: t('nav.payroll'), admin: true },
    { to: '/contracts', icon: FileSignature, label: t('nav.contracts'), admin: true },
    { to: '/settings', icon: SettingsIcon, label: t('nav.settings') },
  ];
  return all.filter((i) => !i.admin || isAdmin);
}