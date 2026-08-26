import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, User, Lock, Eye, EyeOff, CheckCircle2, LogIn, ShieldCheck } from "lucide-react";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const [domain, setDomain] = useState("doratcars");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Read company branding
  const [companyProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('hr_flow_company_profile');
      return saved ? JSON.parse(saved) : {
        name: 'HR DORAT CARS',
        legal_name: 'شركة درة السيارة لقطع غيار السيارات',
        logo_url: ''
      };
    } catch (e) {
      return {
        name: 'HR DORAT CARS',
        legal_name: 'شركة درة السيارة لقطع غيار السيارات',
        logo_url: ''
      };
    }
  });

  const returnTo = safeReturnTo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("يرجى إدخال رقم الهوية الوطنية أو الإقامة أو الرقم الوظيفي.");
      return;
    }

    if (!password.trim()) {
      setError("يرجى إدخال كلمة المرور.");
      return;
    }

    setLoading(true);

    try {
      const loggedUser = await base44.auth.loginViaNationalIdOrUsername(domain, username, password);
      
      // Smart Redirect based on role
      if (loggedUser.role === 'employee') {
        window.location.href = '/portal';
      } else {
        window.location.href = returnTo || '/';
      }
    } catch (err) {
      setError(err.message || "فشل تسجيل الدخول. يرجى التحقق من صحة البيانات المدخلة.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F8FAFC] text-[#0B1F3A] font-sans selection:bg-[#2D164D] selection:text-white" dir="rtl">
      
      {/* 1. LEFT HERO BRANDING BANNER */}
      <div className="relative hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] overflow-hidden flex-col justify-between p-12 border-e border-amber-200/60">
        
        {/* Abstract Yellow/Amber Shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F59E0B]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#D97706]/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* Top Header Tag */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0B1F3A] text-white flex items-center justify-center font-black text-xl shadow-lg border border-[#D4AF37]">
              {companyProfile.logo_url ? (
                <img src={companyProfile.logo_url} alt="Logo" className="w-full h-full object-contain p-1.5" />
              ) : (
                <span className="text-[#D4AF37]">DC</span>
              )}
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-lg text-[#0B1F3A] tracking-tight">{companyProfile.name || 'HR DORAT CARS'}</h2>
              <p className="text-xs text-slate-600 font-medium">بوابة الموارد البشرية والخدمة الذاتية</p>
            </div>
          </div>
        </div>

        {/* Center Hero Mockup & Slogan */}
        <div className="relative z-10 my-auto text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl xl:text-4xl font-heading font-black text-[#0B1F3A] tracking-tight">
              سهل ... متكامل ... سحابي ...
            </h1>
            <p className="text-sm xl:text-base font-medium text-slate-700 tracking-wide font-sans dir-ltr">
              Simple ... Unified ... Cloud ...
            </p>
          </div>

          {/* Interactive UI Card Mockup */}
          <div className="relative mx-auto max-w-md rounded-2xl bg-white/90 backdrop-blur-md p-5 shadow-2xl border border-white/80 transition-all hover:scale-[1.02] duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-800">نظام إدارة الموظفين والحضور</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                سحابي مباشر 100%
              </span>
            </div>

            <div className="mt-3 space-y-2 text-right text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">تسجيل الدخول بالهوية الوطنية</span>
                <span className="font-bold text-emerald-600">✅ مفعل</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">بوابة الخدمة الذاتية وتتبع الإجازات</span>
                <span className="font-bold text-emerald-600">✅ مفعل</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">ربط البصمات والورديات والفروع</span>
                <span className="font-bold text-emerald-600">✅ مفعل</span>
              </div>
            </div>

            {/* Slider Dots */}
            <div className="flex items-center justify-center gap-1.5 mt-4 pt-2">
              <span className="w-6 h-1.5 rounded-full bg-[#0B1F3A]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            </div>
          </div>
        </div>

        {/* Bottom Secure Portal Info Banner */}
        <div className="relative z-10 bg-white/85 backdrop-blur-md p-4 rounded-2xl border border-amber-300/60 text-xs shadow-sm">
          <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>بوابة الخدمة الذاتية المعتمدة للموظفين</span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            يرجى إدخال رقم الهوية الوطنية / الإقامة وكلمة المرور الخاصة بك للوصول الآمن إلى بياناتك وطلبات الخدمة الذاتية.
          </p>
        </div>
      </div>

      {/* 2. RIGHT LOGIN FORM PANEL */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-white overflow-y-auto">
        
        {/* Top Brand Logo for Mobile */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0B1F3A] to-[#1E3A8A] text-white flex items-center justify-center font-bold text-xl shadow-md border border-[#D4AF37]/50">
              {companyProfile.logo_url ? (
                <img src={companyProfile.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-[#D4AF37] font-serif">DC</span>
              )}
            </div>
            <div>
              <h2 className="font-heading font-black text-xl text-[#0B1F3A]">{companyProfile.name || 'درة السيارة'}</h2>
              <p className="text-xs text-slate-500 font-medium">HR DORAT CARS SYSTEM</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>نظام آمن ومحمي</span>
          </div>
        </div>

        {/* Center Main Login Card */}
        <div className="max-w-md w-full mx-auto space-y-6">
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-heading font-extrabold text-[#0B1F3A]">تسجيل الدخول</h1>
            </div>
            <p className="text-xs text-slate-500 font-medium dir-ltr text-right">Sign in to continue.</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Field 1: Company Domain */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>نطاق الشركة</span>
                <span className="text-[11px] font-normal text-slate-400">Company Domain</span>
              </div>
              <div className="relative">
                <Building2 className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="ps-10 h-12 rounded-xl bg-slate-50/80 border-slate-200 text-sm font-mono font-medium focus:bg-white"
                  placeholder="doratcars"
                  required
                />
              </div>
            </div>

            {/* Field 2: Username (National ID / Employee Number) - BLANK BY DEFAULT */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>رقم الهوية الوطنية / الإقامة / الرقم الوظيفي</span>
                <span className="text-[11px] font-normal text-slate-400">Username / National ID</span>
              </div>
              <div className="relative">
                <User className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="ps-10 h-12 rounded-xl bg-slate-50/80 border-slate-200 text-sm font-mono font-medium focus:bg-white"
                  placeholder="أدخل رقم الهوية أو الإقامة أو الرقم الوظيفي"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Field 3: Password - BLANK BY DEFAULT */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>كلمة المرور</span>
                <span className="text-[11px] font-normal text-slate-400">Password</span>
              </div>
              <div className="relative">
                <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ps-10 pe-10 h-12 rounded-xl bg-slate-50/80 border-slate-200 text-sm font-mono focus:bg-white"
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label="إظهار/إخفاء كلمة المرور"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                💡 للدخول للمرة الأولى استخدم <strong>رقم الهوية الوطنية / الإقامة</strong> أو كلمة المرور الخاصة بك.
              </p>
            </div>

            {/* Cloudflare Style Verification Badge */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>تم التحقق من الأمان بنجاح</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <ShieldCheck className="w-3 h-3 text-slate-500" />
                <span>CLOUDFLARE SECURE</span>
              </div>
            </div>

            {/* Terms text */}
            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              دخولك على نظام درة السيارة يعني موافقتك على <span className="text-[#0B1F3A] font-bold underline cursor-pointer">شروط وأحكام</span> استخدام الخدمة وسياسة الخصوصية.
            </p>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold rounded-xl shadow-lg transition-all text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>جاري تسجيل الدخول...</span>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>دخول | Login</span>
                </>
              )}
            </Button>

            {/* Forgot password */}
            <div className="text-center pt-2">
              <a href="mailto:info@doracars.com?subject=طلب إعادة تعيين كلمة المرور - نظام الموارد البشرية" className="text-xs text-slate-500 hover:text-[#0B1F3A] font-medium transition-colors">
                هل فقدت كلمة المرور؟ | Forgot Password?
              </a>
            </div>

          </form>
        </div>

        {/* Bottom Store & Compliance Badges */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-slate-500">متوافق مع الأنظمة السعودية:</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">GOSI / التأمينات</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">MUDAD / مدد WPS</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">QIWA / قوى</span>
          </div>

          <div className="text-left font-mono text-[10px] text-slate-400">
            © {new Date().getFullYear()} DORAT CARS HR. All rights reserved.
          </div>
        </div>

      </div>

    </div>
  );
}
