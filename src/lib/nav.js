import {
  LayoutDashboard,
  MessageSquare,
  Clock,
  Users,
  Briefcase,
  Wallet,
  Settings,
  UserCheck,
  CalendarDays,
  FileCheck,
  FolderOpen,
  Mail,
  Megaphone,
  Bell,
  Fingerprint,
  UploadCloud,
  UserPlus,
  GitBranch,
  Layers,
  FileText,
  CalendarRange,
  FileSpreadsheet,
  BookOpen,
  Award,
  CreditCard,
  Building,
  KeyRound,
  Calculator
} from 'lucide-react';

export const navigationModules = [
  {
    id: 'dashboard',
    label: 'الرئيسية',
    icon: LayoutDashboard,
    color: '#0284c7', // Sky Blue
    badgeColor: 'bg-sky-500 text-white',
    activeBg: 'bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
    items: [
      { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
      { to: '/employee-profile', label: 'ملفي', icon: UserCheck },
      { to: '/leave', label: 'طلباتي', icon: CalendarDays },
      { to: '/attendance', label: 'موافقاتي', icon: FileCheck },
      { to: '/documents-print', label: 'مستنداتي', icon: FolderOpen },
    ]
  },
  {
    id: 'communication',
    label: 'التواصل',
    icon: MessageSquare,
    color: '#ec4899', // Pink
    badgeColor: 'bg-pink-500 text-white',
    activeBg: 'bg-pink-50 text-pink-900 dark:bg-pink-950/40 dark:text-pink-200',
    items: [
      { to: '/announcements?tab=inbox', label: 'البريد الداخلي', icon: Mail, admin: true },
      { to: '/announcements?tab=circulars', label: 'التعاميم', icon: Megaphone, admin: true },
      { to: '/announcements?tab=notifications', label: 'التنبيهات', icon: Bell, admin: true },
      { to: '/announcements?tab=calendar', label: 'التقويم', icon: CalendarDays, admin: true },
    ]
  },
  {
    id: 'attendance',
    label: 'الحضور',
    icon: Clock,
    color: '#f97316', // Orange
    badgeColor: 'bg-orange-500 text-white',
    activeBg: 'bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200',
    items: [
      { to: '/attendance', label: 'إدارة البصمات', icon: Clock },
      { to: '/devices', label: 'أجهزة البصمة', icon: Fingerprint, admin: true },
      { to: '/import-data', label: 'رفع الحضور', icon: UploadCloud, admin: true },
      { to: '/attendance?mode=manual', label: 'التحضير اليدوي', icon: FileCheck, admin: true },
      { to: '/devices?sync=true', label: 'تحديث البصمات', icon: Fingerprint, admin: true },
    ]
  },
  {
    id: 'employees',
    label: 'الموظفين',
    icon: Users,
    color: '#ef4444', // Red
    badgeColor: 'bg-red-500 text-white',
    activeBg: 'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200',
    items: [
      { to: '/employees', label: 'دليل الموظفين', icon: Users, admin: true },
      { to: '/branches', label: 'الفروع', icon: GitBranch, admin: true },
      { to: '/departments', label: 'الأقسام', icon: Layers, admin: true },
      { to: '/contracts', label: 'العقود', icon: FileText, admin: true },
      { to: '/shifts', label: 'الورديات', icon: CalendarRange, admin: true },
    ]
  },
  {
    id: 'services',
    label: 'وظائف الكادر',
    icon: Briefcase,
    color: '#0ea5e9', // Blue
    badgeColor: 'bg-sky-500 text-white',
    activeBg: 'bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
    items: [
      { to: '/leave', label: 'الإجازات', icon: CalendarDays },
      { to: '/reports', label: 'التقارير', icon: FileSpreadsheet, admin: true },
      { to: '/leave-policies', label: 'سياسات الإجازات', icon: BookOpen, admin: true },
      { to: '/rewards-penalties', label: 'المكافآت والجزاءات', icon: Award, admin: true },
    ]
  },
  {
    id: 'payroll',
    label: 'الأجور',
    icon: Wallet,
    color: '#8b5cf6', // Purple
    badgeColor: 'bg-purple-500 text-white',
    activeBg: 'bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200',
    items: [
      { to: '/payroll?stage=1', label: '1. مراجعة وتدقيق البصمات', icon: Clock, admin: true },
      { to: '/payroll?stage=2', label: '2. اعتماد الاستقطاعات والخصم', icon: Wallet, admin: true },
      { to: '/payroll?stage=3', label: '3. اعتماد الاستحقاقات والمكافئات', icon: Award, admin: true },
      { to: '/payroll?stage=4', label: '4. المراجعة والإقفال النهائي', icon: FileSpreadsheet, admin: true },
      { to: '/payroll?stage=5', label: '5. رواتب الشهور السابقة والمصادقة', icon: FileText, admin: true },
      { to: '/payroll?tab=advances', label: 'نظام السلف والقروض', icon: CreditCard, admin: true },
      { to: '/end-of-service', label: 'حاسبة مكافأة نهاية الخدمة', icon: Calculator, admin: true },
    ]
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    icon: Settings,
    color: '#10b981', // Emerald Green
    badgeColor: 'bg-emerald-500 text-white',
    activeBg: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
    items: [
      { to: '/settings', label: 'إعدادات النظام', icon: Settings, admin: true },
      { to: '/users', label: 'المستخدمين والصلاحيات', icon: KeyRound, admin: true },
      { to: '/print-templates', label: 'قوالب الطباعة', icon: FileText, admin: true },
      { to: '/evaluations', label: 'التقييمات', icon: Award, admin: true },
    ]
  }
];

export const EKTEFA_MODULES = navigationModules;

export function getNavGroups(isAdmin = false) {
  return navigationModules.map(mod => ({
    ...mod,
    items: mod.items.filter(it => !it.admin || isAdmin)
  }));
}

export function getNavItems(isAdmin = false) {
  const items = [];
  navigationModules.forEach(mod => {
    mod.items.forEach(it => {
      if (!it.admin || isAdmin) {
        items.push({ ...it, module: mod.id });
      }
    });
  });
  return items;
}
