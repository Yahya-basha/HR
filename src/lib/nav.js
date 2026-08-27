import { 
  LayoutDashboard,
  Users,
  Building2,
  Timer,
  Trophy,
  Clock, 
  CalendarDays, 
  CalendarClock, 
  BarChart3, 
  Wallet, 
  Calculator, 
  Gift, 
  FileSignature, 
  Fingerprint, 
  Printer, 
  FileText, 
  UploadCloud, 
  Megaphone, 
  Settings as SettingsIcon,
  MessageSquare,
  Briefcase,
  TrendingUp,
  FileCheck,
  HelpCircle,
  CreditCard,
  UserCheck,
  FolderOpen,
  Sparkles,
  Award,
  AlertOctagon,
  Lock
} from 'lucide-react';

export const EKTEFA_MODULES = [
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
      { to: '/announcements', label: 'الإعلانات والأحداث', icon: Megaphone, admin: true },
      { to: '/announcements?tab=messages', label: 'الرسائل والتعاميم', icon: MessageSquare, admin: true },
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
    badgeColor: 'bg-rose-500 text-white',
    activeBg: 'bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
    items: [
      { to: '/employees', label: 'سجل الموظفين', icon: Users, admin: true },
      { to: '/branches', label: 'الفروع والأقسام', icon: Building2, admin: true },
      { to: '/shifts', label: 'الورديات وفترات العمل', icon: Timer, admin: true },
      { to: '/contracts', label: 'العقود والتوثيق', icon: FileSignature, admin: true },
      { to: '/leave-policies', label: 'سياسات الإجازات', icon: CalendarClock, admin: true },
    ]
  },
  {
    id: 'payroll',
    label: 'الأجور',
    icon: Wallet,
    color: '#a855f7', // Purple
    badgeColor: 'bg-purple-500 text-white',
    activeBg: 'bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200',
    items: [
      { to: '/payroll?stage=1', label: '1. مراجعة وتدقيق البصمات', icon: Clock, admin: true },
      { to: '/payroll?stage=2', label: '2. اعتماد الاستقطاعات والخصم', icon: AlertOctagon, admin: true },
      { to: '/payroll?stage=3', label: '3. اعتماد الاستحقاقات والمكافئات', icon: Gift, admin: true },
      { to: '/payroll?stage=4', label: '4. المراجعة والإقفال النهائي', icon: Lock, admin: true },
      { to: '/payroll?stage=5', label: '5. رواتب الشهور السابقة والمصادقة', icon: Award, admin: true },
      { to: '/payroll?tab=advances', label: 'نظام السلف والقروض', icon: CreditCard, admin: true },
      { to: '/end-of-service', label: 'حاسبة مكافأة نهاية الخدمة', icon: Calculator, admin: true },
    ]
  },
  {
    id: 'evaluation',
    label: 'التقييم',
    icon: Trophy,
    color: '#14b8a6', // Teal
    badgeColor: 'bg-teal-500 text-white',
    activeBg: 'bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-200',
    items: [
      { to: '/evaluations', label: 'تقييم الأداء والموظفين', icon: Trophy, admin: true },
      { to: '/evaluations?tab=kpis', label: 'مؤشرات الأداء الرئيسية', icon: Award, admin: true },
    ]
  },
  {
    id: 'development',
    label: 'التطوير',
    icon: TrendingUp,
    color: '#f59e0b', // Amber
    badgeColor: 'bg-amber-500 text-white',
    activeBg: 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    items: [
      { to: '/evaluations?tab=training', label: 'الدورات والتدريب', icon: TrendingUp, admin: true },
      { to: '/announcements', label: 'خطط التطوير الوظيفي', icon: Briefcase, admin: true },
    ]
  },
  {
    id: 'reports',
    label: 'التقارير',
    icon: BarChart3,
    color: '#f43f5e', // Coral
    badgeColor: 'bg-rose-500 text-white',
    activeBg: 'bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
    items: [
      { to: '/reports', label: 'تقارير الحضور والغياب', icon: BarChart3, admin: true },
      { to: '/documents-print', label: 'طابعة المستندات والنماذج A4', icon: Printer, admin: true },
      { to: '/print-templates', label: 'نماذج الطباعة الرسمية', icon: FileText, admin: true },
    ]
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    icon: SettingsIcon,
    color: '#d946ef', // Fuchsia
    badgeColor: 'bg-fuchsia-500 text-white',
    activeBg: 'bg-fuchsia-50 text-fuchsia-900 dark:bg-fuchsia-950/40 dark:text-fuchsia-200',
    items: [
      { to: '/settings', label: 'إعدادات المنظومة', icon: SettingsIcon },
      { to: '/users', label: 'المستخدمون والصلاحيات', icon: Users, admin: true },
      { to: '/settings?tab=payroll', label: 'إعدادات الرواتب والبدلات', icon: Wallet, admin: true },
    ]
  },
  {
    id: 'support',
    label: 'الدعم',
    icon: HelpCircle,
    color: '#334155', // Slate
    badgeColor: 'bg-slate-700 text-white',
    activeBg: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
    items: [
      { to: '/settings?tab=support', label: 'الدعم الفني والمساعدة', icon: HelpCircle },
      { to: '/settings?tab=backup', label: 'النسخ الاحتياطي السحابي', icon: FolderOpen, admin: true },
    ]
  }
];

export function getNavGroups(isAdmin, t) {
  return EKTEFA_MODULES.map(mod => ({
    group: mod.label,
    items: mod.items.filter(it => !it.admin || isAdmin)
  }));
}

export function getNavItems(isAdmin, t) {
  const items = [];
  EKTEFA_MODULES.forEach(mod => {
    mod.items.forEach(it => {
      if (!it.admin || isAdmin) {
        items.push({ ...it, moduleColor: mod.color, moduleName: mod.label });
      }
    });
  });
  return items;
}
