import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, User, Lock, Eye, EyeOff, CheckCircle2, LogIn, ShieldCheck, TrendingUp, Sparkles } from "lucide-react";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const [domain, setDomain] = useState("green-arrow");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F8FAFC] text-[#0B1F3A] font-sans selection:bg-[#10B981] selection:text-white" dir="rtl">
      
      {/* 1. LEFT HERO BRANDING BANNER */}
      <div className="relative hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#061A14] via-[#0B2E24] to-[#04120E] text-white overflow-hidden flex-col justify-between p-12 border-e border-emerald-500/20 shadow-2xl">
        
        {/* Abstract Green Glow Shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#10B981]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#059669]/25 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* Top Header Tag with Ultra-White Glass Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/95 backdrop-blur-md border-2 border-white shadow-[0_10px_30px_rgba(0,0,0,0.4)] ring-2 ring-emerald-400/40 flex items-center justify-center p-1.5 shrink-0 transition-transform hover:scale-105">
              <img src="/green-arrow-logo.png" alt="Green Arrow Logo" className="w-full h-full object-contain filter drop-shadow-sm" />
            </div>
            <div>
              <h2 className="font-heading font-black text-xl text-white tracking-tight flex items-center gap-2">
                <span>GREEN ARROW HR</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </h2>
              <p className="text-xs text-emerald-300/80 font-medium">نظام الموارد البشرية والخدمة الذاتية</p>
            </div>
          </div>
        </div>

        {/* Center Hero Mockup & Slogan */}
        <div className="relative z-10 my-auto text-center space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold mb-1 backdrop-blur-sm">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>مسار إدارتك ومبيعاتك دائمًا للأعلى</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-heading font-black text-white tracking-tight">
              سهل ... متكامل ... سحابي ...
            </h1>
            <p className="text-sm xl:text-base font-medium text-emerald-200/80 tracking-wide font-sans dir-ltr">
              Green Arrow Performance & Cloud HR
            </p>
          </div>

          {/* Interactive UI Card Mockup */}
          <div className="relative mx-auto max-w-md rounded-2xl bg-white/10 backdrop-blur-xl p-5 shadow-2xl border border-white/20 transition-all hover:scale-[1.02] duration-300 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold text-white">إدارة الحضور والانصراف والبصمة الذكية</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                سحابي مباشر 100%
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 text-emerald-100">
                <span>تسجيل الدخول بالهوية الوطنية / الإقامة</span>
                <span className="font-bold text-emerald-400">✅ مفعل</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 text-emerald-100">
                <span>بوابة الموظف وطلبات الإجازات الذاتية</span>
                <span className="font-bold text-emerald-400">✅ مفعل</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 text-emerald-100">
                <span>ربط الفروع وأجهزة البصمة سحابياً</span>
                <span className="font-bold text-emerald-400">✅ مفعل</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-4 pt-2">
              <span className="w-6 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
            </div>
          </div>
        </div>

        {/* Bottom Secure Portal Info Banner */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-xs shadow-sm">
          <div className="flex items-center gap-2 font-bold text-white mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>بوابة الخدمة الذاتية المعتمدة للموظفين - Green Arrow</span>
          </div>
          <p className="text-emerald-100/75 leading-relaxed text-[11px]">
            يرجى إدخال رقم الهوية الوطنية / الإقامة وكلمة المرور الخاصة بك للوصول الآمن إلى سجلاتك الإدارية.
          </p>
        </div>
      </div>

      {/* 2. RIGHT LOGIN FORM PANEL */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-white overflow-y-auto">
        
        {/* Top Brand Logo for Mobile */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md ring-2 ring-emerald-500/20 flex items-center justify-center p-1.5 shrink-0">
              <img src="/green-arrow-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="font-heading font-black text-xl text-slate-900">Green Arrow HR</h2>
              <p className="text-xs text-emerald-600 font-bold">نظام الموارد البشرية الذكي</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>نظام آمن ومحمي</span>
          </div>
        </div>

        {/* Center Main Login Card */}
        <div className="max-w-md w-full mx-auto space-y-6">
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-heading font-extrabold text-slate-900">تسجيل الدخول</h1>
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
                <span>نطاق المنشأة</span>
                <span className="text-[11px] font-normal text-slate-400">Company Domain</span>
              </div>
              <div className="relative">
                <Building2 className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="ps-10 h-12 rounded-xl bg-slate-50/80 border-slate-200 text-sm font-mono font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="green-arrow"
                  required
                />
              </div>
            </div>

            {/* Field 2: Username (National ID / Employee Number) */}
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
                  className="ps-10 h-12 rounded-xl bg-slate-50/80 border-slate-200 text-sm font-mono font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="أدخل رقم الهوية أو الإقامة أو الرقم الوظيفي"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Field 3: Password */}
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
                  className="ps-10 pe-10 h-12 rounded-xl bg-slate-50/80 border-slate-200 text-sm font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500"
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
                💡 للدخول للمرة الأولى استخدم <strong>رقم الهوية الوطنية / الإقامة</strong> أو كلمة المرور المسلمة لك.
              </p>
            </div>

            {/* Cloudflare Style Verification Badge */}
            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>تم التحقق من الأمان وتشفير البيانات</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-mono">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>GREEN ARROW SECURE</span>
              </div>
            </div>

            {/* Terms text */}
            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              دخولك على نظام Green Arrow HR يعني موافقتك على <span className="text-emerald-700 font-bold underline cursor-pointer">شروط وأحكام</span> استخدام الخدمة وسياسة الخصوصية.
            </p>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all text-base flex items-center justify-center gap-2"
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

            {/* Help / Support */}
            <div className="text-center pt-2">
              <a href="mailto:support@greenarrow.sa?subject=طلب مساعدة - نظام Green Arrow HR" className="text-xs text-slate-500 hover:text-emerald-700 font-medium transition-colors">
                هل تحتاج مساعدة في تسجيل الدخول؟ | Contact Support
              </a>
            </div>

          </form>
        </div>

        {/* Bottom Compliance Badges */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-slate-500">متوافق مع الأنظمة السعودية:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px]">GOSI / التأمينات</span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px]">MUDAD / مدد WPS</span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px]">QIWA / قوى</span>
          </div>

          <div className="text-left font-mono text-[10px] text-slate-400">
            © {new Date().getFullYear()} Green Arrow HR. All rights reserved.
          </div>
        </div>

      </div>

    </div>
  );
}
