import { DollarSign, useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { 
  Building2, 
  UploadCloud, 
  Image as ImageIcon, 
  Save, 
  ShieldCheck, 
  Palette, 
  Sun, 
  Moon, 
  Globe,
  Sparkles,
  Check,
  RotateCcw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Settings() {
  const { user } = useAuth();
  const { lang, setLang } = useI18n();
  const { toast } = useToast();
  const { currentTheme, themes, setTheme, isDark, toggleDarkMode } = useTheme();

  const [companyProfile, setCompanyProfile] = useState(() => {
    const saved = localStorage.getItem('hr_flow_company_profile');
    return saved ? JSON.parse(saved) : {
      name: 'Green Arrow HR',
      legal_name: 'شركة السهم الأخضر لتقنية المعلومات والتسويق',
      cr_number: '7016475555',
      tax_number: '311861381500003',
      phone: '+966 54 169 7999',
      address: 'المملكة العربية السعودية',
      logo_url: '/green-arrow-logo.png'
    };
  });

  // Payroll Settings State
  const [payrollSettings, setPayrollSettings] = React.useState(() => {
    try {
      const saved = localStorage.getItem('hr_flow_payroll_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { friday_daily_rate: 50, overtime_daily_rate: 100, days_per_month: 30 };
  });

  const handleSavePayrollSettings = () => {
    localStorage.setItem('hr_flow_payroll_settings', JSON.stringify(payrollSettings));
    window.dispatchEvent(new Event('payroll_settings_updated'));
    toast({ title: 'تم حفظ إعدادات الرواتب بنجاح' });
  };


  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'حجم الصورة كبير، يرجى اختيار صورة أقل من 2 ميجابايت', variant: 'destructive' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = { ...companyProfile, logo_url: reader.result };
        setCompanyProfile(updated);
        localStorage.setItem('hr_flow_company_profile', JSON.stringify(updated));
        window.dispatchEvent(new Event('company_profile_updated'));
        toast({ title: 'تم تحديث شعار المنشأة بنجاح بنمط الجلاس الفاخر 🎉' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    const updated = { ...companyProfile, logo_url: '' };
    setCompanyProfile(updated);
    localStorage.setItem('hr_flow_company_profile', JSON.stringify(updated));
    window.dispatchEvent(new Event('company_profile_updated'));
    toast({ title: 'تم استعادة الشعار الافتراضي للنظام' });
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    localStorage.setItem('hr_flow_company_profile', JSON.stringify(companyProfile));
    window.dispatchEvent(new Event('company_profile_updated'));
    toast({ title: 'تم حفظ بيانات وهوية الشركة بنجاح' });
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-heading font-extrabold text-foreground">إعدادات المنظومة وتخصيص المظهر</h1>
        <p className="text-xs text-muted-foreground mt-1">التحكم في الثيم العام للبرنامج، خلفية اللوجو البيضاء الفاخرة، وهوية المنشأة</p>
      </div>

      <Tabs defaultValue="theme" className="space-y-6">
        <TabsList className="grid grid-cols-2 max-w-md bg-secondary/80 p-1 rounded-2xl">
          <TabsTrigger value="theme" className="rounded-xl font-bold text-xs gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <span>الثيم والمظهر العام</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="rounded-xl font-bold text-xs gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span>هوية وشعار الشركة</span>
          </TabsTrigger>
        <TabsTrigger value="payroll" className="rounded-xl font-bold text-xs">إعدادات الرواتب</TabsTrigger>
        </TabsList>

        {/* TAB 1: THEME CUSTOMIZATION */}
        <TabsContent value="theme" className="space-y-6">
          
          {/* Theme Color Palette Selector */}
          <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-foreground">باليت الألوان والثيمات المعتمدة (Color Palettes)</h3>
                  <p className="text-xs text-muted-foreground">اختر النمط المناسب لهوية درة السيارة لتطبيقه فورياً على كافة صفحات النظام</p>
                </div>
              </div>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {themes.map((th) => {
                const isSelected = currentTheme.id === th.id;
                return (
                  <div
                    key={th.id}
                    onClick={() => {
                      setTheme(th.id);
                      toast({ title: `تم تطبيق ${th.name.split('(')[0]} بنجاح 🎉` });
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden group hover:scale-[1.02] ${
                      isSelected 
                        ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20' 
                        : 'border-border/60 bg-secondary/20 hover:border-primary/40'
                    }`}
                  >
                    {/* Color Swatch Circles */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <span 
                          className="w-7 h-7 rounded-xl border border-black/10 shadow-md" 
                          style={{ backgroundColor: th.previewPrimary }} 
                        />
                        <span 
                          className="w-5 h-5 rounded-xl -ms-2 border border-black/10 shadow-md" 
                          style={{ backgroundColor: th.previewAccent }} 
                        />
                      </div>
                      {isSelected ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>المفعل حالياً</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground group-hover:text-primary font-medium">
                          انقر للتفعيل
                        </span>
                      )}
                    </div>

                    <h4 className="font-heading font-bold text-sm text-foreground">{th.name.split('(')[0]}</h4>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5" dir="ltr">
                      {th.name.split('(')[1]?.replace(')', '')}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Dark Mode & Layout Settings */}
          <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold">
                  {isDark ? <Moon className="w-5 h-5 text-amber-500" /> : <Sun className="w-5 h-5 text-amber-600" />}
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm text-foreground">الوضع الداكن / الفاتح (Dark / Light Mode)</h4>
                  <p className="text-xs text-muted-foreground">تبديل واجهة النظام للوضع المريح للعين في المساء</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={toggleDarkMode}
                className="font-bold text-xs rounded-xl h-10 px-4 gap-2"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
                <span>{isDark ? 'التحويل إلى الفاتح' : 'التحويل إلى الداكن'}</span>
              </Button>
            </div>
          </Card>

        </TabsContent>

        {/* TAB 2: BRANDING & LUXURY WHITE GLASS LOGO */}
        <TabsContent value="branding" className="space-y-6">
          <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-border/40">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">شعار وهوية المنشأة (Company Branding)</h3>
                <p className="text-xs text-muted-foreground">خلفية الشعار مصممة بتقنية الجلاس الأبيض الفاخر لظهور ناصع وأنيق</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              
              {/* Luxury White Glass Logo Showcase */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-[#0B1F3A] to-slate-900 text-white shadow-xl relative overflow-hidden border border-white/10">
                
                {/* Background Glass Highlights */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

                {/* THE LUXURY WHITE GLASS CONTAINER */}
                <div className="w-28 h-28 rounded-3xl bg-white/95 backdrop-blur-md border-2 border-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] ring-4 ring-white/30 flex items-center justify-center overflow-hidden shrink-0 transition-transform duration-300 hover:scale-105 p-3 relative z-10">
                  {companyProfile.logo_url ? (
                    <img 
                      src={companyProfile.logo_url} 
                      alt="Company Logo" 
                      className="w-full h-full object-contain filter drop-shadow-md" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-[#0B1F3A] to-[#1E3A8A] rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-inner font-serif border border-[#D4AF37]">
                      <span className="text-[#D4AF37]">DC</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 text-center sm:text-right relative z-10">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-bold text-amber-300">
                      ✨ تصميم الجلاس الأبيض النقي الفاخر (Ultra-White Glass)
                    </span>
                    <h4 className="font-heading font-bold text-base mt-1 text-white">
                      معاينة الشعار كما يظهر في القائمة الجانبية والشاشات
                    </h4>
                    <p className="text-xs text-slate-300">
                      يتم عرض الشعار فوق خلفية بيضاء عاكسة للضوء تضمن إبراز الشعار ووضوحه بأعلى احترافية.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-lg hover:bg-slate-100 transition-all">
                      <UploadCloud className="w-4 h-4 text-primary" />
                      <span>رفع شعار جديد (PNG/SVG)</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>

                    {companyProfile.logo_url && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="rounded-xl text-xs font-bold border-white/30 text-white hover:bg-white/10 gap-1.5 h-9"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>استعادة الافتراضي</span>
                      </Button>
                    )}
                  </div>
                </div>

              </div>

              {/* Company Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>اسم المنشأة في النظام (Display Name) *</Label>
                  <Input 
                    value={companyProfile.name} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, name: e.target.value }))}
                    className="font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>الاسم التجاري الرسمي (Legal Company Name)</Label>
                  <Input 
                    value={companyProfile.legal_name} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, legal_name: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>رقم السجل التجاري (CR Number)</Label>
                  <Input 
                    value={companyProfile.cr_number} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, cr_number: e.target.value }))}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>الرقم الضريبي (VAT Number)</Label>
                  <Input 
                    value={companyProfile.tax_number} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, tax_number: e.target.value }))}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-border/40">
                <Button type="submit" className="bg-primary text-primary-foreground font-bold px-6 rounded-xl shadow-md gap-2">
                  <Save className="w-4 h-4" />
                  <span>حفظ بيانات المنشأة</span>
                </Button>
              </div>

            </form>
          </Card>
        </TabsContent>

      
      {/* === PAYROLL SETTINGS TAB === */}{/* payroll_settings_tab */}
      <TabsContent value="payroll">
        <Card className="rounded-2xl border-border/60 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-5 border-b border-border/40 bg-emerald-500/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-foreground">اعدادات الرواتب والبدلات</h2>
              <p className="text-xs text-muted-foreground mt-0.5">تحكم في مبالغ بدل الجمعة والاضافي وعدد ايام الشهر لاحتساب الراتب</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label className="font-bold text-sm">بدل يوم الجمعة (ريال)</Label>
                <Input
                  type="number"
                  value={payrollSettings.friday_daily_rate}
                  onChange={e => setPayrollSettings(p => ({...p, friday_daily_rate: Number(e.target.value)}))}
                  className="rounded-xl h-10 font-mono font-bold"
                  min="0" step="10"
                />
                <p className="text-xs text-muted-foreground">المبلغ الاضافي لكل يوم جمعة حضره الموظف (بصمة فعلية)</p>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-sm">اضافي ساعة يومياً (ريال)</Label>
                <Input
                  type="number"
                  value={payrollSettings.overtime_daily_rate}
                  onChange={e => setPayrollSettings(p => ({...p, overtime_daily_rate: Number(e.target.value)}))}
                  className="rounded-xl h-10 font-mono font-bold"
                  min="0" step="10"
                />
                <p className="text-xs text-muted-foreground">المبلغ لكل يوم في شفت 9 ساعات (has_overtime = true)</p>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-sm">عدد ايام الشهر للاحتساب</Label>
                <Input
                  type="number"
                  value={payrollSettings.days_per_month}
                  onChange={e => setPayrollSettings(p => ({...p, days_per_month: Number(e.target.value)}))}
                  className="rounded-xl h-10 font-mono font-bold"
                  min="26" max="31" step="1"
                />
                <p className="text-xs text-muted-foreground">يستخدم في: قيمة الساعة = (الراتب ÷ الايام ÷ ساعات الشفت)</p>
              </div>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold space-y-1">
              <p>معادلة قيمة الساعة: الراتب الاساسي ÷ {payrollSettings.days_per_month} يوم ÷ ساعات الشفت</p>
              <p>مثال راتب 1500 ريال وشفت 5 ساعات: 1500 ÷ {payrollSettings.days_per_month} ÷ 5 = {(1500 / (payrollSettings.days_per_month || 30) / 5).toFixed(2)} ريال/ساعة</p>
            </div>
            <Button onClick={handleSavePayrollSettings}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl px-6 h-10 shadow gap-2">
              <Save className="w-4 h-4" /> حفظ اعدادات الرواتب
            </Button>
          </div>
        </Card>
      </TabsContent>

      </Tabs>
    </div>
  );
}
