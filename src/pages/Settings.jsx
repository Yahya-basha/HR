import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { 
  Palette, 
  Building2, 
  Globe, 
  ShieldCheck, 
  Moon, 
  Sun, 
  Coins, 
  Check, 
  Sparkles, 
  Save, 
  Bell, 
  User,
  Sliders
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

const COLOR_THEMES = [
  { id: 'navy-gold', name: 'كحلي ملكي وذهبي (Royal Navy & Gold)', primary: '#0B1F3A', accent: '#D4AF37', border: '#D4AF37' },
  { id: 'emerald', name: 'أخضر زمردي فاخر (Emerald Luxury)', primary: '#064E3B', accent: '#10B981', border: '#10B981' },
  { id: 'indigo', name: 'أزرق تقني عصري (Tech Indigo)', primary: '#1E1B4B', accent: '#6366F1', border: '#6366F1' },
  { id: 'slate', name: 'رصاصي مؤسسي (Corporate Slate)', primary: '#0F172A', accent: '#38BDF8', border: '#38BDF8' },
  { id: 'burgundy', name: 'عنابي فاخر (Imperial Burgundy)', primary: '#4A0404', accent: '#E11D48', border: '#E11D48' }
];

const CURRENCIES = [
  { code: 'SAR', label: 'ريال سعودي (SAR)', symbol: 'ر.س' },
  { code: 'AED', label: 'درهم إماراتي (AED)', symbol: 'د.إ' },
  { code: 'USD', label: 'دولار أمريكي (USD)', symbol: '$' },
  { code: 'EGP', label: 'جنيه مصري (EGP)', symbol: 'ج.م' },
  { code: 'KWD', label: 'دينار كويتي (KWD)', symbol: 'د.ك' }
];

export default function Settings() {
  const { user } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  // Appearance & Branding States
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('saas_theme_color') || 'navy-gold');
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [currency, setCurrency] = useState(() => localStorage.getItem('saas_currency') || 'SAR');
  
  // Company Profile States
  const [companyInfo, setCompanyInfo] = useState(() => {
    const saved = localStorage.getItem('saas_company_profile');
    return saved ? JSON.parse(saved) : {
      name: 'شركة درة السيارة للتجارة',
      commercial_record: '7016475555',
      tax_number: '311861381500003',
      phone: '+966538834212',
      email: 'hr@doracars.com',
      address: 'طريق الملك فهد، الرياض، المملكة العربية السعودية'
    };
  });

  const applyThemeColor = (themeId) => {
    setActiveTheme(themeId);
    localStorage.setItem('saas_theme_color', themeId);
    const selected = COLOR_THEMES.find(th => th.id === themeId);
    if (selected) {
      document.documentElement.style.setProperty('--primary', selected.primary);
      document.documentElement.style.setProperty('--accent', selected.accent);
    }
    toast({ title: 'تم تحديث ألوان النظام بنجاح ✨' });
  };

  const toggleDarkMode = (enabled) => {
    setIsDarkMode(enabled);
    if (enabled) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    toast({ title: enabled ? 'تم تفعيل الوضع الليلي 🌙' : 'تم تفعيل الوضع الفاتح ☀️' });
  };

  const saveCompanySettings = () => {
    localStorage.setItem('saas_company_profile', JSON.stringify(companyInfo));
    localStorage.setItem('saas_currency', currency);
    toast({ title: 'تم حفظ إعدادات وبيانات المنشأة بنجاح 💾' });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">إعدادات المنصة وتخصيص المظهر</h1>
          <p className="text-sm text-muted-foreground mt-1">التحكم الكامل في هوية المنشأة، الألوان، العملة، والصلاحيات</p>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 font-bold">
          نظام SaaS التجاري v1.0
        </Badge>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid grid-cols-3 sm:w-[480px] p-1 bg-secondary/80 rounded-xl">
          <TabsTrigger value="appearance" className="rounded-lg gap-2 text-xs sm:text-sm">
            <Palette className="w-4 h-4" /> المظهر والهوية
          </TabsTrigger>
          <TabsTrigger value="company" className="rounded-lg gap-2 text-xs sm:text-sm">
            <Building2 className="w-4 h-4" /> بيانات المنشأة
          </TabsTrigger>
          <TabsTrigger value="general" className="rounded-lg gap-2 text-xs sm:text-sm">
            <Sliders className="w-4 h-4" /> اللغة والأمان
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: APPEARANCE & BRANDING */}
        <TabsContent value="appearance" className="space-y-6">
          
          {/* Theme Mode Toggle */}
          <Card className="p-6 border-border/60 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  {isDarkMode ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-foreground">نمط العرض (الوضع الليلي / الفاتح)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">اختر المظهر المريح لعينيك أثناء إدارة النظام</p>
                </div>
              </div>
              <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
            </div>
          </Card>

          {/* Color Palette Customizer */}
          <Card className="p-6 border-border/60 shadow-sm rounded-2xl space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">طابع الألوان الملكي (Color Palettes)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">حدد طابع الألوان المعتمد لأزرار وبطاقات لوحة التحكم</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {COLOR_THEMES.map((th) => {
                const isSelected = activeTheme === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => applyThemeColor(th.id)}
                    type="button"
                    className={`flex items-center justify-between p-4 rounded-2xl border text-right transition-all ${
                      isSelected 
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm' 
                        : 'border-border/60 hover:border-border hover:bg-secondary/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center -space-x-1.5 rtl:space-x-reverse">
                        <div className="w-6 h-6 rounded-full border border-white shadow-sm" style={{ backgroundColor: th.primary }}></div>
                        <div className="w-6 h-6 rounded-full border border-white shadow-sm" style={{ backgroundColor: th.accent }}></div>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-foreground">{th.name}</span>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Currency Selector */}
          <Card className="p-6 border-border/60 shadow-sm rounded-2xl space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">عملة النظام المعتمدة (Currency)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">تطبق على مسيرات الرواتب، البدلات، والمكافآت</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              {CURRENCIES.map((curr) => {
                const isSelected = currency === curr.code;
                return (
                  <button
                    key={curr.code}
                    onClick={() => { setCurrency(curr.code); localStorage.setItem('saas_currency', curr.code); toast({ title: `تم تعيين العملة: ${curr.label}` }); }}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm' 
                        : 'border-border/70 hover:bg-secondary/60 text-foreground font-medium'
                    }`}
                  >
                    <div className="text-base font-bold">{curr.symbol}</div>
                    <div className="text-[11px] opacity-80 mt-0.5">{curr.code}</div>
                  </button>
                );
              })}
            </div>
          </Card>

        </TabsContent>

        {/* TAB 2: COMPANY PROFILE & LEGAL */}
        <TabsContent value="company" className="space-y-6">
          <Card className="p-6 border-border/60 shadow-sm rounded-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">بيانات الشركة الرسمية</h3>
                <p className="text-xs text-muted-foreground mt-0.5">تظهر في تقارير الموظفين وعقود العمل ومسيرات الرواتب المطبوعة</p>
              </div>
              <Button onClick={saveCompanySettings} className="bg-primary text-primary-foreground shadow-sm">
                <Save className="w-4 h-4 me-2" /> حفظ التغييرات
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">اسم الشركة / المنشأة</Label>
                <Input 
                  value={companyInfo.name} 
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, name: e.target.value }))} 
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">رقم السجل التجاري (CR Number)</Label>
                <Input 
                  value={companyInfo.commercial_record} 
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, commercial_record: e.target.value }))} 
                  className="rounded-xl h-11 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">الرقم الضريبي (VAT Number)</Label>
                <Input 
                  value={companyInfo.tax_number} 
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, tax_number: e.target.value }))} 
                  className="rounded-xl h-11 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">رقم هاتف المنشأة</Label>
                <Input 
                  value={companyInfo.phone} 
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, phone: e.target.value }))} 
                  className="rounded-xl h-11 dir-ltr text-right"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">العنوان والمقر الرئيسي</Label>
                <Input 
                  value={companyInfo.address} 
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, address: e.target.value }))} 
                  className="rounded-xl h-11"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: GENERAL & ROLES */}
        <TabsContent value="general" className="space-y-6">
          
          {/* Language Selection */}
          <Card className="p-6 border-border/60 shadow-sm rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">{t('settings.language') || 'لغة واجهة النظام'}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">يدعم النظام الواجهتين العربية والإنجليزية بالكامل</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLang('ar')}
                className={`h-12 rounded-xl border text-sm font-bold transition-all ${
                  lang === 'ar' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border hover:bg-secondary text-foreground'
                }`}
              >
                العربية (RTL)
              </button>
              <button
                onClick={() => setLang('en')}
                className={`h-12 rounded-xl border text-sm font-bold transition-all ${
                  lang === 'en' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border hover:bg-secondary text-foreground'
                }`}
              >
                English (LTR)
              </button>
            </div>
          </Card>

          {/* User Account Info */}
          <Card className="p-6 border-border/60 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-foreground">{user?.full_name || 'يحيى باشا'}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{user?.email || 'admin@doracars.com'}</p>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-3 py-1">
                {isAdmin ? 'مدير النظام (Admin)' : 'موظف (Employee)'}
              </Badge>
            </div>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}
