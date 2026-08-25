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
  Settings as SettingsIcon
} from 'lucide-react';

export function getNavGroups(isAdmin, t) {
  return [
    {
      group: 'الرئيسية',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'لوحة التحكم' },
      ]
    },
    {
      group: 'الموارد البشرية',
      items: [
        { to: '/employees', icon: Users, label: 'الموظفون', admin: true },
        { to: '/branches', icon: Building2, label: 'الفروع', admin: true },
        { to: '/shifts', icon: Timer, label: 'الورديات', admin: true },
        { to: '/evaluations', icon: Trophy, label: 'تقييم الأداء', admin: true },
      ]
    },
    {
      group: 'الحضور والإجازات',
      items: [
        { to: '/attendance', icon: Clock, label: 'الحضور' },
        { to: '/leave', icon: CalendarDays, label: 'طلبات الإجازات' },
        { to: '/leave-policies', icon: CalendarClock, label: 'سياسات الإجازات', admin: true },
        { to: '/reports', icon: BarChart3, label: 'التقارير', admin: true },
      ]
    },
    {
      group: 'التعويضات',
      items: [
        { to: '/payroll', icon: Wallet, label: 'الرواتب', admin: true },
        { to: '/end-of-service', icon: Calculator, label: 'حاسبة نهاية الخدمة', admin: true },
        { to: '/rewards-penalties', icon: Gift, label: 'إعدادات المكافآت والجزاءات', admin: true },
        { to: '/contracts', icon: FileSignature, label: 'العقود', admin: true },
      ]
    },
    {
      group: 'العمليات',
      items: [
        { to: '/devices', icon: Fingerprint, label: 'أجهزة الحضور', admin: true },
        { to: '/documents-print', icon: Printer, label: 'طابعة المستندات', admin: true },
        { to: '/print-templates', icon: FileText, label: 'نماذج الطباعة', admin: true },
        { to: '/import-data', icon: UploadCloud, label: 'استيراد البيانات', admin: true },
      ]
    },
    {
      group: 'النظام',
      items: [
        { to: '/announcements', icon: Megaphone, label: 'الإعلانات والأحداث', admin: true },
        { to: '/users', icon: Users, label: 'المستخدمون', admin: true },
        { to: '/settings', icon: SettingsIcon, label: 'الإعدادات' },
      ]
    }
  ];
}

export function getNavItems(isAdmin, t) {
  const groups = getNavGroups(isAdmin, t);
  const items = [];
  groups.forEach(g => {
    g.items.forEach(i => {
      if (!i.admin || isAdmin) items.push(i);
    });
  });
  return items;
}
