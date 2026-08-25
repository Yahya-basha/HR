import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Building2, UploadCloud, Image as ImageIcon, Save, ShieldCheck, Palette, Sun, Moon, Globe } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function Settings() {
  const { user } = useAuth();
  const { lang, setLang } = useI18n();
  const { toast } = useToast();

  const [companyProfile, setCompanyProfile] = useState(() => {
    const saved = localStorage.getItem('hr_flow_company_profile');
    return saved ? JSON.parse(saved) : {
      name: 'HR DORAT CARS',
      legal_name: 'شركة درة السيارة للتجارة',
      cr_number: '7016475555',
      tax_number: '311861381500003',
      phone: '+966 54 169 7999',
      address: 'المملكة العربية السعودية - القصيم - بريدة',
      logo_url: ''
    };
  });

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
        toast({ title: 'تم رفع وتحديث شعار الشركة بنجاح 🎉' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    localStorage.setItem('hr_flow_company_profile', JSON.stringify(companyProfile));
    window.dispatchEvent(new Event('company_profile_updated'));
    toast({ title: 'تم حفظ بيانات وهوية الشركة بنجاح' });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">إعدادات المنظومة وهوية الشركة</h1>
        <p className="text-xs text-muted-foreground mt-1">تخصيص شعار وبيانات المنشأة، اللغة، والصلاحيات العامة</p>
      </div>

      {/* 1. Company Branding & Logo Uploader */}
      <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-border/40">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#1E1035] flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-foreground">هوية وشعار المنشأة (Company Branding)</h3>
            <p className="text-xs text-muted-foreground">شعار الشركة المعتمد يظهر في القائمة الجانبية وكافة المطبوعات الرسمية</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Logo Box */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-secondary/20 border border-border/40">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-primary/40 bg-white flex items-center justify-center overflow-hidden shadow-sm shrink-0">
              {companyProfile.logo_url ? (
                <img src={companyProfile.logo_url} alt="Company Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-lg flex items-center justify-center">
                  DC
                </div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-right">
              <Label className="text-sm font-bold block">تغيير / رفع أيقونة وشعار الشركة</Label>
              <p className="text-xs text-muted-foreground">يدعم ملفات PNG, SVG, JPG بدقة عالية (الحجم الأقصى 2MB)</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <label className="cursor-pointer inline-flex items-center gap-2 bg-[#2D164D] hover:bg-[#1E1035] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-colors">
                  <UploadCloud className="w-4 h-4" />
                  <span>اختيار ملف الشعار</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                {companyProfile.logo_url && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const updated = { ...companyProfile, logo_url: '' };
                      setCompanyProfile(updated);
                      localStorage.setItem('hr_flow_company_profile', JSON.stringify(updated));
                      window.dispatchEvent(new Event('company_profile_updated'));
                    }}
                    className="text-xs rounded-xl"
                  >
                    استعادة الشعار الافتراضي
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Company Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">اسم المنظومة المختصر</Label>
              <Input value={companyProfile.name} onChange={(e) => setCompanyProfile(prev => ({ ...prev, name: e.target.value }))} className="rounded-xl h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">الاسم القانوني للشركة</Label>
              <Input value={companyProfile.legal_name} onChange={(e) => setCompanyProfile(prev => ({ ...prev, legal_name: e.target.value }))} className="rounded-xl h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">رقم السجل التجاري (CR Number)</Label>
              <Input value={companyProfile.cr_number} onChange={(e) => setCompanyProfile(prev => ({ ...prev, cr_number: e.target.value }))} className="rounded-xl h-11 font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">الرقم الضريبي (VAT / Tax Number)</Label>
              <Input value={companyProfile.tax_number} onChange={(e) => setCompanyProfile(prev => ({ ...prev, tax_number: e.target.value }))} className="rounded-xl h-11 font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">رقم هاتف المنشأة المعتمد</Label>
              <Input value={companyProfile.phone} onChange={(e) => setCompanyProfile(prev => ({ ...prev, phone: e.target.value }))} className="rounded-xl h-11 font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">العنوان والمقر الرئيسي</Label>
              <Input value={companyProfile.address} onChange={(e) => setCompanyProfile(prev => ({ ...prev, address: e.target.value }))} className="rounded-xl h-11" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" className="bg-[#2D164D] hover:bg-[#1E1035] text-white px-8 font-bold rounded-xl h-11 shadow-sm">
              <Save className="w-4 h-4 me-2" /> حفظ بيانات المنشأة
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
